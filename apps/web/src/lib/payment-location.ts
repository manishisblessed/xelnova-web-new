/**
 * Payment Location Utility
 * Captures and logs user location during payment for security and compliance purposes
 */

export interface PaymentLocationData {
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

/**
 * Capture user location from IP during payment
 * This is used for fraud detection and security purposes
 */
export async function capturePaymentLocation(): Promise<PaymentLocationData | null> {
  try {
    const [geoData, ipData] = await Promise.all([
      fetch('https://ipapi.co/json/', { 
        signal: AbortSignal.timeout(5000),
        headers: { 'Accept': 'application/json' },
      })
        .then(res => res.ok ? res.json() : null)
        .catch(() => null),
      getDeviceLocation(),
    ]);

    if (!geoData) return null;

    const locationData: PaymentLocationData = {
      ipAddress: geoData.ip,
      city: geoData.city,
      region: geoData.region,
      postalCode: geoData.postal,
      country: geoData.country_name,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    // Add browser geolocation if available
    if (ipData) {
      locationData.latitude = ipData.latitude;
      locationData.longitude = ipData.longitude;
    }

    return locationData;
  } catch {
    return null;
  }
}

/**
 * Get device location from browser's Geolocation API
 * This is complementary to IP-based location
 */
export function getDeviceLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
} | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    );
  });
}

/**
 * Verify location consistency during payment
 * Compares IP-based location with delivery address for security
 */
export function verifyLocationConsistency(
  paymentLocation: PaymentLocationData,
  deliveryCity: string,
  deliveryState: string,
): {
  isConsistent: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  reason?: string;
} {
  // If payment location is not available, consider it low risk
  if (!paymentLocation.city || !paymentLocation.region) {
    return { isConsistent: true, riskLevel: 'low' };
  }

  const paymentCity = paymentLocation.city.toLowerCase().trim();
  const paymentRegion = paymentLocation.region.toLowerCase().trim();
  const deliveryCityLower = deliveryCity.toLowerCase().trim();
  const deliveryStateLower = deliveryState.toLowerCase().trim();

  // Check if cities match (exact or close match)
  const citiesMatch = paymentCity === deliveryCityLower || 
                     paymentCity.includes(deliveryCityLower) || 
                     deliveryCityLower.includes(paymentCity);

  // Check if states/regions match
  const statesMatch = paymentRegion === deliveryStateLower ||
                     paymentRegion.includes(deliveryStateLower) ||
                     deliveryStateLower.includes(paymentRegion);

  if (citiesMatch && statesMatch) {
    return { isConsistent: true, riskLevel: 'low' };
  }

  if (citiesMatch || statesMatch) {
    return {
      isConsistent: true,
      riskLevel: 'medium',
      reason: 'Partial location match - payment and delivery locations are in same state but different city',
    };
  }

  return {
    isConsistent: false,
    riskLevel: 'high',
    reason: `Location mismatch - payment location (${paymentLocation.city}, ${paymentLocation.region}) differs from delivery location (${deliveryCity}, ${deliveryState})`,
  };
}

/**
 * Log payment location for audit and security purposes
 * This should be called to backend for storage and analysis
 */
export async function logPaymentLocation(
  orderId: string,
  paymentLocation: PaymentLocationData,
  deliveryCity?: string,
  deliveryState?: string,
): Promise<boolean> {
  try {
    const verification = deliveryCity && deliveryState
      ? verifyLocationConsistency(paymentLocation, deliveryCity, deliveryState)
      : null;

    const payload = {
      orderId,
      location: paymentLocation,
      verification,
      capturedAt: new Date().toISOString(),
    };

    // This should send to your backend API
    // const response = await fetch('/api/orders/log-location', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });

    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Payment Location Log]', payload);
    }

    return true;
  } catch {
    console.error('[Payment Location Log] Error:', {
      orderId,
      error: 'Failed to log payment location',
    });
    return false;
  }
}
