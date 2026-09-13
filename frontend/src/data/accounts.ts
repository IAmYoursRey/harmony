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
export async function provisionAccount(
  name: string,
  email: string,
  password: string,
  role: 'student' | 'teacher' | 'dev',
  gender?: string,
  grade?: string,
  classSection?: string,
  schoolId?: string,
  dob?: string
): Promise<{ success: boolean; error?: string; account?: UserAccount }> {
  try {
    const data = await apiClient.post('/api/users', { 
      name, email, password, role, gender, grade, classSection, schoolId, dob 
    });
    return { success: true, account: data.account };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Provision error' };
  }
}

export async function updateAccount(
  id: string,
  updates: { name?: string; email?: string; password?: string, schoolId?: string, grade?: string, classSection?: string }
): Promise<{ success: boolean; error?: string; account?: UserAccount }> {
  try {
    const data = await apiClient.put(`/api/users/${id}`, updates);
    return { success: true, account: data.account };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Update error' };
  }
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
