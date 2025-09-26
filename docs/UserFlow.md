# User Flow Documentation

## 1. Membership Application
1. **Step 1**: User visits the membership application page.
2. **Step 2**: User fills out the application form (name, surname, ID number, etc.).
3. **Step 3**: System validates the data and stores it in the `Members Table`.
4. **Step 4**: User receives a confirmation email.

## 2. User Creation
1. **Step 1**: After a member is registered, a user account is created.
2. **Step 2**: User receives login credentials (email and password).

## 3. User Login
1. **Step 1**: User visits the login page.
2. **Step 2**: User enters email and password.
3. **Step 3**: System verifies credentials and generates a JWT token.
4. **Step 4**: User is redirected to their dashboard.

## 4. Member Dashboard
1. **Step 1**: User views their profile, membership status, and voter registration status.
2. **Step 2**: User can update their profile or renew their membership.

## 5. Admin Dashboard
1. **Step 1**: Admin logs in and is redirected to the admin dashboard.
2. **Step 2**: Admin views membership statistics and drills down into provinces, regions, municipalities, and wards.
3. **Step 3**: Admin can verify voter registration status for single or multiple members.

## 6. Voter Verification
1. **Step 1**: Admin selects a member or uploads a CSV file for bulk verification.
2. **Step 2**: System verifies voter registration status using the provided code.
3. **Step 3**: System updates the member’s profile with the voter status.

## 7. Analytics and Reporting
1. **Step 1**: Admin navigates to the analytics page.
2. **Step 2**: Admin views membership statistics at the national, provincial, regional, municipal, or ward level.
3. **Step 3**: Admin exports reports in CSV or PDF format.

## 8. Leadership Structure Management
1. **Step 1**: Admin navigates to the leadership management section.
2. **Step 2**: Admin selects a hierarchical level and corresponding structure:
   - **National Level**: Central Command Team (CCT) or National Executive Committee (NEC)
   - **Provincial Level**: Provincial Executive Committee (PEC) or Provincial Command Team (PCT)
   - **Regional Level**: Regional Executive Committee (REC) or Regional Command Team (RCT)
   - **Municipal Level**: Sub-Regional Command Team (SRCT)
   - **Ward Level**: Branch Executive Committee (BEC) or Branch Command Team (BCT)
3. **Step 3**: Admin views current leadership positions for the selected structure.
4. **Step 4**: Admin can assign new leadership roles, update existing roles, or end leadership terms.
5. **Step 5**: System validates the assignment to prevent duplicate active positions.
6. **Step 6**: System records the leadership role with start and end dates for historical tracking.