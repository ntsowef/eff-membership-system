/**
 * Membership Status Service
 * 
 * Handles membership status validation and updates during bulk uploads:
 * 1. Calculate missing expiry dates from last_payment_date
 * 2. Determine correct status based on expiry date
 * 3. Update members with calculated expiry dates and statuses
 * 
 * Business Rules:
 * - Active (1): expiry_date >= CURRENT_DATE
 * - Grace Period (7): expiry_date between CURRENT_DATE - 90 days and CURRENT_DATE
 * - Expired (2): expiry_date < CURRENT_DATE - 90 days
 * - Inactive (6): expiry_date is NULL
 * - Protected statuses (Suspended=3, Cancelled=4, Pending=5) are NOT overridden
 */

import { Pool, PoolClient } from 'pg';
import {
    MembershipStatusId,
    PROTECTED_STATUS_IDS,
    MemberStatusUpdateResult,
    StatusUpdateStats,
    MemberStatusUpdateBatchResult
} from './types';

// Status name mapping for reports
const STATUS_NAMES: Record<number, string> = {
    1: 'Active',
    2: 'Expired',
    3: 'Suspended',
    4: 'Cancelled',
    5: 'Pending',
    6: 'Inactive',
    7: 'Grace Period',
    8: 'Good Standing'
};

// Default subscription duration in months
const DEFAULT_SUBSCRIPTION_MONTHS = 24;

// Subscription type to months mapping (subscription_type_id -> months)
const SUBSCRIPTION_DURATION_MAP: Record<number, number> = {
    1: 12,  // Annual
    2: 24,  // Biennial
    3: 6,   // Semi-annual
    4: 1,   // Monthly
};

// Grace period in days
const GRACE_PERIOD_DAYS = 90;

export class MembershipStatusService {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Calculate expiry date from last_payment_date + subscription duration
     * 
     * @param lastPaymentDate - The date of last payment
     * @param subscriptionTypeId - Optional subscription type ID (defaults to 12 months)
     * @returns Calculated expiry date
     */
    static calculateExpiryDate(lastPaymentDate: Date, subscriptionTypeId?: number | null): Date {
        const months = subscriptionTypeId
            ? SUBSCRIPTION_DURATION_MAP[subscriptionTypeId] || DEFAULT_SUBSCRIPTION_MONTHS
            : DEFAULT_SUBSCRIPTION_MONTHS;

        const expiryDate = new Date(lastPaymentDate);
        expiryDate.setMonth(expiryDate.getMonth() + months);
        return expiryDate;
    }

    /**
     * Determine correct membership status based on expiry date
     * 
     * @param expiryDate - The member's expiry date (null = Inactive)
     * @returns Correct membership status ID
     */
    // Cut-off for the "→ Expired" suspension (inclusive). Until and including
    // this date, members that would normally be classified as Expired are kept
    // in Grace Period instead. Matches the DB trigger in
    // migrations/046_suspend_expired_status_until_2026_11_30.sql
    private static readonly EXPIRED_SUSPEND_UNTIL = new Date('2026-11-30T00:00:00');

    static determineStatus(expiryDate: Date | null): MembershipStatusId {
        if (!expiryDate) {
            return MembershipStatusId.INACTIVE;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0);

        // Active: expiry_date >= today
        if (expiry >= today) {
            return MembershipStatusId.ACTIVE;
        }

        // Calculate grace period boundary (90 days ago)
        const gracePeriodStart = new Date(today);
        gracePeriodStart.setDate(gracePeriodStart.getDate() - GRACE_PERIOD_DAYS);

        // Grace Period: expiry between (today - 90 days) and today
        if (expiry >= gracePeriodStart) {
            return MembershipStatusId.GRACE_PERIOD;
        }

        // Expired: expiry < (today - 90 days)
        // Suspended until EXPIRED_SUSPEND_UNTIL (inclusive) — keep in Grace Period.
        if (today <= MembershipStatusService.EXPIRED_SUSPEND_UNTIL) {
            return MembershipStatusId.GRACE_PERIOD;
        }
        return MembershipStatusId.EXPIRED;
    }

    /**
     * Check if a status is protected and should not be automatically updated
     * 
     * @param statusId - The membership status ID
     * @returns True if status is protected
     */
    static isProtectedStatus(statusId: number | null): boolean {
        if (statusId === null) return false;
        return PROTECTED_STATUS_IDS.includes(statusId);
    }

    /**
     * Get status name from ID
     */
    static getStatusName(statusId: number | null): string {
        if (statusId === null) return 'Unknown';
        return STATUS_NAMES[statusId] || 'Unknown';
    }

