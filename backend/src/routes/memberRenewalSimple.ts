import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { executeQuery, executeQuerySingle } from '../config/database';
import { ValidationError, NotFoundError, DatabaseError } from '../middleware/errorHandler';
import { sendSuccess } from '../utils/responseHelpers';
import { CacheInvalidationHooks } from '../services/cacheInvalidationService';
import { PaymentService } from '../services/paymentService';
import { MemberRenewalLogService } from '../services/memberRenewalLogService';

const router = Router();

/**
 * Interface for member renewal data
 */
interface MemberRenewalData {
  member_id: number;
  id_number: string;
  firstname: string;
  surname: string;
  middle_name?: string;
  email?: string;
  cell_number?: string;
  landline_number?: string;
  residential_address?: string;
  postal_address?: string;
  ward_code?: string;
  membership_number?: string;
  membership_type?: string;
  date_joined?: string;
  last_payment_date?: string;
  expiry_date?: string;
  status_id?: number;
  status_name?: string;
  province_code?: string;
  province_name?: string;
  district_code?: string;
  district_name?: string;
  municipality_code?: string;
  municipality_name?: string;
  ward_name?: string;
  voting_station_name?: string;
}

/**
 * Interface for proof of payment file
 */
interface ProofOfPaymentData {
  filename: string;
  mime_type: string;
  file_size: number;
  file_data: string;
}

/**
 * Interface for renewal payment data
 */
interface RenewalPaymentData {
  id_number: string;
  payment_method: 'Card' | 'Cash' | 'EFT' | 'Mobile' | 'Other';
  payment_reference?: string;
  amount_paid: number;
  shopperResultUrl?: string;
  proof_of_payment?: ProofOfPaymentData;
  updated_member_data?: {
    email?: string;
    cell_number?: string;
    landline_number?: string;
    residential_address?: string;
    postal_address?: string;
    ward_code?: string;
  };
}

/**
 * Validation schema for ID number
 */
const idNumberSchema = Joi.object({
  idNumber: Joi.string().pattern(/^\d{13}$/).required()
    .messages({
      'string.pattern.base': 'ID number must be exactly 13 digits',
      'any.required': 'ID number is required'
    })
});

/**
 * Validation schema for renewal processing
 */
const renewalProcessSchema = Joi.object({
  id_number: Joi.string().pattern(/^\d{13}$/).required()
    .messages({
      'string.pattern.base': 'ID number must be exactly 13 digits',
      'any.required': 'ID number is required'
    }),
  payment_method: Joi.string().valid('Card', 'Cash', 'EFT', 'Mobile', 'Other').required()
    .messages({
      'any.only': 'Payment method must be one of: Card, Cash, EFT, Mobile, Other',
      'any.required': 'Payment method is required'
    }),
  payment_reference: Joi.string().max(100).allow('').optional(),
  amount_paid: Joi.number().min(0).required()
    .messages({
      'number.min': 'Amount paid must be a positive number',
      'any.required': 'Amount paid is required'
    }),
  shopperResultUrl: Joi.string().allow('').optional(),
  proof_of_payment: Joi.object({
    filename: Joi.string().required(),
    mime_type: Joi.string().valid('image/jpeg', 'image/png', 'image/jpg', 'application/pdf').required(),
    file_size: Joi.number().max(10 * 1024 * 1024).required(),
    file_data: Joi.string().required(),
  }).optional(),
  updated_member_data: Joi.object({
    email: Joi.string().email().max(255).allow('').optional(),
    cell_number: Joi.string().max(20).allow('').optional(),
    landline_number: Joi.string().max(20).allow('').optional(),
    residential_address: Joi.string().max(500).allow('').optional(),
    postal_address: Joi.string().max(500).allow('').optional(),
    ward_code: Joi.string().max(20).allow('').optional()
  }).optional()
}).unknown(true);

/**
 * GET /api/v1/renewals/member/:idNumber
 * Retrieve member data for renewal by ID number
 */
