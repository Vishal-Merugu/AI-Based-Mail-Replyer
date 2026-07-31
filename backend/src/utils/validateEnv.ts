import { cleanEnv, str, port } from "envalid";

export default cleanEnv(process.env, {
  PORT: port(),
  MONGO_URL: str(),
  REDIS_HOST: str({ default: "127.0.0.1" }),
  REDIS_PORT: port({ default: 6379 }),
  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),
  GOOGLE_REDIRECT_URI: str(),
  GC_TOPIC_NAME: str(),
  GROQ_API_KEY: str(),
  GROQ_MODEL: str({ default: "llama-3.3-70b-versatile" }),
  CLIENT_URL: str({ default: "http://localhost:3000" }),
});
