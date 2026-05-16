import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '@xelnova/api';
import { Button, Input } from '@xelnova/ui-native';
import { ScreenHeader } from '../../../src/components/screen-header';
import { queryKeys } from '../../../src/lib/query-keys';

export default function NewTicketScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const createMutation = useMutation({
    mutationFn: () => ticketsApi.createTicket(subject.trim(), message.trim()),
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.list() });
      router.replace({
        pathname: '/account/support/[id]',
        params: { id: ticket.id },
      });
    },
    onError: (e: Error) =>
      Alert.alert('Could not send', e?.message ?? 'Please try again.'),
  });

  const onSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing details', 'Please fill in both fields.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader title="Open a new ticket" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Input
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="What do you need help with?"
          />
          <Input
            label="Describe your issue"
            value={message}
            onChangeText={setMessage}
            placeholder="Add as much detail as you can — order numbers, screenshots etc"
            multiline
            numberOfLines={6}
            inputClassName="min-h-32 py-2"
            textAlignVertical="top"
          />
          <Button
            size="lg"
            fullWidth
            onPress={onSubmit}
            loading={createMutation.isPending}
            disabled={!subject.trim() || !message.trim()}
          >
            Send ticket
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
