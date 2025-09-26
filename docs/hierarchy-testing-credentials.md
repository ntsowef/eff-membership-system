# 🔐 Comprehensive Hierarchy Testing Credentials

## **📋 TESTING CREDENTIALS FOR ALL ADMIN LEVELS**

### **🌍 NATIONAL ADMINISTRATORS**
**Full access to all provinces, regions, municipalities, and wards**

| **Email** | **Password** | **Name** | **Scope** |
|-----------|--------------|----------|-----------|
| `admin@example.com` | `admin123` | National Administrator | All Provinces |
| `national.admin@membership.org.za` | `admin123` | National Admin | All Provinces |

**Expected Behavior:**
- Geographic drill-down starts at **province level**
- Can view all 9 provinces
- Can drill down: provinces → regions → municipalities → wards
- No data scope restrictions

---

### **🏛️ PROVINCIAL ADMINISTRATORS**
**Limited to their assigned province only**

| **Email** | **Password** | **Name** | **Province** | **Province ID** |
|-----------|--------------|----------|--------------|-----------------|
| `gauteng.admin@membership.org.za` | `province123` | Gauteng Provincial Admin | Gauteng | 3 |
| `westerncape.admin@membership.org.za` | `province123` | Western Cape Provincial Admin | Western Cape | 9 |
| `kzn.admin@membership.org.za` | `province123` | KwaZulu-Natal Provincial Admin | KwaZulu-Natal | 4 |
| `easterncape.admin@membership.org.za` | `province123` | Eastern Cape Provincial Admin | Eastern Cape | 1 |

**Expected Behavior:**
- Geographic drill-down starts at **region level**
- Shows only regions within their province
- Can drill down: regions → municipalities → wards
- Data scope limited to their province

**Test Case - Gauteng Provincial Admin:**
- Should see: Johannesburg Metropolitan, Tshwane Metropolitan, Ekurhuleni Metropolitan, West Rand District
- Should NOT see: Cape Town regions or other provinces

---

### **🏙️ REGIONAL ADMINISTRATORS**
**Limited to their assigned region only**

| **Email** | **Password** | **Name** | **Region** | **Province** | **Region ID** |
|-----------|--------------|----------|------------|--------------|---------------|
| `joburg.region@membership.org.za` | `region123` | Johannesburg Regional Admin | Johannesburg Metropolitan | Gauteng | 1 |
| `tshwane.region@membership.org.za` | `region123` | Tshwane Regional Admin | Tshwane Metropolitan | Gauteng | 2 |
| `ekurhuleni.region@membership.org.za` | `region123` | Ekurhuleni Regional Admin | Ekurhuleni Metropolitan | Gauteng | 3 |
| `westrand.region@membership.org.za` | `region123` | West Rand Regional Admin | West Rand District | Gauteng | 4 |
| `capetown.region@membership.org.za` | `region123` | Cape Town Regional Admin | City of Cape Town Metropolitan | Western Cape | 8 |
| `ethekwini.region@membership.org.za` | `region123` | eThekwini Regional Admin | eThekwini Metropolitan | KwaZulu-Natal | 5 |

**Expected Behavior:**
- Geographic drill-down starts at **municipality level**
- Shows only municipalities within their region
- Can drill down: municipalities → wards
- Data scope limited to their region

**Test Case - Johannesburg Regional Admin:**
- Should see: City of Johannesburg municipality
- Should NOT see: Tshwane or other region municipalities

---

### **🏘️ MUNICIPAL ADMINISTRATORS**
**Limited to their assigned municipality only**

