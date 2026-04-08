#!/bin/bash
set -e

echo "=== 1. Fix FORTIUS_OTP_MESSAGE in .env ==="
# Check if it exists
if grep -q 'FORTIUS_OTP_MESSAGE' ~/xelnova-web-new/backend/.env; then
  echo "Found existing FORTIUS_OTP_MESSAGE, replacing..."
  sed -i '/FORTIUS_OTP_MESSAGE/d' ~/xelnova-web-new/backend/.env
fi

# Add the correct DLT template message
echo 'FORTIUS_OTP_MESSAGE="XELNOVA: Your OTP is {#var#}. Please do not share this code with anyone. It is valid for 10 minutes."' >> ~/xelnova-web-new/backend/.env
echo "Added FORTIUS_OTP_MESSAGE"

# Also fix in ~/backend/.env for backup
if ! grep -q 'FORTIUS_OTP_MESSAGE' ~/backend/.env 2>/dev/null; then
  echo 'FORTIUS_OTP_MESSAGE="XELNOVA: Your OTP is {#var#}. Please do not share this code with anyone. It is valid for 10 minutes."' >> ~/backend/.env
fi

echo ""
echo "=== 2. Verify .env has all Fortius vars ==="
grep FORTIUS ~/xelnova-web-new/backend/.env
echo ""

echo "=== 3. Restart backend to pick up new env ==="
pm2 restart xelnova-api
sleep 5
echo ""

echo "=== 4. Check Razorpay mode in new logs ==="
pm2 logs xelnova-api --lines 30 --nostream 2>/dev/null | grep -iE 'PAYMENT|razorpay|test mode|live mode|Nest application' | tail -5
echo ""

echo "=== 5. Test OTP again ==="
OTP_RESP=$(curl -s -X POST http://localhost:4000/api/v1/auth/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+919090702705"}')
echo "OTP Response: $OTP_RESP"
echo ""

sleep 2
echo "=== 6. Check SMS logs ==="
pm2 logs xelnova-api --lines 20 --nostream 2>/dev/null | grep -i 'SMS' | tail -10
echo ""

echo "=== 7. PM2 status (confirm 0 restarts) ==="
pm2 status
echo ""

echo "=== DONE ==="
