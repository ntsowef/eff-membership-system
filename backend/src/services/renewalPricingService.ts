import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
export interface RenewalPricingTier {
  tier_id: number;
  tier_name: string;
  base_renewal_fee: number;
  early_bird_discount_percent: number;
  early_bird_days: number;
  late_fee_percent: number;
  grace_period_days: number;
  is_active: boolean;
}

export interface MemberRenewalPricing {
  member_id: number;
  base_amount: number;
  early_bird_discount: number;
  late_fee: number;
  final_amount: number;
  pricing_tier: string;
  days_until_expiry: number;
  is_early_bird: boolean;
  is_late: boolean;
  discount_reason?: string;
}

export interface RenewalPricingCalculation {
  member_id: number;
  membership_type: string;
  base_renewal_fee: number;
  early_bird_discount: number;
  late_fee: number;
  special_discount: number;
  final_amount: number;
  pricing_breakdown: {
    base_fee: number;
    early_bird_savings: number;
    late_fee_penalty: number;
    special_discounts: number;
    total_due: number;
  };
  payment_deadline: string;
  grace_period_end: string;
}

export class RenewalPricingService {
  // Get renewal pricing tiers
  static async getRenewalPricingTiers(): Promise<RenewalPricingTier[]> {
    try {
      const query = `
        SELECT 
          tier_id,
          tier_name,
          base_renewal_fee,
          early_bird_discount_percent,
          early_bird_days,
          late_fee_percent,
          grace_period_days,
          is_active
        FROM renewal_pricing_tiers 
        WHERE is_active = TRUE 
        ORDER BY base_renewal_fee ASC
      `;
      
      return await executeQuery<RenewalPricingTier>(query);
    } catch (error) {
      // If table doesn't exist, return default tiers
      return this.getDefaultPricingTiers();
    }
  }

  // Get default pricing tiers (fallback)
  static getDefaultPricingTiers(): RenewalPricingTier[] {
    return [
      {
        tier_id: 1,
        tier_name: 'Standard Membership',
        base_renewal_fee: 500.00,
        early_bird_discount_percent: 15,
        early_bird_days: 60,
        late_fee_percent: 20,
        grace_period_days: 30,
        is_active: true
      },
      {
        tier_id: 2,
        tier_name: 'Student Membership',
        base_renewal_fee: 250.00,
        early_bird_discount_percent: 20,
        early_bird_days: 60,
        late_fee_percent: 15,
        grace_period_days: 45,
        is_active: true
      },
      {
        tier_id: 3,
        tier_name: 'Senior Membership',
        base_renewal_fee: 300.00,
        early_bird_discount_percent: 25,
        early_bird_days: 90,
        late_fee_percent: 10,
        grace_period_days: 60,
        is_active: true
      },
      {
        tier_id: 4,
        tier_name: 'Premium Membership',
        base_renewal_fee: 800.00,
        early_bird_discount_percent: 10,
        early_bird_days: 45,
        late_fee_percent: 25,
        grace_period_days: 21,
        is_active: true
      }
    ];
  }

  // Calculate renewal pricing for a specific member
  static async calculateMemberRenewalPricing(memberId: number): Promise<RenewalPricingCalculation> {
    try {
      // Get member details including membership type and expiry
      const memberQuery = `
        SELECT 
          m.member_id,
          COALESCE(ms.subscription_name, 'Standard Membership') as membership_type,
          COALESCE(ms.membership_amount, 500.00) as current_membership_amount,
          CASE 
            WHEN m.member_created_at IS NOT NULL THEN 
              (m.member_created_at + INTERVAL '365 DAY\')
            ELSE (CURRENT_DATE + INTERVAL '30 DAY')
          END as membership_expiry_date,
          CASE 
            WHEN m.member_created_at IS NOT NULL THEN 
              ((m.member_created_at + INTERVAL '365 DAY\')::date - CURRENT_DATE::date)
            ELSE 30
          END as days_until_expiry,
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth)) as member_age,
          m.province_name
        FROM vw_member_details m
        LEFT JOIN memberships ms ON m.member_id = ms.member_id
        WHERE m.member_id = $1 LIMIT 1
      `;

      const memberData = await executeQuerySingle<{
        member_id : number;
        membership_type: string;
        current_membership_amount: number;
        membership_expiry_date: string;
        days_until_expiry: number;
        member_age: number;
        province_name: string;
      }>(memberQuery, [memberId]);

      if (!memberData) {
        throw new Error('Member not found: ' + memberId + '');
      }

      // Determine pricing tier based on member characteristics
      const pricingTier = this.determinePricingTier(memberData);
      
      // Calculate pricing components
      const calculation = this.calculatePricingComponents(memberData, pricingTier);

      return calculation;
    } catch (error) {
      throw createDatabaseError('Failed to calculate member renewal pricing', error);
    }
  }

