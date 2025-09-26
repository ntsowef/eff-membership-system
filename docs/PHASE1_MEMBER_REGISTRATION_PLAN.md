# 📋 Phase 1: Member Registration and Profile Management Implementation Plan

## 🎯 **OVERVIEW**

This document outlines the comprehensive implementation plan for Phase 1 of the membership system, focusing on member registration and profile management functionality. The plan builds upon the existing foundation and addresses gaps in the current implementation.

## 📊 **CURRENT STATE ANALYSIS**

### ✅ **What's Already Implemented:**
- **Backend API**: Member creation endpoint (`POST /api/members`)
- **Database Schema**: Complete members table with all required fields
- **Basic Validation**: Server-side validation for member data
- **Authentication**: JWT-based authentication system
- **Frontend Foundation**: React components and routing structure
- **Membership Application**: Basic application form exists

### ❌ **What's Missing:**
- **Complete Registration Flow**: End-to-end user registration process
- **Profile Management**: Comprehensive profile editing capabilities
- **Form Validation**: Client-side validation and error handling
- **File Upload**: Profile photo and document upload
- **Password Management**: Password reset and change functionality
- **User Experience**: Polished UI/UX for registration and profile management

### 🚫 **Excluded from Phase 1:**
- **Email Verification**: Account verification system (to be implemented in future phase)

## 🚀 **PHASE 1 IMPLEMENTATION PLAN**

### **MILESTONE 1: Enhanced Member Registration (Week 1-2)**

#### **1.1 Frontend Registration Form Enhancement**
- **File**: `frontend-react/src/components/forms/MemberRegistrationForm.tsx`
- **Features**:
  - Multi-step registration wizard (Personal Info → Contact Info → Address → Verification)
  - Real-time form validation with error messages
  - South African ID number validation and auto-population of date of birth
  - Hierarchical location selection (Province → Region → Municipality → Ward)
  - Terms and conditions acceptance
  - Progress indicator

#### **1.2 Backend Registration API Enhancement**
- **File**: `backend/src/controllers/member.controller.js`
- **Enhancements**:
  - Enhanced validation with detailed error messages
  - Duplicate email/ID number checking
  - Automatic membership number generation
  - Immediate account activation (no email verification required)
  - Success confirmation messaging

### **MILESTONE 2: Profile Management System (Week 2-3)**

#### **2.1 Member Profile Dashboard**
- **File**: `frontend-react/src/pages/member/Profile.tsx`
- **Features**:
  - Comprehensive profile view with all member information
  - Profile photo upload and management
  - Membership status and expiry information
  - Voter registration status
  - Recent activity timeline

#### **2.2 Profile Editing Interface**
- **File**: `frontend-react/src/components/forms/ProfileEditForm.tsx`
- **Features**:
  - Tabbed interface (Personal Info, Contact Info, Address, Security)
  - Inline editing with save/cancel functionality
  - Change history tracking
  - Restricted field editing (ID number, date of birth)
  - Address change with ward reassignment

#### **2.3 Backend Profile Management**
- **Files**:
  - `backend/src/controllers/profile.controller.js`
  - `backend/src/services/profileService.js`
- **Features**:
  - Profile update API with field-level validation
  - Change history logging
  - Profile photo upload handling
  - Address change workflow with admin approval

### **MILESTONE 3: Security and Account Management (Week 4)**

#### **3.1 Password Management**
- **Files**:
  - `frontend-react/src/components/forms/PasswordChangeForm.tsx`
  - `backend/src/controllers/password.controller.js`
- **Features**:
  - Password change functionality
  - Password reset via email
  - Password strength validation
  - Security question setup (optional)

#### **3.2 Account Security**
- **Features**:
  - Login history tracking
  - Account lockout after failed attempts
  - Session management
  - Two-factor authentication (optional)

### **MILESTONE 4: User Experience and Polish (Week 5)**

#### **4.1 UI/UX Enhancements**
- **Features**:
  - Responsive design optimization
  - Loading states and progress indicators
  - Success/error message system
  - Accessibility improvements
  - Mobile-first design

