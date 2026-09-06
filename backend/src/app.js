import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { globalLimiter } from "./middleware/rateLimit.js";
import { getAllowedOrigins, requireSameOrigin, securityHeaders } from "./middleware/security.js";
import { assetRouter } from "./routes/assetRoutes.js";
import { authRouter } from "./routes/authRoutes.js";
import { cartRouter } from "./routes/cartRoutes.js";
import { menuRouter } from "./routes/menuRoutes.js";
import { orderRouter } from "./routes/orderRoutes.js";
import { reservationRouter } from "./routes/reservationRoutes.js";
import { paymentRouter } from "./routes/paymentRoutes.js";

export function createApp() {
  const app = express();

  // Rate limits key off the client IP, which is only trustworthy once the proxy hop count is declared.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy !== undefined && trustProxy !== "") {
    if (!/^(?:0|[1-9]\d*)$/.test(trustProxy)) throw new Error("TRUST_PROXY must be a non-negative integer");
    app.set("trust proxy", Number(trustProxy));
  }

  app.use(securityHeaders);
  app.use(cors({
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }));
  app.use("/api/payments/stripe/webhook", express.raw({ type: "application/json" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(globalLimiter);
  app.use(requireSameOrigin);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/assets", assetRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/reservations", reservationRouter);
  app.use("/api/payments", paymentRouter);
  app.use("/api", menuRouter);

  app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));
  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error);
    if (!error.status || error.status >= 500) console.error(error);
    if (error.name === "MulterError") return res.status(400).json({ message: error.message });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    // `retryable` lets the client decide to replay the request without matching on copy.
    if (error.name === "VersionError") return res.status(409).json({ message: "That record was modified in another tab. Please try again.", retryable: true });
    if (error.code === 11000) return res.status(409).json({ message: "A record with that value already exists" });
    const status = error.status || 500;
    res.status(status).json({ message: status >= 500 ? "Internal server error" : error.message });
  });

  return app;
}
