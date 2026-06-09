import express from 'express';
import { PaymentService } from '../services/paymentService';
import { MembershipApprovalWorkflow } from '../services/membershipApprovalWorkflow';
import { createDatabaseError } from '../middleware/errorHandler';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
  }
});

// =============================================================================
// Peach Payments Checkout Endpoints
// =============================================================================

/**
 * POST /initiate-checkout
 * Initiates a Peach Payments checkout session and returns the checkoutId
 * for the frontend to render the embedded payment widget.
 */
router.post('/initiate-checkout', async (req, res) => {
  try {
    const { memberId, amount, paymentType, nonce, shopperResultUrl } = req.body;

    if (!amount || !paymentType || !nonce || !shopperResultUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, paymentType, nonce, shopperResultUrl'
      });
    }

    // memberId can be 0 or null for new application payments (no member yet)
    const resolvedMemberId = memberId ? parseInt(memberId) : null;

    // Pass request host so the service can build the webhook notification URL
    const requestHost = req.get('host') || '';

    const result = await PaymentService.initiateCheckout(
      resolvedMemberId,
      parseFloat(amount),
      paymentType,
      nonce,
      shopperResultUrl,
      undefined,     // merchantTransactionId (auto-generated)
      requestHost    // for webhook notificationUrl construction
    );

    res.json(result);
  } catch (error) {
    const dbError = createDatabaseError('Failed to initiate checkout', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

/**
 * GET /verify-payment/:checkoutId
 * Verifies the payment status after the checkout widget completes.
 * Called by the frontend after the shopper returns from the payment flow.
 */
router.get('/verify-payment/:checkoutId', async (req, res) => {
  try {
    const { checkoutId } = req.params;

    if (!checkoutId) {
      return res.status(400).json({
        success: false,
        message: 'Missing checkoutId parameter'
      });
    }

    const result = await PaymentService.verifyPayment(checkoutId);
    res.json(result);
  } catch (error) {
    const dbError = createDatabaseError('Failed to verify payment', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

/**
 * POST /webhook/peach
 * Receives asynchronous payment notifications from Peach Payments.
 * This endpoint should be publicly accessible (no auth).
 */
router.post('/webhook/peach', async (req, res) => {
  try {
    console.log('📨 Peach Payments webhook received');
    const result = await PaymentService.handleWebhook(req.body);

    // Always respond 200 to acknowledge receipt
    res.status(200).json(result);
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(200).json({ success: false, message: 'Webhook processing error' });
  }
});

// =============================================================================
// Server-to-Server Card Payment Endpoints
// =============================================================================

/**
 * POST /process-card-payment
 * Process a card payment directly via S2S. The frontend sends card details
 * (number, holder, expiry, CVV) and this endpoint forwards them to Peach.
 */
router.post('/process-card-payment', async (req, res) => {
  try {
    const { memberId, amount, paymentType, cardNumber, cardHolder, expiryMonth, expiryYear, cvv } = req.body;

    if (!amount || !paymentType || !cardNumber || !cardHolder || !expiryMonth || !expiryYear || !cvv) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, paymentType, cardNumber, cardHolder, expiryMonth, expiryYear, cvv'
      });
    }

    // Basic card number validation (13-19 digits)
    const cleanCard = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleanCard)) {
      return res.status(400).json({ success: false, message: 'Invalid card number' });
    }

    // CVV validation (3-4 digits)
    if (!/^\d{3,4}$/.test(cvv)) {
      return res.status(400).json({ success: false, message: 'Invalid CVV' });
    }

    const resolvedMemberId = memberId ? parseInt(memberId) : null;

    const result = await PaymentService.processCardPayment(
      resolvedMemberId,
      parseFloat(amount),
      paymentType,
      {
        cardNumber: cleanCard,
        cardHolder,
        expiryMonth,
        expiryYear,
        cvv,
      }
    );

    res.json(result);
  } catch (error) {
    const dbError = createDatabaseError('Failed to process card payment', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

/**
 * GET /payment-status/:paymentId
 * Check the status of a payment after 3DS redirect completion.
 */
router.get('/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'Missing paymentId parameter' });
    }

    // Look up the transaction ID from the payment record
    const payment = await require('../config/database').executeQuerySingle(
      `SELECT gateway_transaction_id FROM payments WHERE payment_id = $1`,
      [parseInt(paymentId)]
    );

    if (!payment || !payment.gateway_transaction_id) {
      return res.status(404).json({ success: false, message: 'Payment not found or no transaction ID' });
    }

    const result = await PaymentService.getPaymentStatus(
      payment.gateway_transaction_id,
      parseInt(paymentId)
    );

    res.json(result);
  } catch (error) {
    const dbError = createDatabaseError('Failed to check payment status', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

// =============================================================================
// Cash Payment Endpoints
// =============================================================================

/**
 * POST /cash-payment
 * Process cash payment with optional receipt upload.
 */
router.post('/cash-payment', upload.single('receipt'), async (req, res) => {
  try {
    const { memberId, amount, paymentType, receiptNumber, verificationNotes } = req.body;

    if (!memberId || !amount || !paymentType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: memberId, amount, paymentType'
      });
    }

    const result = await PaymentService.processCashPayment(
      parseInt(memberId),
      parseFloat(amount),
      paymentType,
      receiptNumber,
      verificationNotes
    );

    res.json(result);
  } catch (error) {
    const dbError = createDatabaseError('Failed to process cash payment', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

/**
 * POST /verify-cash-payment/:paymentId
 * Verify cash payment (Admin only).
 */
router.post('/verify-cash-payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { verifiedBy, amountVerified, verificationStatus, verificationNotes } = req.body;

    if (!verifiedBy || !amountVerified || !verificationStatus) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: verifiedBy, amountVerified, verificationStatus'
      });
    }

    const result = await PaymentService.verifyCashPayment(
      parseInt(paymentId),
      parseInt(verifiedBy),
      {
        amount_verified: parseFloat(amountVerified),
        verification_status: verificationStatus,
        verification_notes: verificationNotes
      }
    );

    res.json(result);
  } catch (error) {
    const dbError = createDatabaseError('Failed to verify cash payment', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

/**
 * GET /pending-cash-payments
 * Get pending cash payments for admin verification dashboard.
 */
router.get('/pending-cash-payments', async (req, res) => {
  try {
    const pendingPayments = await PaymentService.getPendingCashPayments();
    res.json({ success: true, data: pendingPayments, count: pendingPayments.length });
  } catch (error) {
    const dbError = createDatabaseError('Failed to get pending cash payments', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

// =============================================================================
// Reporting & Monitoring Endpoints
// =============================================================================

/**
 * GET /statistics
 * Get payment statistics for financial monitoring.
 */
router.get('/statistics', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const stats = await PaymentService.getPaymentStatistics(dateFrom as string, dateTo as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    const dbError = createDatabaseError('Failed to get payment statistics', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

/**
 * GET /monitoring/dashboard
 * Get financial monitoring dashboard data.
 */
router.get('/monitoring/dashboard', async (req, res) => {
  try {
    const { date } = req.query;
    const monitoringData = await MembershipApprovalWorkflow.getFinancialMonitoringData(date as string);
    res.json({ success: true, data: monitoringData });
  } catch (error) {
    const dbError = createDatabaseError('Failed to get financial monitoring data', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

/**
 * GET /reports/financial
 * Generate financial report.
 */
router.get('/reports/financial', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ success: false, message: 'Date range required: dateFrom and dateTo' });
    }
    const report = await MembershipApprovalWorkflow.generateFinancialReport(dateFrom as string, dateTo as string);
    res.json({ success: true, data: report });
  } catch (error) {
    const dbError = createDatabaseError('Failed to generate financial report', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

// =============================================================================
// Approval Workflow Endpoints
// =============================================================================

router.get('/approval-status/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const status = await MembershipApprovalWorkflow.checkApprovalReadiness(parseInt(applicationId));
    res.json({ success: true, data: status });
  } catch (error) {
    const dbError = createDatabaseError('Failed to check approval readiness', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

router.get('/ready-for-approval', async (req, res) => {
  try {
    const applications = await MembershipApprovalWorkflow.getApplicationsReadyForApproval();
    res.json({ success: true, data: applications, count: applications.length });
  } catch (error) {
    const dbError = createDatabaseError('Failed to get applications ready for approval', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

router.post('/auto-approve', async (req, res) => {
  try {
    const result = await MembershipApprovalWorkflow.processAutoApprovals();
    res.json({ success: true, data: result, message: `Processed ${result.processed} applications, approved ${result.approved}` });
  } catch (error) {
    const dbError = createDatabaseError('Failed to process auto-approvals', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

router.post('/bulk-approve', async (req, res) => {
  try {
    const { applicationIds, approvedBy, adminNotes } = req.body;
    if (!applicationIds || !Array.isArray(applicationIds) || !approvedBy) {
      return res.status(400).json({ success: false, message: 'Missing required fields: applicationIds (array), approvedBy' });
    }
    const result = await MembershipApprovalWorkflow.processBulkApproval(applicationIds, parseInt(approvedBy), adminNotes);
    res.json({ success: true, data: result, message: `Bulk approval completed: ${result.successful} successful, ${result.failed} failed` });
  } catch (error) {
    const dbError = createDatabaseError('Failed to process bulk approval', error);
    res.status(500).json({ success: false, message: dbError.message });
  }
});

export default router;
