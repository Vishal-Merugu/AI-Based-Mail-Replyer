import { cleanEnv, str, port } from "envalid";

export default cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "test", "production"],
    default: "development",
  }),
  PORT: port(),
  MONGO_URL: str(),
  REDIS_HOST: str({ default: "127.0.0.1" }),
  REDIS_PORT: port({ default: 6379 }),
  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),
  GOOGLE_REDIRECT_URI: str(),
  GC_TOPIC_NAME: str(),
  // Authentication for the Gmail -> Pub/Sub -> /getMessage push endpoint.
  // Set PUBSUB_AUDIENCE to the audience configured on the push subscription
  // (preferred), or PUBSUB_VERIFICATION_TOKEN for the shared-secret fallback.
  // In production one of the two is REQUIRED — the endpoint refuses traffic
  // otherwise, because it can enqueue work for arbitrary mailboxes.
  PUBSUB_AUDIENCE: str({ default: "" }),
  PUBSUB_SERVICE_ACCOUNT_EMAIL: str({ default: "" }),
  PUBSUB_VERIFICATION_TOKEN: str({ default: "" }),
  GROQ_API_KEY: str(),
  GROQ_MODEL: str({ default: "llama-3.3-70b-versatile" }),
  CLIENT_URL: str({ default: "http://localhost:3000" }),
  TOKEN_ENCRYPTION_KEY: str(),
  JWT_SECRET: str(),
  JWT_EXPIRES_IN: str({ default: "7d" }),
  STRIPE_SECRET_KEY: str({ default: "" }),
  STRIPE_WEBHOOK_SECRET: str({ default: "" }),
  STRIPE_PRO_PRICE_ID: str({ default: "" }),
  FREE_PLAN_QUOTA: str({ default: "100" }),
  PRO_PLAN_QUOTA: str({ default: "5000" }),
});
