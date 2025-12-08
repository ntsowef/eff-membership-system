import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { executeQuery, executeQuerySingle } from '../config/database';
import { ValidationError, NotFoundError, DatabaseError } from '../middleware/errorHandler';
import { sendSuccess } from '../utils/responseHelpers';
import { CacheInvalidationHooks } from '../services/cacheInvalidationService';

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
 * Interface for renewal payment data
 */
interface RenewalPaymentData {
  id_number: string;
  payment_method: 'Card' | 'Cash' | 'EFT' | 'Mobile' | 'Other';
  payment_reference?: string;
  amount_paid: number;
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
  payment_reference: Joi.string().max(100).optional(),
  amount_paid: Joi.number().min(0).required()
    .messages({
      'number.min': 'Amount paid must be a positive number',
      'any.required': 'Amount paid is required'
    }),
  updated_member_data: Joi.object({
    email: Joi.string().email().max(255).allow('').optional(),
    cell_number: Joi.string().max(20).allow('').optional(),
    landline_number: Joi.string().max(20).allow('').optional(),
    residential_address: Joi.string().max(500).allow('').optional(),
    postal_address: Joi.string().max(500).allow('').optional(),
    ward_code: Joi.string().max(20).allow('').optional()
  }).optional()
});

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

        -- Membership information
        m.membership_type, m.application_id,
        ms.membership_number, ms.date_joined, ms.last_payment_date,
        ms.expiry_date, ms.status_id, mst.status_name as membership_status_name,
        ms.subscription_type_id, st.subscription_name, ms.membership_amount,

        -- Timestamps
        m.created_at as member_created_at, m.updated_at as member_updated_at,
        ms.created_at as membership_created_at, ms.updated_at as membership_updated_at

      FROM members_consolidated m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id
      LEFT JOIN subscription_types st ON ms.subscription_type_id = st.subscription_type_id

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

    // Step 1: Get member information from members_consolidated (single source of truth)
    const memberQuery = `
      SELECT
        member_id,
        id_number,
        firstname,
        surname,
        membership_number,
        expiry_date,
        membership_status_id
      FROM members_consolidated
      WHERE id_number = $1
    `;

    const member = await executeQuerySingle<any>(memberQuery, [id_number]);

    if (!member) {
      throw new NotFoundError(`Member with ID number ${id_number} not found`);
    }

    // Step 2: Calculate new dates
    const currentDate = new Date();
    const lastPaymentDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Calculate expiry date as 24 months (730 days) from payment date
    const expiryDate = new Date(currentDate);
    expiryDate.setDate(expiryDate.getDate() + 730); // 24 months = 730 days
    const newExpiryDate = expiryDate.toISOString().split('T')[0];

    console.log(`📅 Renewal dates calculated:`);
    console.log(`   Payment date: ${lastPaymentDate}`);
    console.log(`   New expiry date: ${newExpiryDate} (24 months from payment)`);

    // Step 3: Update members_consolidated with contact info AND membership dates
    // This is the single source of truth - no separate memberships table update needed
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    // Only update contact fields that have non-empty values
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

    // Always update membership dates and status
    updateFields.push(`last_payment_date = $${paramIndex++}`);
    updateValues.push(lastPaymentDate);

    updateFields.push(`expiry_date = $${paramIndex++}`);
    updateValues.push(newExpiryDate);

    updateFields.push(`membership_status_id = $${paramIndex++}`);
    updateValues.push(1); // 1 = "Good Standing"

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(member.member_id);

    const updateConsolidatedQuery = `
      UPDATE members_consolidated
      SET ${updateFields.join(', ')}
      WHERE member_id = $${paramIndex}
    `;

    await executeQuery(updateConsolidatedQuery, updateValues);
    console.log(`✅ Updated members_consolidated for member ${member.member_id}:`);
    console.log(`   - Contact fields updated: ${updateFields.length - 4}`);
    console.log(`   - Membership dates updated: last_payment_date, expiry_date`);
    console.log(`   - Status updated: membership_status_id = 1 (Good Standing)`);

    // Step 4: Create payment record for self-service renewal
    const paymentReferenceValue = payment_reference || `REN-${Date.now()}-${member.member_id}`;

    const insertPaymentQuery = `
      INSERT INTO payments (
        member_id,
        membership_id,
        payment_reference,
        payment_method,
        payment_type,
        amount,
        currency,
        payment_status,
        payment_date,
        verification_notes,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING payment_id
    `;

    const verificationNote = `Self-service renewal via member portal`;

    const paymentResult = await executeQuerySingle<{ payment_id: number }>(
      insertPaymentQuery,
      [
        member.member_id,
        null, // membership_id - can be null since members_consolidated is the source of truth
        paymentReferenceValue,
        payment_method,
        'Renewal',
        amount_paid,
        'ZAR',
        'Completed',
        currentDate,
        verificationNote
      ]
    );

    console.log(`✅ Payment record created: payment_id = ${paymentResult?.payment_id}`);

    // Step 5: Get updated member data from members_consolidated
    const updatedMemberQuery = `
      SELECT
        m.member_id,
        m.id_number,
        m.firstname,
        m.surname,
        m.email,
        m.cell_number,
        m.membership_number,
        m.date_joined,
        m.last_payment_date,
        m.expiry_date,
        m.membership_status_id,
        mst.status_name
      FROM members_consolidated m
      LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
      WHERE m.member_id = $1
    `;

    const updatedMember = await executeQuerySingle<any>(updatedMemberQuery, [member.member_id]);

    console.log(`✅ Retrieved updated member data:`);
    console.log(`   - Membership number: ${updatedMember?.membership_number}`);
    console.log(`   - Last payment date: ${updatedMember?.last_payment_date}`);
    console.log(`   - Expiry date: ${updatedMember?.expiry_date}`);
    console.log(`   - Status: ${updatedMember?.status_name}`);

    // Step 6: Invalidate all relevant caches after successful renewal
    console.log(`🔄 Invalidating caches for member ${member.member_id} after renewal...`);
    try {
      await CacheInvalidationHooks.onMemberChange('update', member.member_id);
      console.log(`✅ Cache invalidation completed for member ${member.member_id}`);
    } catch (cacheError) {
      // Log cache invalidation errors but don't fail the renewal
      console.error('⚠️ Cache invalidation error (non-critical):', cacheError);
    }

    console.log(`\n🎉 Renewal completed successfully for member ${member.member_id}`);
    console.log(`   Member: ${updatedMember?.firstname} ${updatedMember?.surname}`);
    console.log(`   Membership: ${updatedMember?.membership_number}`);
    console.log(`   New expiry: ${newExpiryDate} (24 months from ${lastPaymentDate})`);
    console.log(`   Status: ${updatedMember?.status_name}\n`);

    // Return success response
    sendSuccess(res, {
      member: updatedMember,
      payment: {
        payment_id: paymentResult?.payment_id,
        payment_reference: paymentReferenceValue,
        amount_paid,
        payment_method,
        payment_date: lastPaymentDate
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

export default router;