  // Determine appropriate pricing tier for member
  private static determinePricingTier(memberData: any): RenewalPricingTier {
    const defaultTiers = this.getDefaultPricingTiers();
    
    // Student discount for members under 25
    if (memberData.member_age < 25) {
      return defaultTiers.find(t => t.tier_name === 'Student Membership') || defaultTiers[0];
    }
    
    // Senior discount for members over 65
    if (memberData.member_age >= 65) {
      return defaultTiers.find(t => t.tier_name === 'Senior Membership') || defaultTiers[0];
    }
    
    // Premium membership based on current amount
    if (memberData.current_membership_amount > 600) {
      return defaultTiers.find(t => t.tier_name === 'Premium Membership') || defaultTiers[0];
    }
    
    // Default to standard membership
    return defaultTiers.find(t => t.tier_name === 'Standard Membership') || defaultTiers[0];
  }

  // Calculate pricing components based on member data and tier
  private static calculatePricingComponents(
    memberData: any,
    pricingTier: RenewalPricingTier
  ): RenewalPricingCalculation {
    const baseFee = pricingTier.base_renewal_fee;
    let earlyBirdDiscount = 0;
    let lateFee = 0;
    let specialDiscount = 0;

    // Early bird discount calculation
    if (memberData.days_until_expiry > pricingTier.early_bird_days) {
      earlyBirdDiscount = baseFee * (pricingTier.early_bird_discount_percent / 100);
    }

    // Late fee calculation
    if (memberData.days_until_expiry < 0) {
      const daysOverdue = Math.abs(memberData.days_until_expiry);
      if (daysOverdue <= pricingTier.grace_period_days) {
        // Within grace period - no late fee yet
        lateFee = 0;
      } else {
        // Beyond grace period - apply late fee
        lateFee = baseFee * (pricingTier.late_fee_percent / 100);
      }
    }

    // Apply special discounts based on member characteristics
    specialDiscount = this.calculateSpecialDiscounts(memberData, baseFee);

    // Calculate final amount
    const finalAmount = baseFee - earlyBirdDiscount + lateFee - specialDiscount;

    // Calculate payment and grace period dates
    const paymentDeadline = new Date();
    paymentDeadline.setDate(paymentDeadline.getDate() + Math.max(memberData.days_until_expiry, 0));

    const gracePeriodEnd = new Date(paymentDeadline);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + pricingTier.grace_period_days);

