import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  CreditCard,
  HelpCircle,
  Package,
  RotateCcw,
  Tag,
  type LucideIcon,
} from 'lucide-react-native';
import { notificationsApi } from '@xelnova/api';
import { EmptyState } from '@xelnova/ui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { queryKeys } from '../../src/lib/query-keys';
import { notificationHref } from '../../src/lib/push-notifications';

interface NotificationRow {
  id: string;
  type: string | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

interface NotificationListResponse {
  notifications: NotificationRow[];
  unread: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const TYPE_ICON: Record<string, { Icon: LucideIcon; color: string; background: string }> = {
  ORDER_PLACED: { Icon: Package, color: '#0c831f', background: '#ecfdf3' },
  ORDER_CONFIRMED: { Icon: Package, color: '#0c831f', background: '#ecfdf3' },
  ORDER_SHIPPED: { Icon: Package, color: '#1f8f89', background: '#e6f7f6' },
  ORDER_OUT_FOR_DELIVERY: { Icon: Package, color: '#1f8f89', background: '#e6f7f6' },
  ORDER_DELIVERED: { Icon: Package, color: '#047857', background: '#ecfdf5' },
  ORDER_CANCELLED: { Icon: Package, color: '#b91c1c', background: '#fef2f2' },
  ORDER_PAYMENT_FAILED: { Icon: Package, color: '#b91c1c', background: '#fef2f2' },
  RETURN_REQUESTED: { Icon: RotateCcw, color: '#5a6478', background: '#f1f5f9' },
  RETURN_APPROVED: { Icon: RotateCcw, color: '#0c831f', background: '#ecfdf3' },
  RETURN_REJECTED: { Icon: RotateCcw, color: '#b91c1c', background: '#fef2f2' },
  WALLET_CREDITED: { Icon: CreditCard, color: '#0c831f', background: '#ecfdf3' },
  WALLET_DEBITED: { Icon: CreditCard, color: '#5a6478', background: '#f1f5f9' },
  WALLET_REFUND: { Icon: CreditCard, color: '#0c831f', background: '#ecfdf3' },
  TICKET_REPLY: { Icon: HelpCircle, color: '#a78bfa', background: '#f5f3ff' },
  PROMO: { Icon: Tag, color: '#b07a00', background: '#fffbeb' },
  OFFER: { Icon: Tag, color: '#b07a00', background: '#fffbeb' },
};

function formatRelative(iso: string): string {
  try {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<NotificationListResponse>({
    queryKey: queryKeys.notifications.list(),
    queryFn: ({ pageParam }) =>
      notificationsApi.getNotifications(pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
    refetchOnMount: 'always',
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    },
  });

  const handlePress = (n: NotificationRow) => {
    if (!n.read) markRead.mutate(n.id);
    const href = notificationHref(n.type, n.data ?? null);
    if (href) router.push(href);
  };

  const pages = query.data?.pages ?? [];
  const list = pages.flatMap((p) => p.notifications ?? []);
  const unread = pages[0]?.unread ?? 0;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        trailing={
          unread > 0 ? (
            <Pressable
              onPress={() => markAll.mutate()}
              hitSlop={4}
              className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary-50 active:opacity-60"
            >
              <CheckCheck size={14} color="#0c831f" />
              <Text className="text-xs font-semibold text-primary-700">
                Mark all
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      ) : list.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon={<Bell size={40} color="#11ab3a" />}
            title="You're all caught up"
            subtitle="When something important happens, it will appear here."
          />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading && !query.isFetchingNextPage}
              onRefresh={() => query.refetch()}
              tintColor="#11ab3a"
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              query.fetchNextPage();
            }
          }}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="#11ab3a" />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const config =
              TYPE_ICON[(item.type ?? '').toUpperCase()] ?? {
                Icon: Bell,
                color: '#5a6478',
                background: '#f1f5f9',
              };
            return (
              <Pressable
                onPress={() => handlePress(item)}
                className={`flex-row gap-3 rounded-2xl p-4 border ${
                  item.read
                    ? 'bg-surface border-line-light'
                    : 'bg-promo-mint-50 border-primary-200'
                } active:opacity-90`}
              >
                <View
                  style={{ backgroundColor: config.background }}
                  className="w-10 h-10 rounded-xl items-center justify-center"
                >
                  <config.Icon size={18} color={config.color} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text
                      className={`text-sm flex-1 ${
                        item.read ? 'text-ink' : 'font-bold text-ink'
                      }`}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {!item.read ? (
                      <View className="w-2 h-2 rounded-full bg-primary-500" />
                    ) : null}
                  </View>
                  <Text
                    className="text-xs text-ink-secondary mt-0.5 leading-relaxed"
                    numberOfLines={3}
                  >
                    {item.body}
                  </Text>
                  <Text className="text-[11px] text-ink-muted mt-1">
                    {formatRelative(item.createdAt)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
