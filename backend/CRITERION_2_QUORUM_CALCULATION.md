# Criterion 2: Automatic Quorum Calculation

## 🎯 Overview

Implemented automatic quorum calculation for Criterion 2 in the Record Meeting functionality. The system now automatically calculates the required quorum based on total ward members and determines if it has been achieved.

---

## 📐 Quorum Formula

**Formula:** `Quorum Required = (Total Ward Members ÷ 2) + 1`

**Example:**
- Ward has **156 members**
- Calculation: `(156 ÷ 2) + 1 = 78 + 1 = 79`
- **Quorum Required: 79 members**

---

## ✅ How It Works

### **1. Automatic Calculation**
- System fetches total ward members from ward compliance data
- Automatically calculates quorum using the formula: `(Total Members / 2) + 1`
- Quorum requirement is **read-only** (cannot be manually edited)

### **2. Real-Time Quorum Status**
- User enters **Total Attendees** (from attendance register or signatures)
- System automatically compares attendees vs. quorum required
- **Quorum Achieved** field auto-updates to match total attendees
- Visual indicator shows if quorum is **REACHED** or **NOT REACHED**

### **3. Manual Verification**
- User must verify the calculation matches the attendance register
- Checkbox to confirm quorum status
- Required notes field for verification details

---

## 🎨 User Interface

### **Dialog Title**
```
Record New Ward Meeting
Ward 1 - Johannesburg • 156 members in this ward
```

### **Criterion 2 Alert Box**
```
Criterion 2: Quorum Verification
Formula: Quorum Required = (Total Ward Members ÷ 2) + 1
Calculation: (156 ÷ 2) + 1 = 79 members required
Current Status: ✓ Quorum ACHIEVED (or ✗ Quorum NOT achieved)
```

### **Input Fields**

#### **Total Attendees / Signatures from Register**
- User enters number from attendance register
- Helper text: "Enter number of attendees or signatures (Quorum: 79)"

#### **Quorum Required (Auto-Calculated)**
- **Read-only field** - cannot be edited
- Shows calculated value: `79`
- Helper text: "Formula: (156 ÷ 2) + 1 = 79"

#### **Quorum Achieved (Auto-Filled)**
- **Read-only field** - automatically matches Total Attendees
- Shows: `85` (if 85 attendees entered)
- Helper text: "✓ Quorum met" or "✗ Quorum not met"
- Red border if quorum not met

### **Quorum Status Box**
Visual indicator with color coding:
- **Green box** if quorum reached: "✓ QUORUM REACHED - 85 / 79 required"
- **Red box** if quorum not reached: "✗ QUORUM NOT REACHED - 50 / 79 required"

### **Final Verification Section**
```
Criterion 2: Final Quorum Verification

System Calculation: ✓ Quorum ACHIEVED
Attendees: 85 / 79 required
Formula: (156 ÷ 2) + 1 = 79

Please verify this calculation matches the attendance register and confirm below.

☑ I verify that the meeting quorum was met (system shows ACHIEVED)

[Required Notes Field]
Confirm attendance register matches the system calculation
```

---

## 🔄 Workflow

1. **User opens Record Meeting dialog**
   - System shows total ward members in title
   - Quorum requirement is pre-calculated

2. **User enters Total Attendees**
   - Types number from attendance register (e.g., 85)
   - System automatically updates:
     - Quorum Achieved = 85
     - Status indicator = "✓ QUORUM REACHED"
     - Alert box turns green

3. **System determines quorum status**
   - Compares: 85 attendees ≥ 79 required
   - Result: **Quorum ACHIEVED** ✓

4. **User verifies and confirms**
   - Checks that system calculation matches attendance register
   - Checks verification checkbox
   - Adds notes confirming the verification

5. **Meeting record saved**
   - All quorum data saved to database
   - Criterion 2 compliance automatically determined

---

## 📊 Example Scenarios

### **Scenario 1: Quorum Achieved**
- Ward Members: 156
- Quorum Required: 79
- Total Attendees: 85
- **Result:** ✓ QUORUM REACHED (85 ≥ 79)

### **Scenario 2: Quorum Not Achieved**
- Ward Members: 156
- Quorum Required: 79
- Total Attendees: 50
- **Result:** ✗ QUORUM NOT REACHED (50 < 79)

### **Scenario 3: Exact Quorum**
- Ward Members: 100
- Quorum Required: 51
- Total Attendees: 51
- **Result:** ✓ QUORUM REACHED (51 ≥ 51)

---

## 🔧 Technical Implementation

### **Quorum Calculation**
```typescript
const quorumRequired = React.useMemo(() => {
  return Math.floor(wardMemberCount / 2) + 1;
}, [wardMemberCount]);
```

### **Quorum Status Check**
```typescript
const isQuorumAchieved = React.useMemo(() => {
  return formData.total_attendees >= quorumRequired;
}, [formData.total_attendees, quorumRequired]);
```

### **Auto-Update Quorum Achieved**
```typescript
React.useEffect(() => {
  setFormData(prev => ({
    ...prev,
    quorum_achieved: prev.total_attendees
  }));
}, [formData.total_attendees]);
```

---

## ✅ Benefits

1. **Eliminates Manual Calculation Errors** - System calculates quorum automatically
2. **Real-Time Feedback** - User sees quorum status immediately
3. **Transparent Formula** - Shows calculation steps clearly
4. **Prevents Data Entry Errors** - Read-only fields for calculated values
5. **Audit Trail** - Verification notes required for compliance
6. **Visual Indicators** - Color-coded status boxes for quick understanding

---

## 📝 Validation Rules

- Total Attendees must be entered (required field)
- Quorum Required is auto-calculated (read-only)
- Quorum Achieved auto-matches Total Attendees (read-only)
- Manual verification checkbox required
- Verification notes required when checkbox is checked

---

**Status:** ✅ **Complete and Tested**
