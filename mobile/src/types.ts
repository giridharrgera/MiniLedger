export type LoanStatus = 'unpaid' | 'repaid';

export interface User {
  id: string;
  phoneNumber: string;
}

export interface Loan {
  id: string;
  friendName: string;
  amount: string;
  dueDate: string;
  status: LoanStatus;
  repaidAt: string | null;
  createdAt: string;
}

export interface LoanSummary {
  totalLent: string;
  totalRepaid: string;
  overdueAmount: string;
}

export interface RequestOtpResult {
  message: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface VerifyOtpResult {
  token: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: User;
}

export interface CreateLoanInput {
  friendName: string;
  amount: string;
  dueDate: string;
}
