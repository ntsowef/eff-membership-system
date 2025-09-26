# Payment System & Admin Approval Implementation

This document outlines the complete implementation of the Peach Payments integration and admin approval workflow for the EFF membership system.

## Overview

The system now includes:
1. **Peach Payments Integration** - Online payment processing for membership fees
2. **Admin Configuration** - Payment settings management by national admins
3. **Email Notifications** - Automated notifications to national admins
4. **Member Approval Workflow** - Admin review and approval process
5. **Payment Tracking** - Complete transaction history and status tracking

## Implementation Components

### Backend Implementation

#### 1. Database Schema (`docs/payment_system_setup.sql`)
- **system_config** - Payment and email configuration storage
- **payment_transactions** - Transaction history and status tracking
- **email_notifications** - Email notification queue and history
- **Enhanced members table** - Payment status and reference fields

#### 2. Payment Service (`backend/services/paymentService.js`)
- Peach Payments API integration
- Checkout session creation
- Webhook processing
- Transaction status management
- Email notification triggers

#### 3. Email Service (`backend/services/emailService.js`)
- SMTP email sending
- Member registration notifications
- Approval/rejection notifications
- Template generation (text and HTML)

#### 4. Payment Routes (`backend/src/routes/payment.routes.js`)
- `/api/payments/create-checkout` - Create payment session
- `/api/payments/webhook` - Handle payment webhooks
- `/api/payments/status/:member_id` - Get payment status
- `/api/payments/config` - Get public payment config
- `/api/payments/transactions` - Admin transaction history
- `/api/payments/dashboard` - Payment analytics

#### 5. Enhanced Admin Management (`backend/src/routes/adminManagement.routes.js`)
- Payment configuration management
- Pending member approval interface
- Member approval with user account creation
- Geographic scope filtering

### Frontend Implementation

#### 1. Payment API Service (`frontend-react/src/services/paymentApi.ts`)
- Payment configuration retrieval
- Checkout session creation
- Payment status checking
- Peach Payments widget integration

#### 2. Enhanced Registration Success (`frontend-react/src/pages/EnhancedRegister.tsx`)
- Payment option display after registration
- Peach Payments widget integration
- Payment flow handling
- Skip payment option

## Payment Flow

### 1. Member Registration
```
Member Registration → Application Submitted → Payment Option → Admin Notification
```

#### Step 1: Registration Completion
- Member completes 5-step registration form
- Application submitted with "pending_approval" status
- Payment status set to "pending"

#### Step 2: Payment Processing
- Payment configuration loaded from database
- Member presented with payment option
- Peach Payments checkout session created
- Payment widget displayed for card entry

#### Step 3: Payment Completion
- Payment processed through Peach Payments
- Webhook updates transaction status
- Member payment status updated
- Email notification sent to national admin

#### Step 4: Admin Review
- National admin receives email notification
- Admin logs in to review member application
- Admin can approve/reject with optional user account creation
- Member receives approval/rejection notification

### 2. Admin Configuration

#### Payment Settings Management
```
National Admin → Admin Panel → Payment Configuration → Save Settings
```

**Configurable Settings:**
- Peach Payments API Key (encrypted)
- Peach Payments Entity ID
- Test/Production mode toggle
- Membership fee amount
- Payment description
- Currency settings

#### Email Settings Management
- SMTP server configuration
- Email templates and branding
- National admin notification email
- Automated notification settings

## Database Schema Details

### System Configuration Table
```sql
CREATE TABLE system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Payment Transactions Table
```sql
CREATE TABLE payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    transaction_reference VARCHAR(100) UNIQUE NOT NULL,
    peach_checkout_id VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    payment_status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
    peach_response_code VARCHAR(20),
    peach_response_message TEXT,
    payment_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Email Notifications Table