#### **4.2 Data Validation and Error Handling**
- **Features**:
  - Comprehensive client-side validation
  - Server-side validation with detailed error messages
  - Graceful error handling and recovery
  - Form auto-save functionality

## 📁 **DETAILED FILE STRUCTURE**

### **Frontend Components**
```
frontend-react/src/
├── components/
│   ├── forms/
│   │   ├── MemberRegistrationForm.tsx          # ✨ NEW - Multi-step registration
│   │   ├── ProfileEditForm.tsx                 # ✨ NEW - Profile editing
│   │   ├── PasswordChangeForm.tsx              # ✨ NEW - Password management
│   │   └── AddressChangeForm.tsx               # ✨ NEW - Address change workflow
│   ├── ui/
│   │   ├── FormWizard.tsx                      # ✨ NEW - Multi-step form component
│   │   ├── FileUpload.tsx                      # ✨ NEW - File upload component
│   │   └── ValidationMessage.tsx               # ✨ NEW - Validation message component
│   └── profile/
│       ├── ProfilePhoto.tsx                    # ✨ NEW - Profile photo management
│       ├── MembershipCard.tsx                  # ✨ NEW - Digital membership card
│       └── ChangeHistory.tsx                   # ✨ NEW - Change history display
├── pages/
│   ├── Register.tsx                            # 🔄 ENHANCED - Registration page
│   ├── member/
│   │   ├── Profile.tsx                         # 🔄 ENHANCED - Profile management
│   │   └── Dashboard.tsx                       # 🔄 ENHANCED - Member dashboard
│   └── auth/
│       └── ResetPassword.tsx                   # ✨ NEW - Password reset
└── services/
    ├── memberApi.ts                            # 🔄 ENHANCED - Member API calls
    ├── profileApi.ts                           # ✨ NEW - Profile management API
    └── uploadApi.ts                            # ✨ NEW - File upload API
```

### **Backend Structure**
```
backend/src/
├── controllers/
│   ├── member.controller.js                   # 🔄 ENHANCED - Member management
│   ├── profile.controller.js                  # ✨ NEW - Profile management
│   └── password.controller.js                 # ✨ NEW - Password management
├── services/
│   ├── memberService.js                       # 🔄 ENHANCED - Member business logic
│   ├── profileService.js                      # ✨ NEW - Profile management
│   ├── uploadService.js                       # ✨ NEW - File upload handling
│   └── validationService.js                   # ✨ NEW - Enhanced validation
├── middleware/
│   ├── upload.js                              # ✨ NEW - File upload middleware
│   ├── validation.js                          # 🔄 ENHANCED - Enhanced validation
│   └── rateLimit.js                           # ✨ NEW - Rate limiting
└── routes/
    ├── member.routes.js                       # 🔄 ENHANCED - Member routes
    ├── profile.routes.js                      # ✨ NEW - Profile routes
    └── upload.routes.js                       # ✨ NEW - Upload routes
```

## 🗄️ **DATABASE ENHANCEMENTS**

### **New Tables Required**
```sql
-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Profile change history
CREATE TABLE profile_changes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by INT NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- File uploads
CREATE TABLE file_uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  file_type ENUM('profile_photo', 'document', 'other') NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
```

### **Existing Table Enhancements**
```sql
-- Add new fields to members table
ALTER TABLE members ADD COLUMN profile_photo_id INT NULL;
ALTER TABLE members ADD COLUMN last_profile_update TIMESTAMP NULL;

-- Add foreign key for profile photo
ALTER TABLE members ADD FOREIGN KEY (profile_photo_id) REFERENCES file_uploads(id) ON DELETE SET NULL;

-- Add new fields to users table
ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL;
```

## 🔧 **TECHNICAL SPECIFICATIONS**

### **Frontend Technologies**
- **React 18** with TypeScript
- **React Hook Form** for form management
- **Zod** for client-side validation
- **React Query** for API state management
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Dropzone** for file uploads

