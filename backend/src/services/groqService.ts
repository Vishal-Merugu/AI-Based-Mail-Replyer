import Groq from "groq-sdk";
import ENV from "../utils/validateEnv";
import { logger } from "../utils/logger";

const GROQ_PROMPT_TEXT = `Analyze this email content and determine the category out of: "Interested", "Not Interested", or "More Information". Also, generate an appropriate response email.
You MUST output the response purely as a valid JSON object with EXACTLY these two keys: "category" and "responseMail". Do not include any other text, markdown formatting, or explanation.
Email content: `;

class GroqChatHandler {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({ apiKey: ENV.GROQ_API_KEY });
  }

  async getGroqChatCompletion(messageContent: string) {
    return this.groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: messageContent,
        },
      ],
      model: ENV.GROQ_MODEL,
      response_format: { type: "json_object" },
    });
  }

  async analyzeEmailContent(emailContent: string) {
    const chatCompletion = await this.getGroqChatCompletion(
      GROQ_PROMPT_TEXT + emailContent
    );
    const response = chatCompletion.choices[0]?.message?.content || "{}";
    return response;
  }

  getCategoryNResponseMail(inputString: string): {
    category: string;
    responseMail: string;
  } {
    try {
      const parsed = JSON.parse(inputString);
      if (parsed.category && parsed.responseMail) {
        return {
          category: parsed.category,
          responseMail: parsed.responseMail,
        };
      }
    } catch (e) {
      logger.error(
        { err: e, inputString },
        "Failed to parse JSON from Groq response"
      );
    }

    return {
      category: "Human Touch",
      responseMail:
        "We have received your email. Our customer team will contact you soon.",
    };
  }
}

export default GroqChatHandler;
