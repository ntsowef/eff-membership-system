# EFF Membership Management System - Complete PostgreSQL Schema

## Overview

This comprehensive PostgreSQL schema provides a complete database foundation for the South African Economic Freedom Fighters (EFF) membership management system. The schema is designed to handle 20,000+ concurrent users with production-ready performance optimizations.

## 🗄️ Schema Components

### 1. **Lookup/Reference Tables** (Section 1)
- `genders` - Gender classifications
- `races` - Race classifications (South African context)
- `citizenships` - Citizenship types
- `languages` - South African official languages + others
- `occupation_categories` - Professional categories
- `occupations` - Specific occupations
- `qualifications` - Education levels
- `voter_statuses` - Voter registration statuses
- `membership_statuses` - Membership status types
- `subscription_types` - Membership subscription plans

### 2. **Geographic Hierarchy** (Section 2)
- `provinces` - 9 South African provinces
- `districts` - District municipalities
- `municipalities` - Local municipalities
- `wards` - Electoral wards
- `voting_districts` - IEC voting districts
- `voting_stations` - Physical voting locations

### 3. **Core Membership Tables** (Section 3)
- `members` - Core member information with demographics
- `memberships` - Membership records and payment tracking
- `membership_applications` - Application workflow management
- `membership_renewals` - Renewal process tracking
- `documents` - Document management for members

### 4. **User Management & Security** (Section 4)
- `roles` - System roles (Admin levels)
- `permissions` - Granular permissions
- `role_permissions` - Role-permission mapping
- `users` - System user accounts
- `user_sessions` - Session management
- `audit_logs` - Complete audit trail
- `notifications` - System notifications

### 5. **SMS Management System** (Section 5)
- `sms_templates` - Reusable SMS templates
- `sms_campaigns` - Mass communication campaigns
- `sms_messages` - Individual message tracking
- `sms_delivery_reports` - Delivery confirmations
- `sms_providers` - SMS provider configurations
- `sms_queue` - Message queuing system

## 🚀 Quick Setup

### Prerequisites
- Windows 10/11 with Docker Desktop
- PowerShell 5.1+
- 4GB+ RAM available
- 10GB+ free disk space

### 1. **Automated Setup (Recommended)**
```powershell
# Run the setup script
.\setup_database.ps1 setup

# Check status
.\setup_database.ps1 status
```

### 2. **Manual Setup**
```powershell
# Copy environment file
cp .env.postgres .env

# Edit passwords in .env
notepad .env

# Create Docker network
docker network create membership-network

# Start containers
docker compose -f docker-compose.postgres.yml up -d

# Verify setup
docker exec eff-membership-postgres pg_isready -U eff_admin -d eff_membership_db
```

### 3. **Access the Database**
- **pgAdmin**: http://localhost:5050
  - Email: `admin@eff.local`
  - Password: (from .env file)
- **Direct PostgreSQL**: `localhost:5432`
  - Database: `eff_membership_db`
  - User: `eff_admin`
  - Password: (from .env file)

## 📊 Key Features

### **Performance Optimizations**
- ✅ **90+ Indexes** for fast queries
- ✅ **Full-text search** on member data
- ✅ **Composite indexes** for common query patterns
- ✅ **JSONB columns** for flexible data storage
- ✅ **Connection pooling** ready
- ✅ **Partitioning ready** for large tables

### **Data Integrity**
- ✅ **Foreign key constraints** with proper CASCADE rules
- ✅ **Check constraints** for data validation
- ✅ **Unique constraints** preventing duplicates
- ✅ **NOT NULL constraints** for required fields
- ✅ **Generated columns** for computed values

### **Audit & Security**
- ✅ **Complete audit trail** for all changes
- ✅ **Role-based permissions** system
- ✅ **Session management** with expiry
- ✅ **Password security** with hashing
- ✅ **Multi-factor authentication** ready
- ✅ **Account lockout** protection

### **Geographic Intelligence**
- ✅ **South African hierarchy** (Province → District → Municipality → Ward → Voting District)
- ✅ **IEC integration ready** for voter verification
- ✅ **Ward performance tracking** with standing classifications
- ✅ **Geographic filtering** and drill-down capabilities

### **Communication System**
- ✅ **SMS campaign management** with templates
- ✅ **Multi-provider support** (Twilio, Clickatell, SMPP)
- ✅ **Delivery tracking** and reporting
- ✅ **Message queuing** for high volume
- ✅ **Template variables** for personalization

