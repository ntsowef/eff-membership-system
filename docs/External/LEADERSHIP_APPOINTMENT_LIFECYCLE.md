# Leadership Appointment Lifecycle

## Overview

This document explains the lifecycle of leadership appointments in the EFF Membership Management System, including appointment statuses, allowed transitions, and common errors.

---

## 📊 Appointment Statuses

Leadership appointments can have the following statuses:

### 1. **Active** ✅
- **Description**: The appointment is currently active and the member is serving in the position
- **Can be**: Terminated, Removed, or Replaced
- **Cannot be**: Created again for the same position (must remove/terminate first)

### 2. **Completed** ✔️
- **Description**: The appointment has been completed/removed (position is now vacant)
- **Can be**: Viewed in history
- **Cannot be**: Terminated, Removed, or Modified
- **Note**: This is the final status when a member is removed from a position

### 3. **Terminated** ❌
- **Description**: The appointment was terminated (e.g., due to misconduct, resignation)
- **Can be**: Viewed in history
- **Cannot be**: Removed or Modified
- **Note**: This is the final status when an appointment is terminated

### 4. **Suspended** ⏸️
- **Description**: The appointment is temporarily suspended
- **Can be**: Reactivated or Terminated
- **Cannot be**: Removed (must terminate or reactivate first)

---

## 🔄 Status Transitions

### Valid Transitions

```
Active → Completed (via Remove)
Active → Terminated (via Terminate)
Active → Suspended (via Suspend)
Suspended → Active (via Reactivate)
Suspended → Terminated (via Terminate)
```

### Invalid Transitions

```
Completed → Any (Final status)
Terminated → Any (Final status)
Completed → Remove ❌ (Already removed)
Terminated → Remove ❌ (Already terminated)
```

---

## 🛠️ Operations

### 1. Create Appointment
**Endpoint**: `POST /api/v1/leadership/appointments`

**Requirements**:
- Position must exist
- Position must be vacant (no active appointments)
- Member must be eligible

**Result**: Creates appointment with status "Active"

---

### 2. Remove Appointment
**Endpoint**: `POST /api/v1/leadership/appointments/:id/remove`

**Requirements**:
- Appointment must exist
- Appointment status must be "Active" ✅

**Result**: Changes status to "Completed", sets end_date, position becomes vacant

**Common Errors**:
```
❌ "Cannot remove appointment: This appointment is already completed."
   → The appointment has already been removed
   → Solution: No action needed, position is already vacant

❌ "Cannot remove appointment: This appointment is already terminated."
   → The appointment was terminated, not removed
   → Solution: No action needed, position is already vacant
```

---

### 3. Terminate Appointment
**Endpoint**: `POST /api/v1/leadership/appointments/:id/terminate`

**Requirements**:
- Appointment must exist
- Appointment status must be "Active" ✅

**Result**: Changes status to "Terminated", sets end_date, position becomes vacant

**Common Errors**:
```
❌ "Cannot terminate appointment: This appointment is already terminated."
   → The appointment has already been terminated
   → Solution: No action needed

❌ "Cannot terminate appointment: This appointment is already completed."
   → The appointment was removed, not terminated
   → Solution: No action needed, position is already vacant
```

---

### 4. Replace Appointment
**Endpoint**: `POST /api/v1/leadership/appointments/:id/replace`

**Requirements**:
- Appointment must exist
- Appointment status must be "Active" ✅
- New member must be eligible

**Result**: 
- Old appointment status → "Completed"
- New appointment created with status "Active"
- Position remains filled

---

## 🔍 Checking Appointment Status

### Using the Diagnostic Script

```bash
node test/database/check-appointment-status.js <appointment_id>
```

**Example**:
```bash
node test/database/check-appointment-status.js 93
```

**Output**:
```
📋 Appointment Details:
ID: 93
Position: Gauteng Provincial Chairperson (PCHAIR_GP)
Member: Zakhele Moses Mahlalela (MEM028507)

Status: Completed ⚠️

❌ This appointment CANNOT be removed (status is Completed, not Active)
```

### Using SQL Query

```sql
SELECT 
  la.id,
  la.appointment_status,
  la.start_date,
  la.end_date,
  lp.position_name,
  m.firstname || ' ' || COALESCE(m.surname, '') as member_name
FROM leadership_appointments la
JOIN leadership_positions lp ON la.position_id = lp.id
LEFT JOIN members m ON la.member_id = m.member_id
WHERE la.id = 93;
```

---

## 💡 Common Scenarios

### Scenario 1: Trying to Remove an Already Removed Appointment