| **Email** | **Password** | **Name** | **Municipality** | **Region** | **Municipality ID** |
|-----------|--------------|----------|------------------|------------|---------------------|
| `joburg.municipal@membership.org.za` | `municipal123` | City of Johannesburg Municipal Admin | City of Johannesburg | Johannesburg Metropolitan | 1 |
| `tshwane.municipal@membership.org.za` | `municipal123` | City of Tshwane Municipal Admin | City of Tshwane | Tshwane Metropolitan | 2 |
| `ekurhuleni.municipal@membership.org.za` | `municipal123` | Ekurhuleni Municipal Admin | Ekurhuleni Metropolitan Municipality | Ekurhuleni Metropolitan | 3 |
| `mogale.municipal@membership.org.za` | `municipal123` | Mogale City Municipal Admin | Mogale City Local Municipality | West Rand District | 4 |
| `randfontein.municipal@membership.org.za` | `municipal123` | Randfontein Municipal Admin | Randfontein Local Municipality | West Rand District | 5 |
| `capetown.municipal@membership.org.za` | `municipal123` | Cape Town Municipal Admin | City of Cape Town Metropolitan Municipality | City of Cape Town Metropolitan | 7 |
| `ethekwini.municipal@membership.org.za` | `municipal123` | eThekwini Municipal Admin | eThekwini Metropolitan Municipality | eThekwini Metropolitan | 6 |

**Expected Behavior:**
- Geographic drill-down starts at **ward level**
- Shows only wards within their municipality
- Cannot drill down further (ward is lowest level)
- Data scope limited to their municipality

**Test Case - City of Johannesburg Municipal Admin:**
- Should see: Ward 1, Ward 2, Ward 3, Ward 4, Ward 5, Ward 6, Ward 7
- Should NOT see: Tshwane wards or other municipality wards

---

### **🏠 WARD ADMINISTRATORS**
**Limited to their assigned ward only**

| **Email** | **Password** | **Name** | **Ward** | **Municipality** | **Ward ID** |
|-----------|--------------|----------|----------|------------------|-------------|
| `joburg.ward1@membership.org.za` | `ward123` | Johannesburg Ward 1 Admin | Ward 1 | City of Johannesburg | 1 |
| `joburg.ward2@membership.org.za` | `ward123` | Johannesburg Ward 2 Admin | Ward 2 | City of Johannesburg | 2 |
| `joburg.ward3@membership.org.za` | `ward123` | Johannesburg Ward 3 Admin | Ward 3 | City of Johannesburg | 3 |
| `tshwane.ward1@membership.org.za` | `ward123` | Tshwane Ward 1 Admin | Ward 1 | City of Tshwane | 8 |
| `tshwane.ward2@membership.org.za` | `ward123` | Tshwane Ward 2 Admin | Ward 2 | City of Tshwane | 9 |
| `mogale.ward1@membership.org.za` | `ward123` | Mogale Ward 1 Admin | Ward 1 | Mogale City Local Municipality | 13 |
| `capetown.ward1@membership.org.za` | `ward123` | Cape Town Ward 1 Admin | Ward 1 | City of Cape Town Metropolitan Municipality | 15 |
| `capetown.ward2@membership.org.za` | `ward123` | Cape Town Ward 2 Admin | Ward 2 | City of Cape Town Metropolitan Municipality | 16 |

**Expected Behavior:**
- Geographic drill-down starts and stays at **ward level**
- Shows only their specific ward
- Cannot drill down further
- Data scope limited to their ward only

**Test Case - Johannesburg Ward 1 Admin:**
- Should see: Only Ward 1 data
- Should NOT see: Ward 2, Ward 3, or any other wards

---

### **👤 MEMBER USERS**
**Standard member access**

| **Email** | **Password** | **Name** | **Location** |
|-----------|--------------|----------|--------------|
| `member@example.com` | `member123` | John Doe | Johannesburg Ward 1 |
| `jane.smith@membership.org.za` | `member123` | Jane Smith | Cape Town Ward 1 |
| `michael.johnson@membership.org.za` | `member123` | Michael Johnson | Tshwane Ward 1 |
| `sarah.williams@membership.org.za` | `member123` | Sarah Williams | Mogale City Ward 1 |

---

