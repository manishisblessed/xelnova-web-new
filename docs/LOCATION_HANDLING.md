# Location Handling Implementation

## Overview

This document outlines the improved location handling strategy for Xelnova, which provides a better user experience by:

1. **Auto-detecting location on page load** using IP-based geolocation
2. **Showing location modal only on the home page** when no location is found
3. **Capturing location during payment** for security and compliance purposes
4. **Stopping repeated location prompts** across different pages

## Architecture

### 1. Location Store (`@/lib/store/location-store.ts`)

**State Management:**
- `location`: Currently selected location with city, district, state, and pincode
- `autoDetected`: Flag indicating whether auto-detection has been attempted
- `promptDismissed`: Tracks if user has dismissed the location prompt
- `shouldShowModal`: Controls modal visibility

**Key Functions:**

#### `autoDetectLocation(): Promise<LocationData | null>`
- Fetches user's location from `ipapi.co`
- Attempts to convert IP postal code to full location data via `lookupPincode()`
- Falls back to using city/region from IP data if pincode lookup fails
- Called automatically when user visits the site

#### `lookupPincode(pincode: string): Promise<LocationData>`
- Converts a 6-digit Indian pincode to location details
- Uses server-side proxy at `/api/pincode/[code]` for reliability
- Falls back to direct API call if server proxy fails
- Provides city, district, state information

#### `captureLocationFromIP(): Promise<IPLocationData | null>`
- Captures raw IP-based location data including latitude/longitude
- Used for payment location logging and security purposes
- Returns: `{ ipAddress, city, region, postal, country, latitude, longitude }`

### 2. Header Component (`@/components/layout/header.tsx`)

**Behavior Changes:**

1. **On Page Load:**
   - Auto-detects location using IP geolocation
   - Sets location automatically if found
   - No modal shown unless on home page

2. **Location Modal Trigger:**
   - **Only shown on home page** (`pathname === '/'`)
   - Appears after 2 seconds if:
     - No location has been auto-detected
     - User hasn't dismissed the prompt
   - Can always be manually opened via location button in header

3. **Location Display:**
   - Shows current location in top bar: "Deliver to [City] [Pincode]"
   - Users can click to change location anytime

**Key Changes:**
```typescript
// Added pathname check
const pathname = usePathname();
const isHomePage = pathname === '/';

// Only show modal on home page
if (!isHomePage) return;
```

### 3. Payment Location Tracking (`@/lib/payment-location.ts`)

**Purpose:**
- Captures user's IP location during checkout for security
- Verifies location consistency between payment and delivery addresses
- Logs location data for fraud detection and compliance

**Key Functions:**

#### `capturePaymentLocation(): Promise<PaymentLocationData>`
- Captures IP-based location + device geolocation (if available)
- Returns timestamp and user agent
- Called at checkout/payment stage

#### `verifyLocationConsistency(paymentLocation, deliveryCity, deliveryState): VerificationResult`
- Compares payment location with delivery address
- Returns risk level: `low`, `medium`, or `high`
- Flags potential fraud or shipping issues

#### `logPaymentLocation(orderId, paymentLocation, deliveryCity?, deliveryState?): Promise<boolean>`
- Sends payment location data to backend
- Includes verification results
- Used for audit trail and security analysis

## User Journey

### Home Page
1. User visits `xelnova.in`
2. Auto-detection runs immediately
3. If successful → location set silently, no modal
4. If unsuccessful → modal shown after 2 seconds asking user to enter pincode
5. User can:
   - Click "Detect my location" (browser geolocation)
   - Enter pincode manually
   - Dismiss and come back later

### Other Pages (Products, Search, Checkout, etc.)
- **No location modal** is shown automatically
- User can manually change location via header button
- Current location persists across pages

### Checkout/Payment
1. Before payment, system captures user's IP location
2. Compares with delivery address for security
3. Logs location data with order for compliance
4. User proceeds with payment

## Technical Details

### Location Detection Priority
1. Browser geolocation (if user grants permission)
2. IP-based location via `ipapi.co`
3. Pincode lookup for detailed location data

### Storage & Persistence
- Location data stored in browser's `localStorage`
- Uses Zustand persist middleware with key `'xelnova-location'`
- Persists across sessions

### API Endpoints
- **IP Location:** `https://ipapi.co/json/` (external service)
- **Pincode Lookup:** `/api/pincode/[pincode]` (internal proxy)
- **Reverse Geocoding:** `https://nominatim.openstreetmap.org/reverse` (used in location modal)

### Error Handling
- All location operations have timeouts (5-10 seconds)
- Graceful fallbacks if any service is unavailable
- No blocking of user experience if location detection fails

## Configuration

### Environment Variables
No new environment variables required. Existing configuration should work as-is.

### Feature Flags
Could be added for:
- Disabling auto-detection in certain regions
- Location modal frequency
- Payment location logging

## Security Considerations

### Privacy
- Geolocation asks user for permission (not automatic)
- IP location is standard industry practice
- Payment location is logged only during checkout
- All requests use HTTPS

### Fraud Detection
- Location consistency check helps detect suspicious orders
- IP + delivery address mismatch flagged for review
- Audit trail maintained for all location captures

### Compliance
- Location data capture during payment complies with:
  - PCI DSS (fraud detection)
  - Card scheme requirements
  - Anti-fraud regulations

## Testing Checklist

- [ ] Auto-detect location on home page load
- [ ] Location modal shows only on home page
- [ ] Manual location change still works from header
- [ ] Location persists across page navigation
- [ ] Payment location is captured correctly
- [ ] Location consistency verification works
- [ ] No location errors affect checkout flow
- [ ] Works on mobile and desktop
- [ ] Works with slow/no internet connection

## Future Enhancements

1. **Cached Location Suggestions**
   - Remember last 5 locations user searched
   - Quick access to frequently used locations

2. **Multiple Addresses**
   - Save delivery addresses per location
   - Auto-populate at checkout

3. **Analytics**
   - Track location distribution of users
   - Identify high-demand areas

4. **International Support**
   - Currently India-only with pincodes
   - Extend to international zip codes/postcodes

## Migration Notes

### From Old Implementation
- Old implementation showed modal on every page
- **New:** Modal only shows on home page
- Users may notice location prompt appears less frequently (intentional improvement)
- Existing stored locations are compatible

### No Breaking Changes
- All existing location store methods remain the same
- API signatures unchanged
- Backward compatible with existing code
