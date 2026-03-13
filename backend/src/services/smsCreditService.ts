import { executeQuery, executeQuerySingle } from '../config/database-hybrid';
import { logger } from '../utils/logger';
import { emailService } from './emailService';

interface CreditBalance {
  id: number;
  credits_remaining: number;
  total_purchased: number;
  total_used: number;
  low_credit_threshold: number;
  last_alert_sent_at: string | null;
  updated_at: string;
}

interface CreditTransaction {
  id: number;
  transaction_type: 'purchase' | 'deduction' | 'adjustment';
  amount: number;
  balance_after: number;
  reference: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export class SMSCreditService {

  static async getBalance(): Promise<CreditBalance | null> {
    return executeQuerySingle<CreditBalance>('SELECT * FROM sms_credit_balance LIMIT 1');
  }

  static async hasSufficientCredits(count: number): Promise<boolean> {
    const balance = await this.getBalance();
    if (!balance) return false;
    return balance.credits_remaining >= count;
  }

  static async deductCredits(count: number, reference?: string): Promise<number> {
    // Atomic decrement + return new balance
    const rows = await executeQuery<CreditBalance>(
      `UPDATE sms_credit_balance
       SET credits_remaining = credits_remaining - $1,
           total_used = total_used + $1,
           updated_at = NOW()
       WHERE id = (SELECT id FROM sms_credit_balance LIMIT 1)
         AND credits_remaining >= $1
       RETURNING credits_remaining`,
      [count]
    );

    if (!rows || rows.length === 0) {
      throw new Error('Insufficient SMS credits for deduction');
    }

    const newBalance = rows[0].credits_remaining;

    // Log deduction transaction
    await executeQuery(
      `INSERT INTO sms_credit_transactions (transaction_type, amount, balance_after, reference, created_at)
       VALUES ('deduction', $1, $2, $3, NOW())`,
      [count, newBalance, reference || null]
    );

    // Check low-balance alert
    await this.checkAndAlertLowBalance(newBalance);

    return newBalance;
  }

  static async addCredits(amount: number, notes: string, userId: number): Promise<number> {
    const rows = await executeQuery<CreditBalance>(
      `UPDATE sms_credit_balance
       SET credits_remaining = credits_remaining + $1,
           total_purchased = total_purchased + $1,
           updated_at = NOW()
       WHERE id = (SELECT id FROM sms_credit_balance LIMIT 1)
       RETURNING credits_remaining`,
      [amount]
    );

    if (!rows || rows.length === 0) {
      throw new Error('Failed to add SMS credits — balance row missing');
    }

    const newBalance = rows[0].credits_remaining;

    await executeQuery(
      `INSERT INTO sms_credit_transactions (transaction_type, amount, balance_after, reference, notes, created_by, created_at)
       VALUES ('purchase', $1, $2, $3, $4, $5, NOW())`,
      [amount, newBalance, `Purchase by user ${userId}`, notes || null, userId]
    );

    logger.info('SMS credits added', { amount, newBalance, userId });
    return newBalance;
  }

  static async getTransactions(
    page: number = 1,
    limit: number = 50,
    type?: string
  ): Promise<{ transactions: CreditTransaction[]; total: number }> {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params: any[] = [];
    let paramIdx = 1;

    if (type && ['purchase', 'deduction', 'adjustment'].includes(type)) {
      whereClause = `WHERE transaction_type = $${paramIdx++}`;
      params.push(type);
    }

    const countResult = await executeQuerySingle<{ count: string }>(
      `SELECT COUNT(*) as count FROM sms_credit_transactions ${whereClause}`,
      params
    );

    const transactions = await executeQuery<CreditTransaction>(
      `SELECT t.*, u.name as created_by_name
       FROM sms_credit_transactions t
       LEFT JOIN users u ON t.created_by = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    return {
      transactions,
      total: parseInt(countResult?.count || '0', 10),
    };
  }

  static async checkAndAlertLowBalance(currentBalance: number): Promise<void> {
    try {
      const balance = await this.getBalance();
      if (!balance) return;

      const threshold = balance.low_credit_threshold;
      if (currentBalance > threshold) return;

      // Cooldown: don't send more than one alert every 24 hours
      if (balance.last_alert_sent_at) {
        const lastAlert = new Date(balance.last_alert_sent_at).getTime();
        const now = Date.now();
        if (now - lastAlert < 24 * 60 * 60 * 1000) return;
      }

      const isZero = currentBalance <= 0;
      const subject = isZero
        ? 'CRITICAL: SMS Credits Depleted — Sending Blocked'
        : `Warning: SMS Credits Low (${currentBalance} remaining)`;

      const body = isZero
        ? `<h2>SMS Credit Balance is Zero</h2>
           <p>All SMS sending has been <strong>blocked</strong> because the credit balance has reached 0.</p>
           <p>Please purchase additional credits immediately to restore SMS functionality.</p>
           <p>Current threshold setting: ${threshold} credits.</p>`
        : `<h2>SMS Credits Running Low</h2>
           <p>The current SMS credit balance is <strong>${currentBalance}</strong>, which is below the alert threshold of <strong>${threshold}</strong>.</p>
           <p>Please arrange to purchase additional credits to avoid service interruption.</p>`;

      await emailService.sendEmail({
        to: 'ICT@effonline.org',
        subject,
        html: body,
      });

      // Update last alert timestamp
      await executeQuery(
        `UPDATE sms_credit_balance SET last_alert_sent_at = NOW() WHERE id = (SELECT id FROM sms_credit_balance LIMIT 1)`
      );

      logger.info('Low SMS credit alert sent', { currentBalance, threshold });
    } catch (error) {
      logger.error('Failed to send low SMS credit alert', { error });
    }
  }
}
