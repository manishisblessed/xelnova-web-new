import { createContext, useContext, useMemo, useState } from 'react';
import type { Address } from '@xelnova/api';

export type PaymentMethod = 'cod' | 'razorpay';

interface CheckoutState {
  selectedAddressId: string | null;
  selectedAddress: Address | null;
  paymentMethod: PaymentMethod;
  couponCode: string | null;
}

interface CheckoutContextValue extends CheckoutState {
  setAddress: (address: Address | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCouponCode: (code: string | null) => void;
  reset: () => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

const initialState: CheckoutState = {
  selectedAddressId: null,
  selectedAddress: null,
  paymentMethod: 'razorpay',
  couponCode: null,
};

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CheckoutState>(initialState);

  const value = useMemo<CheckoutContextValue>(() => {
    return {
      ...state,
      setAddress: (address) =>
        setState((prev) => ({
          ...prev,
          selectedAddress: address,
          selectedAddressId: address?.id ?? null,
        })),
      setPaymentMethod: (method) =>
        setState((prev) => ({ ...prev, paymentMethod: method })),
      setCouponCode: (code) =>
        setState((prev) => ({ ...prev, couponCode: code })),
      reset: () => setState(initialState),
    };
  }, [state]);

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider');
  return ctx;
}