```sql
CREATE TABLE email_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body_text TEXT,
    body_html TEXT,
    notification_type ENUM('member_registration', 'payment_confirmation', 'approval_notification'),
    related_member_id INT,
    status ENUM('pending', 'sent', 'failed', 'bounced'),
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Payment Endpoints

#### Create Payment Checkout
```http
POST /api/payments/create-checkout
Content-Type: application/json

{
  "member_id": 123,
  "amount": 50.00
}
```

#### Payment Webhook (Peach Payments)
```http
POST /api/payments/webhook
Content-Type: application/json

{
  "id": "checkout_id",
  "merchantTransactionId": "transaction_reference",
  "result": {
    "code": "000.100.110",
    "description": "Request successfully processed"
  }
}
```

#### Get Payment Status
```http
GET /api/payments/status/{member_id}
```

### Admin Management Endpoints

#### Get Payment Configuration
```http
GET /api/admin-management/payment-config
Authorization: Bearer {admin_token}
```

#### Update Payment Configuration
```http
PUT /api/admin-management/payment-config
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "peach_api_key": "api_key",
  "peach_entity_id": "entity_id",
  "peach_test_mode": true,
  "membership_fee_amount": "50.00",
  "payment_description": "EFF Membership Fee"
}
```

#### Get Pending Members
```http
GET /api/admin-management/pending-members
Authorization: Bearer {admin_token}
```

#### Approve Member
```http
POST /api/admin-management/approve-member/{member_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "create_user_account": true,
  "temporary_password": "temp123"
}
```

## Email Notifications

### Member Registration Notification
**Recipient:** National Administrator
**Trigger:** New member registration (with or without payment)
**Content:** Member details, payment status, approval link

### Payment Confirmation Notification
**Recipient:** National Administrator
**Trigger:** Successful payment completion
**Content:** Member details, payment information, approval required

### Member Approval Notification
**Recipient:** Member
**Trigger:** Admin approves membership
**Content:** Welcome message, login credentials (if applicable)

## Security Features

### Payment Security
- Encrypted API key storage
- Secure webhook validation
- Transaction reference generation
- PCI DSS compliant payment processing

### Admin Access Control
- National admin only for payment configuration
- Geographic scope filtering for member approval
- Audit trail for all configuration changes
- Secure password handling for user accounts

### Data Protection
- Encrypted sensitive configuration
- Secure email transmission
- Payment data encryption
- GDPR compliant data handling

## Setup Instructions

### 1. Database Setup
```bash
cd backend
node setup-payment-system.js
```

### 2. Install Dependencies
```bash
cd backend
npm install nodemailer axios
```

### 3. Configure Payment Settings
1. Log in as national admin
2. Navigate to Admin Panel → Payment Configuration
3. Enter Peach Payments credentials:
   - API Key
   - Entity ID
   - Test/Production mode
   - Membership fee amount

### 4. Configure Email Settings
1. Set SMTP server details
2. Configure national admin email
3. Test email notifications

### 5. Test Payment Flow
1. Complete member registration
2. Process test payment
3. Verify webhook processing
4. Check admin notifications
5. Test member approval

## Peach Payments Integration

### Test Credentials
- **Test API Key:** Provided by Peach Payments
- **Test Entity ID:** Provided by Peach Payments
- **Test Mode:** Enabled by default

### Production Setup
1. Obtain production credentials from Peach Payments
2. Update configuration through admin panel
3. Disable test mode
4. Test with small amounts before full deployment

### Supported Payment Methods
- Visa Credit/Debit Cards
- Mastercard Credit/Debit Cards
- American Express
- Local South African payment methods

## Monitoring & Analytics

### Payment Dashboard
- Daily transaction statistics
- Success/failure rates
- Revenue tracking
- Payment method analytics

### Email Notification Tracking
- Delivery status monitoring
- Failed notification alerts
- Bounce rate tracking
- Template performance

### Member Approval Metrics
- Pending application counts
- Approval/rejection rates
- Processing time analytics
- Geographic distribution

The payment system implementation provides a complete, secure, and scalable solution for EFF membership fee processing with comprehensive admin controls and automated workflows.
