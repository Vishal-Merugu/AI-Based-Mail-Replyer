import { Request, Response } from "express";
import Stripe from "stripe";

import ENV from "../utils/validateEnv";
import UserModel from "../models/user";
import { getUsage } from "../services/quota";
import { logger } from "../utils/logger";

function getStripe(): Stripe | null {
  if (!ENV.STRIPE_SECRET_KEY) return null;
  return new Stripe(ENV.STRIPE_SECRET_KEY);
}

export const getBilling = async (req: Request, res: Response) => {
  try {
    const usage = await getUsage(req.user!.userId);
    res.status(200).send({
      ...usage,
      stripeConfigured: !!ENV.STRIPE_SECRET_KEY && !!ENV.STRIPE_PRO_PRICE_ID,
    });
  } catch (err: any) {
    logger.error({ err }, "Error getting billing info");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    if (!stripe || !ENV.STRIPE_PRO_PRICE_ID) {
      res.status(400).send({ message: "Stripe is not configured on this server" });
      return;
    }

    const user = await UserModel.findById(req.user!.userId);
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: String(user._id) },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const successUrl = `${ENV.CLIENT_URL}/billing?status=success`;
    const cancelUrl = `${ENV.CLIENT_URL}/billing?status=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: ENV.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.status(200).send({ url: session.url });
  } catch (err: any) {
    logger.error({ err }, "Error creating checkout session");
    res.status(500).send({ message: "Internal Server Error" });
  }
};

// Stripe webhook needs the raw body for signature verification, so it's
// mounted with express.raw() in app.ts rather than express.json().
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const stripe = getStripe();
  if (!stripe || !ENV.STRIPE_WEBHOOK_SECRET) {
    res.status(200).send({ received: true });
    return;
  }

  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) {
    res.status(400).send("Missing signature");
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      ENV.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    logger.warn({ err: err.message }, "Stripe webhook signature verification failed");
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (customerId) {
        await UserModel.findOneAndUpdate(
          { stripeCustomerId: customerId },
          {
            plan: "pro",
            stripeSubscriptionId: subscriptionId ?? undefined,
          }
        );
      }
    } else if (
      event.type === "customer.subscription.deleted" ||
      event.type === "invoice.payment_failed"
    ) {
      const obj = event.data.object as any;
      const customerId =
        typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
      if (customerId) {
        await UserModel.findOneAndUpdate(
          { stripeCustomerId: customerId },
          { plan: "free" }
        );
      }
    }
  } catch (err: any) {
    logger.error({ err }, "Error handling Stripe webhook");
  }

  res.status(200).send({ received: true });
};
