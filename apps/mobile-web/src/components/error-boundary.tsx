import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level boundary for unhandled render errors. Keeps the app on a styled
 * "something went wrong" screen with a retry button instead of red-screening.
 *
 * Caveats:
 *   - Class components are required for `componentDidCatch` — there is no
 *     hooks equivalent.
 *   - Doesn't catch async / promise rejections; React Query handles those at
 *     the screen level via its own error states.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
          <View className="flex-1 items-center justify-center gap-4">
            <View className="w-16 h-16 rounded-full bg-danger-50 items-center justify-center">
              <AlertTriangle size={32} color="#dc2626" />
            </View>
            <Text className="text-xl font-bold text-ink text-center">
              Something went wrong
            </Text>
            <Text className="text-sm text-ink-secondary text-center max-w-xs">
              The app hit an unexpected error. Try again — if the problem
              persists, please contact our support team.
            </Text>
            {__DEV__ ? (
              <View className="w-full bg-surface-muted border border-line-light rounded-xl p-3 mt-2">
                <Text className="text-[10px] text-ink-muted">
                  {this.state.error.message}
                </Text>
              </View>
            ) : null}
            <Pressable
              onPress={this.reset}
              className="flex-row items-center gap-2 px-5 h-12 rounded-full bg-primary-500 active:opacity-80 mt-2"
            >
              <RefreshCw size={16} color="#ffffff" />
              <Text className="text-sm font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
}
