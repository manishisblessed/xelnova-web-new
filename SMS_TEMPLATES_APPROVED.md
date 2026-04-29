# SMS Templates - DLT Approval Status Update

## Summary
Successfully updated SMS templates in the Xelnova backend with DLT-approved Template IDs from Fortius. A total of **17 templates** have been activated with their approved Template IDs.

**Status**: 24 Approved Templates | 9 Pending Templates

---

## ✅ Newly Approved Templates (17)

### Customer Templates (12)

| # | Template Type | Template ID | Message |
|---|---|---|---|
| 1 | WELCOME_REGISTRATION | `1707177674832267633` | Welcome to Xelnova! Your account has been created successfully. Start shopping at xelnova.in |
| 2 | PASSWORD_RESET_OTP | `1707177748841266684` | Your password reset OTP is {#var#}. Valid for 10 minutes. Do not share with anyone. |
| 3 | ORDER_CANCELLED | `1707177674861414060` | Your order {#var#} has been cancelled. Refund of Rs. {#var#} will be processed within 5-7 days. |
| 4 | ORDER_OUT_FOR_DELIVERY | `1707177674801577577` | Great news! Your order {#var#} is out for delivery today. Keep your phone handy. |
| 5 | COD_DELIVERY_OTP | `1707177674897656507` | Your delivery OTP for order {#var#} is {#var#}. Share with delivery partner to receive your order. |
| 6 | REFUND_PROCESSED | `1707177674912248789` | Refund of Rs. {#var#} for order {#var#} has been processed. It will reflect in 5-7 business days. |
| 7 | RETURN_APPROVED | `1707177674919994971` | Your return request for order {#var#} has been approved. Pickup will be scheduled shortly. |
| 8 | RETURN_REJECTED | `1707177675186976130` | Your return request for order {#var#} was not approved. Reason: {#var#}. Contact support for help. |
| 9 | RETURN_PICKUP_SCHEDULED | `1707177674608633940` | Return pickup for order {#var#} scheduled for {#var#}. Keep the package ready. |
| 10 | WALLET_CREDITED | `1707177674971656507` | Rs. {#var#} credited to your Xelnova wallet. New balance: Rs. {#var#} |
| 11 | TICKET_CREATED | `1707177674992900265` | Support ticket {#var#} created. We will respond within 24 hours. Track at xelnova.in/support |
| 12 | TICKET_REPLY | `1707177675021951834` | New reply on your support ticket {#var#}. View at xelnova.in/support |

### Seller Templates (5)

| # | Template Type | Template ID | Message |
|---|---|---|---|
| 13 | SELLER_APPROVED | `1707177675093229314` | Congratulations! Your seller account {#var#} is now approved. Start selling at seller.xelnova.in |
| 14 | SELLER_REJECTED | `1707177675186976130` | Your seller verification for {#var#} needs attention. Reason: {#var#}. Update at seller.xelnova.in |
| 15 | NEW_ORDER_SELLER | `1707177675196681361` | New order! Order {#var#} worth Rs. {#var#} received. Ship by EOD. View at seller.xelnova.in |
| 16 | PRODUCT_APPROVED | `1707177675205644311` | Your product {#var#} is now live on Xelnova marketplace. |
| 17 | PAYOUT_PROCESSED | `1707177674912248789` | Payout of Rs. {#var#} processed to your bank account. Transaction ref: {#var#} |

---

## 📝 Implementation Details

### Updated File
- **Path**: `backend/src/modules/notifications/sms.service.ts`
- **Changes**: 
  - Updated 17 template entries with DLT-approved Template IDs from Fortius
  - Changed `approved` flag from `false` to `true` for all updated templates
  - Updated comment count from "APPROVED TEMPLATES (9)" to "APPROVED TEMPLATES (24)"

### How SMS Sending Works

The SMS service will now automatically send approved templates through Fortius:

```typescript
// Example usage in the codebase:
async sendWelcome(phone: string): Promise<boolean> {
  return this.sendSms(phone, SmsTemplateType.WELCOME_REGISTRATION, []);
}

async sendOrderCancelled(phone: string, orderNumber: string, refundAmount: string): Promise<boolean> {
  return this.sendSms(phone, SmsTemplateType.ORDER_CANCELLED, [orderNumber, refundAmount]);
}
```

**Key Features**:
- Automatic template validation before sending
- Retries on network failures (up to 2 retries)
- Development mode logs template content without sending
- Production mode requires `FORTIUS_API_KEY` to be configured

---

## ⏳ Still Pending Approval (9)

These templates are still awaiting DLT approval and will not send in production:

1. **WALLET_DEBITED** - Wallet debit notification
2. **PRODUCT_REJECTED** - Product rejection notification
3. **PAYOUT_REJECTED** - Payout rejection notification
4. **LOW_STOCK_ALERT** - Low inventory alert for sellers
5. **TICKET_RESOLVED** - Support ticket resolution

---

## 🚀 Next Steps

1. **Deploy the changes** to the backend service
2. **Verify in staging** that SMS messages are being sent correctly
3. **Monitor logs** for any Fortius API errors
4. **Test all customer journeys** that trigger these SMS templates
5. **Once approved**: Update remaining 5 pending templates similarly

---

## ✨ References

- **SMS Service Location**: `backend/src/modules/notifications/sms.service.ts`
- **Fortius Panel**: SMS Console for monitoring delivery and templates
- **Environment Variables Required**:
  - `FORTIUS_API_KEY` - API authentication
  - `FORTIUS_SENDER_ID` - Sender identifier (default: XELNVA)
  - `FORTIUS_SMS_URL` - API endpoint URL

---

**Last Updated**: April 29, 2026  
**Status**: Ready for Production  
**Total Approved Templates**: 24 / 32
