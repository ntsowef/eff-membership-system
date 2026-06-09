import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import axios from 'axios';
import { emailService } from './emailService';

// =============================================================================
// Peach Payments Checkout Integration Service
// =============================================================================

export interface PeachPaymentConfig {
  entityId: string;
  accessToken: string;
  clientId: string;
  clientSecret: string;
  merchantId: string;
  testMode: boolean;
  baseUrl: string;
  authUrl: string;
  cardUrl: string;
  checkoutJsUrl: string;
  notificationUrl: string;
}

export interface PaymentTransaction {
  payment_id?: number;
  member_id?: number;
  membership_id?: number;
  payment_reference: string;
  payment_method: string;
  payment_provider?: string;
  amount: number;
  currency: string;
  payment_status: string;
  gateway_transaction_id?: string;
  gateway_reference?: string;
  gateway_response?: string;
  payment_date?: Date;
  processed_at?: Date;
  completed_at?: Date;
  payment_type: string;
  description?: string;
  receipt_number?: string;
  verified_by?: number;
  verified_at?: Date;
  verification_notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CheckoutInitResult {
  success: boolean;
  checkoutId?: string;
  checkoutJsUrl?: string;
  paymentId?: number;
  message: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  transactionId?: string;
  resultCode?: string;
  resultDescription?: string;
  paymentBrand?: string;
  amount?: string;
  message: string;
}

export interface CardPaymentRequest {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface CardPaymentResult {
  success: boolean;
  paymentId?: number;
  transactionId?: string;
  resultCode?: string;
  resultDescription?: string;
  paymentBrand?: string;
  amount?: string;
  redirectUrl?: string;
  message: string;
}

export class PaymentService {
  private static peachConfig: PeachPaymentConfig = {
    entityId: process.env.PEACH_ENTITY_ID || '',
    accessToken: process.env.PEACH_ACCESS_TOKEN || '',
    clientId: process.env.PEACH_CLIENT_ID || '',
    clientSecret: process.env.PEACH_CLIENT_SECRET || '',
    merchantId: process.env.PEACH_MERCHANT_ID || '',
    testMode: process.env.PEACH_TEST_MODE === 'true' || process.env.NODE_ENV !== 'production',
    baseUrl: process.env.PEACH_BASE_URL || 'https://testsecure.peachpayments.com',
    authUrl: process.env.PEACH_AUTH_URL || 'https://sandbox-dashboard.peachpayments.com',
    cardUrl: process.env.PEACH_CARD_URL || (process.env.PEACH_TEST_MODE === 'true'
      ? 'https://sandbox-card.peachpayments.com/v1/payments'
      : 'https://card.peachpayments.com/v1/payments'),
    checkoutJsUrl: process.env.PEACH_TEST_MODE === 'true'
      ? 'https://sandbox-checkout.peachpayments.com/js/checkout.js'
      : 'https://checkout.peachpayments.com/js/checkout.js',
    notificationUrl: process.env.PEACH_NOTIFICATION_URL || '',
  };

  // Cached OAuth token
  private static cachedToken: string | null = null;
  private static tokenExpiresAt: number = 0;

  // ---------------------------------------------------------------------------
  // OAuth Token Management
  // ---------------------------------------------------------------------------

  /**
   * Get a valid OAuth access token. Generates a new one if expired.
   * Uses client_id + client_secret + merchant_id to authenticate.
   */
  private static async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.cachedToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedToken;
    }

    // If we have client credentials, generate a fresh token
    if (this.peachConfig.clientId && this.peachConfig.clientSecret) {
      try {
        const tokenUrl = `${this.peachConfig.authUrl}/api/oauth/token`;
        console.log(`🔑 Requesting OAuth token from ${tokenUrl}`);

        const response = await axios.post(tokenUrl, {
          clientId: this.peachConfig.clientId,
          clientSecret: this.peachConfig.clientSecret,
          merchantId: this.peachConfig.merchantId,
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        });

        const data = response.data;
        if (data.access_token) {
          this.cachedToken = data.access_token;
          // Default to 1 hour if expires_in not provided
          const expiresInMs = (data.expires_in || 3600) * 1000;
          this.tokenExpiresAt = Date.now() + expiresInMs;
          console.log(`✅ OAuth token obtained (expires in ${data.expires_in || 3600}s)`);
          return this.cachedToken!;
        }
      } catch (error: any) {
        console.error('❌ OAuth token generation failed:', error?.response?.data || error.message);
      }
    }

