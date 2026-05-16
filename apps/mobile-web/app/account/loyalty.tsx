import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  Check,
  Copy,
  Gift,
  Share2,
  Sparkles,
  Tag as TagIcon,
  Users,
  X,
} from 'lucide-react-native';
import { notificationsApi } from '@xelnova/api';
import { Button } from '@xelnova/ui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { queryKeys } from '../../src/lib/query-keys';
import { formatRupees } from '../../src/lib/format';
import { digitsOnly } from '../../src/lib/validation';
import { shareReferralCode } from '../../src/lib/share';

type LoyaltyApi = typeof notificationsApi;
type BalanceData = Awaited<ReturnType<LoyaltyApi['getLoyaltyBalance']>>;
type LedgerData = Awaited<ReturnType<LoyaltyApi['getLoyaltyLedger']>>;
type LedgerEntry = LedgerData extends { entries: infer E }
  ? E extends Array<infer R>
    ? R
    : never
  : never;
type ReferralData = Awaited<ReturnType<LoyaltyApi['getReferralCode']>>;
type ReferralStats = Awaited<ReturnType<LoyaltyApi['getReferralStats']>>;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function LoyaltyScreen() {
  const queryClient = useQueryClient();

  const balanceQuery = useQuery<BalanceData>({
    queryKey: queryKeys.loyalty.balance(),
    queryFn: () => notificationsApi.getLoyaltyBalance(),
    retry: false,
  });

  const referralQuery = useQuery<ReferralData>({
    queryKey: queryKeys.loyalty.referral(),
    queryFn: () => notificationsApi.getReferralCode(),
    retry: false,
  });

  const referralStatsQuery = useQuery<ReferralStats>({
    queryKey: queryKeys.loyalty.referralStats(),
    queryFn: () => notificationsApi.getReferralStats(),
    retry: false,
  });

  const ledgerQuery = useInfiniteQuery({
    queryKey: queryKeys.loyalty.ledger(0),
    queryFn: ({ pageParam }) =>
      notificationsApi.getLoyaltyLedger(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last: LedgerData) => {
      const p = (last as { pagination?: { page: number; totalPages: number } })
        .pagination;
      if (!p) return undefined;
      return p.page < p.totalPages ? p.page + 1 : undefined;
    },
    retry: false,
  });

  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState('');
  const redeemMutation = useMutation({
    mutationFn: (points: number) => notificationsApi.redeemPoints(points),
    onSuccess: (res: { discountAmount?: number; pointsRedeemed?: number; message?: string }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.balance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.ledger(0) });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
      setRedeemOpen(false);
      setRedeemPoints('');
      Alert.alert(
        'Redeemed',
        res?.message ??
          `Credited ${formatRupees(res?.discountAmount ?? 0)} to your wallet.`,
      );
    },
    onError: (e: Error) =>
      Alert.alert('Could not redeem', e?.message ?? 'Please try again.'),
  });

  const onRedeem = () => {
    const num = parseInt(redeemPoints, 10);
    if (!num || num <= 0) {
      Alert.alert('Invalid points', 'Enter a valid number of points to redeem.');
      return;
    }
    if (num > balance) {
      Alert.alert(
        'Not enough points',
        `You have ${balance} points available.`,
      );
      return;
    }
    redeemMutation.mutate(num);
  };

  const [referralInput, setReferralInput] = useState('');
  const applyMutation = useMutation({
    mutationFn: (code: string) => notificationsApi.applyReferralCode(code),
    onSuccess: (res: { referredPoints?: number }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.balance() });
      queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.ledger(0) });
      setReferralInput('');
      Alert.alert(
        'Referral applied',
        `You earned ${res?.referredPoints ?? 0} loyalty points.`,
      );
    },
    onError: (e: Error) =>
      Alert.alert('Could not apply', e?.message ?? 'Please try again.'),
  });

  const onApplyReferral = () => {
    const code = referralInput.trim();
    if (!code) {
      Alert.alert('Enter a code', 'Paste the referral code you received.');
      return;
    }
    applyMutation.mutate(code);
  };

  const balance = (balanceQuery.data as { points?: number })?.points ?? 0;
  const myReferralCode =
    (referralQuery.data as { code?: string } | undefined)?.code ?? '';
  const referralStats = referralStatsQuery.data as
    | { totalUses?: number; earnedPoints?: number }
    | undefined;

  const ledgerEntries: LedgerEntry[] = (ledgerQuery.data?.pages ?? []).flatMap(
    (page) => (page as { entries?: LedgerEntry[] }).entries ?? [],
  );

  const onCopyCode = async () => {
    if (!myReferralCode) return;
    await Clipboard.setStringAsync(myReferralCode);
    Alert.alert('Copied', 'Referral code copied to clipboard.');
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader title="Loyalty & rewards" />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <View className="rounded-2xl overflow-hidden">
          <View className="bg-primary-600 p-5 gap-2">
            <View className="flex-row items-center gap-2">
              <Award size={16} color="#ffffff" />
              <Text className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Available points
              </Text>
            </View>
            {balanceQuery.isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-3xl font-bold text-white">{balance.toLocaleString('en-IN')}</Text>
            )}
            <Text className="text-xs text-white/80">
              {`Worth ${formatRupees(balance / 10)} \u00b7 10 points = \u20B91`}
            </Text>
            <View className="flex-row gap-2 mt-1">
              <Pressable
                onPress={() => setRedeemOpen(true)}
                disabled={balance <= 0}
                className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full ${
                  balance <= 0 ? 'bg-white/40' : 'bg-white active:opacity-80'
                }`}
              >
                <Sparkles size={14} color="#0c831f" />
                <Text className="text-xs font-bold text-primary-700">Redeem</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="bg-surface rounded-2xl border border-line-light p-4 gap-3">
          <View className="flex-row items-center gap-2">
            <Gift size={16} color="#11ab3a" />
            <Text className="text-sm font-bold text-ink">Refer & earn</Text>
          </View>
          <Text className="text-xs text-ink-secondary leading-relaxed">
            Share your referral code with friends. They get bonus points when they
            join, and you earn points when they shop.
          </Text>

          <View className="bg-promo-mint-50 rounded-xl px-4 py-3 flex-row items-center justify-between">
            <View>
              <Text className="text-[11px] uppercase tracking-wide text-primary-700 font-semibold">
                Your code
              </Text>
              <Text className="text-lg font-bold text-primary-700 mt-0.5">
                {myReferralCode || '\u2014'}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={onCopyCode}
                disabled={!myReferralCode}
                hitSlop={4}
                className="w-10 h-10 items-center justify-center rounded-full bg-surface active:opacity-80"
              >
                <Copy size={16} color="#0c831f" />
              </Pressable>
              <Pressable
                onPress={() => myReferralCode && shareReferralCode(myReferralCode)}
                disabled={!myReferralCode}
                hitSlop={4}
                className="w-10 h-10 items-center justify-center rounded-full bg-primary-500 active:opacity-80"
              >
                <Share2 size={16} color="#ffffff" />
              </Pressable>
            </View>
          </View>

          {referralStats ? (
            <View className="flex-row gap-3">
              <View className="flex-1 bg-surface-muted rounded-xl px-3 py-2.5">
                <View className="flex-row items-center gap-1.5">
                  <Users size={12} color="#5a6478" />
                  <Text className="text-[10px] uppercase tracking-wide text-ink-muted font-semibold">
                    Friends joined
                  </Text>
                </View>
                <Text className="text-base font-bold text-ink mt-0.5">
                  {referralStats.totalUses ?? 0}
                </Text>
              </View>
              <View className="flex-1 bg-surface-muted rounded-xl px-3 py-2.5">
                <View className="flex-row items-center gap-1.5">
                  <Award size={12} color="#5a6478" />
                  <Text className="text-[10px] uppercase tracking-wide text-ink-muted font-semibold">
                    Points earned
                  </Text>
                </View>
                <Text className="text-base font-bold text-ink mt-0.5">
                  {(referralStats.earnedPoints ?? 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View className="bg-surface rounded-2xl border border-line-light p-4 gap-3">
          <View className="flex-row items-center gap-2">
            <TagIcon size={16} color="#11ab3a" />
            <Text className="text-sm font-bold text-ink">Have a referral code?</Text>
          </View>
          <View className="flex-row items-center bg-surface-muted rounded-xl px-3 h-12 border border-line-light">
            <TextInput
              value={referralInput}
              onChangeText={(v) => setReferralInput(v.toUpperCase())}
              placeholder="Enter code"
              placeholderTextColor="#8d95a5"
              autoCapitalize="characters"
              autoCorrect={false}
              className="flex-1 text-sm text-ink"
            />
          </View>
          <Button
            size="md"
            onPress={onApplyReferral}
            loading={applyMutation.isPending}
            disabled={!referralInput.trim()}
            leftIcon={<Check size={16} color="#ffffff" />}
          >
            Apply code
          </Button>
        </View>

        <View>
          <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold mb-2 px-1">
            Activity
          </Text>
          {ledgerQuery.isLoading ? (
            <View className="bg-surface rounded-2xl border border-line-light p-6 items-center">
              <ActivityIndicator color="#11ab3a" />
            </View>
          ) : ledgerEntries.length === 0 ? (
            <View className="bg-surface rounded-2xl border border-line-light p-6 items-center">
              <Text className="text-sm text-ink-secondary">No activity yet</Text>
            </View>
          ) : (
            <View className="bg-surface rounded-2xl border border-line-light overflow-hidden">
              {ledgerEntries.map((entry, idx) => {
                const e = entry as {
                  id: string;
                  points: number;
                  description: string;
                  createdAt: string;
                };
                const isCredit = e.points >= 0;
                return (
                  <View
                    key={e.id}
                    className={`flex-row items-center gap-3 px-4 py-3 ${
                      idx < ledgerEntries.length - 1
                        ? 'border-b border-line-light'
                        : ''
                    }`}
                  >
                    <View
                      className={`w-9 h-9 rounded-xl items-center justify-center ${
                        isCredit ? 'bg-promo-mint-50' : 'bg-surface-muted'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft size={16} color="#0c831f" />
                      ) : (
                        <ArrowUpRight size={16} color="#5a6478" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm text-ink" numberOfLines={1}>
                        {e.description}
                      </Text>
                      <Text className="text-[11px] text-ink-muted mt-0.5">
                        {formatDate(e.createdAt)}
                      </Text>
                    </View>
                    <Text
                      className={`text-sm font-bold ${
                        isCredit ? 'text-primary-600' : 'text-ink'
                      }`}
                    >
                      {`${isCredit ? '+' : ''}${e.points} pts`}
                    </Text>
                  </View>
                );
              })}
              {ledgerQuery.hasNextPage ? (
                <Pressable
                  onPress={() => ledgerQuery.fetchNextPage()}
                  disabled={ledgerQuery.isFetchingNextPage}
                  className="h-12 items-center justify-center bg-surface-muted active:opacity-80"
                >
                  {ledgerQuery.isFetchingNextPage ? (
                    <ActivityIndicator color="#11ab3a" />
                  ) : (
                    <Text className="text-xs font-semibold text-primary-600">
                      Load more
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={redeemOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRedeemOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="bg-surface rounded-t-3xl px-5 pt-4 pb-8 gap-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-ink">Redeem points</Text>
                <Pressable
                  onPress={() => setRedeemOpen(false)}
                  hitSlop={6}
                  className="w-8 h-8 items-center justify-center rounded-full active:bg-surface-muted"
                >
                  <X size={18} color="#1a1a2e" />
                </Pressable>
              </View>

              <Text className="text-xs text-ink-secondary leading-relaxed">
                Convert your loyalty points into wallet credit. The amount will be
                added to your wallet instantly.
              </Text>

              <View className="flex-row items-center bg-surface-muted rounded-2xl px-4 h-14">
                <Text className="text-base text-ink font-bold mr-2">pts</Text>
                <TextInput
                  value={redeemPoints}
                  onChangeText={(v) => setRedeemPoints(digitsOnly(v, 7))}
                  placeholder="Enter points"
                  placeholderTextColor="#8d95a5"
                  keyboardType="number-pad"
                  className="flex-1 text-2xl font-bold text-ink"
                />
              </View>
              <Text className="text-[11px] text-ink-muted">
                {`You have ${balance.toLocaleString('en-IN')} pts \u00b7 ` +
                  `${formatRupees((parseInt(redeemPoints, 10) || 0) / 10)} will be credited`}
              </Text>

              <Button
                fullWidth
                size="lg"
                onPress={onRedeem}
                loading={redeemMutation.isPending}
                disabled={!redeemPoints || parseInt(redeemPoints, 10) <= 0}
              >
                Redeem
              </Button>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
