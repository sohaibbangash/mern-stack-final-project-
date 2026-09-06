import { Router } from "express";
import { z } from "zod";
import { createStripeCheckout, handleStripeWebhook } from "../controllers/paymentController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(30),
  address: z.string().trim().min(5).max(300),
  note: z.string().trim().max(300).optional().default(""),
});

export const paymentRouter = Router();
paymentRouter.post("/stripe/checkout", requireAuth, validate(z.object({ contact: contactSchema, idempotencyKey: z.string().uuid() })), createStripeCheckout);
paymentRouter.post("/stripe/webhook", handleStripeWebhook);