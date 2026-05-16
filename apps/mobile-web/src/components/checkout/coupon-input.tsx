import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Tag, X } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@xelnova/api';
import { queryKeys } from '../../lib/query-keys';

interface CouponInputProps {
  /** Coupon code currently applied to the cart, if any. */
  appliedCode?: string | null;
  /** Discount amount in rupees, used for inline confirmation. */
  appliedDiscount?: number;
  /** Notify the parent so it can sync local checkout state. */
  onApplied?: (code: string) => void;
  onRemoved?: () => void;
}

export function CouponInput({
  appliedCode,
  appliedDiscount,
  onApplied,
  onRemoved,
}: CouponInputProps) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const applyMutation = useMutation({
    mutationFn: (input: string) => cartApi.applyCoupon(input),
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart(), cart);
      const applied = cart.coupon?.code ?? code;
      onApplied?.(applied);
      setCode('');
      setError(null);
    },
    onError: (e: any) => setError(e?.message ?? 'Could not apply coupon'),
  });

  if (appliedCode) {
    return (
      <View className="flex-row items-center justify-between bg-promo-mint-50 border border-primary-200 rounded-2xl px-4 py-3">
        <View className="flex-row items-center gap-2 flex-1">
          <Tag size={16} color="#11ab3a" />
          <View className="flex-1">
            <Text className="text-sm font-bold text-primary-700">
              {appliedCode}
            </Text>
            {appliedDiscount && appliedDiscount > 0 ? (
              <Text className="text-xs text-primary-700">
                {`Saving \u20B9${Math.round(appliedDiscount).toLocaleString('en-IN')}`}
              </Text>
            ) : null}
          </View>
        </View>
        {onRemoved ? (
          <Pressable
            onPress={() => onRemoved()}
            className="w-8 h-8 items-center justify-center rounded-full active:bg-surface-muted"
            hitSlop={6}
          >
            <X size={16} color="#0c831f" />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center bg-surface border border-line rounded-2xl pl-4 pr-2">
        <Tag size={16} color="#5a6478" />
        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(v.toUpperCase());
            setError(null);
          }}
          placeholder="Have a coupon code?"
          placeholderTextColor="#8d95a5"
          autoCapitalize="characters"
          className="flex-1 h-12 ml-2 text-sm text-ink"
        />
        <Pressable
          onPress={() => code.trim() && applyMutation.mutate(code.trim())}
          disabled={!code.trim() || applyMutation.isPending}
          className="px-3 py-2 rounded-lg active:opacity-60"
          hitSlop={4}
        >
          <Text
            className={`text-sm font-bold ${
              code.trim() ? 'text-primary-600' : 'text-ink-muted'
            }`}
          >
            {applyMutation.isPending ? 'Applying\u2026' : 'Apply'}
          </Text>
        </Pressable>
      </View>
      {error ? (
        <Text className="text-xs text-danger-600 px-1">{error}</Text>
      ) : null}
    </View>
  );
}
