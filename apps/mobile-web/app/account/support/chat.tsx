import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, ExternalLink, Send } from 'lucide-react-native';
import { ticketsApi } from '@xelnova/api';
import { ScreenHeader } from '../../../src/components/screen-header';
import { queryKeys } from '../../../src/lib/query-keys';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'system';
  text: string;
  ticketId?: string;
}

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'bot',
  text:
    "Hi! I'm Xelnova's support assistant. Tell me what you need help with — like 'track order #ORD123', 'cancel order', 'return product', or 'wallet question' — and I'll try to resolve it instantly.",
};

export default function SupportChatScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const chatMutation = useMutation({
    mutationFn: (msg: string) => ticketsApi.chatWithBot(msg.trim()),
  });

  useEffect(() => {
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(t);
  }, [messages.length]);

  const append = (m: ChatMessage) => setMessages((prev) => [...prev, m]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;
    setInput('');
    const userId = `u-${Date.now()}`;
    append({ id: userId, role: 'user', text });
    try {
      const res = await chatMutation.mutateAsync(text);
      append({
        id: `b-${Date.now()}`,
        role: 'bot',
        text: res.reply,
        ticketId: res.ticketId,
      });
      if (res.ticketId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tickets.list() });
        append({
          id: `s-${Date.now()}`,
          role: 'system',
          text: 'Ticket created. You can track it in Account → Support.',
          ticketId: res.ticketId,
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Could not reach the assistant.';
      append({ id: `e-${Date.now()}`, role: 'bot', text: `Sorry — ${msg}` });
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader
        title="Support assistant"
        subtitle="Powered by Xelnova"
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 16 }}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          renderItem={({ item }) =>
            item.role === 'system' ? (
              <SystemNotice
                text={item.text}
                ticketId={item.ticketId}
                onOpen={(id) =>
                  router.push({
                    pathname: '/account/support/[id]',
                    params: { id },
                  })
                }
              />
            ) : (
              <ChatBubble msg={item} />
            )
          }
        />

        {chatMutation.isPending ? (
          <View className="px-4 py-2 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#11ab3a" />
            <Text className="text-xs text-ink-muted">Assistant is typing…</Text>
          </View>
        ) : null}

        <View className="bg-surface border-t border-line-light px-3 pt-2 pb-3">
          <View className="flex-row items-end gap-2">
            <View className="flex-1 bg-surface-muted rounded-2xl px-3 py-2 border border-line-light">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Type your message…"
                placeholderTextColor="#8d95a5"
                multiline
                className="text-sm text-ink min-h-9 max-h-32"
              />
            </View>
            <Pressable
              onPress={onSend}
              disabled={!input.trim() || chatMutation.isPending}
              className={`w-11 h-11 items-center justify-center rounded-full ${
                !input.trim() || chatMutation.isPending
                  ? 'bg-primary-300'
                  : 'bg-primary-500 active:opacity-80'
              }`}
              hitSlop={4}
            >
              <Send size={18} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isMine = msg.role === 'user';
  return (
    <View
      className={`flex-row gap-2 max-w-[88%] ${
        isMine ? 'self-end' : 'self-start'
      }`}
    >
      {!isMine ? (
        <View className="w-8 h-8 rounded-full bg-primary-50 items-center justify-center mt-1">
          <Bot size={14} color="#0c831f" />
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
          className={`text-sm leading-relaxed ${
            isMine ? 'text-white' : 'text-ink'
          }`}
        >
          {msg.text}
        </Text>
      </View>
    </View>
  );
}

function SystemNotice({
  text,
  ticketId,
  onOpen,
}: {
  text: string;
  ticketId?: string;
  onOpen: (id: string) => void;
}) {
  return (
    <View className="bg-promo-mint-50 border border-primary-200 rounded-2xl p-3 gap-2">
      <Text className="text-xs text-primary-700">{text}</Text>
      {ticketId ? (
        <Pressable
          onPress={() => onOpen(ticketId)}
          className="flex-row items-center gap-1.5 self-start px-3 py-1.5 rounded-full bg-primary-500 active:opacity-80"
        >
          <ExternalLink size={12} color="#ffffff" />
          <Text className="text-xs font-bold text-white">Open ticket</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
