import { request } from "./apiClient.js";

export const orderApi = {
  create: (contact, paymentMethod, idempotencyKey) => request("/orders", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: { contact, paymentMethod },
  }),
  createStripeCheckout: (contact, idempotencyKey) => request("/payments/stripe/checkout", {
    method: "POST",
    body: { contact, idempotencyKey },
  }),
  list: () => request("/orders"),
  get: (id) => request(`/orders/${id}`),
  cancel: (id) => request(`/orders/${id}/cancel`, { method: "POST" }),
  listAll: ({ status, page = 1, limit = 20 } = {}) => {
    const query = new URLSearchParams({ page, limit });
    if (status) query.set("status", status);
    return request(`/orders/admin/all?${query}`);
  },
  updateStatus: (id, status) => request(`/orders/${id}/status`, { method: "PATCH", body: { status } }),
};
