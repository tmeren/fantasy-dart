#!/usr/bin/env bash
# Sync local PostgreSQL → Railway PostgreSQL (production).
#
# Dumps local fantasy_darts DB and restores to Railway's public Postgres.
# This is a FULL REPLACE — production data will match local exactly.
#
# Usage:
#   ./scripts/sync_db_to_prod.sh              # Full sync
#   ./scripts/sync_db_to_prod.sh --dry-run    # Show what would happen
#   ./scripts/sync_db_to_prod.sh --data-only  # Only sync data, not schema

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
LOCAL_DB="fantasy_darts"
LOCAL_USER="${PGUSER:-tevfikeren}"
PROD_URL="postgresql://postgres:VCvLcJjQAwZwSVTlljYsxqeuJrIhlTod@interchange.proxy.rlwy.net:47560/railway"
DUMP_FILE="/tmp/fantasy_darts_dump.sql"
PSQL="/opt/homebrew/opt/postgresql@17/bin/psql"
PG_DUMP="/opt/homebrew/opt/postgresql@17/bin/pg_dump"

# ── Parse args ────────────────────────────────────────────────────────────────
DRY_RUN=false
DATA_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --dry-run)  DRY_RUN=true ;;
    --data-only) DATA_ONLY=true ;;
  esac
done

echo "=== Fantasy Darts DB Sync: Local → Production ==="
echo "Local:  ${LOCAL_DB} (user: ${LOCAL_USER})"
echo "Target: Railway PostgreSQL (interchange.proxy.rlwy.net)"
echo ""

# ── Step 1: Verify local DB ──────────────────────────────────────────────────
echo ">> Step 1: Checking local database..."
LOCAL_MATCHES=$($PSQL -d "$LOCAL_DB" -t -c "SELECT COUNT(*) FROM matches WHERE status='Completed';" 2>/dev/null | tr -d ' ')
LOCAL_USERS=$($PSQL -d "$LOCAL_DB" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
echo "   Local: ${LOCAL_MATCHES} completed matches, ${LOCAL_USERS} users"

# ── Step 2: Check production DB ──────────────────────────────────────────────
echo ">> Step 2: Checking production database..."
PROD_MATCHES=$($PSQL "$PROD_URL" -t -c "SELECT COUNT(*) FROM matches WHERE status='Completed';" 2>/dev/null | tr -d ' ')
PROD_USERS=$($PSQL "$PROD_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
echo "   Prod:  ${PROD_MATCHES} completed matches, ${PROD_USERS} users"

if [ "$LOCAL_MATCHES" = "$PROD_MATCHES" ]; then
  echo ""
  echo ">> Databases already in sync (${LOCAL_MATCHES} matches). Nothing to do."
  exit 0
fi

echo ""
echo "   Delta: ${LOCAL_MATCHES} local vs ${PROD_MATCHES} prod"

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo ">> DRY RUN — would sync ${LOCAL_MATCHES} matches to production"
  exit 0
fi

# ── Step 3: Dump local DB ────────────────────────────────────────────────────
echo ">> Step 3: Dumping local database..."
DUMP_OPTS="--no-owner --no-privileges --no-comments"
if [ "$DATA_ONLY" = true ]; then
  DUMP_OPTS="$DUMP_OPTS --data-only"
fi
$PG_DUMP -d "$LOCAL_DB" $DUMP_OPTS > "$DUMP_FILE"
DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "   Dump created: ${DUMP_FILE} (${DUMP_SIZE})"

# ── Step 4: Restore to production ────────────────────────────────────────────
echo ">> Step 4: Restoring to production..."
if [ "$DATA_ONLY" = true ]; then
  # Data-only: truncate tables first, then restore data
  echo "   Truncating production tables..."
  $PSQL "$PROD_URL" -c "
    TRUNCATE activities, bets, quiz_responses, whatsapp_logs, quiz_questions,
             selections, markets, matches, users RESTART IDENTITY CASCADE;
  " 2>/dev/null
  echo "   Restoring data..."
  $PSQL "$PROD_URL" -f "$DUMP_FILE" > /dev/null 2>&1
else
  # Full sync: drop and recreate everything
  echo "   Dropping existing tables..."
  $PSQL "$PROD_URL" -c "
    DROP TABLE IF EXISTS quiz_responses, whatsapp_logs, quiz_questions,
                         bets, activities, selections, markets, matches, users CASCADE;
  " 2>/dev/null
  echo "   Restoring schema + data..."
  $PSQL "$PROD_URL" -f "$DUMP_FILE" > /dev/null 2>&1
fi

# ── Step 5: Verify ───────────────────────────────────────────────────────────
echo ">> Step 5: Verifying production..."
NEW_PROD_MATCHES=$($PSQL "$PROD_URL" -t -c "SELECT COUNT(*) FROM matches WHERE status='Completed';" 2>/dev/null | tr -d ' ')
NEW_PROD_USERS=$($PSQL "$PROD_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
echo "   Prod now: ${NEW_PROD_MATCHES} completed matches, ${NEW_PROD_USERS} users"

if [ "$NEW_PROD_MATCHES" = "$LOCAL_MATCHES" ]; then
  echo ""
  echo "=== SYNC COMPLETE === Production matches local (${NEW_PROD_MATCHES} matches) ==="
else
  echo ""
  echo "=== WARNING === Mismatch: local=${LOCAL_MATCHES}, prod=${NEW_PROD_MATCHES} ==="
  exit 1
fi

# Cleanup
rm -f "$DUMP_FILE"
