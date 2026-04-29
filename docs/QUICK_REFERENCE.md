# Location Handling - Quick Reference Guide

## For Frontend Developers

### Import Location Store
```typescript
import { useLocationStore, autoDetectLocation, captureLocationFromIP } from '@/lib/store';
```

### Use Location in Component
```typescript
export function MyComponent() {
  const location = useLocationStore((s) => s.location);
  
  return (
    <div>
      Current location: {location?.city}, {location?.pincode}
    </div>
  );
}
```

### Change Location Programmatically
```typescript
const setLocation = useLocationStore((s) => s.setLocation);

setLocation({
  pincode: '110077',
  city: 'Delhi',
  state: 'DL',
  district: 'South Delhi',
});
```

### Detect Location from IP
```typescript
const location = await autoDetectLocation();
// Returns LocationData or null
```

### Payment/Checkout Location Capture
```typescript
import { 
  capturePaymentLocation, 
  verifyLocationConsistency,
  logPaymentLocation 
} from '@/lib/payment-location';

// In your payment handler
async function handlePayment(orderId: string) {
  const paymentLocation = await capturePaymentLocation();
  
  if (paymentLocation) {
    const verification = verifyLocationConsistency(
      paymentLocation,
      deliveryAddress.city,
      deliveryAddress.state
    );
    
    if (verification.riskLevel === 'high') {
      console.warn('High risk location mismatch');
      // Handle risk appropriately
    }
    
    await logPaymentLocation(orderId, paymentLocation);
  }
}
```

---

## Location Store API

### State
```typescript
// Current selected location
location: LocationData | null

// Whether auto-detection has been attempted
autoDetected: boolean

// Whether user dismissed the prompt
promptDismissed: boolean

// Whether modal should be shown
shouldShowModal: boolean
```

### Actions
```typescript
// Set location and mark prompt as dismissed
setLocation(data: LocationData): void

// Clear location
clearLocation(): void

// Mark auto-detection as attempted
setAutoDetected(v: boolean): void

// Mark prompt as dismissed
setPromptDismissed(v: boolean): void

// Control modal visibility
setShouldShowModal(v: boolean): void
```

### Helper Functions
```typescript
// Auto-detect from IP and return LocationData
async function autoDetectLocation(): Promise<LocationData | null>

// Get raw IP location data
async function captureLocationFromIP(): Promise<IPLocationData | null>

// Convert pincode to location details
async function lookupPincode(pincode: string): Promise<LocationData>
```

---

## Payment Location API

### Interfaces
```typescript
interface PaymentLocationData {
  ipAddress?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timestamp: number;
  userAgent: string;
}

interface LocationVerification {
  isConsistent: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  reason?: string;
}
```

### Functions
```typescript
// Capture payment location
async function capturePaymentLocation(): Promise<PaymentLocationData | null>

// Verify location consistency
function verifyLocationConsistency(
  paymentLocation: PaymentLocationData,
  deliveryCity: string,
  deliveryState: string
): LocationVerification

// Log to backend (for audit trail)
async function logPaymentLocation(
  orderId: string,
  paymentLocation: PaymentLocationData,
  deliveryCity?: string,
  deliveryState?: string
): Promise<boolean>

// Get device location (browser geolocation)
function getDeviceLocation(): Promise<{ 
  latitude: number; 
  longitude: number; 
  accuracy: number; 
} | null>
```

---

## Common Tasks

### Task: Show current location in UI
```typescript
import { useLocationStore } from '@/lib/store';

export function LocationDisplay() {
  const location = useLocationStore((s) => s.location);
  
  if (!location) {
    return <div>Location not set</div>;
  }
  
  return (
    <div>
      <span>{location.city}</span>
      <span>{location.pincode}</span>
    </div>
  );
}
```

