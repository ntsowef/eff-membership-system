import React from 'react';
import EnhancedFinancialReviewPanel from '../applications/EnhancedFinancialReviewPanel';

interface RenewalFinancialReviewPanelProps {
  renewal: any;
  payments: any[];
  approvalStatus: any;
  canReview: boolean;
}

/**
 * Financial Review Panel specifically for membership renewals
 * Uses the enhanced version with renewal-specific defaults
 */
const RenewalFinancialReviewPanel: React.FC<RenewalFinancialReviewPanelProps> = ({
  renewal,
  payments,
  approvalStatus,
  canReview
}) => {
  return (
    <EnhancedFinancialReviewPanel
      entity={renewal}
      entityType="renewal"
      payments={payments}
      approvalStatus={approvalStatus}
      canReview={canReview}
    />
  );
};

export default RenewalFinancialReviewPanel;
