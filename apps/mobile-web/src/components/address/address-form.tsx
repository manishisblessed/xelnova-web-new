import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { Address } from '@xelnova/api';
import { Button, Input } from '@xelnova/ui-native';
import { digitsOnly, isValidIndianPhone, isValidPincode } from '../../lib/validation';
import { lookupPincode } from '../../lib/pincode';

export type AddressFormValues = Omit<Address, 'id' | 'isDefault'>;

interface AddressFormProps {
  initial?: Partial<AddressFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: AddressFormValues) => void;
  onCancel?: () => void;
}

const ADDRESS_TYPES: Array<{ key: string; label: string }> = [
  { key: 'HOME', label: 'Home' },
  { key: 'OFFICE', label: 'Office' },
  { key: 'OTHER', label: 'Other' },
];

export function AddressForm({
  initial,
  submitting,
  submitLabel = 'Save address',
  onSubmit,
  onCancel,
}: AddressFormProps) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [pincode, setPincode] = useState(initial?.pincode ?? '');
  const [addressLine1, setAddressLine1] = useState(initial?.addressLine1 ?? '');
  const [addressLine2, setAddressLine2] = useState(initial?.addressLine2 ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [state, setState] = useState(initial?.state ?? '');
  const [landmark, setLandmark] = useState(initial?.landmark ?? '');
  const [type, setType] = useState(initial?.type ?? 'HOME');
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormValues, string>>>({});
  const [pinLookupBusy, setPinLookupBusy] = useState(false);
  const lastLookedUp = useRef<string | null>(null);
  const lookupAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isValidPincode(pincode)) return;
    if (lastLookedUp.current === pincode) return;
    // Skip if user has already typed values we don't want to overwrite.
    const shouldFill = !city.trim() || !state.trim();
    if (!shouldFill) {
      lastLookedUp.current = pincode;
      return;
    }
    lookupAbort.current?.abort();
    const controller = new AbortController();
    lookupAbort.current = controller;
    setPinLookupBusy(true);
    lookupPincode(pincode, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        lastLookedUp.current = pincode;
        if (!res) return;
        if (res.city && !city.trim()) setCity(res.city);
        if (res.state && !state.trim()) setState(res.state);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPinLookupBusy(false);
      });
    return () => controller.abort();
    // We deliberately ignore city/state changes here — the lookup should
    // only re-fire when the pincode itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincode]);

  const validate = (): boolean => {
    const next: Partial<Record<keyof AddressFormValues, string>> = {};
    if (!fullName.trim()) next.fullName = 'Required';
    if (!isValidIndianPhone(phone)) next.phone = 'Enter a valid 10-digit mobile';
    if (!isValidPincode(pincode)) next.pincode = '6-digit PIN code';
    if (!addressLine1.trim()) next.addressLine1 = 'Required';
    if (!city.trim()) next.city = 'Required';
    if (!state.trim()) next.state = 'Required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      fullName: fullName.trim(),
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || null,
      city: city.trim(),
      district: null,
      state: state.trim(),
      pincode: pincode.trim(),
      landmark: landmark.trim() || null,
      type,
    });
  };

  return (
    <View className="gap-4">
      <Input
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        placeholder="Recipient's name"
        autoCapitalize="words"
        error={errors.fullName}
      />
      <Input
        label="Mobile number"
        value={phone}
        onChangeText={(v) => setPhone(digitsOnly(v, 10))}
        placeholder="10-digit mobile"
        keyboardType="phone-pad"
        error={errors.phone}
      />
      <View>
        <Input
          label="PIN code"
          value={pincode}
          onChangeText={(v) => setPincode(digitsOnly(v, 6))}
          placeholder="6-digit PIN"
          keyboardType="number-pad"
          error={errors.pincode}
          rightIcon={
            pinLookupBusy ? (
              <ActivityIndicator size="small" color="#11ab3a" />
            ) : undefined
          }
        />
        {pinLookupBusy ? (
          <Text className="text-[11px] text-ink-muted mt-1">
            Looking up your area…
          </Text>
        ) : null}
      </View>
      <Input
        label="Flat / House no, Building"
        value={addressLine1}
        onChangeText={setAddressLine1}
        placeholder="House 12, Riverside Apartments"
        error={errors.addressLine1}
      />
      <Input
        label="Area, Street, Sector"
        value={addressLine2 ?? ''}
        onChangeText={setAddressLine2}
        placeholder="Sector 14, Phase 1"
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="City"
            error={errors.city}
          />
        </View>
        <View className="flex-1">
          <Input
            label="State"
            value={state}
            onChangeText={setState}
            placeholder="State"
            error={errors.state}
          />
        </View>
      </View>
      <Input
        label="Landmark (optional)"
        value={landmark ?? ''}
        onChangeText={setLandmark}
        placeholder="Near city park"
      />

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
          Address type
        </Text>
        <View className="flex-row gap-2">
          {ADDRESS_TYPES.map((opt) => {
            const selected = type === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setType(opt.key)}
                className={
                  selected
                    ? 'flex-1 items-center justify-center h-11 rounded-xl bg-primary-50 border-2 border-primary-500'
                    : 'flex-1 items-center justify-center h-11 rounded-xl bg-surface border-2 border-line-light'
                }
              >
                <Text
                  className={
                    selected
                      ? 'text-sm font-semibold text-primary-700'
                      : 'text-sm font-semibold text-ink-secondary'
                  }
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="flex-row gap-3 mt-2">
        {onCancel ? (
          <Button variant="outline" className="flex-1" onPress={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          className="flex-1"
          size="lg"
          onPress={handleSubmit}
          loading={submitting}
        >
          {submitLabel}
        </Button>
      </View>
    </View>
  );
}
