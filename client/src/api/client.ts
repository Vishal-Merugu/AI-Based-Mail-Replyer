import axios from "axios";

export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

const TOKEN_KEY = "auth-token";

export function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

export type FollowUpConfig = {
  enabled: boolean;
  intervalDays: number;
  maxAttempts: number;
};

export type ConnectedAccount = {
  _id: string;
  emailID: string;
  lastHistoryId?: string;
  autoSend?: boolean;
  followUp?: FollowUpConfig;
  createdAt: string;
  updatedAt: string;
};

export type PendingDraft = {
  _id: string;
  emailID: string;
  from?: string;
  to?: string;
  subject?: string;
  incomingSnippet?: string;
  draftBody?: string;
  category?: string;
  createdAt: string;
};

export type ProcessedEmailActivity = {
  _id: string;
  emailID: string;
  threadId?: string;
  subject?: string;
  from?: string;
  category?: string;
  createdAt: string;
};

export async function signup(
  email: string,
  password: string,
  name?: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await apiClient.post("/auth/signup", { email, password, name });
  return res.data;
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await apiClient.post("/auth/login", { email, password });
  return res.data;
}

export async function fetchMe(): Promise<{ user: AuthUser }> {
  const res = await apiClient.get("/auth/me");
  return res.data;
}

export async function fetchAccounts(): Promise<ConnectedAccount[]> {
  const res = await apiClient.get<ConnectedAccount[]>("/accounts");
  return res.data;
}

export async function fetchActivity(
  limit = 20
): Promise<ProcessedEmailActivity[]> {
  const res = await apiClient.get<ProcessedEmailActivity[]>("/activity", {
    params: { limit },
  });
  return res.data;
}

export type Persona = {
  name?: string;
  tone?: string;
  signature?: string;
  extraInstructions?: string;
};

export async function fetchPersona(
  accountId: string
): Promise<{ emailID: string; persona: Persona }> {
  const res = await apiClient.get(`/accounts/${accountId}/persona`);
  return res.data;
}

export async function savePersona(
  accountId: string,
  persona: Persona
): Promise<{ persona: Persona }> {
  const res = await apiClient.put(`/accounts/${accountId}/persona`, persona);
  return res.data;
}

export async function updateAccountSettings(
  accountId: string,
  settings: { autoSend?: boolean; followUp?: FollowUpConfig }
): Promise<{ autoSend?: boolean; followUp?: FollowUpConfig }> {
  const res = await apiClient.put(`/accounts/${accountId}/settings`, settings);
  return res.data;
}

export async function fetchDrafts(): Promise<PendingDraft[]> {
  const res = await apiClient.get<PendingDraft[]>("/drafts");
  return res.data;
}

export async function approveDraft(
  draftId: string,
  updates?: { draftBody?: string; category?: string }
): Promise<void> {
  await apiClient.post(`/drafts/${draftId}/approve`, updates ?? {});
}

export async function rejectDraft(draftId: string): Promise<void> {
  await apiClient.post(`/drafts/${draftId}/reject`);
}

// --- Categories & rules ---

export type Category = {
  _id: string;
  name: string;
  description?: string;
  replyTemplate?: string;
  dontReply?: boolean;
};

export type Rule = {
  _id: string;
  matchType: "from-domain" | "from-address" | "subject-contains";
  matchValue: string;
  action: "force-category" | "skip-reply";
  categoryName?: string;
  priority?: number;
};

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiClient.get<Category[]>("/categories");
  return res.data;
}

export async function createCategory(
  body: Omit<Category, "_id">
): Promise<Category> {
  const res = await apiClient.post<Category>("/categories", body);
  return res.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}

export async function fetchRules(): Promise<Rule[]> {
  const res = await apiClient.get<Rule[]>("/rules");
  return res.data;
}

export async function createRule(
  body: Omit<Rule, "_id">
): Promise<Rule> {
  const res = await apiClient.post<Rule>("/rules", body);
  return res.data;
}

export async function deleteRule(id: string): Promise<void> {
  await apiClient.delete(`/rules/${id}`);
}

// --- Analytics ---

export type AnalyticsData = {
  daily: Array<{ date: string; count: number }>;
  categories: Array<{ category: string; count: number }>;
  accounts: Array<{ emailID: string; count: number }>;
  totals: { emailsProcessed: number; rangeDays: number };
};

export async function fetchAnalytics(days = 30): Promise<AnalyticsData> {
  const res = await apiClient.get<AnalyticsData>("/analytics", {
    params: { days },
  });
  return res.data;
}

// --- Contact memory ---

export type ContactMemory = {
  _id: string;
  contactEmail: string;
  notes: string;
};

export async function fetchMemory(): Promise<ContactMemory[]> {
  const res = await apiClient.get<ContactMemory[]>("/memory");
  return res.data;
}

export async function upsertMemory(
  contactEmail: string,
  notes: string
): Promise<ContactMemory> {
  const res = await apiClient.post<ContactMemory>("/memory", {
    contactEmail,
    notes,
  });
  return res.data;
}

export async function deleteMemory(id: string): Promise<void> {
  await apiClient.delete(`/memory/${id}`);
}
