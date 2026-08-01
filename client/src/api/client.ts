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

export type ConnectedAccount = {
  _id: string;
  emailID: string;
  lastHistoryId?: string;
  autoSend?: boolean;
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
  settings: { autoSend: boolean }
): Promise<{ autoSend: boolean }> {
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
