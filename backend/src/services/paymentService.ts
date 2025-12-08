import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import axios from 'axios';
export interface PeachPaymentConfig {
  entityId: string;
  accessToken: string;
  testMode: boolean;
  baseUrl: string;
}

export interface PaymentTransaction {
  id?: number;
  application_id: number;
  transaction_id?: string;
  payment_method: 'card' | 'cash' | 'bank_transfer' | 'eft';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'verification_required';
  gateway_response?: string;
  receipt_number?: string;
  receipt_image_path?: string;
  verified_by?: number;
  verified_at?: Date;
  verification_notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CashPaymentVerification {
  transaction_id: number;
  receipt_number: string;
  receipt_image_path: string;
  amount_verified: number;
  verified_by: number;
  verification_notes?: string;
  verification_status: 'pending' | 'approved' | 'rejected';
}

export class PaymentService {
  private static peachConfig: PeachPaymentConfig = {
    entityId: process.env.PEACH_ENTITY_ID || '',
    accessToken: process.env.PEACH_ACCESS_TOKEN || '',
    testMode: process.env.NODE_ENV !== 'production',
    baseUrl: process.env.PEACH_BASE_URL || 'https://test.oppwa.com'
  };

  /**
   * Initialize payment transaction record
   */
  static async createPaymentTransaction(data: Omit<PaymentTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    try {
      const query = `
        INSERT INTO payment_transactions (
          application_id, transaction_id, payment_method, amount, currency,
          status, gateway_response, receipt_number, receipt_image_path,
          created_at, updated_at
        ) EXCLUDED.?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      `;

      const params = [
        data.application_id,
        data.transaction_id || null,
        data.payment_method,
        data.amount,
        data.currency,
        data.status,
        data.gateway_response || null,
        data.receipt_number || null,
        data.receipt_image_path || null
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create payment transaction', error);
    }
  }

  /**
   * Process card payment through Peach Payment Gateway
   */
  static async processCardPayment(
    applicationId: number,
    amount: number,
    cardData: {
      number: string;
      expiryMonth: string;
      expiryYear: string;
      cvv: string;
      holder: string;
    }
  ): Promise<{ success: boolean; transactionId?: string; message: string; paymentTransactionId?: number }> {
    try {
      // Create initial payment transaction record
      const paymentTransactionId = await this.createPaymentTransaction({
        application_id: applicationId,
        payment_method: 'card',
        amount: amount,
        currency: 'ZAR',
        status: 'processing'
      });

      // Prepare Peach Payment request
      const paymentData: Record<string, string> = {
        entityId: this.peachConfig.entityId,
        amount: amount.toFixed(2),
        currency: 'ZAR',
        paymentBrand: 'VISA', // or detect from card number
        paymentType: 'DB', // Debit transaction
        'card.number': cardData.number,
        'card.expiryMonth': cardData.expiryMonth,
        'card.expiryYear': cardData.expiryYear,
        'card.cvv': cardData.cvv,
        'card.holder': cardData.holder
      };

      // Add testMode only if it's defined
      if (this.peachConfig.testMode) {
        paymentData.testMode = 'EXTERNAL';
      }

      // Make API call to Peach Payment
      const response = await axios.post(
        '' + this.peachConfig.baseUrl + '/v1/payments',
        new URLSearchParams(paymentData).toString(),
        {
          headers: {
            'Authorization': 'Bearer ' + this.peachConfig.accessToken + '',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const result = response.data;
      const isSuccess = result.result?.code?.match(/^(000\.000\.|000\.100\.1|000\.200)/);

      // Update payment transaction with gateway response
      await this.updatePaymentTransaction(paymentTransactionId, {
        transaction_id: result.id,
        status: isSuccess ? 'completed' : 'failed',
        gateway_response: JSON.stringify(result)
      });

      return {
        success: !!isSuccess,
        transactionId: result.id,
        message: isSuccess ? 'Payment processed successfully'  : result.result.description || 'Payment failed',
        paymentTransactionId
      };

    } catch (error) {
      console.error('Card payment processing error:', error);
      return {
        success: false,
        message: 'Payment processing failed. Please try again.'
      };
    }
  }

  /**
   * Process cash payment (requires manual verification)
   */
  static async processCashPayment(
    applicationId: number,
    amount: number,
    receiptNumber: string,
    receiptImagePath?: string
  ): Promise<{ success: boolean; paymentTransactionId: number; message: string }> {
    try {
      const paymentTransactionId = await this.createPaymentTransaction({
        application_id: applicationId,
        payment_method: 'cash',
        amount: amount,
        currency: 'ZAR',
        status: 'verification_required',
        receipt_number: receiptNumber,
        receipt_image_path: receiptImagePath
      });

      return {
        success: true,
        paymentTransactionId,
        message: 'Cash payment recorded. Awaiting verification by office staff.'
      };
    } catch (error) {
      throw createDatabaseError('Failed to process cash payment', error);
    }
  }

  /**
   * Verify cash payment by office staff
   */
  static async verifyCashPayment(
    transactionId: number,
    verifiedBy: number,
    verificationData: {
      amount_verified: number;
      verification_status: 'approved' | 'rejected';
      verification_notes?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      await executeQuery('START TRANSACTION');

      // Update payment transaction
      const newStatus = verificationData.verification_status === 'approved' ? 'completed' : 'failed';
      await this.updatePaymentTransaction(transactionId, {
        status: newStatus,
        verified_by: verifiedBy,
        verified_at: new Date(),
        verification_notes: verificationData.verification_notes
      });

      // Create verification record
      const verificationQuery = `
        INSERT INTO cash_payment_verifications (
          transaction_id, amount_verified, verified_by, verification_status,
          verification_notes, created_at
        ) EXCLUDED.?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      `;

      await executeQuery(verificationQuery, [
        transactionId,
        verificationData.amount_verified,
        verifiedBy,
        verificationData.verification_status,
        verificationData.verification_notes || null
      ]);

      await executeQuery('COMMIT');

      return {
        success: true,
        message: 'Cash payment ' + verificationData.verification_status + ' successfully'
      };

    } catch (error) {
      await executeQuery('ROLLBACK');
      throw createDatabaseError('Failed to verify cash payment', error);
    }
  }

  /**
   * Update payment transaction
   */
  static async updatePaymentTransaction(
    id: number,
    updates: Partial<PaymentTransaction>
  ): Promise<void> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          fields.push('' + key + ' = ? ');
          values.push(value);
        }
      });

      if (fields.length === 0) return;

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const query = `UPDATE payment_transactions SET ' + fields.join(', ') + ' WHERE id = $1`;
      await executeQuery(query, values);

    } catch (error) {
      throw createDatabaseError('Failed to update payment transaction', error);
    }
  }

