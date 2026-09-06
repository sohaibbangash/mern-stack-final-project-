import { Cart } from "../models/Cart.js";
import { Order, createOrderNumber } from "../models/Order.js";
import { priceCart } from "../services/cartService.js";
import { constructWebhookEvent, createCheckoutSession } from "../services/stripeService.js";
import { AppError, asyncHandler } from "../utils/errors.js";

const orderFromLines = (lines) => lines.map((line) => ({
  menuItem: line.menuItem,
  name: line.name,
  image: line.image,
  unitPrice: line.unitPrice,
  quantity: line.quantity,
  lineTotal: line.lineTotal,
}));

export const createStripeCheckout = asyncHandler(async (req, res) => {
  const { contact, idempotencyKey } = req.body;
  const existing = await Order.findOne({ user: req.user._id, idempotencyKey });
  if (existing?.stripeCheckoutUrl) return res.json({ data: existing, url: existing.stripeCheckoutUrl });

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart?.items.length) throw new AppError("Your cart is empty", 400);
  const priced = await priceCart(cart);
  if (!priced.items.length) throw new AppError("None of the items in your cart are available right now", 409);
  if (priced.removed > 0) throw new AppError("Some items in your cart are no longer available. Review your cart and try again.", 409);

  const order = await Order.create({
    orderNumber: createOrderNumber(),
    user: req.user._id,
    idempotencyKey,
    items: orderFromLines(priced.items),
    subtotal: priced.subtotal,
    total: priced.total,
    paymentMethod: "stripe",
    paymentStatus: "pending",
    status: "pending",
    statusHistory: [{ status: "pending" }],
    contact,
  });

  try {
    const customerUrl = process.env.CUSTOMER_URL || "http://localhost:5173";
    const session = await createCheckoutSession({
      order,
      customerEmail: req.user.email,
      successUrl: `${customerUrl}/orders/${order._id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${customerUrl}/checkout?payment=cancelled`,
    });
    order.stripeSessionId = session.id;
    order.stripeCheckoutUrl = session.url;
    await order.save();
    cart.items = [];
    await cart.save();
    res.json({ data: order, url: session.url });
  } catch (error) {
    await Order.deleteOne({ _id: order._id });
    throw error;
  }
});

export async function handleStripeWebhook(req, res) {
  let event;
  try {
    event = constructWebhookEvent(req.body, req.headers["stripe-signature"]);
  } catch (error) {
    return res.status(400).json({ message: `Webhook signature verification failed: ${error.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "paid",
        paymentReference: session.payment_intent || session.id,
      });
    }
  }
  return res.json({ received: true });
}