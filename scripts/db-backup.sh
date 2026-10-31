#!/usr/bin/env bash
# Full logical backup of a Postgres database, then a check that the file is readable.
#
#   DATABASE_URL='postgresql://...' ./scripts/db-backup.sh internal
#
# Needs pg_dump / pg_restore with a major version >= the server's (see the runbook).
# Writes backups/<label>-<UTC timestamp>.dump (custom format, compressed). backups/ is gitignored.
set -euo pipefail

label="${1:-db}"
: "${DATABASE_URL:?Set DATABASE_URL to the Postgres connection string}"
command -v pg_dump >/dev/null || { echo "pg_dump not found. Install PostgreSQL client tools first."; exit 1; }

cd "$(dirname "$0")/.."
mkdir -p backups
file="backups/${label}-$(date -u +%Y%m%dT%H%M%SZ).dump"

echo "Dumping to $file ..."
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$file"

entries=$(pg_restore --list "$file" | grep -c 'TABLE DATA' || true)
size=$(du -h "$file" | cut -f1)
if [ "$entries" -eq 0 ]; then
  echo "❌ Backup file has no table data. Do not continue."
  exit 1
fi
echo "✅ $file ($size, $entries tables with data). Copy it somewhere off this laptop too."
