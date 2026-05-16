import { ActivityIndicator, Modal, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import {
  buildRazorpayHtml,
  parseRazorpayMessage,
  type RazorpayBridgeMessage,
  type RazorpayCheckoutOptions,
} from '../../lib/razorpay';

interface RazorpayWebViewProps {
  visible: boolean;
  options: RazorpayCheckoutOptions | null;
  onMessage: (msg: RazorpayBridgeMessage) => void;
  onRequestClose: () => void;
}

/**
 * Renders Razorpay's hosted JS checkout inside a `react-native-webview`.
 * The bridging is one-way: Razorpay's `handler` / `payment.failed` /
 * `modal.ondismiss` callbacks `postMessage` JSON envelopes, which the host
 * screen turns into `verifyPayment` calls or error toasts.
 */
export function RazorpayWebView({
  visible,
  options,
  onMessage,
  onRequestClose,
}: RazorpayWebViewProps) {
  const html = options ? buildRazorpayHtml(options) : null;

  const handleMessage = (event: WebViewMessageEvent) => {
    const parsed = parseRazorpayMessage(event.nativeEvent.data);
    if (parsed) onMessage(parsed);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onRequestClose}
      presentationStyle="overFullScreen"
    >
      <View className="flex-1 bg-surface">
        {html ? (
          <WebView
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://xelnova.in' }}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            startInLoadingState
            renderLoading={() => (
              <View className="absolute inset-0 items-center justify-center bg-surface">
                <ActivityIndicator color="#11ab3a" size="large" />
              </View>
            )}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
    </Modal>
  );
}