### **Backend Technologies**
- **Node.js** with Express
- **MySQL2** for database operations
- **Multer** for file upload handling
- **bcryptjs** for password hashing
- **jsonwebtoken** for authentication
- **express-rate-limit** for rate limiting

### **Validation Rules**
- **South African ID Number**: 13-digit validation with checksum
- **Email**: RFC 5322 compliant email validation
- **Cell Number**: South African format (10 digits starting with 0)
- **Password**: Minimum 8 characters, mixed case, numbers, special characters
- **File Upload**: Max 5MB, specific file types (JPEG, PNG for photos)

## 📋 **ACCEPTANCE CRITERIA**

### **Registration Flow**
- [ ] User can complete multi-step registration form
- [ ] All form fields are validated in real-time
- [ ] Account is immediately activated upon successful registration
- [ ] User can login immediately after registration
- [ ] User receives success confirmation message

### **Profile Management**
- [ ] User can view complete profile information
- [ ] User can edit allowed profile fields
- [ ] Profile changes are saved and logged
- [ ] User can upload and change profile photo
- [ ] User can view change history

### **Security Features**
- [ ] User can change password securely
- [ ] User can reset password via email
- [ ] Failed login attempts are tracked and limited
- [ ] All sensitive operations are logged

### **User Experience**
- [ ] Forms are responsive and mobile-friendly
- [ ] Loading states are shown during operations
- [ ] Error messages are clear and helpful
- [ ] Success confirmations are displayed
- [ ] Navigation is intuitive and consistent

## 📅 **DETAILED IMPLEMENTATION TIMELINE (5 WEEKS)**

### **Week 1: Foundation and Registration Enhancement**

#### **Day 1-2: Database Setup**
- [ ] Create new database tables (password_reset_tokens, profile_changes, file_uploads)
- [ ] Add new columns to existing tables (profile_photo_id, last_profile_update, etc.)
- [ ] Create database migration scripts
- [ ] Test database changes with sample data

#### **Day 3-5: Backend Registration API**
- [ ] Enhance member.controller.js with improved validation
- [ ] Implement immediate account activation (no email verification)
- [ ] Add duplicate checking for email/ID number
- [ ] Add rate limiting middleware
- [ ] Write unit tests for registration endpoints

### **Week 2: Frontend Registration Form**

#### **Day 1-3: Multi-step Form Component**
- [ ] Create FormWizard.tsx component
- [ ] Build MemberRegistrationForm.tsx with steps
- [ ] Implement real-time validation with Zod
- [ ] Add progress indicator and navigation

#### **Day 4-5: Integration and Testing**
- [ ] Connect frontend form to backend API
- [ ] Implement error handling and success states
- [ ] Add loading states and user feedback
- [ ] Test complete registration flow

### **Week 2: Profile Management Backend**

#### **Day 1-2: Profile API Development**
- [ ] Create profile.controller.js
- [ ] Implement profileService.js with business logic
- [ ] Add profile update endpoints
- [ ] Implement change history tracking

#### **Day 3-5: File Upload System**
- [ ] Set up Multer for file uploads
- [ ] Create uploadService.js for file handling
- [ ] Implement profile photo upload endpoint
- [ ] Add file validation and security measures

### **Week 3: Profile Management Frontend**

#### **Day 1-3: Profile Dashboard**
- [ ] Enhance member/Profile.tsx page
- [ ] Create ProfilePhoto.tsx component
- [ ] Build MembershipCard.tsx component
- [ ] Add ChangeHistory.tsx component

#### **Day 4-5: Profile Editing**
- [ ] Create ProfileEditForm.tsx with tabs
- [ ] Implement inline editing functionality
- [ ] Add file upload component
- [ ] Connect to backend APIs

### **Week 4: Security and Account Management**

#### **Day 1-2: Password Management**
- [ ] Create password.controller.js
- [ ] Implement password reset functionality
- [ ] Build PasswordChangeForm.tsx
- [ ] Add password strength validation