    return {
      member_id: memberData.member_id,
      membership_type: pricingTier.tier_name,
      base_renewal_fee: baseFee,
      early_bird_discount: earlyBirdDiscount,
      late_fee: lateFee,
      special_discount: specialDiscount,
      final_amount: Math.max(finalAmount, 50), // Minimum R50 renewal fee
      pricing_breakdown: {
        base_fee: baseFee,
        early_bird_savings: earlyBirdDiscount,
        late_fee_penalty: lateFee,
        special_discounts: specialDiscount,
        total_due: Math.max(finalAmount, 50)
      },
      payment_deadline: paymentDeadline.toISOString().split('T')[0],
      grace_period_end: gracePeriodEnd.toISOString().split('T')[0]
    };
  }

  // Calculate special discounts based on member characteristics
  private static calculateSpecialDiscounts(memberData: any, baseFee: number): number {
    let totalDiscount = 0;

    // Rural province discount (15% for specific provinces)
    const ruralProvinces = ['Limpopo', 'Northern Cape', 'Eastern Cape'];
    if (ruralProvinces.includes(memberData.province_name)) {
      totalDiscount += baseFee * 0.15; // 15% rural discount
    }

    // Long-term member discount (5% for members over 3 years)
    const membershipYears = Math.floor((Date.now() - new Date(memberData.membership_start_date || '2020-01-01').getTime()) / (365 * 24 * 60 * 60 * 1000));
    if (membershipYears >= 3) {
      totalDiscount += baseFee * 0.05; // 5% loyalty discount
    }

    // Cap total special discounts at 25% of base fee
    return Math.min(totalDiscount, baseFee * 0.25);
  }

  // Bulk calculate pricing for multiple members
  static async calculateBulkRenewalPricing(memberIds: number[]): Promise<RenewalPricingCalculation[]> {
    const calculations: RenewalPricingCalculation[] = [];
    
    for (const memberId of memberIds) {
      try {
        const calculation = await this.calculateMemberRenewalPricing(memberId);
        calculations.push(calculation);
      } catch (error) {
        console.error('Failed to calculate pricing for member ' + memberId + ':', error);
        // Continue with other members
      }
    }
    
    return calculations;
  }

  // Get renewal pricing summary for analytics
  static async getRenewalPricingSummary(): Promise<{
    total_members_due: number;
    total_potential_revenue: number;
    early_bird_savings: number;
    late_fee_revenue: number;
    average_renewal_amount: number;
    pricing_tier_breakdown: any[];
  }> {
    try {
      // Get members due for renewal in next 90 days
      const membersDueQuery = `
        SELECT
          COUNT(*) as total_members_due,
          AVG(500.00) as avg_amount
        FROM vw_member_details
        WHERE (member_created_at + INTERVAL '365 DAY') BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 DAY')
      `;

      const membersDue = await executeQuerySingle<{
        total_members_due: number;
        avg_amount: number;
      }>(membersDueQuery);

      // Calculate pricing tier breakdown
      const tierBreakdownQuery = `
        SELECT
          CASE
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) < 25 THEN 'Student Membership'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) >= 65 THEN 'Senior Membership'
            WHEN COALESCE(ms.membership_amount, 500) > 600 THEN 'Premium Membership'
            ELSE 'Standard Membership'
          END as tier_name,
          COUNT(*) as member_count
        FROM vw_member_details m
        LEFT JOIN memberships ms ON m.member_id = ms.member_id
        WHERE (m.member_created_at + INTERVAL '365 DAY') BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 DAY')
        GROUP BY tier_name
      `;

      const tierBreakdown = await executeQuery<{
        tier_name: string;
        member_count: number;
      }>(tierBreakdownQuery);

      const tiers = this.getDefaultPricingTiers();
      const totalMembersDue = membersDue?.total_members_due || 0;

      // Calculate potential revenue and savings
      let totalPotentialRevenue = 0;
      let earlyBirdSavings = 0;
      let lateFeeRevenue = 0;

      const pricingTierBreakdown = tiers.map(tier => {
        const tierMembers = tierBreakdown.find(t => t.tier_name === tier.tier_name)?.member_count || 0;
        const tierRevenue = tierMembers * tier.base_renewal_fee;
        const tierEarlyBirdSavings = tierMembers * tier.base_renewal_fee * (tier.early_bird_discount_percent / 100) * 0.3; // Assume 30% take early bird
        const tierLateFees = tierMembers * tier.base_renewal_fee * (tier.late_fee_percent / 100) * 0.1; // Assume 10% pay late

        totalPotentialRevenue += tierRevenue;
        earlyBirdSavings += tierEarlyBirdSavings;
        lateFeeRevenue += tierLateFees;

        return {
          tier_name: tier.tier_name,
          base_fee: tier.base_renewal_fee,
          member_count: tierMembers,
          potential_revenue: tierRevenue,
          early_bird_discount_percent: tier.early_bird_discount_percent,
          late_fee_percent: tier.late_fee_percent
        };
      });

      return {
        total_members_due: totalMembersDue,
        total_potential_revenue: totalPotentialRevenue,
        early_bird_savings: earlyBirdSavings,
        late_fee_revenue: lateFeeRevenue,
        average_renewal_amount: totalMembersDue > 0 ? totalPotentialRevenue / totalMembersDue : 500,
        pricing_tier_breakdown: pricingTierBreakdown
      };
    } catch (error) {
      throw createDatabaseError('Failed to get renewal pricing summary', error);
    }
  }

  // Apply pricing override for specific member
  static async applyPricingOverride(
    memberId: number,
    overrideAmount: number,
    reason: string,
    requestedBy: number
  ): Promise<{
    override_id: string;
    original_amount: number;
    override_amount: number;
    savings: number;
  }> {
    try {
      // Get original pricing calculation
      const originalPricing = await this.calculateMemberRenewalPricing(memberId);

      // Create override record (would typically insert into database)
      const overrideId = `OVERRIDE_${memberId}_${Date.now()}`;
      const savings = originalPricing.final_amount - overrideAmount;

      // In a real implementation, this would insert into renewal_pricing_overrides table
      console.log(`Pricing override applied: Member ${memberId}, Original: R${originalPricing.final_amount}, Override: R${overrideAmount}, Reason: ${reason}`);

      return {
        override_id: overrideId,
        original_amount: originalPricing.final_amount,
        override_amount: overrideAmount,
        savings: savings
      };
    } catch (error) {
      throw createDatabaseError('Failed to apply pricing override', error);
    }
  }

  // Get pricing recommendations for bulk renewals
  static async getBulkRenewalPricingRecommendations(memberIds: number[]): Promise<{
    total_members: number;
    total_revenue: number;
    average_amount: number;
    tier_distribution: any[];
    discount_opportunities: any[];
    recommendations: string[];
  }> {
    try {
      const calculations = await this.calculateBulkRenewalPricing(memberIds);

      const totalRevenue = calculations.reduce((sum, calc) => sum + calc.final_amount, 0);
      const averageAmount = calculations.length > 0 ? totalRevenue / calculations.length : 0;

      // Analyze tier distribution
      const tierDistribution = calculations.reduce((acc, calc) => {
        const existing = acc.find(t => t.tier === calc.membership_type);
        if (existing) {
          existing.count++;
          existing.revenue += calc.final_amount;
        } else {
          acc.push({
            tier: calc.membership_type,
            count: 1,
            revenue: calc.final_amount
          });
        }
        return acc;
      }, [] as any[]);

      // Identify discount opportunities
      const discountOpportunities = calculations
        .filter(calc => calc.early_bird_discount > 0)
        .map(calc => ({
          member_id: calc.member_id,
          potential_savings: calc.early_bird_discount,
          tier: calc.membership_type
        }));

      // Generate recommendations
      const recommendations: string[] = [];
      if (discountOpportunities.length > 0) {
        recommendations.push('' + discountOpportunities.length + ' members eligible for early bird discounts');
      }
      if (calculations.some(c => c.late_fee > 0)) {
        recommendations.push('Some members have late fees - consider grace period extension');
      }
      if (tierDistribution.some(t => t.tier === 'Student Membership')) {
        recommendations.push('Student members present - verify eligibility for continued discounts');
      }

      return {
        total_members: calculations.length,
        total_revenue: totalRevenue,
        average_amount: averageAmount,
        tier_distribution: tierDistribution,
        discount_opportunities: discountOpportunities,
        recommendations: recommendations
      };
    } catch (error) {
      throw createDatabaseError('Failed to get bulk renewal pricing recommendations', error);
    }
  }
}
