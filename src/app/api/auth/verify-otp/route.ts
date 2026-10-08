import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateUserToken } from '@/lib/userAuth';
import { verifyOtp } from '@/lib/meraOtp';
import { isTestMobile, ensureTestSubscription, TEST_OTP } from '@/lib/testAccount';

const DEFAULT_SECS = 60 * 60 * 24 * 3; // 3 days if no subscription

export async function POST(req: NextRequest) {
  try {
    const { mobile, otp } = await req.json();

    if (!mobile || !otp) {
      return NextResponse.json(
        { success: false, message: 'Mobile and OTP required' },
        { status: 400 },
      );
    }

    if (isTestMobile(String(mobile))) {
      // Test account — fixed OTP, subscription kept active
      if (String(otp) !== TEST_OTP) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired OTP' },
          { status: 401 },
        );
      }
      await ensureTestSubscription();
    } else {
      // Latest live OTP only; 5 wrong tries burns it
      const otpRes = await pool.query(
        `SELECT id, message_id FROM otps
         WHERE mobile = $1 AND is_used = false AND expires_at > NOW() AND attempts < 5
           AND message_id IS NOT NULL
         ORDER BY created_at DESC LIMIT 1`,
        [mobile],
      );

      const verified =
        otpRes.rows.length > 0 && (await verifyOtp(otpRes.rows[0].message_id, String(otp)));

      if (!verified) {
        if (otpRes.rows.length > 0) {
          await pool.query(`UPDATE otps SET attempts = attempts + 1 WHERE id = $1`, [otpRes.rows[0].id]);
        }
        return NextResponse.json(
          { success: false, message: 'Invalid or expired OTP' },
          { status: 401 },
        );
      }

      await pool.query(`UPDATE otps SET is_used = true WHERE id = $1`, [otpRes.rows[0].id]);
    }

    const userRes = await pool.query(
      `INSERT INTO users (mobile) VALUES ($1)
       ON CONFLICT (mobile) DO UPDATE SET updated_at = NOW()
       RETURNING id, mobile`,
      [mobile],
    );
    const user = userRes.rows[0];

    const subRes = await pool.query(
      `SELECT id, end_date,
              GREATEST(EXTRACT(EPOCH FROM (end_date - NOW()))::int, 60) AS secs_left
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND end_date > NOW()
       ORDER BY end_date DESC LIMIT 1`,
      [user.id],
    );

    const hasActiveSub = subRes.rows.length > 0;
    const secsLeft     = hasActiveSub ? subRes.rows[0].secs_left : DEFAULT_SECS;
    const token        = generateUserToken(user.id, secsLeft);

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: { mobile: user.mobile, hasActiveSub },
    });

    response.cookies.set('mr_token', token, {
      path: '/',
      maxAge: secsLeft,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    response.cookies.set('mr_has_sub', hasActiveSub ? '1' : '0', {
      path: '/',
      maxAge: secsLeft,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    // Clear legacy cookies
    response.cookies.set('mr_uid', '', { path: '/', maxAge: 0 });
    response.cookies.set('mr_sub', '', { path: '/', maxAge: 0 });

    return response;
  } catch (err) {
    console.error('verify-otp error:', err);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 },
    );
  }
}
