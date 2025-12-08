# Quick Start Guide - Unified Financial Views Migration

## 🚀 Quick Commands

### For Linux/Mac Server:

```bash
# 1. Upload files to server
scp 021_unified_financial_transactions_view_server.sql user@server:/tmp/
scp run_unified_financial_views_migration.sh user@server:/tmp/

# 2. SSH to server
ssh user@server

# 3. Run migration
cd /tmp
chmod +x run_unified_financial_views_migration.sh
./run_unified_financial_views_migration.sh
```

### For Windows Server (PowerShell):

```powershell
# 1. Copy files to server (if remote)
# Use WinSCP, FileZilla, or RDP copy-paste

# 2. Open PowerShell as Administrator

# 3. Navigate to migrations folder
cd C:\path\to\backend\migrations

# 4. Run migration
.\run_unified_financial_views_migration.ps1
```

### Direct psql Commands (Any OS):

```bash
# Run both migrations in order
psql -h your_host -U eff_admin -d eff_membership_db -f 021_unified_financial_transactions_view_server.sql
psql -h your_host -U eff_admin -d eff_membership_db -f 023_financial_dashboard_summary_tables_server.sql
```

---

## 📋 Default Connection Details

If your setup uses defaults, just press Enter for each prompt:

- **Host:** localhost
- **Port:** 5432
- **Database:** eff_membership_db
- **User:** eff_admin
- **Password:** (you'll need to enter this)

---

## ✅ Verification Commands

After migration, run these to verify:

```sql
-- Check views exist
SELECT table_name FROM information_schema.views 
WHERE table_name LIKE '%financial%' ORDER BY table_name;

-- Count transactions
SELECT COUNT(*) FROM unified_financial_transactions;

-- View summary
SELECT * FROM financial_transactions_summary;
```

---

## 🔄 Restart Backend

After successful migration:

```bash
# PM2
pm2 restart backend

# Systemd
sudo systemctl restart eff-backend

# Docker
docker restart eff-backend

# Manual
# Kill the process and restart
```

---

## 🆘 Quick Troubleshooting

| Error | Solution |
|-------|----------|
| `psql: command not found` | Install PostgreSQL client: `sudo apt install postgresql-client` |
| `permission denied` | Use database superuser or grant CREATE permission |
| `relation does not exist` | Verify tables exist: `\dt` in psql |
| `column does not exist` | Check table structure: `\d membership_applications` |

---

## 📞 Need Help?

1. Check full README: `README_UNIFIED_FINANCIAL_VIEWS.md`
2. Review error messages in script output
3. Check backend logs for errors
4. Contact development team with error details

---

## 🎯 What This Does

**Migration 021** creates 4 views for financial oversight:
- ✅ `unified_financial_transactions` - All transactions in one place
- ✅ `financial_transactions_summary` - Statistics and summaries
- ✅ `pending_financial_reviews` - Transactions awaiting review
- ✅ `financial_audit_trail_view` - Complete audit trail

**Migration 023** creates 5 tables for dashboard performance:
- ✅ `daily_financial_summary` - Daily metrics
- ✅ `monthly_financial_summary` - Monthly trends
- ✅ `financial_reviewer_performance` - Reviewer tracking
- ✅ `financial_dashboard_cache` - Real-time caching
- ✅ `financial_kpi_tracking` - KPI tracking (13 initial KPIs)

**Result:** National Admin can now access all financial reviews and dashboards!

