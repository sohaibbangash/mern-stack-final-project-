import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { orderApi } from "../services/orderApi.js";
import { formatDate, formatPrice } from "../utils/format.js";
import "./Account.css";

const CANCELLABLE = ["pending", "confirmed"];

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    orderApi.get(id).then((data) => setOrder(data.data)).catch((loadError) => setError(loadError.message));
  }, [id]);

  async function cancel() {
    setIsBusy(true);
    try {
      const data = await orderApi.cancel(id);
      setOrder(data.data);
    } catch (cancelError) {
      setError(cancelError.message);
    } finally {
      setIsBusy(false);
    }
  }

  if (error && !order) {
    return (
      <div className="account-page">
        <div className="account-card narrow">
          <div className="alert error">{error}</div>
          <p className="form-note"><Link to="/orders">Back to your orders</Link></p>
        </div>
      </div>
    );
  }

  if (!order) return <div className="page-loader">Loading order...</div>;

  return (
    <div className="account-page">
      <div className="account-card">
        {location.state?.message && <div className="alert success">{location.state.message}</div>}
        {error && <div className="alert error">{error}</div>}

        <h1 className="account-title">{order.orderNumber}</h1>
        <p className="account-subtitle">
          Placed {formatDate(order.createdAt)} · <span className={`status-pill ${order.status}`}>{order.status}</span>
        </p>

        <div className="line-list">
          {order.items.map((line) => (
            <div className="line-item" key={line.menuItem}>
              <img
                src={line.image || "/images/logo.png"}
                alt={line.name}
                onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/images/logo.png"; }}
              />
              <div>
                <p className="line-name">{line.name}</p>
                <p className="line-meta">{formatPrice(line.unitPrice)} × {line.quantity}</p>
              </div>
              <p className="line-name">{formatPrice(line.lineTotal)}</p>
            </div>
          ))}
        </div>

        <div className="summary">
          <div className="summary-row"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          <div className="summary-row total"><span>Total</span><span>{formatPrice(order.total)}</span></div>
        </div>

        <p className="line-meta">Payment: {order.paymentMethod === "stripe" ? "Stripe test card" : order.paymentMethod === "mock_card" ? "Mock card" : "Cash on delivery"} · {order.paymentStatus}</p>

        <h3 style={{ marginTop: 28, color: "var(--primary-color)" }}>Delivering to</h3>
        <p className="line-meta">{order.contact.name} · {order.contact.phone}</p>
        <p className="line-meta">{order.contact.address}</p>
        {order.contact.note && <p className="line-meta">Note: {order.contact.note}</p>}

        <h3 style={{ marginTop: 28, color: "var(--primary-color)" }}>Progress</h3>
        <ul className="timeline">
          {order.statusHistory.map((entry) => (
            <li key={`${entry.status}-${entry.at}`}>
              <span>{entry.status}</span>
              <span>{formatDate(entry.at)}</span>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
          <Link className="btn ghost" to="/orders">Back to your orders</Link>
          {CANCELLABLE.includes(order.status) && (
            <button type="button" className="btn danger" onClick={cancel} disabled={isBusy}>
              {isBusy ? "Cancelling..." : "Cancel order"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
