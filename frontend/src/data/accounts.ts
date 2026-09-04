import { apiClient } from '../services/apiClient';
export const TOKEN_KEY = 'geosense_token';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'dev';
  createdAt: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function authenticateAccount(email: string, password: string): Promise<{ success: boolean; error?: string; account?: UserAccount, token?: string }> {
  try {
    const data = await apiClient.post('/api/auth/login', { email, password });
    
    saveToken(data.token);
    return { success: true, account: data.account, token: data.token };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Login error' };
  }
}

export async function registerAccount(
  name: string,
  email: string,
  password: string,
  role: 'student' | 'teacher' | 'dev'
): Promise<{ success: boolean; error?: string; account?: UserAccount, token?: string }> {
  try {
    const data = await apiClient.post('/api/auth/register', { name, email, password, role });
    
    saveToken(data.token);
    return { success: true, account: data.account, token: data.token };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Register error' };
  }
}

// In the new architecture, updating accounts (like name/email) should be done via an auth endpoint if needed, but for now we'll stub it out as it's less critical.
export async function updateAccount(
  id: string,
  updates: { name?: string; email?: string; password?: string }
): Promise<{ success: boolean; error?: string; account?: UserAccount }> {
  return { success: false, error: 'Not implemented in this version' };
}

export async function getAllAccounts(): Promise<UserAccount[]> {
  try {
    const data = await apiClient.get('/api/profile/accounts');
    return data.accounts || [];
  } catch {
    return [];
  }
}

export function hashPassword(pw: string) { return pw; } // Stub for frontend