#### **Day 3-5: Security Features**
- [ ] Implement account lockout mechanism
- [ ] Add login history tracking
- [ ] Create security settings page
- [ ] Add session management

### **Week 5: Polish and Testing**

#### **Day 1-2: UI/UX Improvements**
- [ ] Responsive design optimization
- [ ] Accessibility improvements
- [ ] Animation and transition polish
- [ ] Mobile testing and fixes

#### **Day 3-5: Final Testing and Documentation**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] User acceptance testing
- [ ] Documentation and deployment

## 🛠️ **DEVELOPMENT TASKS BREAKDOWN**

### **HIGH PRIORITY TASKS**

1. **Database Schema Updates** (Day 1)
   ```sql
   -- Run migration scripts
   -- Test with sample data
   -- Verify foreign key constraints
   ```

2. **Enhanced Registration API** (Day 2-3)
   ```javascript
   // Implement enhanced validation
   // Add email verification
   // Improve error handling
   ```

3. **Multi-step Registration Form** (Day 4-6)
   ```typescript
   // Create wizard component
   // Add form validation
   // Implement progress tracking
   ```

### **MEDIUM PRIORITY TASKS**

4. **Profile Management API** (Week 2)
5. **File Upload System** (Week 2)
6. **Profile Dashboard UI** (Week 3)
7. **Password Management** (Week 4)

### **LOW PRIORITY TASKS**

8. **Advanced Security Features** (Week 4)
9. **UI Polish and Animations** (Week 5)
10. **Performance Optimization** (Week 5)

## 🧪 **TESTING STRATEGY**

### **Unit Tests**
- [ ] Backend API endpoints
- [ ] Frontend form validation
- [ ] Service layer functions
- [ ] Utility functions

### **Integration Tests**
- [ ] Registration flow end-to-end
- [ ] Profile update workflow
- [ ] File upload functionality
- [ ] Password reset process

### **User Acceptance Tests**
- [ ] Registration user journey
- [ ] Profile management scenarios
- [ ] Mobile responsiveness
- [ ] Accessibility compliance

## 🚀 **IMMEDIATE NEXT STEPS**

1. **Create Development Branch**
   ```bash
   git checkout -b feature/phase1-member-registration
   ```

2. **Set Up Database Migrations**
   ```bash
   # Create migration files
   # Run database updates
   # Verify schema changes
   ```

3. **Install Required Dependencies**
   ```bash
   # Frontend dependencies
   npm install react-hook-form zod @hookform/resolvers
   npm install react-dropzone framer-motion

   # Backend dependencies
   npm install multer express-rate-limit
   ```

4. **Begin Implementation**
   - Start with database schema updates
   - Move to backend API enhancements
   - Then frontend form development

## 📊 **SUCCESS METRICS**

- **Registration Completion Rate**: >85% of started registrations completed
- **Account Activation Rate**: >95% of registrations successfully activated
- **Profile Update Frequency**: Average 2+ profile updates per member per year
- **User Satisfaction**: >4.5/5 rating for registration and profile experience
- **Security Incidents**: Zero security breaches related to registration/profile
- **Performance**: Registration form loads in <2 seconds
- **Mobile Usage**: >60% of registrations completed on mobile devices

## 🎯 **DELIVERABLES**

### **Week 1 Deliverables**
- [ ] Enhanced registration API with immediate activation
- [ ] Multi-step registration form with validation
- [ ] Database schema updates
- [ ] Unit tests for registration flow

### **Week 2-3 Deliverables**
- [ ] Complete profile management system
- [ ] File upload functionality
- [ ] Profile editing interface
- [ ] Change history tracking

### **Week 4-5 Deliverables**
- [ ] Password management system
- [ ] Security features implementation
- [ ] Polished user interface
- [ ] Complete documentation

---

**This comprehensive plan provides a clear roadmap for implementing robust member registration and profile management functionality that will serve as the foundation for the entire membership system.**
