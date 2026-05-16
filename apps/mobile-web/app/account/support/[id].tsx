import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ImagePlus,
  Send,
  Shield,
  Store,
  User as UserIcon,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageFromUri } from '../../../src/lib/upload';
import { ticketsApi } from '@xelnova/api';

type Ticket = Awaited<ReturnType<typeof ticketsApi.getMyTicketDetail>>;
type TicketMessage = NonNullable<Ticket['messages']>[number];
import { Image, Pill } from '@xelnova/ui-native';
import { ScreenHeader } from '../../../src/components/screen-header';
import { queryKeys } from '../../../src/lib/query-keys';

const STATUS_TONE: Record<
  Ticket['status'],
  { label: string; tone: 'primary' | 'accent' | 'success' | 'neutral' }
> = {
  OPEN: { label: 'Open', tone: 'primary' },
  IN_PROGRESS: { label: 'In progress', tone: 'accent' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function TicketDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<TicketMessage>>(null);

  const ticketQuery = useQuery({
    queryKey: queryKeys.tickets.detail(id),
    queryFn: () => ticketsApi.getMyTicketDetail(id),
    enabled: id.length > 0,
    retry: false,
    refetchInterval: 30_000,
  });

  const [reply, setReply] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async () => {
    if (attachments.length >= 5) {
      Alert.alert('Limit reached', 'You can attach up to 5 photos per reply.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to attach images.');
      return;
    }
    const remaining = 5 - attachments.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (result.canceled || !result.assets?.length) return;
    setUploading(true);
    const next = [...attachments];
    try {
      for (const asset of result.assets.slice(0, remaining)) {
        try {
          const url = await uploadImageFromUri({
            uri: asset.uri,
            mime: asset.mimeType ?? 'image/jpeg',
            name: asset.fileName ?? `photo-${Date.now()}.jpg`,
          });
          next.push(url);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Upload failed';
          Alert.alert('Upload failed', msg);
        }
      }
      setAttachments(next);
    } finally {
      setUploading(false);
    }
  };

  const replyMutation = useMutation({
    mutationFn: () =>
      ticketsApi.replyToMyTicket(
        id,
        reply.trim(),
        attachments.length > 0 ? attachments : undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.list() });
      setReply('');
      setAttachments([]);
    },
    onError: (e: Error) =>
      Alert.alert('Could not send', e?.message ?? 'Please try again.'),
  });

  const ticket = ticketQuery.data;
  const messages = ticket?.messages ?? [];

  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(t);
  }, [messages.length]);

  const onSend = () => {
    if (!reply.trim()) return;
    replyMutation.mutate();
  };

  const isClosed = ticket?.status === 'CLOSED' || ticket?.status === 'RESOLVED';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader
        title={ticket?.subject ?? 'Ticket'}
        subtitle={ticket?.ticketNumber}
        trailing={
          ticket ? (
            <Pill tone={STATUS_TONE[ticket.status].tone} size="sm">
              {STATUS_TONE[ticket.status].label}
            </Pill>
          ) : undefined
        }
      />

      {ticketQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      ) : !ticket ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-semibold text-ink">
            Ticket not found
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 24,
              gap: 12,
            }}
            renderItem={({ item }) => <MessageBubble msg={item} />}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Text className="text-sm text-ink-secondary">
                  No messages yet
                </Text>
              </View>
            }
          />

          {isClosed ? (
            <View className="bg-surface border-t border-line-light px-4 py-3">
              <Text className="text-xs text-ink-muted text-center">
                This ticket is {ticket.status === 'RESOLVED' ? 'resolved' : 'closed'}.
                Open a new ticket for further help.
              </Text>
            </View>
          ) : (
            <View className="bg-surface border-t border-line-light px-3 pt-2 pb-3 gap-2">
              {attachments.length > 0 ? (
                <View className="flex-row gap-2 flex-wrap">
                  {attachments.map((uri, idx) => (
                    <View
                      key={uri}
                      className="w-16 h-16 rounded-lg bg-surface-muted overflow-hidden border border-line-light relative"
                    >
                      <Image uri={uri} className="w-full h-full" contentFit="cover" />
                      <Pressable
                        onPress={() =>
                          setAttachments((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        hitSlop={6}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 items-center justify-center"
                      >
                        <X size={11} color="#ffffff" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <View className="flex-row items-end gap-2">
                <Pressable
                  onPress={pickAndUpload}
                  disabled={uploading}
                  className="w-11 h-11 items-center justify-center rounded-full bg-surface-muted active:opacity-80"
                  hitSlop={4}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#11ab3a" />
                  ) : (
                    <ImagePlus size={18} color="#1a1a2e" />
                  )}
                </Pressable>
                <View className="flex-1 bg-surface-muted rounded-2xl px-3 py-2 border border-line-light">
                  <TextInput
                    value={reply}
                    onChangeText={setReply}
                    placeholder="Type your message…"
                    placeholderTextColor="#8d95a5"
                    multiline
                    className="text-sm text-ink min-h-9 max-h-32"
                  />
                </View>
                <Pressable
                  onPress={onSend}
                  disabled={!reply.trim() || replyMutation.isPending}
                  className={`w-11 h-11 items-center justify-center rounded-full ${
                    !reply.trim() || replyMutation.isPending
                      ? 'bg-primary-300'
                      : 'bg-primary-500 active:opacity-80'
                  }`}
                  hitSlop={4}
                >
                  {replyMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Send size={18} color="#ffffff" />
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function MessageBubble({ msg }: { msg: TicketMessage }) {
  const isMine = msg.senderRole === 'CUSTOMER';
  const senderLabel =
    msg.senderRole === 'CUSTOMER'
      ? 'You'
      : msg.senderRole === 'SELLER'
        ? msg.sender?.name || 'Seller'
        : 'Xelnova support';

  const Icon =
    msg.senderRole === 'SELLER'
      ? Store
      : msg.senderRole === 'ADMIN'
        ? Shield
        : UserIcon;

  return (
    <View className={`flex-row gap-2 ${isMine ? 'self-end' : 'self-start'} max-w-[88%]`}>
      {!isMine ? (
        <View className="w-8 h-8 rounded-full bg-primary-50 items-center justify-center mt-1">
          <Icon size={14} color="#0c831f" />
        </View>
      ) : null}
      <View
        className={`rounded-2xl px-3.5 py-2.5 ${
          isMine
            ? 'bg-primary-500 rounded-br-md'
            : 'bg-surface border border-line-light rounded-bl-md'
        }`}
      >
        <Text
          className={`text-[10px] font-semibold uppercase tracking-wide ${
            isMine ? 'text-white/80' : 'text-ink-muted'
          }`}
        >
          {senderLabel}
        </Text>
        <Text
          className={`text-sm mt-0.5 leading-relaxed ${
            isMine ? 'text-white' : 'text-ink'
          }`}
        >
          {msg.message}
        </Text>
        {msg.attachments && msg.attachments.length > 0 ? (
          <View className="flex-row gap-1.5 flex-wrap mt-2">
            {msg.attachments.map((url: string) => (
              <View
                key={url}
                className="w-20 h-20 rounded-lg bg-surface-muted overflow-hidden"
              >
                <Image uri={url} className="w-full h-full" contentFit="cover" />
              </View>
            ))}
          </View>
        ) : null}
        <Text
          className={`text-[10px] mt-1 ${
            isMine ? 'text-white/70' : 'text-ink-muted'
          }`}
        >
          {formatDateTime(msg.createdAt)}
        </Text>
      </View>
    </View>
  );
}
