// src/data/accounts.ts
// Manages user account data (credentials) stored in localStorage.

import { hashPassword } from '@/lib/crypto';
import { createProfile, getProfile } from './userProfiles';

const ACCOUNTS_KEY = 'geosense_accounts';
const SESSION_KEY  = 'geosense_session';

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'student' | 'teacher' | 'dev';
  createdAt: string;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'geosense_salt_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getAllAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAllAccounts(accounts: UserAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getAccountByEmail(email: string): UserAccount | undefined {
  return getAllAccounts().find(a => a.email.toLowerCase() === email.toLowerCase());
}

export function getAccountById(id: string): UserAccount | undefined {
  return getAllAccounts().find(a => a.id === id);
}

// ── Inisialisasi Akun Dev & Tim ───────────────────────────────────────────────────
export async function ensureDevAccount(): Promise<void> {
  const accounts = getAllAccounts();
  let modified = false;

  const seedAccounts = [
    { email: 'raihanansari6678@gmail.com', name: 'Developer Admin', role: 'dev' as const, pw: '081515876022' },
    { email: 'alvira.nizha@geosense.edu', name: 'Alvira Fitriatun Nizha', role: 'student' as const, pw: 'geosense123' },
    { email: 'aretha.kirana@geosense.edu', name: 'Aretha Kirana Putri Junaidi', role: 'student' as const, pw: 'geosense123' },
    { email: 'sinta.nadhifah@geosense.edu', name: 'Sinta Nadhifah', role: 'student' as const, pw: 'geosense123' },
  ];

  for (const seed of seedAccounts) {
    let existing = accounts.find(a => a.email === seed.email);
    if (!existing) {
      const passwordHash = await hashPassword(seed.pw);
      existing = {
        id: `seed-${seed.email.split('@')[0]}`,
        email: seed.email,
        passwordHash,
        name: seed.name,
        role: seed.role,
        createdAt: new Date().toISOString(),
      };
      accounts.push(existing);
      modified = true;
    }
    
    // Ensure profile exists
    if (!getProfile(existing.id)) {
      createProfile(
        existing.id, 
        'female', // they are all female based on names
        seed.role === 'teacher' ? 'Guru' : 'X IPA 1', 
        'SMA Negeri 1 Mojokerto'
      );
    }
  }

  if (modified) {
    saveAllAccounts(accounts);
  }
}
// Panggil saat file dimuat (non-blocking)
ensureDevAccount().catch(console.error);


export async function registerAccount(
  name: string,
  email: string,
  password: string,
  role: 'student' | 'teacher' | 'dev'
): Promise<{ success: boolean; error?: string; account?: UserAccount }> {
  const accounts = getAllAccounts();
  if (accounts.find(a => a.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'Email sudah terdaftar. Gunakan email lain atau login.' };
  }
  const passwordHash = await hashPassword(password);
  const newAccount: UserAccount = {
    id: crypto.randomUUID(),
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name.trim(),
    role,
    createdAt: new Date().toISOString(),
  };
  saveAllAccounts([...accounts, newAccount]);
  return { success: true, account: newAccount };
}

export async function authenticateAccount(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; account?: UserAccount }> {
  const account = getAccountByEmail(email);
  if (!account) {
    return { success: false, error: 'Email tidak ditemukan. Periksa kembali atau daftar akun baru.' };
  }
  const passwordHash = await hashPassword(password);
  if (passwordHash !== account.passwordHash) {
    return { success: false, error: 'Kata sandi salah. Silakan coba lagi.' };
  }
  return { success: true, account };
}

export function updateAccount(id: string, updates: Partial<Omit<UserAccount, 'id' | 'createdAt'>>): void {
  const accounts = getAllAccounts().map(a => a.id === id ? { ...a, ...updates } : a);
  saveAllAccounts(accounts);
}

export function deleteAccount(id: string): void {
  saveAllAccounts(getAllAccounts().filter(a => a.id !== id));
}

export function getSession(): UserAccount | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(account: UserAccount): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(account));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
