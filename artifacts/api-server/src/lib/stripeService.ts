import { getUncachableStripeClient } from "./stripeClient";
import { stripeStorage } from "./stripeStorage";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export class StripeService {
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    const user = await stripeStorage.getUser(userId);
    if (user?.stripeCustomerId) return user.stripeCustomerId;

    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.create({ email, metadata: { userId } });
    await stripeStorage.updateUserStripeCustomer(userId, customer.id);
    return customer.id;
  }

  async createCheckoutSession(opts: {
    userId: string;
    email: string;
    productId: string;
    productName: string;
    amountUsd: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; orderId: string }> {
    const stripe = await getUncachableStripeClient();
    const customerId = await this.getOrCreateCustomer(opts.userId, opts.email);

    const orderId = nanoid();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(opts.amountUsd * 100),
            product_data: {
              name: opts.productName,
              metadata: { solvexProductId: opts.productId },
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      metadata: { orderId, userId: opts.userId, productId: opts.productId },
    });

    await db.insert(ordersTable).values({
      id: orderId,
      userId: opts.userId,
      productId: opts.productId,
      status: "pending",
      paymentMethod: "stripe",
      amount: String(opts.amountUsd),
      walletAddress: "stripe-checkout",
      stripeSessionId: session.id,
    });

    return { url: session.url!, orderId };
  }

  async handleCheckoutComplete(sessionId: string): Promise<void> {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return;

    const orderId = session.metadata?.orderId;
    if (!orderId) return;

    await db
      .update(ordersTable)
      .set({
        status: "paid",
        stripePaymentIntentId: session.payment_intent as string | null,
        confirmedAt: new Date(),
      })
      .where(eq(ordersTable.stripeSessionId, sessionId));
  }

  async getCheckoutSession(sessionId: string) {
    const stripe = await getUncachableStripeClient();
    return stripe.checkout.sessions.retrieve(sessionId);
  }
}

export const stripeService = new StripeService();
