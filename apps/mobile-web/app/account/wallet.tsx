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
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ShieldAlert,
  Wallet as WalletIcon,
  X,
} from 'lucide-react-native';
import { usersApi, walletApi } from '@xelnova/api';
import { Button } from '@xelnova/ui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { RazorpayWebView } from '../../src/components/checkout/razorpay-webview';
import { queryKeys } from '../../src/lib/query-keys';
import { formatRupees } from '../../src/lib/format';
import { digitsOnly } from '../../src/lib/validation';
import { useAuth } from '../../src/lib/auth-context';
import type {
  RazorpayBridgeMessage,
  RazorpayCheckoutOptions,
} from '../../src/lib/razorpay';

const QUICK_AMOUNTS = [100, 500, 1000, 2000];

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function WalletScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const balanceQuery = useQuery({
    queryKey: queryKeys.wallet.balance(),
    queryFn: () => walletApi.getCustomerBalance(),
    retry: false,
  });

  const profileQuery = useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: () => usersApi.getProfile(),
    initialData: user ?? undefined,
    retry: false,
  });
  const aadhaarVerified = !!(profileQuery.data as any)?.aadhaarVerified;

  const txnsQuery = useInfiniteQuery({
    queryKey: queryKeys.wallet.transactions(0),
    queryFn: ({ pageParam }) =>
      walletApi.getCustomerTransactions(pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const p = (last as { pagination?: { page: number; totalPages: number } })
        .pagination;
      if (!p) return undefined;
      return p.page < p.totalPages ? p.page + 1 : undefined;
    },
    retry: false,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [rzp, setRzp] = useState<RazorpayCheckoutOptions | null>(null);

  const verifyMutation = useMutation({
    mutationFn: walletApi.verifyAddMoney,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.wallet.transactions(0),
      });
      Alert.alert('Money added', 'Your wallet has been topped up.');
      setRzp(null);
      setAddOpen(false);
      setAmount('');
    },
    onError: (e: any) => {
      Alert.alert(
        'Verification failed',
        e?.message ?? 'If money was debited it will be refunded shortly.',
      );
      setRzp(null);
    },
  });

  const startAdd = async () => {
    const numeric = parseInt(amount, 10);
    if (!numeric || numeric < 10) {
      Alert.alert('Minimum amount', 'Please enter at least \u20B910.');
      return;
    }
    try {
      const order = await walletApi.createAddMoneyOrder(numeric);
      setRzp({
        keyId: order.keyId,
        razorpayOrderId: order.razorpayOrderId,
        // Wallet returns rupees → convert to paise for Razorpay.
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        orderId: order.razorpayOrderId,
        orderNumber: `Wallet \u00b7 \u20B9${numeric}`,
        prefill: {
          name: user?.name ?? '',
          email: user?.email ?? '',
          contact: user?.phone ?? '',
        },
      });
    } catch (e: any) {
      Alert.alert('Could not start payment', e?.message ?? 'Please try again.');
    }
  };

  const handleRzpMessage = (msg: RazorpayBridgeMessage) => {
    if (msg.type === 'success') {
      verifyMutation.mutate(msg.payload);
    } else if (msg.type === 'failed') {
      Alert.alert('Payment failed', msg.message);
      setRzp(null);
    } else if (msg.type === 'dismissed') {
      setRzp(null);
    }
  };

  const balance = balanceQuery.data?.balance ?? 0;
  const txns = (txnsQuery.data?.pages ?? []).flatMap(
    (p) => (p as { transactions?: Array<{ id: string; type: string; amount: number; description: string; createdAt: string }> }).transactions ?? [],
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader title="Wallet" />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <View className="bg-primary-500 rounded-2xl p-5 gap-2">
          <View className="flex-row items-center gap-2">
            <WalletIcon size={16} color="#ffffff" />
            <Text className="text-xs font-semibold uppercase tracking-wide text-white/80">
              Available balance
            </Text>
          </View>
          <Text className="text-3xl font-bold text-white">
            {formatRupees(balance)}
          </Text>
          <Pressable
            onPress={() => {
              if (!aadhaarVerified) {
                Alert.alert(
                  'KYC required',
                  'Please complete Aadhaar KYC from the website to top up your wallet.',
                );
                return;
              }
              setAddOpen(true);
            }}
            className="self-start mt-1 flex-row items-center gap-1.5 px-3 py-2 rounded-full bg-white active:opacity-80"
          >
            <Plus size={14} color="#0c831f" />
            <Text className="text-xs font-bold text-primary-700">Add money</Text>
          </Pressable>
        </View>

        {!aadhaarVerified ? (
          <View className="bg-accent-50 border border-accent-200 rounded-2xl p-4 flex-row gap-3">
            <ShieldAlert size={18} color="#b07a00" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-accent-700">
                Verify your Aadhaar to add money
              </Text>
              <Text className="text-xs text-accent-700 mt-0.5 leading-relaxed">
                For your security and to comply with regulations, KYC is required
                before adding funds. Please complete it from the Xelnova website.
              </Text>
            </View>
          </View>
        ) : null}

        <View>
          <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold mb-2">
            Recent activity
          </Text>
          {txnsQuery.isLoading ? (
            <View className="bg-surface rounded-2xl border border-line-light p-6 items-center">
              <ActivityIndicator color="#11ab3a" />
            </View>
          ) : txns.length === 0 ? (
            <View className="bg-surface rounded-2xl border border-line-light p-6 items-center">
              <Text className="text-sm text-ink-secondary">
                No transactions yet
              </Text>
            </View>
          ) : (
            <View className="bg-surface rounded-2xl border border-line-light overflow-hidden">
              {txns.map((txn, idx) => {
                const isCredit = txn.type === 'CREDIT';
                return (
                  <View
                    key={txn.id}
                    className={`flex-row items-center gap-3 px-4 py-3 ${
                      idx < txns.length - 1 ? 'border-b border-line-light' : ''
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
                        {txn.description}
                      </Text>
                      <Text className="text-[11px] text-ink-muted mt-0.5">
                        {formatDateTime(txn.createdAt)}
                      </Text>
                    </View>
                    <Text
                      className={`text-sm font-bold ${
                        isCredit ? 'text-primary-600' : 'text-ink'
                      }`}
                    >
                      {`${isCredit ? '+' : '-'} ${formatRupees(txn.amount)}`}
                    </Text>
                  </View>
                );
              })}
              {txnsQuery.hasNextPage ? (
                <Pressable
                  onPress={() => txnsQuery.fetchNextPage()}
                  disabled={txnsQuery.isFetchingNextPage}
                  className="h-12 items-center justify-center bg-surface-muted active:opacity-80"
                >
                  {txnsQuery.isFetchingNextPage ? (
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
        visible={addOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAddOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View className="bg-surface rounded-t-3xl px-5 pt-4 pb-8 gap-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-ink">Add money</Text>
                <Pressable
                  onPress={() => setAddOpen(false)}
                  hitSlop={6}
                  className="w-8 h-8 items-center justify-center rounded-full active:bg-surface-muted"
                >
                  <X size={18} color="#1a1a2e" />
                </Pressable>
              </View>

              <View className="flex-row items-center bg-surface-muted rounded-2xl px-4 h-14">
                <Text className="text-base text-ink font-bold mr-2">
                  {'\u20B9'}
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={(v) => setAmount(digitsOnly(v, 6))}
                  placeholder="Enter amount"
                  placeholderTextColor="#8d95a5"
                  keyboardType="number-pad"
                  className="flex-1 text-2xl font-bold text-ink"
                />
              </View>

              <View className="flex-row gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setAmount(String(value))}
                    className="flex-1 h-10 items-center justify-center rounded-full bg-surface-muted active:opacity-80"
                  >
                    <Text className="text-xs font-bold text-ink">
                      {`+ \u20B9${value}`}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="text-[11px] text-ink-muted text-center">
                Minimum top-up is {'\u20B9'}10. You will be charged via Razorpay.
              </Text>

              <Button
                fullWidth
                size="lg"
                onPress={startAdd}
                disabled={!amount || parseInt(amount, 10) < 10}
              >
                {`Add ${amount ? `\u20B9${amount}` : 'money'}`}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <RazorpayWebView
        visible={!!rzp}
        options={rzp}
        onMessage={handleRzpMessage}
        onRequestClose={() => setRzp(null)}
      />
    </SafeAreaView>
  );
}
