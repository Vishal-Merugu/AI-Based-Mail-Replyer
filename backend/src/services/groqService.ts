import Groq from "groq-sdk";
import ENV from "../utils/validateEnv";
import { logger } from "../utils/logger";

export type Persona = {
  name?: string;
  tone?: string;
  signature?: string;
  extraInstructions?: string;
};

export type CategoryHint = {
  name: string;
  description?: string;
};

export type ThreadTurn = {
  from: string;
  date: string;
  snippet: string;
};

export type AnalyzeContext = {
  persona?: Persona;
  categories?: CategoryHint[];
  threadHistory?: ThreadTurn[];
  contactNotes?: string;
};

function buildPrompt(emailContent: string, ctx: AnalyzeContext): string {
  const p = ctx.persona || {};
  const categoryList =
    ctx.categories && ctx.categories.length
      ? ctx.categories
      : [
          { name: "Interested" },
          { name: "Not Interested" },
          { name: "More Information" },
        ];

  const catBlock = categoryList
    .map((c) => (c.description ? `- ${c.name}: ${c.description}` : `- ${c.name}`))
    .join("\n");

  const parts: string[] = [
    `Analyze this email content and pick exactly one category from the list below. Also generate an appropriate response email.\nCategories:\n${catBlock}`,
    'You MUST output the response purely as a valid JSON object with EXACTLY these two keys: "category" and "responseMail". The "category" value must be one of the category names above. Do not include any other text, markdown formatting, or explanation.',
  ];

  const styleBits: string[] = [];
  if (p.name) styleBits.push(`You are writing as ${p.name}.`);
  if (p.tone) styleBits.push(`Match a ${p.tone} tone.`);
  if (p.signature) styleBits.push(`End the reply with this exact signature block on its own line:\n${p.signature}`);
  if (p.extraInstructions) styleBits.push(`Additional guidance: ${p.extraInstructions}`);
  if (styleBits.length) parts.push(styleBits.join("\n"));

  if (ctx.contactNotes && ctx.contactNotes.trim()) {
    parts.push(`Context about this contact (private notes):\n${ctx.contactNotes.trim()}`);
  }

  if (ctx.threadHistory && ctx.threadHistory.length > 1) {
    const history = ctx.threadHistory
      .slice(0, 10)
      .map(
        (t, i) =>
          `[${i + 1}] From: ${t.from} (${t.date})\n${t.snippet}`
      )
      .join("\n\n");
    parts.push(`Prior conversation in this thread (oldest first):\n${history}`);
  }

  parts.push(`Latest incoming email to reply to:\n${emailContent}`);

  return parts.join("\n\n");
}

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

  async analyzeEmailContent(
    emailContent: string,
    ctx: AnalyzeContext = {}
  ) {
    const chatCompletion = await this.getGroqChatCompletion(
      buildPrompt(emailContent, ctx)
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
