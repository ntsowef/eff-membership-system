#!/bin/bash
# =====================================================================================
# Production SMS Backfill Script (Docker-aware)
# Copies historical SMS logs from sms_send_log into sms_messages for Reports visibility
# =====================================================================================
# Usage: 
#   1. SSH into your production server
#   2. Navigate to the project root directory
#   3. Run: bash backend/scripts/backfill_production.sh
# =====================================================================================

set -e

CONTAINER="eff-membership-postgres"
DB_USER="${POSTGRES_USER:-eff_admin}"
DB_NAME="${POSTGRES_DB:-eff_membership_database}"

echo "🔄 SMS Reports Backfill Script (Production - Docker)"
echo "====================================================="
echo "   Container: $CONTAINER"
echo "   Database:  $DB_NAME"
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "❌ Docker container '$CONTAINER' is not running!"
  echo "   Start it first: docker compose -f docker-compose.postgres.yml up -d"
  exit 1
fi
echo "✅ Container is running"

# Count existing records
echo ""
echo "📊 Checking current data..."

EXISTING=$(docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM sms_messages;" | tr -d ' ')
echo "   sms_messages current count: $EXISTING"

LOG_COUNT=$(docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM sms_send_log WHERE source_type IN ('birthday', 'manual', 'expiration_reminder', 'voter_registration');" | tr -d ' ')
echo "   sms_send_log records to backfill: $LOG_COUNT"

echo ""
echo "📊 Source type breakdown:"
docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c \
  "SELECT source_type, COUNT(*) as count FROM sms_send_log WHERE source_type IN ('birthday', 'manual', 'expiration_reminder', 'voter_registration') GROUP BY source_type ORDER BY count DESC;"

if [ "$LOG_COUNT" = "0" ]; then
  echo "✅ Nothing to backfill."
  exit 0
fi

echo ""
read -p "⚠️  Proceed with backfilling $LOG_COUNT records? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "❌ Aborted."
  exit 0
fi

echo ""
echo "🚀 Running backfill in batches of 1000..."

# Run the backfill directly via SQL inside the Docker container
docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME <<'EOSQL'
DO $$
DECLARE
  batch_size INT := 1000;
  total_inserted INT := 0;
  batch_count INT := 0;
  rec RECORD;
  mapped_status TEXT;
  mapped_category TEXT;
BEGIN
  FOR rec IN 
    SELECT * FROM sms_send_log 
    WHERE source_type IN ('birthday', 'manual', 'expiration_reminder', 'voter_registration')
    ORDER BY id ASC
  LOOP
    -- Map status
    IF lower(rec.status) IN ('sent', 'delivered') THEN
      mapped_status := 'Sent';
    ELSIF lower(rec.status) IN ('failed', 'expired') THEN
      mapped_status := 'Failed';
    ELSIF lower(rec.status) = 'sending' THEN
      mapped_status := 'Sending';
    ELSE
      mapped_status := 'Pending';
    END IF;

    -- Map category
    CASE rec.source_type
      WHEN 'birthday' THEN mapped_category := 'Birthday';
      WHEN 'manual' THEN mapped_category := 'General';
      WHEN 'expiration_reminder' THEN mapped_category := 'Membership Renewal';
      WHEN 'voter_registration' THEN mapped_category := 'Voter Registration';
      ELSE mapped_category := 'General';
    END CASE;

    -- Insert (skip duplicates)
    INSERT INTO sms_messages (
      message_text, recipient_number, recipient_name,
      status, cost_per_message, provider_message_id, error_message, sent_at, category
    ) VALUES (
      rec.message_content,
      rec.recipient_phone,
      rec.recipient_name,
      mapped_status,
      COALESCE(rec.cost, 0.05),
      rec.message_id,
      rec.error_message,
      COALESCE(rec.created_at, NOW()),
      mapped_category
    )
    ON CONFLICT DO NOTHING;

    total_inserted := total_inserted + 1;
    
    IF total_inserted % 10000 = 0 THEN
      RAISE NOTICE '   Inserted % records...', total_inserted;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Total inserted: % records', total_inserted;
END;
$$;
EOSQL

echo ""
echo "📊 Verifying results..."
docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c \
  "SELECT category, COUNT(*) as count FROM sms_messages GROUP BY category ORDER BY count DESC;"

echo ""
echo "✅ Production backfill complete!"
