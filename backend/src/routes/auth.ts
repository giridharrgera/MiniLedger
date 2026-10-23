import { Router } from 'express';
import { env } from '../config/env.js';
import { createAccessToken } from '../lib/auth.js';
import { requestOtp, verifyOtpAndGetUser } from '../lib/otp.js';
import {
  requestOtpSchema,
  verifyOtpSchema,
} from '../lib/schemas.js';
import { parseInput } from '../lib/validation.js';

export const authRouter = Router();

authRouter.post('/request-otp', async (req, res) => {
  const { phoneNumber } = parseInput(requestOtpSchema, req.body);
  const result = await requestOtp(phoneNumber);

  res.status(200).json({
    success: true,
    data: {
      message: 'OTP generated successfully.',
      ...result,
    },
  });
});

authRouter.post('/verify-otp', async (req, res) => {
  const { phoneNumber, otp } = parseInput(verifyOtpSchema, req.body);
  const user = await verifyOtpAndGetUser(phoneNumber, otp);
  const token = createAccessToken({
    id: user.id,
    phoneNumber: user.phone_number,
  });

  res.status(200).json({
    success: true,
    data: {
      token,
      tokenType: 'Bearer',
      expiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
      },
    },
  });
});