router.get('/member/:idNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate ID number
    const { error } = idNumberSchema.validate(req.params);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { idNumber } = req.params;

    // Query member data with ALL relevant information for renewal
    const query = `
      SELECT
        -- Core member fields
        m.member_id, m.id_number, m.firstname, m.surname, m.middle_name,
        m.date_of_birth, m.age,

        -- Demographic information
        m.gender_id, g.gender_name,
        m.race_id, r.race_name,
        m.citizenship_id, c.citizenship_name,
        m.language_id, l.language_name,

        -- Contact information
        m.email, m.cell_number, m.landline_number, m.alternative_contact,
        m.residential_address, m.postal_address,

        -- Geographic information
        m.ward_code, w.ward_name, w.ward_number,
        m.voting_district_code, vd.voting_district_name,
        m.voting_station_id, vs.station_name as voting_station_name, vs.station_code as voting_station_code,
        m.province_code, m.province_name,
        m.district_code, m.district_name,
        m.municipality_code, m.municipality_name,

        -- Professional information
        m.occupation_id, o.occupation_name, oc.category_name as occupation_category,
        m.qualification_id, q.qualification_name,

        -- Voter information
        m.voter_status_id, vst.status_name as voter_status_name,
        m.voter_registration_number, m.voter_registration_date, m.voter_verified_at,

        -- Membership information (primary from members_consolidated, fallback to memberships)
        m.membership_type, m.application_id,
        COALESCE(m.membership_number, ms.membership_number, 'EFF' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || m.member_id::TEXT) as membership_number,
        COALESCE(m.date_joined, ms.date_joined, m.created_at::DATE) as date_joined,
        COALESCE(m.last_payment_date, ms.last_payment_date) as last_payment_date,
        COALESCE(m.expiry_date, ms.expiry_date) as expiry_date,
        COALESCE(m.membership_status_id, ms.status_id, 1) as status_id,
        mst.status_name as membership_status_name,
        COALESCE(m.subscription_type_id, ms.subscription_type_id) as subscription_type_id,
        COALESCE(st.subscription_name, 'Standard Annual') as subscription_name,
        COALESCE(m.membership_amount, ms.membership_amount, 10.00) as membership_amount,

        -- Timestamps
        m.created_at as member_created_at, m.updated_at as member_updated_at,
        ms.created_at as membership_created_at, ms.updated_at as membership_updated_at

      FROM members_consolidated m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      LEFT JOIN membership_statuses mst ON COALESCE(m.membership_status_id, ms.status_id, 1) = mst.status_id
      LEFT JOIN subscription_types st ON COALESCE(m.subscription_type_id, ms.subscription_type_id) = st.subscription_type_id

      -- Lookup tables
      LEFT JOIN genders g ON m.gender_id = g.gender_id
      LEFT JOIN races r ON m.race_id = r.race_id
      LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
      LEFT JOIN languages l ON m.language_id = l.language_id
      LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
      LEFT JOIN occupation_categories oc ON o.category_id = oc.category_id
      LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
      LEFT JOIN voter_statuses vst ON m.voter_status_id = vst.status_id

      -- Geographic tables
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
      LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
      LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON m.province_code = p.province_code

      WHERE m.id_number = $1
    `;

    const memberData = await executeQuerySingle<MemberRenewalData>(query, [idNumber]);

    if (!memberData) {
      throw new NotFoundError(`Member with ID number ${idNumber} not found`);
    }

    // Return member data for renewal
    sendSuccess(res, {
      member: memberData,
      renewal_eligible: true,
      message: 'Member data retrieved successfully for renewal'
    }, 'Member data retrieved for renewal');

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/renewals/process
 * Process membership renewal with payment
 * PUBLIC ENDPOINT - No authentication required for self-service renewals
 */
router.post('/process', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(`🔄 Processing self-service renewal...`);

    // Validate request body
    const { error, value } = renewalProcessSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const {
      id_number,
      payment_method,
      payment_reference,
      amount_paid,
      updated_member_data
    } = value as RenewalPaymentData;

    // Step 1: Get member information
    const memberQuery = `
      SELECT member_id, id_number, firstname, surname, membership_number, expiry_date, membership_status_id
      FROM members_consolidated
      WHERE id_number = $1
    `;
    const member = await executeQuerySingle<any>(memberQuery, [id_number]);

    if (!member) {
      throw new NotFoundError(`Member with ID number ${id_number} not found`);
    }

    // =========================================================================
    // Card Payment → Process via Peach Payments S2S or Checkout
    // =========================================================================
    if (payment_method === 'Card' && !payment_reference) {
      console.log(`💳 Processing card payment for member ${member.member_id}`);

      // Check if card details are provided (S2S flow)
      const { cardNumber, cardHolder, expiryMonth, expiryYear, cvv } = req.body;

      if (cardNumber && cardHolder && expiryMonth && expiryYear && cvv) {
        // S2S Direct Card Payment
        const merchantTransactionId = `REN-${Date.now()}-${member.member_id}`;

        const cardResult = await PaymentService.processCardPayment(
          member.member_id,
          amount_paid,
          'Renewal',
          { cardNumber, cardHolder, expiryMonth, expiryYear, cvv },
          merchantTransactionId
        );

        // Store pending member data update in payment description
        if (updated_member_data && cardResult.paymentId) {
          await executeQuery(
            `UPDATE payments SET description = $1 WHERE payment_id = $2`,
            [JSON.stringify({ updated_member_data, id_number }), cardResult.paymentId]
          );
        }

        // Handle 3DS redirect
        if (cardResult.redirectUrl) {
          sendSuccess(res, {
            requires_payment: true,
            redirectUrl: cardResult.redirectUrl,
            paymentId: cardResult.paymentId,
            transactionId: cardResult.transactionId,
          }, '3D Secure authentication required');
          return;
        }

        if (cardResult.success) {
          // Calculate renewal dates (24 months = 730 days)
          const currentDate = new Date();
          const lastPaymentDate = currentDate.toISOString().split('T')[0];
          const expiryDate = new Date(currentDate);
          expiryDate.setDate(expiryDate.getDate() + 730);
          const newExpiryDate = expiryDate.toISOString().split('T')[0];

          // Apply member contact data updates and renewal dates
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let idx = 1;

          if (updated_member_data) {
            if (updated_member_data.email !== undefined && updated_member_data.email !== '') {
              updateFields.push(`email = $${idx++}`);
              updateValues.push(updated_member_data.email);
            }
            if (updated_member_data.cell_number !== undefined && updated_member_data.cell_number !== '') {
              updateFields.push(`cell_number = $${idx++}`);
              updateValues.push(updated_member_data.cell_number);
            }
            if (updated_member_data.landline_number !== undefined && updated_member_data.landline_number !== '') {
              updateFields.push(`landline_number = $${idx++}`);
              updateValues.push(updated_member_data.landline_number);
            }
            if (updated_member_data.residential_address !== undefined && updated_member_data.residential_address !== '') {
              updateFields.push(`residential_address = $${idx++}`);
              updateValues.push(updated_member_data.residential_address);
            }
            if (updated_member_data.postal_address !== undefined && updated_member_data.postal_address !== '') {
              updateFields.push(`postal_address = $${idx++}`);
              updateValues.push(updated_member_data.postal_address);
            }
            if (updated_member_data.ward_code !== undefined && updated_member_data.ward_code !== '') {
              updateFields.push(`ward_code = $${idx++}`);
              updateValues.push(updated_member_data.ward_code);
            }
          }

          updateFields.push(`last_payment_date = $${idx++}`);
          updateValues.push(lastPaymentDate);
          updateFields.push(`expiry_date = $${idx++}`);
          updateValues.push(newExpiryDate);
          updateFields.push(`membership_status_id = $${idx++}`);
          updateValues.push(1);
          updateFields.push(`payment_status = $${idx++}`);
          updateValues.push('Completed');
          updateFields.push(`payment_method = $${idx++}`);
          updateValues.push('Card');
          updateFields.push(`payment_reference = $${idx++}`);
          updateValues.push(cardResult.transactionId || merchantTransactionId);
          updateFields.push(`membership_number = COALESCE(membership_number, 'EFF' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || member_id::TEXT)`);
          updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
          updateValues.push(member.member_id);

          await executeQuery(
            `UPDATE members_consolidated SET ${updateFields.join(', ')} WHERE member_id = $${idx}`,
            updateValues
          );
          console.log(`✅ Updated members_consolidated for member ${member.member_id} via card renewal (Active, Completed)`);

          // Invalidate caches
          try {
            await CacheInvalidationHooks.onMemberChange('update', member.member_id);
          } catch (cacheError) {
            console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
          }

          // Log renewal to member_renewal_log
          try {
            const memberInfo = await executeQuerySingle<any>(
              `SELECT province_code, province_name, district_code, municipality_code, ward_code FROM members_consolidated WHERE member_id = $1`,
              [member.member_id]
            );

            await MemberRenewalLogService.logRenewal({
              member_id: member.member_id,
              renewal_year: new Date().getFullYear(),
              renewal_type: 'Annual',
              previous_expiry_date: member.expiry_date || undefined,
              new_expiry_date: newExpiryDate,
              amount_paid,
              payment_method: 'Card',
              payment_reference: cardResult.transactionId || merchantTransactionId,
              payment_status: 'Completed',
              province_code: memberInfo?.province_code || undefined,
              province_name: memberInfo?.province_name || undefined,
              district_code: memberInfo?.district_code || undefined,
              municipality_code: memberInfo?.municipality_code || undefined,
              ward_code: memberInfo?.ward_code || undefined,
              source: 'online',
              source_reference: `PAY-${cardResult.paymentId}`,
              notes: 'Self-service renewal via card payment',
              metadata: { payment_id: cardResult.paymentId, transaction_id: cardResult.transactionId, last_payment_date: lastPaymentDate }
            });
          } catch (logErr) {
            console.warn('⚠️ Failed to log renewal to member_renewal_log:', logErr);
          }

          // Get updated member data
          const updatedMember = await executeQuerySingle<any>(
            `SELECT m.member_id, m.id_number, m.firstname, m.surname, m.email, m.cell_number,
                    m.membership_number, m.date_joined, m.last_payment_date, m.expiry_date,
                    m.membership_status_id, mst.status_name
             FROM members_consolidated m
             LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
             WHERE m.member_id = $1`,
            [member.member_id]
          );

          console.log(`🎉 Renewal completed via card for member ${member.member_id} → ${newExpiryDate}`);

          sendSuccess(res, {
            member: updatedMember,
            payment: {
              payment_id: cardResult.paymentId,
              payment_reference: cardResult.transactionId || merchantTransactionId,
              amount_paid,
              payment_method: 'Card',
              payment_date: lastPaymentDate,
            },
            renewal_details: {
              last_payment_date: lastPaymentDate,
              expiry_date: newExpiryDate,
              renewal_period: '24 months',
              days_added: 730
            }
          }, 'Membership renewed successfully for 24 months');
        } else {
          sendSuccess(res, {
            success: false,
            message: cardResult.message
          }, cardResult.message, 400);
        }
        return;
      }

      // Fallback: Checkout V2 widget flow (legacy)
      const nonce = crypto.randomBytes(16).toString('hex');
      const shopperResultUrl = req.body.shopperResultUrl || `${req.protocol}://${req.get('host')}/api/v1/renewals/payment-result`;
      const merchantTransactionId = `REN-${Date.now()}-${member.member_id}`;

      const checkoutResult = await PaymentService.initiateCheckout(
        member.member_id,
        amount_paid,
        'Renewal',
        nonce,
        shopperResultUrl,
        merchantTransactionId
      );

      if (!checkoutResult.success) {
        return sendSuccess(res, {
          success: false,
          requires_payment: true,
          message: checkoutResult.message
        }, 'Payment initiation failed', 400);
      }

      // Store pending renewal data in description for later processing
      if (updated_member_data && checkoutResult.paymentId) {
        await executeQuery(
          `UPDATE payments SET description = $1 WHERE payment_id = $2`,
          [JSON.stringify({ updated_member_data, id_number }), checkoutResult.paymentId]
        );
      }

      // Return checkout details for the frontend widget
      sendSuccess(res, {
        requires_payment: true,
        checkout: {
          checkoutId: checkoutResult.checkoutId,
          checkoutJsUrl: checkoutResult.checkoutJsUrl,
          paymentId: checkoutResult.paymentId,
        },
        member: {
          member_id: member.member_id,
          firstname: member.firstname,
          surname: member.surname,
          membership_number: member.membership_number,
        }
      }, 'Checkout session created. Complete payment using the checkout widget.');
      return;
    }

    // =========================================================================
    // Non-Card Payments (Cash, EFT, Mobile) → Direct renewal processing
    // =========================================================================
    const currentDate = new Date();
    const lastPaymentDate = currentDate.toISOString().split('T')[0];
    const expiryDate = new Date(currentDate);
    expiryDate.setDate(expiryDate.getDate() + 730);
    const newExpiryDate = expiryDate.toISOString().split('T')[0];

    console.log(`📅 Renewal dates: payment=${lastPaymentDate}, expiry=${newExpiryDate}`);

    const paymentReferenceValue = payment_reference || `REN-${Date.now()}-${member.member_id}`;

    // Update member contact info and membership dates
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updated_member_data) {
      if (updated_member_data.email !== undefined && updated_member_data.email !== '') {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(updated_member_data.email);
      }
      if (updated_member_data.cell_number !== undefined && updated_member_data.cell_number !== '') {
        updateFields.push(`cell_number = $${paramIndex++}`);
        updateValues.push(updated_member_data.cell_number);
      }
      if (updated_member_data.landline_number !== undefined && updated_member_data.landline_number !== '') {
        updateFields.push(`landline_number = $${paramIndex++}`);
        updateValues.push(updated_member_data.landline_number);
      }
      if (updated_member_data.residential_address !== undefined && updated_member_data.residential_address !== '') {
        updateFields.push(`residential_address = $${paramIndex++}`);
        updateValues.push(updated_member_data.residential_address);
      }
      if (updated_member_data.postal_address !== undefined && updated_member_data.postal_address !== '') {
        updateFields.push(`postal_address = $${paramIndex++}`);
        updateValues.push(updated_member_data.postal_address);
      }
      if (updated_member_data.ward_code !== undefined && updated_member_data.ward_code !== '') {
        updateFields.push(`ward_code = $${paramIndex++}`);
        updateValues.push(updated_member_data.ward_code);
      }
    }

    updateFields.push(`last_payment_date = $${paramIndex++}`);
    updateValues.push(lastPaymentDate);
    updateFields.push(`expiry_date = $${paramIndex++}`);
    updateValues.push(newExpiryDate);
    updateFields.push(`membership_status_id = $${paramIndex++}`);
    updateValues.push(1);
    updateFields.push(`payment_status = $${paramIndex++}`);
    updateValues.push('Completed');
    updateFields.push(`payment_method = $${paramIndex++}`);
    updateValues.push(payment_method);
    updateFields.push(`payment_reference = $${paramIndex++}`);
    updateValues.push(paymentReferenceValue);
    updateFields.push(`membership_number = COALESCE(membership_number, 'EFF' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || member_id::TEXT)`);
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(member.member_id);

    const updateConsolidatedQuery = `
      UPDATE members_consolidated
      SET ${updateFields.join(', ')}
      WHERE member_id = $${paramIndex}
    `;

    await executeQuery(updateConsolidatedQuery, updateValues);
    console.log(`✅ Updated members_consolidated for member ${member.member_id} (Active, Completed)`);

    // Process Proof of Payment document if provided
    let documentId: number | null = null;
    const pop = (value as any).proof_of_payment;
    if (pop && pop.file_data) {
      try {
        const uploadDir = path.join(process.cwd(), 'uploads', 'documents', 'proof-of-payment');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Clean base64 data
        const base64Data = pop.file_data.replace(/^data:[^;]+;base64,/, '');
        const fileBuffer = Buffer.from(base64Data, 'base64');
        const sanitizedOriginalName = path.basename(pop.filename || 'receipt.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const storedFilename = `pop-renewal-${member.member_id}-${Date.now()}-${sanitizedOriginalName}`;
        const relativeFilePath = path.join('uploads', 'documents', 'proof-of-payment', storedFilename);
        const absoluteFilePath = path.join(uploadDir, storedFilename);

        fs.writeFileSync(absoluteFilePath, fileBuffer);

        const insertDocQuery = `
          INSERT INTO documents (
            member_id, document_type, original_filename, stored_filename,
            file_path, file_size, mime_type, status, uploaded_by, uploaded_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING document_id
        `;
        const docResult = await executeQuerySingle<{ document_id: number }>(insertDocQuery, [
          member.member_id,
          'Proof of Payment',
          pop.filename || 'proof_of_payment',
          storedFilename,
          relativeFilePath,
          pop.file_size || fileBuffer.length,
          pop.mime_type || 'image/jpeg',
          0
        ]);

        documentId = docResult?.document_id || null;
        console.log(`✅ Stored Proof of Payment for member renewal ${member.member_id}: document_id = ${documentId}`);
      } catch (docErr) {
        console.error(`⚠️ Failed to store Proof of Payment for member renewal ${member.member_id}:`, docErr);
      }
    }

    // Create or update payment record idempotently
    const existingPayment = await executeQuerySingle<{ payment_id: number }>(
      `SELECT payment_id FROM payments WHERE payment_reference = $1`,
      [paymentReferenceValue]
    );

    let paymentId: number;

    if (existingPayment) {
      paymentId = existingPayment.payment_id;
      await executeQuery(
        `UPDATE payments
         SET payment_status = 'Completed',
             amount = $1,
             payment_method = $2,
             payment_type = 'Renewal',
             payment_date = $3,
             completed_at = CURRENT_TIMESTAMP,
             verification_notes = COALESCE(verification_notes, $4),
             updated_at = CURRENT_TIMESTAMP
         WHERE payment_id = $5`,
        [
          amount_paid,
          payment_method,
          currentDate,
          documentId
            ? `Self-service renewal via member portal. Proof of Payment doc #${documentId} attached.`
            : `Self-service renewal via member portal`,
          paymentId
        ]
      );
      console.log(`✅ Updated existing payment record: payment_id = ${paymentId}`);
    } else {
      const insertPaymentQuery = `
        INSERT INTO payments (
          member_id, membership_id, payment_reference, payment_method,
          payment_type, amount, currency, payment_status,
          payment_date, verification_notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING payment_id
      `;

      const paymentResult = await executeQuerySingle<{ payment_id: number }>(
        insertPaymentQuery,
        [
          member.member_id,
          null,
          paymentReferenceValue,
          payment_method,
          'Renewal',
          amount_paid,
          'ZAR',
          'Completed',
          currentDate,
          documentId
            ? `Self-service renewal via member portal. Proof of Payment doc #${documentId} attached.`
            : `Self-service renewal via member portal`
        ]
      );
      paymentId = paymentResult?.payment_id || 0;
      console.log(`✅ Payment record created: payment_id = ${paymentId}`);
    }

    // Get updated member data
    const updatedMemberQuery = `
      SELECT m.member_id, m.id_number, m.firstname, m.surname, m.email, m.cell_number,
             m.membership_number, m.date_joined, m.last_payment_date, m.expiry_date,
             m.membership_status_id, mst.status_name
      FROM members_consolidated m
      LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
      WHERE m.member_id = $1
    `;
    const updatedMember = await executeQuerySingle<any>(updatedMemberQuery, [member.member_id]);

    // Invalidate caches
    try {
      await CacheInvalidationHooks.onMemberChange('update', member.member_id);
    } catch (cacheError) {
      console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
    }

    // Log renewal to member_renewal_log
    try {
      const memberInfo = await executeQuerySingle<any>(
        `SELECT province_code, province_name, district_code, municipality_code, ward_code FROM members_consolidated WHERE member_id = $1`,
        [member.member_id]
      );

      await MemberRenewalLogService.logRenewal({
        member_id: member.member_id,
        renewal_year: new Date().getFullYear(),
        renewal_type: 'Annual',
        previous_expiry_date: member.expiry_date || undefined,
        new_expiry_date: newExpiryDate,
        amount_paid,
        payment_method,
        payment_reference: paymentReferenceValue,
        payment_status: 'Completed',
        province_code: memberInfo?.province_code || undefined,
        province_name: memberInfo?.province_name || undefined,
        district_code: memberInfo?.district_code || undefined,
        municipality_code: memberInfo?.municipality_code || undefined,
        ward_code: memberInfo?.ward_code || undefined,
        source: 'online',
        source_reference: `PAY-${paymentId}`,
        notes: `Self-service renewal via member portal (${payment_method})`,
        metadata: { payment_id: paymentId, last_payment_date: lastPaymentDate }
      });
    } catch (logErr) {
      console.warn('⚠️ Failed to log renewal to member_renewal_log:', logErr);
    }

    console.log(`🎉 Renewal completed for member ${member.member_id} → ${newExpiryDate}`);

    sendSuccess(res, {
      member: updatedMember,
      payment: {
        payment_id: paymentId,
        payment_reference: paymentReferenceValue,
        amount_paid,
        payment_method,
        payment_date: lastPaymentDate,
        document_id: documentId
      },
      renewal_details: {
        last_payment_date: lastPaymentDate,
        expiry_date: newExpiryDate,
        renewal_period: '24 months',
        days_added: 730
      }
    }, 'Membership renewed successfully for 24 months');

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/renewals/verify-renewal-payment/:checkoutId
 * Verify and complete a card-based renewal payment after Peach Payments checkout.
 */
router.get('/verify-renewal-payment/:checkoutId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { checkoutId } = req.params;

    console.log(`🔍 Verifying renewal payment: checkoutId = ${checkoutId}`);

    const verifyResult = await PaymentService.verifyPayment(checkoutId);

    let updatedMember: any = null;
    let newExpiryDate: string | null = null;
    let lastPaymentDate: string | null = null;

    if (verifyResult.success) {
      // Payment succeeded — PaymentService.verifyPayment already called completeRenewalPayment
      const payment = await executeQuerySingle<any>(
        `SELECT payment_id, member_id, description FROM payments WHERE gateway_reference = $1`,
        [checkoutId]
      );

      if (payment && payment.member_id) {
        const updatedMemberQuery = `
          SELECT m.member_id, m.id_number, m.firstname, m.surname, m.email, m.cell_number,
                 m.membership_number, m.date_joined, m.last_payment_date, m.expiry_date,
                 m.membership_status_id, mst.status_name
          FROM members_consolidated m
          LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
          WHERE m.member_id = $1
        `;
        updatedMember = await executeQuerySingle<any>(updatedMemberQuery, [payment.member_id]);
        if (updatedMember) {
          lastPaymentDate = updatedMember.last_payment_date;
          newExpiryDate = updatedMember.expiry_date;
        }
      }
    }

    sendSuccess(res, {
      payment_verified: verifyResult.success,
      transaction_id: verifyResult.transactionId,
      result_code: verifyResult.resultCode,
      result_description: verifyResult.resultDescription,
      payment_brand: verifyResult.paymentBrand,
      amount: verifyResult.amount,
      message: verifyResult.message,
      member: updatedMember,
      renewal_details: updatedMember ? {
        last_payment_date: lastPaymentDate,
        expiry_date: newExpiryDate,
        renewal_period: '24 months',
        days_added: 730
      } : undefined
    }, verifyResult.message);

  } catch (error) {
    next(error);
  }
});

export default router;