**Error**:
```json
{
  "error": "Cannot remove appointment: This appointment is already completed. This appointment has already been removed."
}
```

**Explanation**: The appointment was already removed previously.

**Solution**: No action needed. The position is already vacant and can accept a new appointment.

---

### Scenario 2: Trying to Terminate an Already Terminated Appointment

**Error**:
```json
{
  "error": "Cannot terminate appointment: This appointment is already terminated. This appointment has already been terminated."
}
```

**Explanation**: The appointment was already terminated previously.

**Solution**: No action needed. The position is already vacant.

---

### Scenario 3: Trying to Remove a Terminated Appointment

**Error**:
```json
{
  "error": "Cannot remove appointment: This appointment is already terminated."
}
```

**Explanation**: The appointment was terminated (not removed). Both result in a vacant position.

**Solution**: No action needed. The position is already vacant.

---

### Scenario 4: Position is Vacant, Want to Assign New Member

**Steps**:
1. Check if position has any active appointments:
   ```sql
   SELECT * FROM leadership_appointments 
   WHERE position_id = <position_id> 
   AND appointment_status = 'Active';
   ```

2. If no active appointments, create new appointment:
   ```
   POST /api/v1/leadership/appointments
   {
     "position_id": <position_id>,
     "member_id": <member_id>,
     "appointment_type": "Elected",
     "start_date": "2025-10-06"
   }
   ```

---

## 📋 Best Practices

### 1. Check Status Before Operations
Always check the appointment status before attempting to remove or terminate:

```javascript
// Get appointment details first
const appointment = await getAppointmentById(appointmentId);

if (appointment.appointment_status === 'Active') {
  // Can remove or terminate
  await removeAppointment(appointmentId, reason);
} else {
  // Show appropriate message to user
  console.log(`Appointment is ${appointment.appointment_status}, cannot be modified`);
}
```

### 2. Use Appropriate Operation
- **Remove**: For normal end of term, resignation, or making position vacant
- **Terminate**: For disciplinary actions, misconduct, or forced removal
- **Replace**: For immediate succession (old member out, new member in)

### 3. Provide Clear Reasons
Always provide clear, descriptive reasons for removal or termination:

```javascript
// Good
removal_reason: "End of term - served 2 years"
termination_reason: "Resigned due to personal reasons"

// Bad
removal_reason: "important"
termination_reason: "test"
```

### 4. Handle Errors Gracefully
```javascript
try {
  await removeAppointment(appointmentId, reason);
} catch (error) {
  if (error.message.includes('already completed')) {
    // Position is already vacant, no action needed
    showMessage('This appointment has already been removed');
  } else if (error.message.includes('already terminated')) {
    // Position is already vacant, no action needed
    showMessage('This appointment was previously terminated');
  } else {
    // Other error
    showError(error.message);
  }
}
```

---

## 🔧 Troubleshooting

### Issue: "Only active appointments can be removed"

**Diagnosis**:
```bash
node test/database/check-appointment-status.js <appointment_id>
```

**Solutions**:
1. If status is "Completed": Appointment already removed, no action needed
2. If status is "Terminated": Appointment already terminated, no action needed
3. If status is "Suspended": Reactivate first, then remove
4. If you need to assign a new member: Create a new appointment (position is vacant)

---

### Issue: Position shows as filled but no active appointments

**Diagnosis**:
```sql
SELECT 
  lp.position_name,
  COUNT(la.id) as total_appointments,
  COUNT(CASE WHEN la.appointment_status = 'Active' THEN 1 END) as active_appointments
FROM leadership_positions lp
LEFT JOIN leadership_appointments la ON lp.id = la.position_id
WHERE lp.id = <position_id>
GROUP BY lp.id, lp.position_name;
```

**Solution**: If active_appointments = 0, position is vacant and can accept new appointment

---

## 📞 Support

### Diagnostic Tools

1. **Check Appointment Status**:
   ```bash
   node test/database/check-appointment-status.js <appointment_id>
   ```

2. **List All Appointments for Position**:
   ```sql
   SELECT * FROM leadership_appointments 
   WHERE position_id = <position_id> 
   ORDER BY created_at DESC;
   ```

3. **Find Active Appointments**:
   ```sql
   SELECT * FROM leadership_appointments 
   WHERE appointment_status = 'Active';
   ```

---

## 📚 Related Documentation

- **Leadership Management Guide**: Details on creating and managing appointments
- **War Council Structure**: Specific rules for War Council appointments
- **API Documentation**: Complete API reference for leadership endpoints

---

**Last Updated**: 2025-01-23  
**Version**: 1.0

