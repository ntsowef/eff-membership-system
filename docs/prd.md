# Product Requirements Document (PRD)

## 1. Introduction
The goal of this project is to develop a **membership system** that supports a hierarchical structure (**National → Province → Region → Municipality → Ward**) and allows members to apply online, manage their profiles, and renew memberships. The system will also include **voter registration verification** and **analytics** for administrators.

## 2. Objectives
- Create a scalable membership system with a hierarchical structure.
- Allow members to apply online and manage their profiles.
- Enable administrators to manage members, view analytics, and verify voter registration.
- Ensure secure access control and data management.

## 3. Scope
The system will include the following features:
1. **User Roles**:
   - Members: Apply for membership, update profiles, and renew memberships.
   - Users: Created after a member is registered; can log in and access the system.
   - Administrators: Manage members, view analytics, and verify voter registration.
2. **Hierarchical Structure**:
   - National → Province → Region → Municipality → Ward.
3. **Membership Management**:
   - Online membership application.
   - Membership expiry tracking and renewal.
   - Voter registration verification.
4. **Analytics and Reporting**:
   - View membership statistics at each level.
   - Drill down into provinces, regions, municipalities, and wards.
   - Export reports in CSV or PDF format.

## Tech Stack:
- **Frontend**: Next.js + Tailwind CSS
- **Backend**: Node.js
- **Database**: MySQL
- **Authentication**: JWT or OAuth
- **Hosting**: TBD (e.g., Vercel, AWS, or DigitalOcean)



## 4. Functional Requirements
| **Feature**                       | **Description**                                                                 |
|-----------------------------------|---------------------------------------------------------------------------------|
| **Membership Application**        | Members can apply online and provide personal and hierarchical information.     |
| **User Creation**                 | Users are created after a member is registered.                                 |
| **Profile Management**            | Users can update their profiles (e.g., contact info, bio).                      |
| **Hierarchy Management**          | Admins can create, update, or delete levels (wards, municipalities, etc.).      |
| **Voter Registration Verification**| Verify if a member is registered to vote and display status on their profile.   |
| **Analytics Dashboard**           | View membership statistics and drill down into each level.                      |
| **Notifications**                 | Send notifications for role assignments, meetings, or updates.                  |
| **Admin Panel**                   | Admins and superusers can manage users, roles, and permissions.                 |

## 5. Non-Functional Requirements
- **Scalability**: Handle a large number of users and levels.
- **Performance**: Fast response times for user actions (e.g., < 2 seconds).
- **Security**: Secure authentication, authorization, and data encryption.
- **Usability**: Intuitive UI/UX for all user types.
- **Availability**: 99.9% uptime.

## 6. Data Model
### **Members Table**
- `member_id` (Primary Key)
- `name`
- `surname`
- `id_number` (Unique)
- `gender` (ENUM: Male, Female)
- `email`
- `cell_number`
- `residential_address`
- `branch_id` (Foreign Key to Branches Table)
- `membership_expiry_date`
- `voter_status` (ENUM: Registered, Not Registered, Pending Verification)
- `created_at`
- `updated_at`

### **Users Table**
- `user_id` (Primary Key)
- `member_id` (Foreign Key to Members Table)
- `email` (Unique)
- `password` (hashed)
- `role` (ENUM: Admin, Member)
- `created_at`
- `updated_at`

### **Branches Table**
- `branch_id` (Primary Key)
- `name` (e.g., Ward A, Ward B)
- `ward_number` (Unique)
- `municipality_id` (Foreign Key to Municipalities Table)

### **Municipalities Table**
- `municipality_id` (Primary Key)
- `name`
- `region_id` (Foreign Key to Regions Table)

### **Regions Table**
- `region_id` (Primary Key)
- `name`
- `province_id` (Foreign Key to Provinces Table)

### **Provinces Table**
- `province_id` (Primary Key)
- `name`
- `national_id` (Foreign Key to National Table)

### **National Table**
- `national_id` (Primary Key)
- `name`

## 7. Success Metrics
- 95% of members renew their membership on time.
- Administrators can view analytics within 2 seconds.
- New members can apply online and receive approval within 24 hours.

## 8. Risks and Mitigation
- **Risk**: Members may not renew their membership on time.
  - **Mitigation**: Send multiple reminders (30 days, 7 days, and on the day of expiration).
- **Risk**: Provincial administrators may try to access other provinces’ data.
  - **Mitigation**: Implement strict RBAC checks in the backend.