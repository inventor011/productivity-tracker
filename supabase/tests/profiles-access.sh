#!/bin/bash
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
db=profiles_access_test
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${db} WITH (FORCE);"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${db};"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db" -f "$root/supabase/tests/baseline.sql"
a="$root/supabase/migrations/20261025160000_username_taken_and_revoke_rls_auto_enable.sql"
b="$root/supabase/migrations/20261025160001_profiles_select_own_row.sql"
if [[ -f "$a" && -f "$b" ]]; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db" -f "$a"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db" -f "$root/supabase/tests/assert-after-a.sql"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db" -f "$b"
fi
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db" -f "$root/supabase/tests/assert.sql"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${db} WITH (FORCE);"
echo "profiles access checks passed"
