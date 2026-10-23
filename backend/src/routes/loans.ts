import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { HttpError } from '../lib/errors.js';
import {
  createLoanSchema,
  loanIdSchema,
} from '../lib/schemas.js';
import { parseInput } from '../lib/validation.js';
import { requireAuth } from '../middleware/require-auth.js';

interface LoanRow {
  id: string;
  friend_name: string;
  amount: string;
  due_date: string;
  status: 'unpaid' | 'repaid';
  repaid_at: Date | null;
  created_at: Date;
}

const loanColumns = `
  id,
  friend_name,
  amount::text AS amount,
  due_date::text AS due_date,
  status,
  repaid_at,
  created_at
`;

function toLoanResponse(row: LoanRow) {
  return {
    id: row.id,
    friendName: row.friend_name,
    amount: row.amount,
    dueDate: row.due_date,
    status: row.status,
    repaidAt: row.repaid_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export const loansRouter = Router();

loansRouter.use(requireAuth);

loansRouter.get('/', async (req, res) => {
  const result = await pool.query<LoanRow>(
    `SELECT ${loanColumns}
     FROM loans
     WHERE user_id = $1
     ORDER BY
       CASE
         WHEN status = 'unpaid' AND due_date < CURRENT_DATE THEN 0
         WHEN status = 'unpaid' THEN 1
         ELSE 2
       END,
       CASE WHEN status = 'unpaid' THEN due_date END ASC NULLS LAST,
       created_at DESC`,
    [req.auth!.userId],
  );

  res.status(200).json({
    success: true,
    data: { loans: result.rows.map(toLoanResponse) },
  });
});

loansRouter.get('/summary', async (req, res) => {
  const result = await pool.query<{
    total_lent: string;
    total_repaid: string;
    overdue_amount: string;
  }>(
    `SELECT
       COALESCE(SUM(amount), 0)::numeric(20, 2)::text AS total_lent,
       COALESCE(
         SUM(amount) FILTER (WHERE status = 'repaid'),
         0
       )::numeric(20, 2)::text AS total_repaid,
       COALESCE(
         SUM(amount) FILTER (
           WHERE status = 'unpaid' AND due_date < CURRENT_DATE
         ),
         0
       )::numeric(20, 2)::text AS overdue_amount
     FROM loans
     WHERE user_id = $1`,
    [req.auth!.userId],
  );

  const summary = result.rows[0];

  if (!summary) {
    throw new HttpError(500, 'SUMMARY_UNAVAILABLE', 'Could not calculate summary.');
  }

  res.status(200).json({
    success: true,
    data: {
      totalLent: summary.total_lent,
      totalRepaid: summary.total_repaid,
      overdueAmount: summary.overdue_amount,
    },
  });
});

loansRouter.post('/', async (req, res) => {
  const { friendName, amount, dueDate } = parseInput(
    createLoanSchema,
    req.body,
  );

  const result = await pool.query<LoanRow>(
    `INSERT INTO loans (id, user_id, friend_name, amount, due_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${loanColumns}`,
    [randomUUID(), req.auth!.userId, friendName, amount, dueDate],
  );

  const loan = result.rows[0];

  if (!loan) {
    throw new HttpError(500, 'LOAN_NOT_CREATED', 'Could not create the loan.');
  }

  res.status(201).json({
    success: true,
    data: { loan: toLoanResponse(loan) },
  });
});

loansRouter.patch('/:id/repay', async (req, res) => {
  const loanId = parseInput(loanIdSchema, req.params.id);

  const result = await pool.query<LoanRow>(
    `UPDATE loans
     SET status = 'repaid', repaid_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'unpaid'
     RETURNING ${loanColumns}`,
    [loanId, req.auth!.userId],
  );

  const loan = result.rows[0];

  if (!loan) {
    const existing = await pool.query<{ status: 'unpaid' | 'repaid' }>(
      'SELECT status FROM loans WHERE id = $1 AND user_id = $2',
      [loanId, req.auth!.userId],
    );

    if (existing.rowCount === 0) {
      throw new HttpError(404, 'LOAN_NOT_FOUND', 'Loan not found.');
    }

    throw new HttpError(
      409,
      'LOAN_ALREADY_REPAID',
      'This loan has already been marked as repaid.',
    );
  }

  res.status(200).json({
    success: true,
    data: { loan: toLoanResponse(loan) },
  });
});
