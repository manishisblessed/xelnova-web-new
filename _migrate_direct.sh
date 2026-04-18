#!/bin/bash
# Temporarily switch DATABASE_URL to the un-pooled host for migration,
# run prisma migrate deploy, then restore the pooled URL.
set -e
cd ~/xelnova-web-new/backend

cp .env .env.bak.migrate
echo "Backed up .env -> .env.bak.migrate"

# Strip the '-pooler' substring from any line beginning with DATABASE_URL=
sed -i '/^DATABASE_URL=/{s/-pooler//g}' .env
echo "Patched DATABASE_URL (pooler removed). Current value (sanitised):"
grep '^DATABASE_URL=' .env | sed 's|://[^@]*@|://USER:PASS@|'

set +e
npx prisma migrate deploy
RC=$?
set -e

echo "Restoring original .env..."
mv .env.bak.migrate .env
grep '^DATABASE_URL=' .env | sed 's|://[^@]*@|://USER:PASS@|'

echo "prisma migrate deploy exit code: $RC"
exit $RC