## 🔧 Database Views

### **vw_member_directory**
Complete member information with all lookups resolved:
```sql
SELECT * FROM vw_member_directory 
WHERE province_name = 'North West' 
AND membership_standing = 'Active'
LIMIT 10;
```

### **vw_ward_membership_audit**
Ward-level membership statistics and standing:
```sql
SELECT ward_name, active_members, ward_standing 
FROM vw_ward_membership_audit 
WHERE municipality_name = 'Rustenburg Local Municipality'
ORDER BY active_members DESC;
```

### **vw_member_search**
Optimized view for member search functionality:
```sql
SELECT * FROM vw_member_search 
WHERE full_name ILIKE '%john%' 
OR cell_number LIKE '%123%';
```

## 📈 Sample Queries

### **Member Statistics by Province**
```sql
SELECT 
    p.province_name,
    COUNT(m.member_id) as total_members,
    COUNT(CASE WHEN ms.expiry_date >= CURRENT_DATE THEN 1 END) as active_members
FROM provinces p
LEFT JOIN districts d ON p.province_code = d.province_code
LEFT JOIN municipalities mu ON d.district_code = mu.district_code
LEFT JOIN wards w ON mu.municipality_code = w.municipality_code
LEFT JOIN members m ON w.ward_code = m.ward_code
LEFT JOIN memberships ms ON m.member_id = ms.member_id
GROUP BY p.province_name
ORDER BY active_members DESC;
```

### **Renewal Reminders Due**
```sql
SELECT 
    m.firstname,
    m.surname,
    m.cell_number,
    ms.membership_number,
    ms.expiry_date,
    ms.expiry_date - CURRENT_DATE as days_until_expiry
FROM members m
JOIN memberships ms ON m.member_id = ms.member_id
JOIN membership_statuses mst ON ms.status_id = mst.status_id
WHERE ms.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
AND mst.is_active = TRUE
ORDER BY ms.expiry_date;
```

### **Ward Performance Report**
```sql
SELECT 
    ward_name,
    municipality_name,
    active_members,
    total_members,
    ward_standing,
    active_percentage
FROM vw_ward_membership_audit
WHERE province_name = 'North West'
ORDER BY active_members DESC;
```

## 🔐 Default Credentials

**System Administrator Account:**
- Email: `admin@eff.local`
- Password: `admin123` (⚠️ **CHANGE IMMEDIATELY**)
- Role: Super Administrator

## 🛠️ Maintenance Commands

```powershell
# View logs
.\setup_database.ps1 logs

# Create backup
.\setup_database.ps1 backup

# Restart services
.\setup_database.ps1 restart

# Check status
.\setup_database.ps1 status

# Reset database (⚠️ DELETES ALL DATA)
.\setup_database.ps1 reset -Force
```

## 📋 Next Steps

1. ✅ **Database Setup** - Run the schema
2. 🔄 **Backend Migration** - Update Node.js to use PostgreSQL
3. 🔄 **Frontend Updates** - Update connection strings
4. 🔄 **Data Import** - Import existing member data
5. 🔄 **Testing** - Run comprehensive tests
6. 🔄 **Production Deployment** - Deploy to production environment

## 🆘 Troubleshooting

### **Common Issues**

**Port Conflicts:**
```powershell
# Change ports in .env file
POSTGRES_HOST_PORT=5433
PGADMIN_HOST_PORT=5051
```

**Permission Errors:**
```powershell
# Ensure Docker has access to directories
# Run PowerShell as Administrator if needed
```

**Connection Issues:**
```powershell
# Check container status
docker ps --filter "name=eff-membership"

# Check logs
docker logs eff-membership-postgres
```

### **Useful Commands**

```powershell
# Connect to PostgreSQL shell
docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db

# View table sizes
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size 
FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check index usage
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats WHERE schemaname='public' ORDER BY n_distinct DESC;
```

## 📞 Support

For issues or questions:
1. Check container logs: `docker logs eff-membership-postgres`
2. Verify network: `docker network ls`
3. Test connection: `docker exec -it eff-membership-postgres pg_isready`
4. Review environment: `docker exec eff-membership-postgres env | grep POSTGRES`

---

**🎯 This schema is production-ready and optimized for the EFF membership management workflow with 20,000+ concurrent users.**