    // Fallback to static access token from .env
    if (this.peachConfig.accessToken) {
      console.log('🔄 Using static PEACH_ACCESS_TOKEN from .env');
      return this.peachConfig.accessToken;
    }

    throw new Error('No Peach Payments access token available. Check PEACH_CLIENT_ID/SECRET or PEACH_ACCESS_TOKEN in .env');
  }

  /**
   * Build the webhook notification URL.
   * Uses PEACH_NOTIFICATION_URL from .env, or constructs one from the request context.
   */
  private static getNotificationUrl(requestHost?: string): string {
    if (this.peachConfig.notificationUrl) {
      return this.peachConfig.notificationUrl;
    }
    // Construct from host (production fallback)
    if (requestHost) {
      const protocol = requestHost.includes('localhost') ? 'http' : 'https';
      return `${protocol}://${requestHost}/api/v1/payments/webhook/peach`;
    }
    return '';
  }

  // ---------------------------------------------------------------------------
  // Peach Payments Checkout V2 Flow
  // ---------------------------------------------------------------------------

  /**
   * Step 1: Initiate a Peach Payments checkout session (V2 API).
   * Creates a payment record in the DB and returns a checkoutId for the frontend widget.
   */
  static async initiateCheckout(
    memberId: number | null,
    amount: number,
    paymentType: string,
    nonce: string,
    shopperResultUrl: string,
    merchantTransactionId?: string,
    requestHost?: string
  ): Promise<CheckoutInitResult> {
    try {
      const paymentRef = merchantTransactionId || `PP-${Date.now()}-${memberId || 'APP'}`;

      // Create payment record with Pending status
      const insertQuery = `
        INSERT INTO payments (
          member_id, payment_reference, payment_method, payment_provider,
          amount, currency, payment_status, payment_type, description,
          payment_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING payment_id
      `;

      const paymentResult = await executeQuerySingle<{ payment_id: number }>(insertQuery, [
        memberId,
        paymentRef,
        'Card',
        'PeachPayments',
        amount,
        'ZAR',
        'Pending',
        paymentType,
        `Peach Payments checkout for ${paymentType}`
      ]);

      const paymentId = paymentResult?.payment_id;
      if (!paymentId) {
        return { success: false, message: 'Failed to create payment record' };
      }

      // Get access token
      const token = await this.getAccessToken();

      // Build the checkout payload (V2 JSON format)
      const checkoutPayload: any = {
        'authentication.entityId': this.peachConfig.entityId,
        merchantTransactionId: paymentRef,
        amount: amount.toFixed(2),
        currency: 'ZAR',
        paymentType: 'DB',
        nonce: nonce,
        shopperResultUrl: shopperResultUrl,
      };

      // Add webhook notification URL
      const notificationUrl = this.getNotificationUrl(requestHost);
      if (notificationUrl) {
        checkoutPayload.notificationUrl = notificationUrl;
        console.log(`📡 Webhook notification URL: ${notificationUrl}`);
      }

      if (this.peachConfig.testMode) {
        checkoutPayload.testMode = 'EXTERNAL';
      }

      console.log(`🔄 Initiating Peach V2 checkout for member ${memberId}, amount: R${amount.toFixed(2)}`);

      const response = await axios.post(
        `${this.peachConfig.baseUrl}/v2/checkout`,
        checkoutPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Origin': shopperResultUrl ? new URL(shopperResultUrl).origin : 'https://effmemberportal.org',
            'Referer': shopperResultUrl || 'https://effmemberportal.org/',
          },
          timeout: 15000,
        }
      );