    /**
     * Process status updates for members found in the upload
     * Only processes members identified as existing in the database
     * 
     * @param memberIds - Array of member IDs to process
     * @returns Batch result with all updates and statistics
     */
    async processStatusUpdates(memberIds: number[]): Promise<MemberStatusUpdateBatchResult> {
        console.log(`\n📊 MEMBERSHIP STATUS SERVICE: Processing ${memberIds.length} members for status updates...`);

        const stats: StatusUpdateStats = {
            total_processed: 0,
            expiry_dates_calculated: 0,
            statuses_changed: 0,
            protected_skipped: 0,
            no_payment_date_skipped: 0,
            already_correct_skipped: 0,
            errors: 0
        };

        const updates: MemberStatusUpdateResult[] = [];

        if (memberIds.length === 0) {
            console.log('   ⏭️  No members to process');
            return { updates, stats };
        }

        // Fetch current member data
        const members = await this.fetchMembersForStatusUpdate(memberIds);
        console.log(`   📋 Fetched ${members.length} members from database`);

        // Process each member
        for (const member of members) {
            stats.total_processed++;
            const result = await this.processSingleMember(member);
            updates.push(result);

            // Update statistics
            if (!result.success) {
                stats.errors++;
            } else if (result.skip_reason === 'protected_status') {
                stats.protected_skipped++;
            } else if (result.skip_reason === 'no_payment_date') {
                stats.no_payment_date_skipped++;
            } else if (result.skip_reason === 'already_correct') {
                stats.already_correct_skipped++;
            } else {
                if (result.expiry_date_calculated) {
                    stats.expiry_dates_calculated++;
                }
                if (result.status_changed) {
                    stats.statuses_changed++;
                }
            }
        }

        console.log(`   ✅ Status updates complete:`);
        console.log(`      - Expiry dates calculated: ${stats.expiry_dates_calculated}`);
        console.log(`      - Statuses changed: ${stats.statuses_changed}`);
        console.log(`      - Protected skipped: ${stats.protected_skipped}`);
        console.log(`      - No payment date: ${stats.no_payment_date_skipped}`);
        console.log(`      - Already correct: ${stats.already_correct_skipped}`);
        console.log(`      - Errors: ${stats.errors}`);

        return { updates, stats };
    }

    /**
     * Fetch members with all required fields for status update
     */
    private async fetchMembersForStatusUpdate(memberIds: number[]): Promise<any[]> {
        const query = `
      SELECT
        m.member_id,
        m.id_number,
        m.firstname,
        m.surname,
        m.expiry_date,
        m.last_payment_date,
        m.membership_status_id,
        m.subscription_type_id
      FROM members_consolidated m
      WHERE m.member_id = ANY($1)
    `;

        const result = await this.pool.query(query, [memberIds]);
        return result.rows;
    }

    /**
     * Process a single member for status update
     */
    private async processSingleMember(member: any): Promise<MemberStatusUpdateResult> {
        const result: MemberStatusUpdateResult = {
            id_number: member.id_number,
            member_id: member.member_id,
            member_name: `${member.firstname || ''} ${member.surname || ''}`.trim(),
            success: true,
            expiry_date_calculated: false,
            previous_expiry_date: member.expiry_date,
            new_expiry_date: member.expiry_date,
            status_changed: false,
            previous_status_id: member.membership_status_id,
            previous_status_name: MembershipStatusService.getStatusName(member.membership_status_id),
            new_status_id: member.membership_status_id,
            new_status_name: MembershipStatusService.getStatusName(member.membership_status_id)
        };

        try {
            // Check for protected status
            if (MembershipStatusService.isProtectedStatus(member.membership_status_id)) {
                result.skip_reason = 'protected_status';
                return result;
            }

            let expiryDate = member.expiry_date ? new Date(member.expiry_date) : null;
            let needsUpdate = false;

            // Calculate expiry date if missing but has last_payment_date
            if (!expiryDate && member.last_payment_date) {
                expiryDate = MembershipStatusService.calculateExpiryDate(
                    new Date(member.last_payment_date),
                    member.subscription_type_id
                );
                result.expiry_date_calculated = true;
                result.new_expiry_date = expiryDate;
                needsUpdate = true;
            } else if (!expiryDate && !member.last_payment_date) {
                result.skip_reason = 'no_payment_date';
                return result;
            }

            // Determine correct status
            const correctStatusId = MembershipStatusService.determineStatus(expiryDate);

            // Check if status needs to change
            if (member.membership_status_id !== correctStatusId) {
                result.status_changed = true;
                result.new_status_id = correctStatusId;
                result.new_status_name = MembershipStatusService.getStatusName(correctStatusId);
                needsUpdate = true;
            }

            // If no changes needed
            if (!needsUpdate) {
                result.skip_reason = 'already_correct';
                return result;
            }

            // Perform database update
            await this.updateMemberStatus(
                member.member_id,
                result.expiry_date_calculated ? expiryDate : null,
                result.status_changed ? correctStatusId : null
            );

            return result;
        } catch (error: any) {
            result.success = false;
            result.error = error.message;
            return result;
        }
    }

    /**
     * Update member status in database
     */
    private async updateMemberStatus(
        memberId: number,
        newExpiryDate: Date | null,
        newStatusId: number | null
    ): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (newExpiryDate !== null) {
            updates.push(`expiry_date = $${paramIndex++}`);
            values.push(newExpiryDate);
        }

        if (newStatusId !== null) {
            updates.push(`membership_status_id = $${paramIndex++}`);
            values.push(newStatusId);
        }

        if (updates.length === 0) {
            return;
        }

        updates.push(`updated_at = NOW()`);
        values.push(memberId);

        const query = `
      UPDATE members_consolidated
      SET ${updates.join(', ')}
      WHERE member_id = $${paramIndex}
    `;

        await this.pool.query(query, values);
    }

    /**
     * Static method for orchestrator to call
     */
    static async processStatusUpdatesBatch(
        memberIds: number[],
        pool: Pool
    ): Promise<MemberStatusUpdateBatchResult> {
        const service = new MembershipStatusService(pool);
        return service.processStatusUpdates(memberIds);
    }
}
