/**
 * Example Integration: Payment Location Capture
 * 
 * This file demonstrates how to integrate payment location capture
 * into your checkout/payment flow.
 * 
 * Place this code in your checkout page or payment processing logic.
 */

import { capturePaymentLocation, logPaymentLocation, verifyLocationConsistency } from '@/lib/payment-location';
import type { PaymentLocationData } from '@/lib/payment-location';

/**
 * Example 1: Capture location before processing payment
 */
export async function handlePaymentInitiation(
  orderId: string,
  deliveryCity: string,
  deliveryState: string,
) {
  try {
    // Capture user's location during payment
    const paymentLocation = await capturePaymentLocation();

    if (paymentLocation) {
      // Verify location consistency
      const verification = verifyLocationConsistency(
        paymentLocation,
        deliveryCity,
        deliveryState,
      );

      console.log('[Payment] Location verification:', {
        isConsistent: verification.isConsistent,
        riskLevel: verification.riskLevel,
        reason: verification.reason,
      });

      // If high risk, you might want to:
      // 1. Show additional verification (OTP, etc.)
      // 2. Flag order for manual review
      // 3. Require extra confirmation from user
      if (verification.riskLevel === 'high') {
        console.warn('[Payment] High risk location mismatch detected');
        // Optionally throw error or show confirmation dialog
        // throw new Error('Location verification failed. Please confirm delivery address.');
      }

      // Log the location for audit trail
      await logPaymentLocation(orderId, paymentLocation, deliveryCity, deliveryState);
    }
  } catch (error) {
    console.error('[Payment] Error capturing location:', error);
    // Don't block payment if location capture fails
    // This is for security/compliance, not a blocker
  }
}

/**
 * Example 2: Integration in a Checkout Component
 */
export interface CheckoutPaymentProps {
  orderId: string;
  deliveryAddress: {
    city: string;
    state: string;
    pincode: string;
  };
  onPaymentStart: () => void;
  onPaymentComplete: (success: boolean) => void;
}

export async function processCheckoutPayment({
  orderId,
  deliveryAddress,
  onPaymentStart,
  onPaymentComplete,
}: CheckoutPaymentProps) {
  try {
    onPaymentStart();

    // Step 1: Capture location before payment gateway
    const paymentLocation = await capturePaymentLocation();

    if (paymentLocation) {
      // Step 2: Verify and log location
      const verification = verifyLocationConsistency(
        paymentLocation,
        deliveryAddress.city,
        deliveryAddress.state,
      );

      // Log to backend
      const logSuccess = await logPaymentLocation(
        orderId,
        paymentLocation,
        deliveryAddress.city,
        deliveryAddress.state,
      );

      if (!logSuccess) {
        console.warn('[Checkout] Failed to log payment location');
        // Continue anyway - don't block payment
      }

      // Step 3: Handle risk levels
      if (verification.riskLevel === 'high') {
        // Option A: Show warning dialog
        const confirmed = window.confirm(
          'Your payment location differs from delivery address. Continue?'
        );
        if (!confirmed) {
          onPaymentComplete(false);
          return;
        }

        // Option B: Require additional verification
        // await performAdditionalVerification(orderId);
      }
    }

    // Step 4: Proceed with payment gateway
    // const paymentResult = await processPaymentWithGateway(orderId);
    // onPaymentComplete(paymentResult.success);

  } catch (error) {
    console.error('[Checkout] Payment processing error:', error);
    onPaymentComplete(false);
  }
}

/**
 * Example 3: Backend API Handler
 * Add this endpoint to your API (e.g., /api/orders/log-location)
 */
/*
// pages/api/orders/log-location.ts (Next.js example)
import { NextRequest, NextResponse } from 'next/server';

interface PaymentLocationLog {
  orderId: string;
  location: PaymentLocationData;
  verification?: {
    isConsistent: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    reason?: string;
  };
  capturedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentLocationLog = await request.json();

    // Validate request
    if (!body.orderId || !body.location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save to database
    // await db.paymentLocations.create({
    //   orderId: body.orderId,
    //   ipAddress: body.location.ipAddress,
    //   city: body.location.city,
    //   region: body.location.region,
    //   postalCode: body.location.postalCode,
    //   country: body.location.country,
    //   latitude: body.location.latitude,
    //   longitude: body.location.longitude,
    //   userAgent: body.location.userAgent,
    //   riskLevel: body.verification?.riskLevel,
    //   isConsistent: body.verification?.isConsistent,
    //   timestamp: new Date(body.location.timestamp),
    // });

    // Or send to fraud detection service
    // await fraudDetectionService.logTransaction({
    //   orderId: body.orderId,
    //   location: body.location,
    //   verification: body.verification,
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Log location error:', error);
    return NextResponse.json(
      { error: 'Failed to log location' },
      { status: 500 }
    );
  }
}
*/

/**
 * Example 4: React Hook for Location Capture
 */
export function usePaymentLocation() {
  const [location, setLocation] = React.useState<PaymentLocationData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const capture = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const paymentLocation = await capturePaymentLocation();
      setLocation(paymentLocation);
      return paymentLocation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to capture location';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const verify = React.useCallback(
    (city: string, state: string) => {
      if (!location) return null;
      return verifyLocationConsistency(location, city, state);
    },
    [location]
  );

  return {
    location,
    loading,
    error,
    capture,
    verify,
  };
}

/**
 * Example 5: Checkout Component Usage
 */
/*
import React from 'react';
import { usePaymentLocation } from '@/lib/hooks/use-payment-location';

export function CheckoutPaymentSection({ order }) {
  const { location, loading, capture } = usePaymentLocation();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Capture location
      const paymentLocation = await capture();

      if (!paymentLocation) {
        throw new Error('Could not determine payment location');
      }

      // Verify location
      const verification = verifyLocationConsistency(
        paymentLocation,
        order.deliveryCity,
        order.deliveryState,
      );

      if (verification.riskLevel === 'high') {
        const confirmed = window.confirm(
          'Your payment location differs from delivery address. Continue?'
        );
        if (!confirmed) return;
      }

      // Process payment
      const result = await processPayment(order.id);
      
      if (result.success) {
        showSuccessMessage('Payment successful!');
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      showErrorMessage(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <button 
        onClick={handlePayment} 
        disabled={isProcessing || loading}
      >
        {isProcessing ? 'Processing...' : 'Complete Payment'}
      </button>
    </div>
  );
}
*/
