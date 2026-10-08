import { randomUUID } from 'crypto';

const BASE_URL = 'https://meraotp.in/api/v1/otp';

function headers(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${process.env.MERAOTP_API_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

type SendResult = { messageId: string } | { messageId: null; rateLimited: boolean };

// MeraOTP generates + delivers the OTP; returns message_id needed for verification
export async function sendOtp(mobile: string): Promise<SendResult> {
  try {
    const res = await fetch(`${BASE_URL}/send`, {
      method: 'POST',
      headers: headers({ 'Idempotency-Key': `login_${mobile}_${randomUUID()}` }),
      body: JSON.stringify({
        mobile,
        purpose: 'login',
        otp_length: 6,
        reference: mobile,
      }),
    });
    const result = await res.json().catch(() => null);
    if (!res.ok || !result?.success || !result.data?.message_id) {
      console.error('MeraOTP send failed:', res.status, result);
      return { messageId: null, rateLimited: res.status === 429 };
    }
    return { messageId: result.data.message_id };
  } catch (err) {
    console.error('MeraOTP send error:', err);
    return { messageId: null, rateLimited: false };
  }
}

export async function verifyOtp(messageId: string, otp: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/verify`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ message_id: messageId, otp }),
    });
    const result = await res.json().catch(() => null);
    return res.ok && !!result?.success && !!result.data?.verified;
  } catch (err) {
    console.error('MeraOTP verify error:', err);
    return false;
  }
}
