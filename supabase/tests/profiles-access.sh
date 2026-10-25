#!/bin/bash
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
db=profiles_access_test
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${db} WITH (FORCE);"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${db};"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db" -f "$root/supabase/tests/baseline.sql"
shopt -s nullglob
migrations=("$root"/supabase/migrations/*.sql)
if ((${#migrations[@]})); then
  for file in "${migrations[@]}"; do
    sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db" -f "$file"
  done
fi
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$db" -f "$root/supabase/tests/assert.sql"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${db} WITH (FORCE);"
echo "profiles access checks passed"
