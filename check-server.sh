#!/bin/bash

echo "============================================"
echo "  FULL HEALTH CHECK"
echo "============================================"

echo ""
echo "=== 1. PM2 STATUS ==="
pm2 status
echo ""

echo "=== 2. BACKEND ENV CHECK ==="
echo "Razorpay: $(grep RAZORPAY_KEY_ID ~/xelnova-web-new/backend/.env)"
echo "Fortius Key: $(grep FORTIUS_API_KEY ~/xelnova-web-new/backend/.env | cut -c1-30)..."
echo "Fortius Template ID: $(grep FORTIUS_OTP_TEMPLATE_ID ~/xelnova-web-new/backend/.env)"
echo "Fortius Sender: $(grep FORTIUS_SENDER_ID ~/xelnova-web-new/backend/.env)"
echo "NODE_ENV: $(grep NODE_ENV ~/xelnova-web-new/backend/.env)"
echo ""

echo "=== 3. FORTIUS_OTP_MESSAGE (raw bytes check) ==="
# Check if the env var has the placeholder
grep FORTIUS_OTP_MESSAGE ~/xelnova-web-new/backend/.env
echo ""
echo "Hex dump of FORTIUS_OTP_MESSAGE line (check for hidden chars):"
grep FORTIUS_OTP_MESSAGE ~/xelnova-web-new/backend/.env | xxd | head -5
echo ""

echo "=== 4. API HEALTH CHECK ==="
API_RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:4000/api/v1 2>/dev/null)
echo "$API_RESP" | head -3
echo ""

echo "=== 5. TEST OTP ENDPOINT ==="
OTP_RESP=$(curl -s -X POST http://localhost:4000/api/v1/auth/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+919090702705"}' 2>/dev/null)
echo "OTP Response: $OTP_RESP"
echo ""

echo "=== 6. CHECK SMS LOGS AFTER OTP SEND ==="
sleep 2
pm2 logs xelnova-api --lines 30 --nostream 2>/dev/null | grep -i 'SMS\|Fortius\|OTP' | tail -15
echo ""

echo "=== 7. TEST CANCEL ENDPOINT (should return 401 without auth) ==="
CANCEL_RESP=$(curl -s -X POST http://localhost:4000/api/v1/orders/XN-TEST/cancel \
  -H 'Content-Type: application/json' \
  -d '{"reason":"test"}' 2>/dev/null)
echo "Cancel Response: $CANCEL_RESP"
echo ""

echo "=== 8. ADMIN SHIPMENT ENDPOINT (should return 401 without auth) ==="
SHIP_RESP=$(curl -s -X PATCH http://localhost:4000/api/v1/admin/orders/test-id/shipment \
  -H 'Content-Type: application/json' \
  -d '{"awbNumber":"TEST123"}' 2>/dev/null)
echo "Shipment Response: $SHIP_RESP"
echo ""

echo "=== 9. PAYMENT CREATE ENDPOINT (should return 401 without auth) ==="
PAY_RESP=$(curl -s -X POST http://localhost:4000/api/v1/payment/create-order/test-id \
  -H 'Content-Type: application/json' 2>/dev/null)
echo "Payment Response: $PAY_RESP"
echo ""

echo "=== 10. CHECK ALL SITES RESPOND ==="
echo -n "Web (3000): "; curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null; echo ""
echo -n "Admin (3002): "; curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null; echo ""
echo -n "Seller (3003): "; curl -s -o /dev/null -w "%{http_code}" http://localhost:3003 2>/dev/null; echo ""
echo -n "API (4000): "; curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1 2>/dev/null; echo ""
echo ""

echo "=== 11. RAZORPAY MODE CHECK FROM BACKEND LOGS ==="
pm2 logs xelnova-api --lines 50 --nostream 2>/dev/null | grep -i 'PAYMENT\|razorpay\|test mode\|live mode' | tail -5
echo ""

echo "============================================"
echo "  HEALTH CHECK COMPLETE"
echo "============================================"
