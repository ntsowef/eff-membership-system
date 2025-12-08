# Member Renewal Workflow - Quick Reference

## 🚀 Quick Start

### 1. Run Database Migration
```bash
mysql -u root -p eff_membership_db < backend/migrations/026_add_renewal_approval_fields.sql
```

### 2. Start Server
```bash
cd backend
npm run dev
```

### 3. Run Tests
```bash
node test/api/member-renewal-workflow.test.js
```

---

## 📋 API Endpoints Cheat Sheet

### Member Endpoints

#### Update Profile
```http
PUT /api/profile/me
Authorization: Bearer <member_token>

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "cell_number": "0821234567"
}
```
**Note:** Cannot update `id_number` or `status`

#### Submit Renewal Request
```http
POST /api/member-renewals/request
Authorization: Bearer <member_token>

{
  "renewal_period_months": 12,
  "payment_method": "bank_transfer",
  "payment_reference": "PAY-2024-001",
  "payment_amount": 120.00
}
```

#### View My Renewals
```http
GET /api/member-renewals/my-requests
Authorization: Bearer <member_token>
```

### Admin Endpoints

#### View Pending Renewals
```http
GET /api/member-renewals/pending
Authorization: Bearer <admin_token>

Query Params (optional):
- province_code
- district_code
- municipality_code
- ward_code
- payment_status
```

#### View Renewal Details
```http
GET /api/member-renewals/:id
Authorization: Bearer <admin_token>
```

#### Approve Renewal
```http
POST /api/member-renewals/:id/approve
Authorization: Bearer <admin_token>

{
  "admin_notes": "Payment verified"
}
```

#### Reject Renewal
```http
POST /api/member-renewals/:id/reject
Authorization: Bearer <admin_token>

{
  "rejection_reason": "Payment not found"
}
```

---

## 🔒 Security Rules

### Member Restrictions
❌ **CANNOT Update:**
- `id_number`
- `status` / `status_id`
- `membership_status`
- `member_id`

✅ **CAN Update:**
- `first_name` / `last_name`
- `email`
- `cell_number`
- `residential_address`

### Role Requirements
- **Member**: Can submit renewals, view own renewals
- **Admin/Finance**: Can approve/reject renewals, view all renewals

---

## 📊 Workflow States

### Renewal Status
- `Pending` → Initial state after submission
- `Processing` → Being reviewed by admin
- `Completed` → Approved and processed
- `Failed` → Rejected by admin
- `Cancelled` → Cancelled by member/admin
- `Expired` → Renewal period expired

### Payment Status
- `Pending` → Awaiting payment verification
- `Processing` → Payment being verified
- `Completed` → Payment confirmed
- `Failed` → Payment not found/invalid
- `Refunded` → Payment refunded

---

## 🗄️ Database Fields

### membership_renewals Table (New Fields)
```sql
approved_by INT NULL              -- Admin who approved
approved_at TIMESTAMP NULL        -- When approved
rejected_by INT NULL              -- Admin who rejected
rejected_at TIMESTAMP NULL        -- When rejected
rejection_reason TEXT NULL        -- Why rejected
previous_expiry_date DATE NULL    -- Old expiry
new_expiry_date DATE NULL         -- New expiry
```

---

## 🧪 Testing

### Test Configuration
Edit `test/api/member-renewal-workflow.test.js`:
```javascript
const TEST_CONFIG = {
  memberCredentials: {
    username: 'test_member',
    password: 'TestPassword123'
  },
  adminCredentials: {
    username: 'admin',
    password: 'admin123'
  }
};
```

### Run Tests
```bash
node test/api/member-renewal-workflow.test.js
```

### Expected Result
```
Total Tests: 10
✅ Passed: 10
❌ Failed: 0
Success Rate: 100.00%
```

---

## 🐛 Troubleshooting

### Error: "Cannot update restricted fields"
**Cause:** Attempting to update `id_number` or `status`
**Solution:** Remove restricted fields from request

### Error: "No member profile associated"
**Cause:** User account not linked to member record
**Solution:** Create member record for user

### Error: "Insufficient permissions"
**Cause:** User doesn't have admin/finance role
**Solution:** Grant appropriate role to user

### Error: "Only pending renewals can be approved"
**Cause:** Renewal already processed
**Solution:** Check renewal status before approval

---

## 📈 Monitoring

### Key Metrics to Track
- Number of pending renewals
- Average approval time
- Rejection rate
- Payment verification time

### Database Queries

#### Count Pending Renewals
```sql
SELECT COUNT(*) FROM membership_renewals 
WHERE renewal_status = 'Pending';
```

#### Average Approval Time
```sql
SELECT AVG(TIMESTAMPDIFF(HOUR, renewal_requested_date, approved_at)) as avg_hours
FROM membership_renewals 
WHERE approved_at IS NOT NULL;
```

#### Rejection Reasons
```sql
SELECT rejection_reason, COUNT(*) as count
FROM membership_renewals 
WHERE rejected_at IS NOT NULL
GROUP BY rejection_reason
ORDER BY count DESC;
```

---

## 🔗 Related Documentation

- **Full API Docs**: `backend/docs/MEMBER_RENEWAL_WORKFLOW_API.md`
- **Implementation Summary**: `backend/docs/IMPLEMENTATION_SUMMARY_RENEWAL_WORKFLOW.md`
- **Test Documentation**: `test/api/README.md`
- **External Renewal API**: `backend/docs/EXTERNAL_RENEWAL_API.md`

---

## 💡 Best Practices

1. **Always verify payment** before approving renewals
2. **Provide clear rejection reasons** to help members
3. **Use filters** when viewing pending renewals
4. **Monitor pending queue** regularly
5. **Keep admin notes** for audit purposes
6. **Test in staging** before production deployment

---

## 🆘 Support

For issues or questions:
1. Check the full documentation
2. Review test suite for examples
3. Check database logs for errors
4. Verify user roles and permissions