## **🧪 COMPREHENSIVE TESTING SCENARIOS**

### **Scenario 1: Provincial Admin Scope Isolation**
1. Login as `gauteng.admin@membership.org.za` / `province123`
2. Navigate to Dashboard → Analytics
3. **Verify**: Geographic drill-down shows only Gauteng regions
4. **Verify**: Demographics show Gauteng-specific data
5. **Verify**: Cannot access Western Cape or other province data

### **Scenario 2: Regional Admin Scope Isolation**
1. Login as `joburg.region@membership.org.za` / `region123`
2. Navigate to Dashboard → Analytics
3. **Verify**: Geographic drill-down shows only Johannesburg municipalities
4. **Verify**: Demographics show Johannesburg-specific data
5. **Verify**: Cannot access Tshwane or other region data

### **Scenario 3: Municipal Admin Scope Isolation**
1. Login as `joburg.municipal@membership.org.za` / `municipal123`
2. Navigate to Dashboard → Analytics
3. **Verify**: Geographic drill-down shows only Johannesburg wards
4. **Verify**: Demographics show City of Johannesburg-specific data
5. **Verify**: Cannot access other municipality data

### **Scenario 4: Ward Admin Scope Isolation**
1. Login as `joburg.ward1@membership.org.za` / `ward123`
2. Navigate to Dashboard → Analytics
3. **Verify**: Geographic drill-down shows only Ward 1
4. **Verify**: Demographics show Ward 1-specific data
5. **Verify**: Cannot access other ward data

### **Scenario 5: Cross-Province Testing**
1. Login as `westerncape.admin@membership.org.za` / `province123`
2. **Verify**: Shows Western Cape regions (Cape Town, Cape Winelands, Overberg)
3. **Verify**: Does NOT show Gauteng regions
4. Login as `capetown.region@membership.org.za` / `region123`
5. **Verify**: Shows only Cape Town municipalities
6. **Verify**: Does NOT show other Western Cape region data

---

## **📊 EXPECTED DATA DISTRIBUTION**

### **Member Counts by Hierarchy Level**
- **Gauteng Province**: 3,245 members
  - **Johannesburg Region**: 1,245 members
    - **City of Johannesburg**: 1,245 members
      - **Ward 1**: 156 members
      - **Ward 2**: 134 members
      - **Ward 3**: 178 members
  - **Tshwane Region**: 987 members
    - **City of Tshwane**: 987 members
      - **Ward 1**: 123 members
      - **Ward 2**: 145 members
  - **West Rand Region**: 257 members
    - **Mogale City**: 128 members
      - **Ward 1**: 42 members

- **Western Cape Province**: 1,567 members
  - **Cape Town Region**: 945 members
    - **City of Cape Town**: 945 members
      - **Ward 1**: 189 members
      - **Ward 2**: 236 members

---

## **🔍 DEBUGGING TIPS**

### **Console Verification**
Check browser console for hierarchy filtering logs:
```javascript
🔄 Using Mock API for Geographic Distribution
🗺️ Mock Geographic Distribution Request: {
  level: "municipality", 
  parentId: undefined, 
  userHierarchy: { adminLevel: "region", regionId: 1 }
}
```

### **Common Issues**
1. **Wrong starting level**: Check `getInitialGeographicLevel()` function
2. **Data not filtered**: Verify `userHierarchy` object is passed correctly
3. **Empty data**: Ensure mock data includes the specific hierarchy IDs
4. **Cross-boundary access**: Verify boundary checking logic in mock API

---

## **🚀 QUICK TEST COMMANDS**

### **Database Setup**
```sql
-- Run the hierarchy test data SQL
mysql -u root -p membership_system < docs/hierarchy-test-data.sql
```

### **Frontend Testing**
```bash
# Start the React app
npm start

# Test URLs
http://localhost:3000/login
```

### **API Testing**
```bash
# Test authentication endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gauteng.admin@membership.org.za","password":"province123"}'
```
