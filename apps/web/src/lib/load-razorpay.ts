/** Shared Razorpay checkout.js loader for checkout + order retry flows */

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: () => void) => void;
    };
  }
}

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();

  const src = "https://checkout.razorpay.com/v1/checkout.js";
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.head.appendChild(script);
  });
}
