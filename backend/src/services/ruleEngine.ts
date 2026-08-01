import { Rule } from "../models/rule";

export type RuleMatch = {
  action: "force-category" | "skip-reply";
  categoryName?: string;
};

type EmailForMatching = {
  From: string;
  Subject: string;
};

function fromDomain(from: string): string {
  const m = from.match(/<([^>]+)>/);
  const address = (m ? m[1] : from).trim();
  const at = address.lastIndexOf("@");
  return at >= 0 ? address.slice(at + 1).toLowerCase() : "";
}

function fromAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

export function evaluateRules(
  rules: Rule[],
  email: EmailForMatching
): RuleMatch | null {
  const sorted = [...rules].sort(
    (a: any, b: any) => (b.priority ?? 0) - (a.priority ?? 0)
  );

  for (const rule of sorted) {
    const value = rule.matchValue?.toLowerCase();
    if (!value) continue;

    let matched = false;
    switch (rule.matchType) {
      case "from-domain":
        matched = fromDomain(email.From) === value;
        break;
      case "from-address":
        matched = fromAddress(email.From) === value;
        break;
      case "subject-contains":
        matched = (email.Subject || "").toLowerCase().includes(value);
        break;
    }

    if (matched) {
      return {
        action: rule.action as RuleMatch["action"],
        categoryName: rule.categoryName || undefined,
      };
    }
  }

  return null;
}
