# Membership Status Investigation by Province Report

**Generated:** 2025-11-21  
**Database:** eff_membership_database  
**Table:** members_consolidated  
**Total Members:** 1,203,052

---

## Executive Summary

This report provides a comprehensive analysis of EFF membership status distribution across all 9 provinces of South Africa. The data shows that **52.89% of members are Active**, with **44.48% Expired**, **2.21% Inactive**, and **0.41% in Grace Period**.

---

## 1. Province Summary (Ranked by Total Members)

| Rank | Province       | Total Members | Active | Expired | Inactive | Grace Period | Active % |
|------|----------------|---------------|--------|---------|----------|--------------|----------|
| 1    | Gauteng        | 273,906       | 115,836| 157,295 | 0        | 775          | 42.29%   |
| 2    | Eastern Cape   | 166,952       | 87,112 | 78,494  | 0        | 1,346        | 52.18%   |
| 3    | Limpopo        | 166,803       | 90,420 | 75,362  | 0        | 1,021        | 54.21%   |
| 4    | KwaZulu-Natal  | 157,717       | 94,193 | 37,641  | 25,441   | 442          | 59.72%   |
| 5    | Mpumalanga     | 119,648       | 77,293 | 41,910  | 0        | 445          | 64.60%   |
| 6    | Western Cape   | 117,443       | 60,128 | 57,038  | 0        | 277          | 51.20%   |
| 7    | Free State     | 76,480        | 52,126 | 22,734  | 1,202    | 418          | 68.16%   |
| 8    | North West     | 75,372        | 30,414 | 44,864  | 0        | 94           | 40.35%   |
| 9    | Northern Cape  | 48,731        | 28,773 | 19,832  | 0        | 126          | 59.04%   |

---

## 2. Membership Status Distribution by Province

### 2.1 Eastern Cape (166,952 members)
- **Active:** 87,112 (52.18%)
- **Expired:** 78,494 (47.02%)
- **Grace Period:** 1,346 (0.81%)

### 2.2 Free State (76,480 members)
- **Active:** 52,126 (68.16%) ⭐ **Highest Active %**
- **Expired:** 22,734 (29.73%)
- **Inactive:** 1,202 (1.57%)
- **Grace Period:** 418 (0.55%)

### 2.3 Gauteng (273,906 members) 🏆 **Largest Province**
- **Expired:** 157,295 (57.43%)
- **Active:** 115,836 (42.29%) ⚠️ **Lowest Active %**
- **Grace Period:** 775 (0.28%)

### 2.4 KwaZulu-Natal (157,717 members)
- **Active:** 94,193 (59.72%)
- **Expired:** 37,641 (23.87%)
- **Inactive:** 25,441 (16.13%)
- **Grace Period:** 442 (0.28%)

### 2.5 Limpopo (166,803 members)
- **Active:** 90,420 (54.21%)
- **Expired:** 75,362 (45.18%)
- **Grace Period:** 1,021 (0.61%)

### 2.6 Mpumalanga (119,648 members)
- **Active:** 77,293 (64.60%)
- **Expired:** 41,910 (35.03%)
- **Grace Period:** 445 (0.37%)

### 2.7 North West (75,372 members)
- **Expired:** 44,864 (59.52%)
- **Active:** 30,414 (40.35%)
- **Grace Period:** 94 (0.12%)

### 2.8 Northern Cape (48,731 members) 📉 **Smallest Province**
- **Active:** 28,773 (59.04%)
- **Expired:** 19,832 (40.70%)
- **Grace Period:** 126 (0.26%)

### 2.9 Western Cape (117,443 members)
- **Active:** 60,128 (51.20%)
- **Expired:** 57,038 (48.57%)
- **Grace Period:** 277 (0.24%)

---

## 3. Overall National Statistics

| Status        | Count     | Percentage |
|---------------|-----------|------------|
| Active        | 636,295   | 52.89%     |
| Expired       | 535,170   | 44.48%     |
| Inactive      | 26,643    | 2.21%      |
| Grace Period  | 4,944     | 0.41%      |
| **TOTAL**     | **1,203,052** | **100%** |

---

## 4. Key Insights

### 4.1 Provinces with Highest Active Membership %
1. **Free State:** 68.16%
2. **Mpumalanga:** 64.60%
3. **KwaZulu-Natal:** 59.72%
4. **Northern Cape:** 59.04%
5. **Limpopo:** 54.21%

### 4.2 Provinces Needing Attention (Low Active %)
1. **North West:** 40.35% ⚠️
2. **Gauteng:** 42.29% ⚠️
3. **Western Cape:** 51.20%
4. **Eastern Cape:** 52.18%

### 4.3 Inactive Members
- **KwaZulu-Natal:** 25,441 inactive members (16.13% of province)
- **Free State:** 1,202 inactive members (1.57% of province)
- **Other provinces:** 0 inactive members

### 4.4 Data Quality
✅ **All members have province mapping** - No orphaned records found

---

## 5. Recommendations

### 5.1 Renewal Campaigns
**Priority Provinces for Renewal Campaigns:**
1. **Gauteng** - 157,295 expired members (largest expired pool)
2. **Eastern Cape** - 78,494 expired members
3. **Limpopo** - 75,362 expired members
4. **Western Cape** - 57,038 expired members
5. **North West** - 44,864 expired members

### 5.2 Member Retention
**Focus on provinces with declining active rates:**
- North West (40.35% active)
- Gauteng (42.29% active)

### 5.3 Grace Period Follow-up
**Members in grace period requiring immediate attention:**
- Eastern Cape: 1,346 members
- Limpopo: 1,021 members
- Gauteng: 775 members

### 5.4 Inactive Member Investigation
**KwaZulu-Natal** has 25,441 inactive members (16.13%) - requires investigation into:
- Reasons for inactivity
- Potential re-engagement strategies
- Data quality issues

---

## 6. Technical Notes

### Query Methodology
- **Source Table:** `members_consolidated`
- **Geographic Join Path:** members → wards → municipalities → districts → provinces
- **Metro Handling:** Includes parent municipality lookup for metro sub-regions
- **Status Mapping:** Uses `membership_statuses` lookup table

### Data Integrity
- ✅ All 1,203,052 members successfully mapped to provinces
- ✅ No NULL province assignments
- ✅ Consistent status categorization across all provinces

---

**Report Generated by:** Membership Status Investigation Script  
**Script Location:** `test/investigate-membership-status-by-province.js`

