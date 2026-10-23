import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://miniledger:miniledger@localhost:5432/miniledger_test',
      JWT_SECRET: 'integration-test-jwt-secret-at-least-32-characters',
      OTP_HASH_SECRET: 'integration-test-otp-secret-at-least-32-characters',
      JWT_EXPIRES_IN_SECONDS: '604800',
      OTP_EXPIRY_MINUTES: '5',
      OTP_RESEND_COOLDOWN_SECONDS: '30',
      OTP_MAX_REQUESTS_PER_HOUR: '5',
      OTP_MAX_ATTEMPTS: '5',
    },
  },
});
