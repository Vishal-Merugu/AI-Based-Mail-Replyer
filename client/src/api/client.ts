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
  createdAt: string;
  updatedAt: string;
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
