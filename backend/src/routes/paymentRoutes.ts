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
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

/**
 * Process card payment through Peach Payment Gateway
 */
router.post('/card-payment', async (req, res) => {
  try {
    const { applicationId, amount, cardData } = req.body;

    // Validate required fields
    if (!applicationId || !amount || !cardData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: applicationId, amount, cardData'
      });
    }

    // Validate card data
    const requiredCardFields = ['number', 'expiryMonth', 'expiryYear', 'cvv', 'holder'];
    for (const field of requiredCardFields) {
      if (!cardData[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required card field: ${field}`
        });
      }
    }

    const result = await PaymentService.processCardPayment(applicationId, amount, cardData);

    res.json(result);

  } catch (error) {
    const dbError = createDatabaseError('Failed to process card payment', error);
    res.status(500).json({
      success: false,
      message: dbError.message
    });
  }
});

/**
 * Process cash payment with receipt upload
 */
router.post('/cash-payment', upload.single('receipt'), async (req, res) => {
  try {
    const { applicationId, amount, receiptNumber } = req.body;

    if (!applicationId || !amount || !receiptNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: applicationId, amount, receiptNumber'
      });
    }

    const receiptImagePath = req.file ? req.file.path : undefined;

    const result = await PaymentService.processCashPayment(
      parseInt(applicationId),
      parseFloat(amount),
      receiptNumber,
      receiptImagePath
    );

    // Notify admin of verification requirement
    await MembershipApprovalWorkflow.notifyPaymentVerificationRequired(parseInt(applicationId));

    res.json(result);

  } catch (error) {
    const dbError = createDatabaseError('Failed to process cash payment', error);
    res.status(500).json({
      success: false,
      message: dbError.message
    });
  }
});

/**
 * Verify cash payment (Admin only)
 */
router.post('/verify-cash-payment/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { verifiedBy, amountVerified, verificationStatus, verificationNotes } = req.body;

    if (!verifiedBy || !amountVerified || !verificationStatus) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: verifiedBy, amountVerified, verificationStatus'
      });
    }

    const result = await PaymentService.verifyCashPayment(
      parseInt(transactionId),
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
    res.status(500).json({
      success: false,
      message: dbError.message
    });
  }
});

/**
 * Get pending cash payments for verification
 */
router.get('/pending-cash-payments', async (req, res) => {
  try {
    const pendingPayments = await PaymentService.getPendingCashPayments();
    
    res.json({
      success: true,
      data: pendingPayments,
      count: pendingPayments.length
    });

  } catch (error) {
    const dbError = createDatabaseError('Failed to get pending cash payments', error);
    res.status(500).json({
      success: false,
      message: dbError.message
    });
  }
});

/**
 * Get payment transactions for an application
 */
router.get('/application/:applicationId/payments', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const payments = await PaymentService.getApplicationPayments(parseInt(applicationId));
    
    res.json({
      success: true,
      data: payments
    });

  } catch (error) {
    const dbError = createDatabaseError('Failed to get application payments', error);
    res.status(500).json({
      success: false,
      message: dbError.message
    });
  }
});

/**
 * Get payment statistics for financial monitoring
 */
router.get('/statistics', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const stats = await PaymentService.getPaymentStatistics(
      dateFrom as string,
      dateTo as string
    );
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    const dbError = createDatabaseError('Failed to get payment statistics', error);
    res.status(500).json({
      success: false,
      message: dbError.message
    });
  }
});

/**
 * Get financial monitoring dashboard data
 */
router.get('/monitoring/dashboard', async (req, res) => {
  try {
    const { date } = req.query;
    
    const monitoringData = await MembershipApprovalWorkflow.getFinancialMonitoringData(date as string);
    
    res.json({
      success: true,
      data: monitoringData
    });

  } catch (error) {
    const dbError = createDatabaseError('Failed to get financial monitoring data', error);
    res.status(500).json({
      success: false,
      message: dbError.message
    });
  }
});

/**
 * Generate financial report
 */
router.get('/reports/financial', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        message: 'Date range required: dateFrom and dateTo'
      });
    }
    
    const report = await MembershipApprovalWorkflow.generateFinancialReport(
      dateFrom as string,
      dateTo as string
    );
    
    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    const dbError = createDatabaseError('Failed to generate financial report', error);
    res.status(500).json({
      success: false,
      message: dbError.message
    });
  }
});

/**
 * Check application approval readiness
 */
router.get('/approval-status/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    const status = await MembershipApprovalWorkflow.checkApprovalReadiness(parseInt(applicationId));
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    const dbError = createDatabaseError('Failed to check approval readiness', error);
    res.status(500).json({
      success: false,
      message: dbError.message
    });
  }
});

/**
 * Get applications ready for approval
 */
router.get('/ready-for-approval', async (req, res) => {
  try {
    const applications = await MembershipApprovalWorkflow.getApplicationsReadyForApproval();
    
    res.json({
      success: true,
      data: applications,
      count: applications.length
    });

  } catch (error) {
    const dbError = createDatabaseError('Failed to get applications ready for approval', error);
    res.status(500).json({
      success: false,
      message: dbError.message
    });
  }
});

/**
 * Process auto-approvals for qualifying applications
 */
router.post('/auto-approve', async (req, res) => {
  try {
    const result = await MembershipApprovalWorkflow.processAutoApprovals();
    
    res.json({
      success: true,
      data: result,
      message: `Processed ${result.processed} applications, approved ${result.approved}`
    });

  } catch (error) {
    const dbError = createDatabaseError('Failed to process auto-approvals', error);
    res.status(500).json({
      success: false,
      message: dbError.message
    });
  }
});

/**
 * Bulk approve applications that are ready
 */
router.post('/bulk-approve', async (req, res) => {
  try {
    const { applicationIds, approvedBy, adminNotes } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds) || !approvedBy) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: applicationIds (array), approvedBy'
      });
    }

    const result = await MembershipApprovalWorkflow.processBulkApproval(
      applicationIds,
      parseInt(approvedBy),
      adminNotes
    );

    res.json({
      success: true,
      data: result,
      message: `Bulk approval completed: ${result.successful} successful, ${result.failed} failed`
    });

  } catch (error) {
    const dbError = createDatabaseError('Failed to process bulk approval', error);
    res.status(500).json({
      success: false,
      message: dbError.message
    });
  }
});

export default router;
