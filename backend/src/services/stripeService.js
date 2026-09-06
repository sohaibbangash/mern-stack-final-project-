import Stripe from "stripe";

let stripeClient;

function getStripe() {
  if (stripeClient) return stripeClient;
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

const currency = () => (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
const pkrPerUsd = () => Number(process.env.STRIPE_PKR_PER_USD || 280);

export function toStripeAmount(pkr) {
  if (currency() === "pkr") return Math.round(Number(pkr) * 100);
  return Math.max(50, Math.round((Number(pkr) / pkrPerUsd()) * 100));
}

export function createCheckoutSession({ order, customerEmail, successUrl, cancelUrl }) {
  return getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: order.items.map((item) => ({
      price_data: {
        currency: currency(),
        product_data: { name: item.name },
        unit_amount: toStripeAmount(item.unitPrice),
      },
      quantity: item.quantity,
    })),
    customer_email: customerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
  });
}

export function constructWebhookEvent(payload, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return getStripe().webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
}