  /**
   * Get payment transaction by ID
   */
  static async getPaymentTransaction(id : number): Promise<PaymentTransaction | null> {
    try {
      const query = `SELECT * FROM payment_transactions WHERE id = $1`;
      const result = await executeQuerySingle(query, [id]);
      return result as PaymentTransaction | null;
    } catch (error) {
      throw createDatabaseError('Failed to get payment transaction', error);
    }
  }

  /**
   * Get payment transactions for application
   */
  static async getApplicationPayments(applicationId: number): Promise<PaymentTransaction[]> {
    try {
      const query = `
        SELECT
          application_id,
          payment_amount as amount,
          payment_method,
          payment_reference as transaction_id,
          payment_status as status,
          created_at,
          updated_at
        FROM membership_applications
        WHERE application_id = $1
      `;
      const results = await executeQuery(query, [applicationId]);
      return results as PaymentTransaction[];
    } catch (error) {
      throw createDatabaseError('Failed to get application payments', error);
    }
  }

  /**
   * Get pending cash payments for verification
   */
  static async getPendingCashPayments() : Promise<any[]> {
    try {
      const query = `
        SELECT 
          pt.*,
          ma.first_name,
          ma.last_name,
          ma.email,
          ma.cell_number
        FROM payment_transactions pt
        JOIN membership_applications ma ON pt.application_id = ma.id
        WHERE pt.payment_method = 'cash' 
        AND pt.status = 'verification_required'
        ORDER BY pt.created_at ASC
      `;
      const results = await executeQuery(query);
      return results;
    } catch (error) {
      throw createDatabaseError('Failed to get pending cash payments', error);
    }
  }

  /**
   * Get payment statistics for financial monitoring
   */
  static async getPaymentStatistics(dateFrom?: string, dateTo?: string): Promise<any> {
    try {
      let whereClause = '';
      const params: any[] = [];

      if (dateFrom && dateTo) {
        whereClause = 'WHERE created_at::date BETWEEN $1 AND $2';
        params.push(dateFrom, dateTo);
      }

      const query = `
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
          SUM(CASE WHEN status = 'completed' AND payment_method = 'card' THEN amount ELSE 0 END) as card_revenue,
          SUM(CASE WHEN status = 'completed' AND payment_method = 'cash' THEN amount ELSE 0 END) as cash_revenue,
          COUNT(CASE WHEN status = 'verification_required' THEN 1 END) as pending_verifications,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
          AVG(CASE WHEN status = 'completed' THEN amount END) as average_transaction
        FROM payment_transactions
        ` + whereClause;

      const stats = await executeQuerySingle(query, params);
      return stats;
    } catch (error) {
      throw createDatabaseError('Failed to get payment statistics', error);
    }
  }
}
