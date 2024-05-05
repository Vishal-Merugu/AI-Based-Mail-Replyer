import Groq from "groq-sdk";
import ENV from "./utils/validateEnv";

const GROG_PROMPT_TEXT =
  "Analyse this email content and suggest me categroy of the mail out of Interested | Not Interested | More Information and also response mail in the form of an object {category, responseMail} jsut give this object nothing else the mail content is:  ";

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
      model: "mixtral-8x7b-32768",
    });
  }

  async analyzeEmailContent(emailContent: string) {
    const chatCompletion = await this.getGroqChatCompletion(
      GROG_PROMPT_TEXT + emailContent
    );
    const response = chatCompletion.choices[0]?.message?.content || "";
    return response;
  }

  getCategoryNResponseMail(inputString: string): {
    category: string;
    responseMail: string;
  } {
    // First, attempt to directly parse JSON-like parts if present
    const jsonPattern =
      /{\s*"category":\s*"([^"]+)",\s*"responseMail":\s*"([^"]+)"\s*}/;
    let jsonMatch = jsonPattern.exec(inputString);

    if (jsonMatch && jsonMatch.length >= 3) {
      // If JSON-like part is found and correctly structured
      return {
        category: jsonMatch[1],
        responseMail: jsonMatch[2],
      };
    } else {
      // If no JSON-like part, fall back to extracting from narrative description
      const narrativePattern =
        /category would be "([^"]+)".*?responseMail": "([^"]+)"/s;
      let narrativeMatch = narrativePattern.exec(inputString);

      if (narrativeMatch && narrativeMatch.length >= 3) {
        return {
          category: narrativeMatch[1],
          responseMail: narrativeMatch[2],
        };
      }
    }

    return {
      category: "Human Touch",
      responseMail:
        "We have recived your mail our customer Team will contact u soon",
    };
  }
}

export default GroqChatHandler;
