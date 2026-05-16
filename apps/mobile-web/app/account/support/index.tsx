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
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  MessageCircle,
  MessageSquarePlus,
} from 'lucide-react-native';
import { ticketsApi } from '@xelnova/api';
import { Button, EmptyState, Pill } from '@xelnova/ui-native';
import { ScreenHeader } from '../../../src/components/screen-header';
import { queryKeys } from '../../../src/lib/query-keys';

type Ticket = Awaited<ReturnType<typeof ticketsApi.getMyTickets>>[number];

const STATUS_TONE: Record<
  Ticket['status'],
  { label: string; tone: 'primary' | 'accent' | 'success' | 'neutral' }
> = {
  OPEN: { label: 'Open', tone: 'primary' },
  IN_PROGRESS: { label: 'In progress', tone: 'accent' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
};

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

export default function SupportListScreen() {
  const router = useRouter();

  const ticketsQuery = useQuery({
    queryKey: queryKeys.tickets.list(),
    queryFn: () => ticketsApi.getMyTickets(),
    retry: false,
  });

  const list = ticketsQuery.data ?? [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader
        title="Support"
        subtitle="We typically reply within a few hours"
      />

      <View className="px-4 pt-4 gap-3">
        <View className="bg-promo-mint-50 rounded-2xl border border-primary-200 p-4 gap-3">
          <View className="flex-row items-center gap-2">
            <MessageCircle size={18} color="#0c831f" />
            <Text className="text-sm font-bold text-primary-700">
              Need quick help?
            </Text>
          </View>
          <Text className="text-xs text-primary-700 leading-relaxed">
            Chat with our assistant first \u2014 most issues like order tracking,
            cancellation, and refunds get answered instantly. If we can't solve
            it, we'll create a ticket for you.
          </Text>
          <Button
            size="md"
            fullWidth
            onPress={() => router.push('/account/support/chat')}
            leftIcon={<MessageCircle size={16} color="#ffffff" />}
          >
            Start a chat
          </Button>
          <Pressable
            onPress={() => router.push('/account/support/new')}
            hitSlop={4}
            className="self-center"
          >
            <Text className="text-xs font-semibold text-primary-700">
              Or open a ticket directly
            </Text>
          </Pressable>
        </View>

        <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold mt-2 px-1">
          Your tickets
        </Text>
      </View>

      {ticketsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      ) : list.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon={<MessageSquarePlus size={40} color="#11ab3a" />}
            title="No tickets yet"
            subtitle="When you start a chat or open a ticket, it will appear here."
          />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={ticketsQuery.isFetching && !ticketsQuery.isLoading}
              onRefresh={() => ticketsQuery.refetch()}
              tintColor="#11ab3a"
            />
          }
          renderItem={({ item }) => {
            const cfg = STATUS_TONE[item.status];
            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/account/support/[id]',
                    params: { id: item.id },
                  })
                }
                className="bg-surface rounded-2xl border border-line-light p-4 active:opacity-90"
              >
                <View className="flex-row items-start justify-between gap-3 mb-1">
                  <View className="flex-1">
                    <Text className="text-[10px] uppercase tracking-wide text-ink-muted">
                      {item.ticketNumber}
                    </Text>
                    <Text className="text-sm font-semibold text-ink mt-0.5">
                      {item.subject}
                    </Text>
                    <Text className="text-[11px] text-ink-muted mt-0.5">
                      {`Last updated ${formatDate(item.updatedAt)}`}
                    </Text>
                  </View>
                  <Pill tone={cfg.tone} size="sm">
                    {cfg.label}
                  </Pill>
                </View>
                <View className="flex-row items-center justify-end mt-1">
                  <ChevronRight size={14} color="#8d95a5" />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
