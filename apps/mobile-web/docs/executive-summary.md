---
title: "Xelnova Customer Mobile App — Executive Summary"
---

<div class="cover">

<div class="brand">
  <span class="logo">Xelnova</span>
  <span class="badge">Mobile · Customer</span>
</div>

# Customer Mobile App
## Delivery Summary · Ready for Build Pipeline

<div class="meta">
  <div><span class="meta-label">Project</span><span class="meta-value">Native customer shopping app · Android + iOS</span></div>
  <div><span class="meta-label">Status</span><span class="meta-value status-ok">All 4 phases complete · Type-safe · Lint-clean</span></div>
  <div><span class="meta-label">Codebase</span><span class="meta-value">Single Expo (React Native) repo · Same monorepo as web</span></div>
  <div><span class="meta-label">Date</span><span class="meta-value">May 2026</span></div>
</div>

</div>

<hr/>

## What Was Built

A complete customer storefront with **40+ screens**, at full feature parity with the existing Xelnova web app, plus mobile-native enhancements.

<div class="feature-grid">

<div class="feature">
<h4>Discover</h4>
<p>Home with hero carousel, deals, categories, recently-viewed; full-text search with filters, recent + popular queries.</p>
</div>

<div class="feature">
<h4>Buy</h4>
<p>Product detail with reviews & sharing, cart, multi-step checkout, Razorpay payments, COD.</p>
</div>

<div class="feature">
<h4>Track</h4>
<p>Order list & detail with timeline, shipment tracking, invoice download, cancel + retry-payment.</p>
</div>

<div class="feature">
<h4>Engage</h4>
<p>Loyalty points + redemption, referral program, wallet top-up, notifications inbox, push deep-linking.</p>
</div>

<div class="feature">
<h4>Support</h4>
<p>In-app chatbot that auto-creates tickets, threaded ticket replies with photo attachments.</p>
</div>

<div class="feature">
<h4>Manage</h4>
<p>Profile, addresses with PIN auto-fill, security (change password), settings, returns with photos.</p>
</div>

</div>

## Technical Foundation

<div class="two-col">

<div>

**Stack**
Expo SDK 54 · React Native 0.81 · NativeWind v4 · TanStack Query · FlashList · Razorpay · Expo Notifications

**Reuse**
100% backend reuse via shared `@xelnova/api` — zero contract drift between web and mobile.

**Library**
New `@xelnova/ui-native` — 18 reusable components, foundation for future seller and business apps.

</div>

<div>

**Quality bar**

<ul class="check-list">
<li>TypeScript strict mode — clean</li>
<li><code>tsc --noEmit</code> — 0 errors</li>
<li>Linter — 0 warnings</li>
<li>40+ typed routes</li>
<li>Encrypted token storage</li>
</ul>

</div>

</div>

## Path to Launch — ~6 Weeks

<div class="timeline">

<div class="t-row">
<span class="t-week">Week 1</span>
<span class="t-task">EAS build pipeline · Push credentials · Final assets</span>
</div>

<div class="t-row">
<span class="t-week">Week 2</span>
<span class="t-task">Internal alpha (10 users)</span>
</div>

<div class="t-row">
<span class="t-week">Week 3 – 4</span>
<span class="t-task">Closed beta — TestFlight + Play Internal</span>
</div>

<div class="t-row">
<span class="t-week">Week 5</span>
<span class="t-task">Submit to App Store + Play Store</span>
</div>

<div class="t-row launch">
<span class="t-week">Week 6</span>
<span class="t-task">Public launch · Day-one analytics</span>
</div>

</div>

## Outstanding Pre-Launch Items

EAS build profiles · Store listings (screenshots, copy) · APNs / FCM credentials · Final 1024×1024 app icon

<div class="footer">
<em>One backend. Two storefronts. Zero drift.</em>
</div>
