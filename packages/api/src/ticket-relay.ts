/**
 * Relay message prefixes used when admin forwards messages between customer and seller.
 * - [Seller] prefix: seller reply forwarded to customer
 * - [Customer] prefix: customer message forwarded to seller
 * These are distinct from the ticket-forward notification which uses [Forwarded by support → seller].
 */

const RE_SELLER_RELAY = /^\[Seller\]\s*/i;
const RE_CUSTOMER_RELAY = /^\[Customer\]\s*/i;

/** Check if this message is a seller reply relayed to the customer. */
export function isRelayToCustomerMessage(senderRole: string, message: string): boolean {
  if (senderRole !== 'ADMIN') return false;
  return RE_SELLER_RELAY.test(message.trim());
}

/** Check if this message is a customer message relayed to the seller. */
export function isRelayToSellerMessage(senderRole: string, message: string): boolean {
  if (senderRole !== 'ADMIN') return false;
  return RE_CUSTOMER_RELAY.test(message.trim());
}

export function stripRelayToCustomerBody(message: string): string {
  return message.trim().replace(RE_SELLER_RELAY, '').trim();
}

export function stripRelayToSellerBody(message: string): string {
  return message.trim().replace(RE_CUSTOMER_RELAY, '').trim();
}
