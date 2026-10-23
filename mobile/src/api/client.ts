import { Platform } from 'react-native';
import type {
  CreateLoanInput,
  Loan,
  LoanSummary,
  RequestOtpResult,
  VerifyOtpResult,
} from '../types';

const fallbackOrigin =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

export const API_ORIGIN = (
  process.env.EXPO_PUBLIC_API_URL?.trim() || fallbackOrigin
).replace(/\/+$/, '');

const API_BASE_URL = `${API_ORIGIN}/api`;

interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  token?: string;
  body?: unknown;
}

async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let payload: unknown = null;

    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        throw new ApiError(
          response.status,
          'INVALID_RESPONSE',
          'The server returned an unexpected response.',
        );
      }
    }

    if (!response.ok) {
      const error = (payload as { error?: ApiErrorBody } | null)?.error;
      throw new ApiError(
        response.status,
        error?.code ?? 'REQUEST_FAILED',
        error?.message ?? 'The request could not be completed.',
        error?.details,
      );
    }

    const successPayload = payload as
      | { success?: boolean; data?: T }
      | null;

    if (!successPayload?.success || successPayload.data === undefined) {
      throw new ApiError(
        response.status,
        'INVALID_RESPONSE',
        'The server returned an unexpected response.',
      );
    }

    return successPayload.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if ((error as { name?: string }).name === 'AbortError') {
      throw new ApiError(
        0,
        'REQUEST_TIMEOUT',
        'The request took too long. Please try again.',
      );
    }

    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach MiniLedger. Check your connection and try again.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function requestOtp(phoneNumber: string): Promise<RequestOtpResult> {
  return apiRequest<RequestOtpResult>('/auth/request-otp', {
    method: 'POST',
    body: { phoneNumber },
  });
}

export function verifyOtp(
  phoneNumber: string,
  otp: string,
): Promise<VerifyOtpResult> {
  return apiRequest<VerifyOtpResult>('/auth/verify-otp', {
    method: 'POST',
    body: { phoneNumber, otp },
  });
}

export async function fetchLoans(token: string): Promise<Loan[]> {
  const data = await apiRequest<{ loans: Loan[] }>('/loans', { token });
  return data.loans;
}

export function fetchLoanSummary(token: string): Promise<LoanSummary> {
  return apiRequest<LoanSummary>('/loans/summary', { token });
}

export async function addLoan(
  token: string,
  input: CreateLoanInput,
): Promise<Loan> {
  const data = await apiRequest<{ loan: Loan }>('/loans', {
    method: 'POST',
    token,
    body: input,
  });
  return data.loan;
}

export async function repayLoan(token: string, loanId: string): Promise<Loan> {
  const data = await apiRequest<{ loan: Loan }>(`/loans/${loanId}/repay`, {
    method: 'PATCH',
    token,
  });
  return data.loan;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Something unexpected happened. Please try again.';
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
