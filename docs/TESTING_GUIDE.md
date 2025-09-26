# Testing Guide for EFF Membership System

## Valid Test ID Numbers for Registration

When testing the membership registration system, you need to use valid South African ID numbers that pass checksum validation. Here are some valid test ID numbers you can use:

### Male Test IDs
- `9001016804089` - Male, Age: 35, Born: 1990
- `8506157683085` - Male, Age: 40, Born: 1985  
- `0012257916085` - Male, Age: 25, Born: 2000
- `8807195000088` - Male, Age: 37, Born: 1988

### Female Test IDs
- `9001011583084` - Female, Age: 35, Born: 1990
- `8506154796088` - Female, Age: 40, Born: 1985
- `9205110681083` - Female, Age: 33, Born: 1992
- `0011163377085` - Female, Age: 25, Born: 2000

## ID Number Validation Rules

The system validates South African ID numbers using the following criteria:

1. **Length**: Must be exactly 13 digits
2. **Format**: Must contain only numeric characters
3. **Date Validation**: The first 6 digits must form a valid date (YYMMDD)
4. **Age Requirement**: Person must be at least 18 years old
5. **Checksum Validation**: Must pass the Luhn algorithm checksum validation

## Common Registration Issues

### Invalid ID Number Checksum Error
If you see the error "Invalid ID number checksum", it means:
- The ID number you entered doesn't pass the mathematical validation
- Use one of the test ID numbers provided above
- Ensure you've typed the ID number correctly (no spaces or special characters)

### Age Validation Error
- The system requires members to be at least 18 years old
- The age is calculated from the ID number's date portion

## Testing Registration Flow

### Step 1: Personal Information
- Use one of the valid test ID numbers above
- The system will automatically populate date of birth and gender
- Fill in first name and last name

### Step 2: Contact Information
- Use a valid email format (e.g., test@example.com)
- Use a valid South African phone number format (e.g., 0821234567)

### Step 3: Address Information
- Select Province, Municipality, and Ward from dropdowns
- Fill in residential address

### Step 4: Finance Information
- Select employment status and income range
- Choose payment method

### Step 5: Terms & Verification
- Accept all required terms and declarations
- Provide digital signature

## Payment Testing

### Test Payment Configuration
- The system uses Peach Payments in test mode by default
- Use test card numbers provided by Peach Payments
- No real money will be charged in test mode

### Test Card Numbers (Peach Payments)
- **Visa**: 4111111111111111
- **Mastercard**: 5555555555554444
- **Expiry**: Any future date (e.g., 12/25)
- **CVV**: Any 3-digit number (e.g., 123)

## Admin Testing

### Test Admin Credentials
- Email: admin@eff.org.za
- Password: (configured by system administrator)

### Admin Functions to Test
1. **Member Approval Workflow**
   - View pending member applications
   - Review verification checklist
   - Approve/reject applications
   - Create user accounts for approved members

2. **Payment Configuration**
   - Configure Peach Payments settings
   - Set membership fee amounts
   - Enable/disable payment processing

3. **Email Notifications**
   - Configure SMTP settings
   - Test email delivery
   - Review notification history

## Database Testing

### Verification Checklist
Each member has an 8-point verification checklist:
1. ID Verification
2. Address Verification
3. Contact Verification
4. Employment Verification
5. Background Check
6. Payment Verification
7. Signature Verification
8. Declaration Verification

### Member Status Flow
```
Registration → Pending Approval → Admin Review → Verification → Approval/Rejection → Active Member
```

## Troubleshooting

### Common Issues and Solutions

1. **"Invalid ID number checksum"**
   - Use one of the provided test ID numbers
   - Ensure no spaces or special characters in ID field

2. **"Must be at least 18 years old"**
   - Use an ID number with a birth date that makes the person 18+
   - Check the year interpretation (00-21 = 2000s, 22-99 = 1900s)

3. **Payment errors**
   - Ensure payment system is configured
   - Check that test mode is enabled
   - Verify Peach Payments credentials

4. **Email notification issues**
   - Configure SMTP settings in admin panel
   - Check email server connectivity
   - Verify recipient email addresses

## System Requirements

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Network Requirements
- Internet connection for payment processing
- SMTP access for email notifications
- Database connectivity

## Support

For technical issues or questions about testing:
1. Check the console logs in browser developer tools
2. Review server logs for backend errors
3. Verify database connectivity and table structure
4. Ensure all required services are running

## Security Notes

- All test data should be removed before production deployment
- Test ID numbers are for testing purposes only
- Real ID numbers should never be used in test environments
- Payment test mode should be disabled in production
