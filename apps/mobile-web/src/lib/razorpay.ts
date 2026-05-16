/**
 * Razorpay Standard Checkout via WebView. We avoid `react-native-razorpay`
 * because it requires a custom dev-client/EAS build; the hosted JS checkout
 * works perfectly inside `react-native-webview` and lets us ship via Expo
 * Go for testing.
 *
 * The flow:
 *   1. Backend creates a Razorpay order and returns key/amount/orderId.
 *   2. We build a tiny HTML page that loads `checkout.razorpay.com/v1/checkout.js`
 *      and immediately calls `new Razorpay({...}).open()`.
 *   3. Razorpay's `handler` and `modal.ondismiss` callbacks bridge the result
 *      back to React Native via `window.ReactNativeWebView.postMessage(...)`.
 *   4. The WebView consumer parses each message and either calls
 *      `paymentApi.verifyPayment(...)` or treats it as a cancellation/error.
 */

export interface RazorpayCheckoutOptions {
  keyId: string;
  /** Razorpay order id returned by `paymentApi.createPaymentOrder`. */
  razorpayOrderId: string;
  /** Amount in paise (already converted backend-side). */
  amount: number;
  currency: string;
  /** Internal Xelnova order id, surfaced back via `notes.orderId`. */
  orderId: string;
  /** Visible order label inside Razorpay's modal. */
  orderNumber: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

export type RazorpayBridgeMessage =
  | {
      type: 'success';
      payload: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      };
    }
  | { type: 'dismissed' }
  | { type: 'failed'; message: string }
  | { type: 'ready' };

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function buildRazorpayHtml(opts: RazorpayCheckoutOptions): string {
  const safeOptions = {
    key: opts.keyId,
    amount: opts.amount,
    currency: opts.currency,
    name: 'Xelnova',
    description: `Order #${opts.orderNumber}`,
    order_id: opts.razorpayOrderId,
    prefill: {
      name: opts.prefill?.name ?? '',
      email: opts.prefill?.email ?? '',
      contact: opts.prefill?.contact ?? '',
    },
    notes: {
      orderId: opts.orderId,
    },
    theme: { color: '#11ab3a' },
  };
  const json = JSON.stringify(safeOptions).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>${escapeHtml(opts.orderNumber)}</title>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .splash { display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%; gap: 16px; color: #1a1a2e; }
    .ring { width: 36px; height: 36px; border-radius: 999px;
      border: 3px solid #d1fadf; border-top-color: #11ab3a;
      animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="splash">
    <div class="ring"></div>
    <div>Opening secure payment\u2026</div>
  </div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    (function () {
      function send(msg) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      }

      function start() {
        if (!window.Razorpay) {
          send({ type: 'failed', message: 'Razorpay script could not load. Check your connection.' });
          return;
        }
        var options = ${json};
        options.handler = function (response) {
          send({ type: 'success', payload: {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }});
        };
        options.modal = options.modal || {};
        options.modal.ondismiss = function () {
          send({ type: 'dismissed' });
        };
        try {
          var rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (resp) {
            var description = (resp && resp.error && (resp.error.description || resp.error.reason)) || 'Payment failed';
            send({ type: 'failed', message: description });
          });
          rzp.open();
          send({ type: 'ready' });
        } catch (err) {
          send({ type: 'failed', message: (err && err.message) || 'Razorpay failed to open' });
        }
      }

      if (document.readyState === 'complete') {
        start();
      } else {
        window.addEventListener('load', start);
      }
    })();
  </script>
</body>
</html>`;
}

/** Safely parse a string sent through `WebView.onMessage`. */
export function parseRazorpayMessage(raw: string): RazorpayBridgeMessage | null {
  try {
    const parsed = JSON.parse(raw) as RazorpayBridgeMessage;
    if (!parsed || typeof parsed !== 'object') return null;
    if (
      parsed.type === 'success' &&
      parsed.payload &&
      typeof parsed.payload.razorpay_order_id === 'string'
    ) {
      return parsed;
    }
    if (parsed.type === 'dismissed' || parsed.type === 'ready') return parsed;
    if (parsed.type === 'failed' && typeof parsed.message === 'string') return parsed;
  } catch {
    return null;
  }
  return null;
}
