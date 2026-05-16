import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, RotateCcw } from 'lucide-react-native';
import { ordersApi, returnsApi } from '@xelnova/api';

type CreateReturnBody = Parameters<typeof returnsApi.createReturn>[1] extends infer T
  ? Exclude<T, string>
  : never;
import { Button } from '@xelnova/ui-native';
import { ScreenHeader } from '../../../../src/components/screen-header';
import { PhotoPicker } from '../../../../src/components/photo-picker';
import { queryKeys } from '../../../../src/lib/query-keys';
import { RETURN_REASONS, returnEligibility } from '../../../../src/lib/returns';

type Kind = 'RETURN' | 'REPLACEMENT';

export default function CreateReturnScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();

  const orderQuery = useQuery({
    queryKey: queryKeys.orders.detail(orderNumber as string),
    queryFn: () => ordersApi.getOrderByNumber(orderNumber as string),
    enabled: typeof orderNumber === 'string' && orderNumber.length > 0,
  });
  const order = orderQuery.data;
  const eligibility = useMemo(
    () => (order ? returnEligibility(order) : null),
    [order],
  );

  const [kind, setKind] = useState<Kind>('RETURN');
  const [reasonCode, setReasonCode] = useState<string>('DEFECTIVE');
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: (body: CreateReturnBody) =>
      returnsApi.createReturn(orderNumber as string, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.list() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderNumber as string),
      });
      Alert.alert(
        'Request submitted',
        kind === 'RETURN'
          ? 'We have received your return request. Pickup details will be shared shortly.'
          : 'We have received your replacement request. The seller will get in touch soon.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/account/returns'),
          },
        ],
      );
    },
    onError: (e: any) => {
      Alert.alert('Could not submit', e?.message ?? 'Please try again.');
    },
  });

  const submit = () => {
    if (imageUrls.length === 0) {
      Alert.alert('Add at least one photo', 'Photos help us process your request faster.');
      return;
    }
    if (reasonCode === 'OTHER' && description.trim().length < 10) {
      Alert.alert('Add a description', 'Please describe the issue in a few words.');
      return;
    }
    createMutation.mutate({
      kind,
      reasonCode,
      reason: RETURN_REASONS.find((r) => r.value === reasonCode)?.label ?? reasonCode,
      description: description.trim() || undefined,
      imageUrls,
    });
  };

  if (orderQuery.isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Return or replace" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order || !eligibility?.eligible) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Return or replace" />
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <RotateCcw size={32} color="#5a6478" />
          <Text className="text-base font-semibold text-ink text-center">
            {eligibility?.reason ?? 'This order can\'t be returned.'}
          </Text>
          <Button onPress={() => router.back()}>Go back</Button>
        </View>
      </SafeAreaView>
    );
  }

  const replacementAllowed = eligibility.replacementAllowed;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader
        title="Return or replace"
        subtitle={`#${order.orderNumber}`}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
          <View className="bg-promo-mint-50 border border-primary-200 rounded-2xl px-4 py-3">
            <Text className="text-sm font-semibold text-primary-700">
              {`${eligibility.daysLeft ?? 0} ${eligibility.daysLeft === 1 ? 'day' : 'days'} left in your return window`}
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
              What would you like to do?
            </Text>
            <View className="flex-row gap-3">
              <KindButton
                active={kind === 'RETURN'}
                label="Return"
                description="Refund to wallet or source"
                onPress={() => setKind('RETURN')}
              />
              <KindButton
                active={kind === 'REPLACEMENT'}
                label="Replace"
                description={
                  replacementAllowed ? 'Send a new one' : 'Not available'
                }
                onPress={() =>
                  replacementAllowed
                    ? setKind('REPLACEMENT')
                    : Alert.alert(
                        'Not available',
                        'These items aren\'t eligible for replacement.',
                      )
                }
                disabled={!replacementAllowed}
              />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
              Reason
            </Text>
            <View className="bg-surface rounded-2xl border border-line-light overflow-hidden">
              {RETURN_REASONS.map((r, idx) => (
                <Pressable
                  key={r.value}
                  onPress={() => setReasonCode(r.value)}
                  className={`flex-row items-center px-4 py-3 active:bg-surface-muted ${
                    idx < RETURN_REASONS.length - 1
                      ? 'border-b border-line-light'
                      : ''
                  }`}
                >
                  <Text className="flex-1 text-sm text-ink">{r.label}</Text>
                  {reasonCode === r.value ? (
                    <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
                      <Check size={14} color="#ffffff" />
                    </View>
                  ) : (
                    <View className="w-6 h-6 rounded-full border border-line" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
              Describe the issue (optional)
            </Text>
            <View className="bg-surface border border-line rounded-2xl px-3 py-2">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Tell us a bit more so we can help faster"
                placeholderTextColor="#8d95a5"
                multiline
                textAlignVertical="top"
                className="min-h-24 text-sm text-ink"
              />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
              Photos
            </Text>
            <PhotoPicker
              value={imageUrls}
              onChange={setImageUrls}
              max={3}
              hint="Share clear photos of the issue. Max 3."
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="bg-surface border-t border-line-light px-4 pt-3 pb-6">
        <Button
          fullWidth
          size="lg"
          onPress={submit}
          loading={createMutation.isPending}
        >
          {kind === 'RETURN' ? 'Submit return request' : 'Submit replacement request'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

function KindButton({
  active,
  label,
  description,
  onPress,
  disabled,
}: {
  active: boolean;
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 rounded-2xl px-4 py-3 border-2 ${
        active
          ? 'bg-primary-50 border-primary-500'
          : 'bg-surface border-line-light'
      } ${disabled ? 'opacity-50' : ''} active:opacity-90`}
    >
      <Text
        className={`text-sm font-bold ${
          active ? 'text-primary-700' : 'text-ink'
        }`}
      >
        {label}
      </Text>
      <Text className="text-xs text-ink-secondary mt-0.5">{description}</Text>
    </Pressable>
  );
}
