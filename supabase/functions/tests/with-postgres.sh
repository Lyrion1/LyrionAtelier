#!/usr/bin/env bash
# Run a command against a throwaway local Postgres with the migrations applied.
#   supabase/functions/tests/with-postgres.sh deno test --allow-all tests/
# TEST_DATABASE_URL is exported to the command. When it is already set (CI
# uses a Postgres service container), the migrations are applied to that
# database instead and no local server is started.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS="$HERE/../../migrations"

apply() {
  for f in "$MIGRATIONS"/*.sql; do
    psql "$TEST_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null
  done
}

if [ -n "${TEST_DATABASE_URL:-}" ]; then
  apply
  exec "$@"
fi

BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
[ -x "$BIN/initdb" ] || { echo "Postgres server binaries not found under /usr/lib/postgresql" >&2; exit 1; }
DIR="$(mktemp -d)"
PORT=$(( 20000 + RANDOM % 20000 ))
AS=()
# initdb refuses to run as root.
if [ "$(id -u)" = 0 ]; then chown postgres "$DIR"; AS=(runuser -u postgres --); fi
"${AS[@]}" "$BIN/initdb" -D "$DIR/data" -U postgres --auth=trust >/dev/null
"${AS[@]}" "$BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
trap '"${AS[@]}" "$BIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null 2>&1; rm -rf "$DIR"' EXIT
export TEST_DATABASE_URL="postgresql://postgres@/postgres?host=$DIR&port=$PORT"
apply
"$@"
