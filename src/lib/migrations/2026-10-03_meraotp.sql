-- OTP generation/verification moved to MeraOTP — we only keep its message_id

ALTER TABLE otps ADD COLUMN IF NOT EXISTS message_id VARCHAR(64);
ALTER TABLE otps ALTER COLUMN otp DROP NOT NULL;
