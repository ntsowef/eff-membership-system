import React from 'react';
import EnhancedFinancialReviewPanel from './EnhancedFinancialReviewPanel';

interface FinancialReviewPanelProps {
  application: any;
  payments: any[];
  approvalStatus: any;
  canReview: boolean;
}

/**
 * Backward-compatible wrapper for the original FinancialReviewPanel
 * Now uses the enhanced version with application-specific defaults
 */
const FinancialReviewPanel: React.FC<FinancialReviewPanelProps> = ({
  application,
  payments,
  approvalStatus,
  canReview
}) => {
  return (
    <EnhancedFinancialReviewPanel
      entity={application}
      entityType="application"
      payments={payments}
      approvalStatus={approvalStatus}
      canReview={canReview}
    />
  );
};

export default FinancialReviewPanel;
