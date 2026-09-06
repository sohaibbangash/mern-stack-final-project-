import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CartLines from "../components/CartLines.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useCart } from "../hooks/useCart.js";
import { orderApi } from "../services/orderApi.js";
import { formatPrice } from "../utils/format.js";
import "./Account.css";

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, total, refresh } = useCart();
  const [contact, setContact] = useState({ name: user?.name || "", phone: "", address: "", note: "" });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idempotencyKey = useRef(null);
  const navigate = useNavigate();

  const update = (field) => (event) => setContact((prev) => ({ ...prev, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      idempotencyKey.current ??= globalThis.crypto.randomUUID();
      const data = paymentMethod === "stripe"
        ? await orderApi.createStripeCheckout(contact, idempotencyKey.current)
        : await orderApi.create(contact, "cash", idempotencyKey.current);
      if (paymentMethod === "stripe") {
        window.location.assign(data.url);
        return;
      }
      await refresh();
      navigate(`/orders/${data.data._id}`, { replace: true, state: { message: data.message } });
    } catch (submitError) {
      setError(submitError.message);
      // A rejected line means the menu moved on: pull the corrected cart back in.
      if (submitError.status === 409) await refresh().catch(() => null);
      setIsSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="account-page">
        <div className="account-card">
          <div className="empty-state">
            <h3>Your cart is empty</h3>
            <p>Add a dish before checking out.</p>
            <Link className="btn" to="/" style={{ marginTop: 16 }}>View the menu</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <h1 className="account-title" style={{ color: "var(--secondary-color)" }}>Checkout</h1>
      <div className="checkout-grid" style={{ marginTop: 20 }}>
        <div className="account-card">
          <h2 className="account-title" style={{ fontSize: "1.4rem" }}>Delivery details</h2>
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span>Name</span>
              <input value={contact.name} onChange={update("name")} autoComplete="name" required />
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={contact.phone} onChange={update("phone")} autoComplete="tel" required />
            </label>
            <label className="field">
              <span>Delivery address</span>
              <textarea value={contact.address} onChange={update("address")} autoComplete="street-address" required />
            </label>
            <label className="field">
              <span>Note for the kitchen (optional)</span>
              <textarea value={contact.note} onChange={update("note")} />
            </label>
            <fieldset className="field">
              <legend>Payment method</legend>
              <label>
                <input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === "cash"} onChange={(event) => setPaymentMethod(event.target.value)} /> Cash on delivery
              </label>
              <label>
                <input type="radio" name="paymentMethod" value="stripe" checked={paymentMethod === "stripe"} onChange={(event) => setPaymentMethod(event.target.value)} /> Card payment (Stripe test mode)
              </label>
              <p className="line-meta">You will be redirected to Stripe&apos;s secure test checkout. No real charge is made.</p>
            </fieldset>
            <button className="btn block" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Placing order..." : `Place order · ${formatPrice(total)}`}
            </button>
          </form>
        </div>

        <div className="account-card">
          <h2 className="account-title" style={{ fontSize: "1.4rem" }}>Order summary</h2>
          <CartLines compact />
          <div className="summary">
            <div className="summary-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="summary-row total"><span>Total</span><span>{formatPrice(total)}</span></div>
          </div>
          <p className="line-meta" style={{ marginTop: 14 }}>
            Prices are confirmed against the live menu when your order is placed.
          </p>
        </div>
      </div>
    </div>
  );
}
