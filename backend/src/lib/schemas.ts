import { z } from 'zod';

export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    'Enter a phone number in international format, for example +919876543210.',
  );

export const requestOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
});

export const verifyOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
  otp: z.string().regex(/^\d{6}$/, 'Enter the six-digit OTP.'),
});

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid due date.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, 'Enter a valid due date.');

const amountSchema = z
  .preprocess((value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  }, z.string())
  .pipe(
    z
      .string()
      .regex(
        /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/,
        'Enter a valid amount with up to two decimal places.',
      )
      .refine((value) => Number(value) > 0, 'Amount must be greater than zero.'),
  )
  .transform((value) => {
    const [whole, fraction = ''] = value.split('.');
    return `${whole}.${fraction.padEnd(2, '0')}`;
  });

export const createLoanSchema = z.object({
  friendName: z
    .string()
    .trim()
    .min(1, "Enter your friend's name.")
    .max(80, 'Name must be 80 characters or fewer.'),
  amount: amountSchema,
  dueDate: dateOnlySchema,
});

export const loanIdSchema = z.uuid('Loan ID must be a valid UUID.');