### Task: Let user change location
```typescript
export function ChangeLocationButton() {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setOpen(true)}>
        Change Location
      </button>
      <LocationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

### Task: Capture location during checkout
```typescript
async function handleCheckout() {
  // Auto-detect location before showing order details
  const location = await autoDetectLocation();
  
  if (location) {
    useLocationStore.setState(s => ({
      ...s,
      location: location,
      promptDismissed: true
    }));
  }
  
  // Proceed to checkout
  router.push('/checkout');
}
```

### Task: Add payment location to order
```typescript
async function submitOrder(orderData) {
  // Capture payment location
  const paymentLocation = await capturePaymentLocation();
  
  // Verify it
  const verification = verifyLocationConsistency(
    paymentLocation,
    orderData.city,
    orderData.state
  );
  
  // Submit with location data
  const response = await fetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      ...orderData,
      paymentLocation,
      verification,
    }),
  });
  
  return response.json();
}
```

---

## Debugging

### Check Current Location
```typescript
// In browser console
localStorage.getItem('xelnova-location')
// Shows: { "state": { "location": {...}, "autoDetected": true, ... } }
```

### Test Auto-Detection
```typescript
import { autoDetectLocation } from '@/lib/store';

const location = await autoDetectLocation();
console.log('Detected location:', location);
```

### Check Payment Location
```typescript
import { capturePaymentLocation } from '@/lib/payment-location';

const paymentLocation = await capturePaymentLocation();
console.log('Payment location:', paymentLocation);
```

### Clear Location Storage
```typescript
// Clear from store
useLocationStore.setState(s => ({
  ...s,
  location: null,
  promptDismissed: false
}));

// OR clear from localStorage
localStorage.removeItem('xelnova-location');
```

---

## Common Errors & Solutions

### Error: "Location not found after auto-detect"
```
Cause: IP geolocation service unavailable or pincode invalid
Solution: Provide manual pincode entry in UI
```

### Error: "Modal shows on every page"
```
Cause: Old version of header component
Solution: Update header.tsx with pathname check
```

### Error: "Payment location is null"
```
Cause: Timeout or API unreachable
Solution: Don't block payment - log error and continue
// It's for security, not a blocker
```

### Error: "Location data not persisting"
```
Cause: localStorage disabled or incognito mode
Solution: Check browser settings; data still works in session
```

---

## Environment Variables

No new environment variables needed. Works with existing setup.

### Optional: API Endpoints to Create

```bash
POST /api/orders/log-location
# Purpose: Log payment location for audit trail
# Body: { orderId, location, verification, capturedAt }
# Returns: { success: boolean }
```

---

## Performance Tips

### 1. Don't Wait for Location
```typescript
// BAD: Blocks page load
const location = await autoDetectLocation();
render(location);

// GOOD: Auto-detect in background
useEffect(() => {
  autoDetectLocation().then(setLocation);
}, []);
render(location || <LoadingState />);
```

### 2. Cache Location
```typescript
// Location is auto-persisted by Zustand
// No need to call autoDetectLocation multiple times
```

### 3. Timeout All Requests
```typescript
// Already done in our code
// Timeouts: 5-10 seconds
// No hanging requests
```

---

## Testing

### Unit Test Template
```typescript
import { autoDetectLocation } from '@/lib/store/location-store';

describe('Location Store', () => {
  it('should auto-detect location', async () => {
    const location = await autoDetectLocation();
    expect(location).toBeDefined();
    expect(location?.pincode).toMatch(/^[1-9][0-9]{5}$/);
  });
});
```

### E2E Test Template
```typescript
// Go to home page
await page.goto('https://xelnova.in');

// Wait for auto-detection
await page.waitForSelector('[contains text="Deliver to"]');

// Check location is shown
const locationText = await page.textContent('[location-header]');
expect(locationText).toContain('Deliver to');
```

---

## Deployment Checklist

- [ ] All TypeScript types defined
- [ ] Error handling in place
- [ ] Timeout values set appropriately
- [ ] localStorage fallback tested
- [ ] Header pathname routing works
- [ ] Payment location capture ready
- [ ] Backend API endpoint created (if logging)
- [ ] Security review passed
- [ ] Mobile devices tested
- [ ] Cross-browser tested

---

## Support Links

- 📖 Full Documentation: `docs/LOCATION_HANDLING.md`
- 🔌 Integration Guide: `docs/PAYMENT_LOCATION_INTEGRATION.md`
- 📊 Before/After: `docs/BEFORE_AFTER_COMPARISON.md`
- 📋 Summary: `docs/LOCATION_ENHANCEMENT_SUMMARY.md`

---

**Last Updated:** April 29, 2026
**Version:** 1.0
**Status:** Ready for Production ✅