      const result = response.data;
      const checkoutId = result.id || result.checkoutId;

      if (!checkoutId) {
        console.error('❌ Peach V2 checkout initiation failed:', result);
        await this.updatePaymentStatus(paymentId, 'Failed', JSON.stringify(result));
        return { success: false, message: result?.result?.description || 'Checkout initiation failed' };
      }

      // Update payment record with gateway reference
      await executeQuery(
        `UPDATE payments SET gateway_reference = $1, gateway_response = $2, updated_at = CURRENT_TIMESTAMP WHERE payment_id = $3`,
        [checkoutId, JSON.stringify(result), paymentId]
      );

      console.log(`✅ Peach V2 checkout initiated: checkoutId = ${checkoutId}`);

      return {
        success: true,
        checkoutId,
        checkoutJsUrl: this.peachConfig.checkoutJsUrl,
        paymentId,
        message: 'Checkout initiated successfully'
      };
    } catch (error: any) {
      console.error('❌ Peach V2 checkout initiation error:', error?.response?.data || error.message);
      return {
        success: false,
        message: error?.response?.data?.result?.description || error?.response?.data?.message || 'Payment gateway error. Please try again.'
      };
    }
  }

  /**
   * Step 2: Verify the payment status after the checkout widget completes.
   * Called by the frontend after the shopper returns from the payment flow.
   */
  static async verifyPayment(checkoutId: string): Promise<PaymentVerifyResult> {
    try {
      const token = await this.getAccessToken();

      // Try V2 status endpoint first
      let result: any;
      try {
        const response = await axios.get(
          `${this.peachConfig.baseUrl}/v2/checkout/${checkoutId}/payment`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 15000,
          }
        );
        result = response.data;
      } catch (v2Error: any) {
        // Fallback to V1 endpoint with Bearer token
        console.log('🔄 V2 verify failed, trying V1 fallback...');
        const queryParams = new URLSearchParams({
          'authentication.entityId': this.peachConfig.entityId,
        });
        const response = await axios.get(
          `${this.peachConfig.baseUrl}/v1/checkouts/${checkoutId}/payment?${queryParams.toString()}`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 15000,
          }
        );
        result = response.data;
      }

      const resultCode = result.result?.code || '';
      const isSuccess = /^(000\.000\.|000\.100\.1|000\.200)/.test(resultCode);

      console.log(`🔍 Payment verification for ${checkoutId}: code=${resultCode}, success=${isSuccess}`);

      // Update payment record in DB
      const paymentRecord = await executeQuerySingle<{ payment_id: number }>(
        `SELECT payment_id FROM payments WHERE gateway_reference = $1`,
        [checkoutId]
      );

      if (paymentRecord) {
        const newStatus = isSuccess ? 'Completed' : 'Failed';
        await executeQuery(
          `UPDATE payments
           SET payment_status = $1,
               gateway_transaction_id = $2,
               gateway_response = $3,
               processed_at = CURRENT_TIMESTAMP,
               completed_at = CASE WHEN $1 = 'Completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
               updated_at = CURRENT_TIMESTAMP
           WHERE payment_id = $4`,
          [newStatus, result.id, JSON.stringify(result), paymentRecord.payment_id]
        );
        console.log(`✅ Payment ${paymentRecord.payment_id} updated to ${newStatus}`);
      }

      return {
        success: isSuccess,
        transactionId: result.id,
        resultCode,
        resultDescription: result.result?.description,
        paymentBrand: result.paymentBrand,
        amount: result.amount,
        message: isSuccess ? 'Payment completed successfully' : (result.result?.description || 'Payment failed')
      };
    } catch (error: any) {
      console.error('❌ Payment verification error:', error?.response?.data || error.message);
      return {
        success: false,
        message: 'Unable to verify payment status. Please contact support.'
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Webhook handler for asynchronous payment notifications
  // ---------------------------------------------------------------------------

  /**
   * Process webhook notification from Peach Payments.
   * Supports both V1 (flat payload) and V2 (nested payload.payload) formats.
   */
  static async handleWebhook(payload: any): Promise<{ success: boolean; message: string }> {
    try {
      // V2 webhooks wrap the data in a 'payload' key; V1 sends it flat
      const data = payload.payload || payload;
      const webhookType = payload.type || 'payment';

      const id = data.id;
      const paymentResult = data.result;
      const merchantTransactionId = data.merchantTransactionId;
      const resultCode = paymentResult?.code || '';
      const isSuccess = /^(000\.000\.|000\.100\.1|000\.200)/.test(resultCode);

      console.log(`📨 Webhook received [${webhookType}]: txn=${id}, ref=${merchantTransactionId}, code=${resultCode}, success=${isSuccess}`);

      // Find payment by reference or gateway_reference
      const payment = await executeQuerySingle<{ payment_id: number; member_id: number; payment_type: string }>(
        `SELECT payment_id, member_id, payment_type FROM payments WHERE payment_reference = $1 OR gateway_reference = $2`,
        [merchantTransactionId, id]
      );

      if (!payment) {
        // Also try lookup by the checkout ID stored in gateway_reference
        const checkoutId = data.ndc || data.checkout?.id;
        if (checkoutId) {
          const fallback = await executeQuerySingle<{ payment_id: number; member_id: number; payment_type: string }>(
            `SELECT payment_id, member_id, payment_type FROM payments WHERE gateway_reference = $1`,
            [checkoutId]
          );
          if (!fallback) {
            console.warn(`⚠️ Webhook: no payment found for ref=${merchantTransactionId}, txn=${id}, checkout=${checkoutId}`);
            return { success: false, message: 'Payment record not found' };
          }
          // Continue with the fallback payment record
          return this.processWebhookPayment(fallback, isSuccess, id, data);
        }

        console.warn(`⚠️ Webhook: no payment found for ref ${merchantTransactionId}`);
        return { success: false, message: 'Payment record not found' };
      }

      return this.processWebhookPayment(payment, isSuccess, id, data);
    } catch (error: any) {
      console.error('❌ Webhook processing error:', error.message);
      return { success: false, message: 'Webhook processing error' };
    }
  }

  /**
   * Process the payment update from a webhook notification.
   */
  private static async processWebhookPayment(
    payment: { payment_id: number; member_id: number; payment_type: string },
    isSuccess: boolean,
    transactionId: string,
    fullPayload: any
  ): Promise<{ success: boolean; message: string }> {
    const newStatus = isSuccess ? 'Completed' : 'Failed';

    await executeQuery(
      `UPDATE payments
       SET payment_status = $1,
           gateway_transaction_id = $2,
           gateway_response = $3,
           processed_at = CURRENT_TIMESTAMP,
           completed_at = CASE WHEN $1 = 'Completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
           updated_at = CURRENT_TIMESTAMP
       WHERE payment_id = $4`,
      [newStatus, transactionId, JSON.stringify(fullPayload), payment.payment_id]
    );

    // If payment succeeded, process based on type
    if (isSuccess) {
      if (payment.payment_type === 'Renewal') {
        await this.completeRenewalPayment(payment.member_id, payment.payment_id);
      }
      // Application payments are picked up by the approval workflow
    }

    console.log(`✅ Webhook processed: payment ${payment.payment_id} → ${newStatus}`);
    return { success: true, message: `Payment ${newStatus.toLowerCase()}` };
  }

  // ---------------------------------------------------------------------------
  // Renewal-specific helpers
  // ---------------------------------------------------------------------------

  /**
   * After a successful card payment for renewal, update the member's dates and status.
   */
  private static async completeRenewalPayment(memberId: number, paymentId: number): Promise<void> {
    try {
      const currentDate = new Date();
      const lastPaymentDate = currentDate.toISOString().split('T')[0];
      const expiryDate = new Date(currentDate);
      expiryDate.setDate(expiryDate.getDate() + 730); // 24 months
      const newExpiryDate = expiryDate.toISOString().split('T')[0];

      await executeQuery(
        `UPDATE members_consolidated
         SET last_payment_date = $1,
             expiry_date = $2,
             membership_status_id = 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE member_id = $3`,
        [lastPaymentDate, newExpiryDate, memberId]
      );

      console.log(`✅ Renewal completed for member ${memberId}: expiry → ${newExpiryDate}`);
    } catch (error) {
      console.error(`❌ Failed to complete renewal for member ${memberId}:`, error);
    }
  }

  // ---------------------------------------------------------------------------
  // Cash payment flow (unchanged)
  // ---------------------------------------------------------------------------

  /**
   * Process cash payment (requires manual verification by admin).
   */
  static async processCashPayment(
    memberId: number,
    amount: number,
    paymentType: string,
    receiptNumber?: string,
    verificationNotes?: string
  ): Promise<{ success: boolean; paymentId: number; message: string }> {
    try {
      const paymentRef = receiptNumber || `CASH-${Date.now()}-${memberId}`;

      const insertQuery = `
        INSERT INTO payments (
          member_id, payment_reference, payment_method, amount, currency,
          payment_status, payment_type, description, verification_notes,
          payment_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING payment_id
      `;

      const result = await executeQuerySingle<{ payment_id: number }>(insertQuery, [
        memberId,
        paymentRef,
        'Cash',
        amount,
        'ZAR',
        'Pending',
        paymentType,
        `Cash payment for ${paymentType}`,
        verificationNotes || 'Awaiting admin verification'
      ]);

      return {
        success: true,
        paymentId: result!.payment_id,
        message: 'Cash payment recorded. Awaiting verification by office staff.'
      };
    } catch (error) {
      throw createDatabaseError('Failed to process cash payment', error);
    }
  }

  /**
   * Verify cash payment by office staff (Admin only).
   */
  static async verifyCashPayment(
    paymentId: number,
    verifiedBy: number,
    verificationData: {
      amount_verified: number;
      verification_status: 'approved' | 'rejected';
      verification_notes?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const newStatus = verificationData.verification_status === 'approved' ? 'Completed' : 'Failed';

      await executeQuery(
        `UPDATE payments
         SET payment_status = $1,
             verified_by = $2,
             verified_at = CURRENT_TIMESTAMP,
             verification_notes = $3,
             completed_at = CASE WHEN $1 = 'Completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
             updated_at = CURRENT_TIMESTAMP
         WHERE payment_id = $4`,
        [newStatus, verifiedBy, verificationData.verification_notes || null, paymentId]
      );

      // If approved, complete the renewal
      if (verificationData.verification_status === 'approved') {
        const payment = await executeQuerySingle<{ member_id: number; payment_type: string }>(
          `SELECT member_id, payment_type FROM payments WHERE payment_id = $1`,
          [paymentId]
        );

        if (payment && payment.payment_type === 'Renewal') {
          await this.completeRenewalPayment(payment.member_id, paymentId);
        }
      }

      return {
        success: true,
        message: `Cash payment ${verificationData.verification_status} successfully`
      };
    } catch (error) {
      throw createDatabaseError('Failed to verify cash payment', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Query helpers
  // ---------------------------------------------------------------------------

  /**
   * Get pending cash payments for admin verification dashboard.
   */
  static async getPendingCashPayments(): Promise<any[]> {
    try {
      const query = `
        SELECT
          p.payment_id, p.member_id, p.payment_reference, p.amount, p.currency,
          p.payment_status, p.payment_type, p.verification_notes,
          p.payment_date, p.created_at,
          m.firstname, m.surname, m.email, m.cell_number, m.membership_number
        FROM payments p
        LEFT JOIN members_consolidated m ON p.member_id = m.member_id
        WHERE p.payment_method = 'Cash'
          AND p.payment_status = 'Pending'
        ORDER BY p.created_at ASC
      `;
      return await executeQuery(query);
    } catch (error) {
      throw createDatabaseError('Failed to get pending cash payments', error);
    }
  }

  /**
   * Get payment history for a member.
   */
  static async getMemberPayments(memberId: number): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM payments
        WHERE member_id = $1
        ORDER BY created_at DESC
      `;
      return await executeQuery(query, [memberId]);
    } catch (error) {
      throw createDatabaseError('Failed to get member payments', error);
    }
  }

  /**
   * Get payment statistics for financial monitoring.
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
          SUM(CASE WHEN payment_status = 'Completed' THEN amount ELSE 0 END) as total_revenue,
          SUM(CASE WHEN payment_status = 'Completed' AND payment_method = 'Card' THEN amount ELSE 0 END) as card_revenue,
          SUM(CASE WHEN payment_status = 'Completed' AND payment_method = 'Cash' THEN amount ELSE 0 END) as cash_revenue,
          COUNT(CASE WHEN payment_status = 'Pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN payment_status = 'Failed' THEN 1 END) as failed_transactions,
          AVG(CASE WHEN payment_status = 'Completed' THEN amount END) as average_transaction
        FROM payments
        ${whereClause}
      `;

      return await executeQuerySingle(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get payment statistics', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Server-to-Server Card Payment (Direct card data)
  // ---------------------------------------------------------------------------

  /**
   * Detect card brand from BIN (first 6 digits).
   */
  private static detectCardBrand(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'VISA';
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'MASTER';
    return 'VISA'; // default fallback
  }

  /**
   * Process a card payment directly via Peach Payments Server-to-Server API.
   * Collects card details from the frontend and POSTs to Peach's /v1/payments endpoint.
   * Handles synchronous results and 3D Secure redirect responses.
   */
  static async processCardPayment(
    memberId: number | null,
    amount: number,
    paymentType: string,
    card: CardPaymentRequest,
    merchantTransactionId?: string
  ): Promise<CardPaymentResult> {
    try {
      const paymentRef = merchantTransactionId || `PP-${Date.now()}-${memberId || 'APP'}`;

      // Create payment record with Pending status
      const insertQuery = `
        INSERT INTO payments (
          member_id, payment_reference, payment_method, payment_provider,
          amount, currency, payment_status, payment_type, description,
          payment_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING payment_id
      `;

      const paymentResult = await executeQuerySingle<{ payment_id: number }>(insertQuery, [
        memberId,
        paymentRef,
        'Card',
        'PeachPayments',
        amount,
        'ZAR',
        'Pending',
        paymentType,
        `Peach Payments S2S card payment for ${paymentType}`
      ]);

      const paymentId = paymentResult?.payment_id;
      if (!paymentId) {
        return { success: false, message: 'Failed to create payment record' };
      }

      // S2S card endpoint uses the static bearer token, NOT OAuth
      const token = this.peachConfig.accessToken;

      // Detect card brand from BIN
      const paymentBrand = this.detectCardBrand(card.cardNumber);

      // Build form-encoded payload (Peach S2S requires application/x-www-form-urlencoded)
      const baseResultUrl = process.env.PEACH_SHOPPER_RESULT_URL || 'https://effmemberportal.org/payment-result';
      const shopperResultUrl = `${baseResultUrl}?paymentId=${paymentId}`;
      const formData = new URLSearchParams({
        'entityId': this.peachConfig.entityId,
        'amount': amount.toFixed(2),
        'currency': 'ZAR',
        'paymentBrand': paymentBrand,
        'paymentType': 'DB',
        'merchantTransactionId': paymentRef,
        'shopperResultUrl': shopperResultUrl,
        'card.number': card.cardNumber.replace(/\s/g, ''),
        'card.holder': card.cardHolder,
        'card.expiryMonth': card.expiryMonth.padStart(2, '0'),
        'card.expiryYear': card.expiryYear,
        'card.cvv': card.cvv,
      });

      // Add testMode for sandbox
      if (this.peachConfig.testMode) {
        formData.append('testMode', 'EXTERNAL');
      }

      const cleanedCard = card.cardNumber.replace(/\s/g, '');
      const maskedCard = cleanedCard.substring(0, 6) + '****' + cleanedCard.substring(cleanedCard.length - 4);

      console.log(`\n${'='.repeat(70)}`);
      console.log(`💳 S2S CARD PAYMENT REQUEST`);
      console.log(`${'='.repeat(70)}`);
      console.log(`🌐 URL: ${this.peachConfig.cardUrl}`);
      console.log(`🔑 Auth: Bearer ${token.substring(0, 20)}...`);
      console.log(`📦 Payload:`);
      console.log(`   entityId:              ${this.peachConfig.entityId}`);
      console.log(`   amount:                ${amount.toFixed(2)}`);
      console.log(`   currency:              ZAR`);
      console.log(`   paymentBrand:          ${paymentBrand}`);
      console.log(`   paymentType:           DB`);
      console.log(`   merchantTransactionId: ${paymentRef}`);
      console.log(`   card.number:           ${maskedCard}`);
      console.log(`   card.holder:           ${card.cardHolder}`);
      console.log(`   card.expiryMonth:      ${card.expiryMonth.padStart(2, '0')}`);
      console.log(`   card.expiryYear:       ${card.expiryYear}`);
      console.log(`   card.cvv:              ***`);
      console.log(`   testMode:              ${this.peachConfig.testMode ? 'EXTERNAL' : 'N/A (production)'}`);
      console.log(`${'='.repeat(70)}\n`);

      const response = await axios.post(
        this.peachConfig.cardUrl,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      const result = response.data;
      const resultCode = result.result?.code || '';
      const transactionId = result.id;

      console.log(`\n${'='.repeat(70)}`);
      console.log(`📨 S2S CARD PAYMENT RESPONSE`);
      console.log(`${'='.repeat(70)}`);
      console.log(`   HTTP Status:   ${response.status}`);
      console.log(`   Transaction:   ${transactionId}`);
      console.log(`   Result Code:   ${resultCode}`);
      console.log(`   Description:   ${result.result?.description}`);
      console.log(`   Payment Brand: ${result.paymentBrand || 'N/A'}`);
      console.log(`   3DS Redirect:  ${result.redirect ? result.redirect.url : 'None'}`);
      console.log(`   Full Response: ${JSON.stringify(result, null, 2)}`);
      console.log(`${'='.repeat(70)}\n`);

      // Check for 3DS redirect
      if (result.redirect) {
        console.log(`🔐 3D Secure redirect required for payment ${paymentId}`);
        await executeQuery(
          `UPDATE payments SET gateway_transaction_id = $1, gateway_reference = $2, gateway_response = $3, updated_at = CURRENT_TIMESTAMP WHERE payment_id = $4`,
          [transactionId, transactionId, JSON.stringify(result), paymentId]
        );

        return {
          success: false,
          paymentId,
          transactionId,
          resultCode,
          resultDescription: result.result?.description,
          redirectUrl: result.redirect.url,
          message: '3D Secure authentication required'
        };
      }

      // Check success (synchronous result)
      const isSuccess = /^(000\.000\.|000\.100\.1|000\.200)/.test(resultCode);

      // Update payment record
      const newStatus = isSuccess ? 'Completed' : 'Failed';
      await executeQuery(
        `UPDATE payments
         SET payment_status = $1,
             gateway_transaction_id = $2,
             gateway_reference = $3,
             gateway_response = $4,
             processed_at = CURRENT_TIMESTAMP,
             completed_at = CASE WHEN $1 = 'Completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
             updated_at = CURRENT_TIMESTAMP
         WHERE payment_id = $5`,
        [newStatus, transactionId, transactionId, JSON.stringify(result), paymentId]
      );

      if (isSuccess) {
        console.log(`✅ S2S card payment successful: txn=${transactionId}, code=${resultCode}`);

        // If this is a renewal, complete the renewal
        if (paymentType === 'Renewal' && memberId) {
          await this.completeRenewalPayment(memberId, paymentId);
        }

        // Send admin notification email (non-blocking)
        emailService.sendPaymentNotification({
          transactionId: transactionId || '',
          amount: amount.toFixed(2),
          paymentBrand: result.paymentBrand || paymentBrand,
          paymentType,
          memberName: card.cardHolder,
          memberId,
          resultCode,
          status: 'success',
        }).catch(err => console.error('⚠️ Failed to send payment notification email:', err));
      } else {
        console.log(`❌ S2S card payment failed: code=${resultCode}, desc=${result.result?.description}`);
      }

      return {
        success: isSuccess,
        paymentId,
        transactionId,
        resultCode,
        resultDescription: result.result?.description,
        paymentBrand: result.paymentBrand || paymentBrand,
        amount: result.amount,
        message: isSuccess ? 'Payment completed successfully' : (result.result?.description || 'Payment failed')
      };
    } catch (error: any) {
      console.error('❌ S2S card payment error:', JSON.stringify(error?.response?.data, null, 2) || error.message);
      const errorDesc = error?.response?.data?.result?.description
        || error?.response?.data?.message
        || 'Payment processing failed. Please check your card details and try again.';
      return {
        success: false,
        message: errorDesc
      };
    }
  }

  /**
   * Check the status of a payment by its transaction ID (for 3DS redirect completion).
   * Uses GET /v1/payments/{id} on the Peach card endpoint.
   */
  static async getPaymentStatus(transactionId: string, paymentId: number): Promise<CardPaymentResult> {
    try {
      const token = this.peachConfig.accessToken;

      // The status endpoint is the same base but with the txn ID appended
      const statusUrl = `${this.peachConfig.cardUrl}/${transactionId}`;
      const queryParams = new URLSearchParams({
        'entityId': this.peachConfig.entityId,
      });

      const response = await axios.get(`${statusUrl}?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 15000,
      });

      const result = response.data;
      const resultCode = result.result?.code || '';
      const isSuccess = /^(000\.000\.|000\.100\.1|000\.200)/.test(resultCode);

      // Update payment record
      const newStatus = isSuccess ? 'Completed' : 'Failed';
      await executeQuery(
        `UPDATE payments
         SET payment_status = $1,
             gateway_response = $2,
             processed_at = CURRENT_TIMESTAMP,
             completed_at = CASE WHEN $1 = 'Completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
             updated_at = CURRENT_TIMESTAMP
         WHERE payment_id = $3`,
        [newStatus, JSON.stringify(result), paymentId]
      );

      // Complete renewal if applicable
      if (isSuccess) {
        const payment = await executeQuerySingle<{ member_id: number; payment_type: string }>(
          `SELECT member_id, payment_type FROM payments WHERE payment_id = $1`,
          [paymentId]
        );
        if (payment && payment.payment_type === 'Renewal' && payment.member_id) {
          await this.completeRenewalPayment(payment.member_id, paymentId);
        }
      }

      return {
        success: isSuccess,
        paymentId,
        transactionId,
        resultCode,
        resultDescription: result.result?.description,
        paymentBrand: result.paymentBrand,
        amount: result.amount,
        message: isSuccess ? 'Payment completed successfully' : (result.result?.description || 'Payment failed')
      };
    } catch (error: any) {
      console.error('❌ Payment status check error:', error?.response?.data || error.message);
      return {
        success: false,
        message: 'Unable to verify payment status. Please contact support.'
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private static async updatePaymentStatus(
    paymentId: number,
    status: string,
    gatewayResponse?: string
  ): Promise<void> {
    await executeQuery(
      `UPDATE payments SET payment_status = $1, gateway_response = $2, updated_at = CURRENT_TIMESTAMP WHERE payment_id = $3`,
      [status, gatewayResponse || null, paymentId]
    );
  }
}
