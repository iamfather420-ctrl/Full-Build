import Stripe from "stripe";
import express from "express";
import { getDb } from "./db";
import { escrowTransactions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-02-25.clover",
});

export { stripe };

/**
 * Create a Stripe Payment Intent for escrow deposit.
 * Returns the client secret for the frontend to confirm payment.
 */
export async function createEscrowPaymentIntent(opts: {
  amount: number; // in USD
  currency?: string;
  problemId: number;
  problemTitle: string;
  userId: number;
  userEmail?: string;
}) {
  const amountCents = Math.round(opts.amount * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: opts.currency ?? "usd",
    description: `SolveX Escrow — Problem #${opts.problemId}: ${opts.problemTitle}`,
    metadata: {
      problem_id: String(opts.problemId),
      user_id: String(opts.userId),
      type: "escrow",
    },
    receipt_email: opts.userEmail,
  });
  return paymentIntent;
}

/**
 * Register Stripe webhook handler on the Express app.
 * Must be registered BEFORE express.json() middleware.
 */
export function registerStripeWebhook(app: express.Express) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: express.Request, res: express.Response) => {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        res.json({ verified: true });
        return;
      }

      console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

      try {
        if (event.type === "payment_intent.succeeded") {
          const pi = event.data.object as Stripe.PaymentIntent;
          const problemId = Number(pi.metadata?.problem_id);

          if (problemId) {
            const db = await getDb();
            if (db) {
              // Update escrow to "held" status
              await db
                .update(escrowTransactions)
                .set({
                  status: "held",
                  stripePaymentIntentId: pi.id,
                })
                .where(eq(escrowTransactions.problemId, problemId));
              console.log(`[Stripe] Escrow confirmed for problem #${problemId}`);
            }
          }
        }

        if (event.type === "payment_intent.payment_failed") {
          const pi = event.data.object as Stripe.PaymentIntent;
          const problemId = Number(pi.metadata?.problem_id);
          if (problemId) {
            const db = await getDb();
            if (db) {
              await db
                .update(escrowTransactions)
                .set({ status: "refunded" })
                .where(eq(escrowTransactions.problemId, problemId));
            }
          }
        }
      } catch (err) {
        console.error("[Stripe Webhook] Error processing event:", err);
      }

      res.json({ received: true });
    }
  );
}
