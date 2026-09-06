import crypto from "node:crypto";
import mongoose from "mongoose";

export const ORDER_STATUSES = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];
export const PAYMENT_METHODS = ["cash", "stripe", "mock_card"];
export const PAYMENT_STATUSES = ["pending", "paid"];

// The only moves an admin may make. Anything outside this table is rejected.
export const ADMIN_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};

export const CUSTOMER_CANCELLABLE = ["pending", "confirmed"];

export const createOrderNumber = () =>
  `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

// Item fields are copied, not referenced, so renaming or deleting a dish never rewrites history.
const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
  name: { type: String, required: true },
  image: { type: String, default: "" },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  idempotencyKey: { type: String, required: true, default: () => crypto.randomUUID() },
  items: { type: [orderItemSchema], validate: [(items) => items.length > 0, "An order needs at least one item"] },
  subtotal: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true, default: "cash" },
  paymentStatus: { type: String, enum: PAYMENT_STATUSES, required: true, default: "pending" },
  paymentReference: { type: String, default: "" },
  stripeSessionId: { type: String, default: "" },
  stripeCheckoutUrl: { type: String, default: "" },
  status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
  statusHistory: {
    type: [new mongoose.Schema({ status: { type: String, enum: ORDER_STATUSES }, at: { type: Date, default: Date.now } }, { _id: false })],
    default: [],
  },
  contact: {
    name: { type: String, required: [true, "Contact name is required"], trim: true, maxlength: 80 },
    phone: { type: String, required: [true, "Phone number is required"], trim: true, maxlength: 30 },
    address: { type: String, required: [true, "Delivery address is required"], trim: true, maxlength: 300 },
    note: { type: String, trim: true, maxlength: 300, default: "" },
  },
}, { timestamps: true });

orderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true } } });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);
