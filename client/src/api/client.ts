import axios from "axios";

export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

export const apiClient = axios.create({
  baseURL: API_URL,
});

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
