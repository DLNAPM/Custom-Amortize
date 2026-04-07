import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Stripe lazily to avoid crashing on startup if key is missing
  let stripeClient: Stripe | null = null;
  function getStripe(): Stripe {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error("STRIPE_SECRET_KEY environment variable is required");
      }
      stripeClient = new Stripe(key);
    }
    return stripeClient;
  }

  // Webhook endpoint needs raw body
  app.post(
    "/api/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !webhookSecret) {
        res.status(400).send("Missing signature or webhook secret");
        return;
      }

      let event;
      try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("Webhook Error:", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }

      // Handle the event
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;

        if (userId) {
          // Here we would ideally update Firestore directly using Firebase Admin SDK.
          // However, since we don't have Firebase Admin configured, we can either:
          // 1. Setup Firebase Admin (requires service account)
          // 2. Just log it and rely on the client to verify, or
          // 3. For this implementation, we will assume Firebase Admin is needed.
          // Let's add Firebase Admin to update the user's tier.
          console.log(`Checkout completed for user: ${userId}`);
          try {
            const { getFirestore } = await import("firebase-admin/firestore");
            const { initializeApp, getApps, cert } = await import("firebase-admin/app");
            
            if (getApps().length === 0) {
              // If we have a service account, we initialize it.
              // If not, we might fail here. We should handle this gracefully.
              if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                initializeApp({
                  credential: cert(serviceAccount)
                });
              } else {
                // Fallback: Default application credentials
                initializeApp();
              }
            }
            const db = getFirestore();
            await db.collection("users").doc(userId).set({ tier: "Premium" }, { merge: true });
            console.log(`Successfully upgraded user ${userId} to Premium`);
          } catch (error) {
            console.error("Error updating user tier in Firestore:", error);
          }
        }
      }

      res.json({ received: true });
    }
  );

  // Parse JSON bodies for other routes
  app.use(express.json());

  app.post("/api/init-premium", async (req, res) => {
    console.log("Received request to /api/init-premium");
    console.log("Body:", req.body);
    try {
      const { userId, priceId } = req.body;
      
      if (!userId) {
        console.log("Missing userId");
        res.status(400).json({ error: "User ID is required" });
        return;
      }

      console.log("Getting Stripe client...");
      const stripe = getStripe();
      console.log("Creating checkout session...");
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId || process.env.VITE_STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.protocol}://${req.get("host")}/?success=true`,
        cancel_url: `${req.protocol}://${req.get("host")}/?canceled=true`,
        client_reference_id: userId,
      });

      console.log("Session created:", session.url);
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // In Express v4, use app.get('*', ...)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
