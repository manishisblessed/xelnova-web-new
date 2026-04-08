# Phase 0 — Scope Alignment & Acceptance Criteria

> Locked: April 7, 2026
> Purpose: Remove ambiguity before build phases begin.

---

## Decision 1 — Customer Authentication

**Decision:** Customer login stays **phone OTP + Google** only.
Email OTP will NOT be added as a customer login method.

### What stays as-is
- Phone OTP via Fortius SMS → verify → login/register
- Google sign-in via token exchange
- Forgot password via phone OTP (already implemented)

### What needs fixing (Phase 2)
- Forgot password **email** branch currently shows a message but does NOT
  actually send a reset link/OTP. Either:
  - Remove the email tab from the forgot-password page, OR
  - Implement a proper email-based password reset token flow (send link via
    Resend → user clicks → sets new password).
- **Recommended:** Implement the email reset flow since users who signed up
  via email+password need a recovery path.

---

## Decision 2 — Support / Communication System

**Decision:** Ticket/thread helpdesk system with **admin as moderator**.

### Flow
```
Customer creates ticket (subject + message)
       ↓
Admin sees ticket in admin panel queue
       ↓
Admin can: reply to customer, forward ticket to seller, add internal notes
       ↓
Seller sees forwarded tickets in seller panel
       ↓
Seller replies → reply goes to admin (NOT directly to customer)
       ↓
Admin reviews seller reply → forwards to customer
       ↓
Customer sees admin's forwarded reply in their ticket thread
```

### Acceptance criteria
- [ ] Customer can create a ticket from Account → Support (optional: link to order)
- [ ] Customer sees their ticket list with statuses (Open, In Progress, Resolved, Closed)
- [ ] Customer can reply within their ticket thread
- [ ] Admin sees all tickets in admin panel with filters (status, date, customer, seller)
- [ ] Admin can reply to customer directly
- [ ] Admin can forward a ticket to a specific seller
- [ ] Admin can add internal notes (not visible to customer or seller)
- [ ] Admin can change ticket status and priority
- [ ] Seller sees tickets forwarded to them in seller panel
- [ ] Seller can reply (reply goes to admin, not customer)
- [ ] Email notification on ticket creation (to admin) and on reply (to customer)
- [ ] No real-time chat / WebSocket required — standard request/response

### Data model (minimal)
```
Ticket
  id, ticketNumber, subject, status, priority
  customerId → User
  orderId → Order (optional)
  assignedSellerId → SellerProfile (optional)
  assignedAdminId → User (optional)
  createdAt, updatedAt, closedAt

TicketMessage
  id, ticketId → Ticket
  senderId → User
  senderRole: CUSTOMER | SELLER | ADMIN
  message (text)
  isInternal (boolean — admin-only notes)
  isForwarded (boolean — admin forwarded seller reply to customer)
  createdAt
```

---

## Decision 3 — Split / Advance Payments

**Decision:** Add an **advance payout** feature alongside the existing payout system.

This is NOT Razorpay Route/Transfer (automatic split at payment time).
Instead, admin can release a partial amount to a seller before the normal
settlement cycle in emergency situations.

### Flow
```
Seller requests advance payout (optional — or admin initiates)
       ↓
Admin sees request in Payouts section
       ↓
Admin approves + specifies amount
       ↓
Amount is deducted from seller's pending balance / wallet
       ↓
Payout is processed (manual bank transfer or Razorpay payout API)
       ↓
Transaction recorded in seller wallet as ADVANCE_PAYOUT
```

### Acceptance criteria
- [ ] Admin can create an advance payout for any seller from the Payouts page
- [ ] Advance payout has: amount, reason/note, seller selection
- [ ] System validates: advance ≤ seller's pending/available balance
- [ ] Advance is recorded as a wallet transaction (new reference type: ADVANCE_PAYOUT)
- [ ] Subsequent normal settlement deducts the advance already paid
- [ ] Seller sees advance payouts in their Wallet / Payouts history
- [ ] Audit trail: who approved, when, reason

### Data model changes
- Add `ADVANCE_PAYOUT` to `WalletReferenceType` enum
- Add optional `isAdvance` boolean or `payoutType` field on payout records
- No changes to Razorpay integration (admin handles bank transfer manually
  or uses existing payout mechanism)

---

## Summary of all Partial / Not Done items — assigned to phases

### Phase 1 — SEO, discovery, polish
| Item | Type |
|------|------|
| Wire autocomplete into header search | Partial → fix |
| New arrivals homepage section | Not done |
| sitemap.xml | Not done |
| robots.txt | Not done |
| Per-product generateMetadata (SSR) | Partial → fix |
| JSON-LD schema markup | Not done |

### Phase 2 — Customer orders, money, trust
| Item | Type |
|------|------|
| Order invoice PDF (buyer) | Not done |
| Return/refund request workflow (customer-initiated) | Not done |
| Re-order / buy again | Not done |
| Customer wallet | Not done |
| Order confirmation email automation | Partial → fix |
| Forgot password email reset flow | Partial → fix |

### Phase 3 — Support & communication
| Item | Type |
|------|------|
| Ticket system (customer, seller, admin) | Not done |
| Admin-monitored communication | Not done |
| Complaint resolution / escalation | Not done |

### Phase 4 — Seller catalog & operations
| Item | Type |
|------|------|
| Bulk upload CSV/Excel | Not done |
| Inventory alerts (low stock) | Not done |
| Product SEO fields (metaTitle, metaDescription) | Partial → fix |
| SKU auto-generation | Partial → fix |
| Tax settings per product | Partial → fix |
| Seller brand creation → admin approval | Partial → fix |
| Settlement / payout reports (export) | Partial → fix |
| Sales analytics charts | Partial → fix |

### Phase 5 — Admin, payments, compliance
| Item | Type |
|------|------|
| Advance payout system | Not done (Decision 3 above) |
| TDS / GST reporting | Not done |
| Duplicate listing detection | Not done |
| Pricing checks / flags | Not done |
| Category-scoped coupons | Not done |
| Seller-specific coupons | Not done |
| Reverse pickup workflow (full) | Partial → fix |

### Phase 6 — Notifications & growth
| Item | Type |
|------|------|
| WhatsApp alerts | Not done |
| Abandoned cart recovery | Not done |
| Loyalty points | Not done |
| Referral program | Not done |
| COD verification | Not done |
| Fraud order detection | Not done |
| Extended warranty API | Not done |
| AI product recommendations | Not done |
| Multilingual support | Not done |
| Mobile app API documentation | Partial → fix |
