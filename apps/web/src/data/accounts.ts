import { apiClient } from '../services/apiClient';
export const TOKEN_KEY = 'harmony_token';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'developer';
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

export async function authenticateAccount(token: string, role?: string): Promise<{ success: boolean; status?: string; email?: string; name?: string; picture?: string; googleId?: string; error?: string; account?: UserAccount, token?: string }> {
  try {
    const data = await apiClient.post('/api/auth/login', { token, role });
    
    if (data.status === 'registered') {
      saveToken(data.token);
      return { success: true, status: 'registered', account: data.account, token: data.token };
    } else if (data.status === 'not_registered') {
      return { 
        success: true, 
        status: 'not_registered',
        email: data.email,
        name: data.name,
        picture: data.picture,
        googleId: data.googleId
      };
    }
    
    // Fallback if status is missing
    if (data.token) saveToken(data.token);
    return { success: true, account: data.account, token: data.token };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Login error' };
  }
}

export async function registerGoogleAccount(
  token: string, 
  role?: string,
  name?: string,
  schoolId?: string,
  grade?: string,
  classSection?: string
): Promise<{ success: boolean; error?: string; account?: UserAccount, token?: string }> {
  try {
    const data = await apiClient.post('/api/auth/register-google', { 
      token, role, name, schoolId, grade, classSection 
    });
    
    saveToken(data.token);
    return { success: true, account: data.account, token: data.token };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Register error' };
  }
}

export async function registerAccount(
  name: string,
  email: string,
  password: string,
  role: 'student' | 'teacher' | 'developer'
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
  role: 'student' | 'teacher' | 'developer',
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
    const data = await apiClient.put('/api/users/' + id, updates);
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

export async function deleteAccount(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await apiClient.delete(`/api/users/${id}`);
    return data;
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Delete error' };
  }
}
