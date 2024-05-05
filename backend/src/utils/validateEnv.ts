import { cleanEnv } from "envalid";
import { str, port } from "envalid/dist/validators";

export default cleanEnv(process.env, {
  PORT: port(),
  MONGO_URL: str(),
  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),
  GOOGLE_REDIRECT_URI: str(),
  GC_TOPIC_NAME: str(),
  GROQ_API_KEY: str(),
});
