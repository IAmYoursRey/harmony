// src/context/AuthContext.tsx
// Global authentication state. API keys dibaca dari .env — tidak disimpan di browser.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type UserAccount,
  authenticateAccount,
  registerAccount,
  getSession,
  saveSession,
  clearSession,
} from '@/data/accounts';
import {
  type UserProfile,
  type Gender,
  getProfile,
  createProfile,
} from '@/data/userProfiles';

// -- Context types -------------------------------------------------------------

interface AuthContextValue {
  currentUser: UserAccount | null;
  currentProfile: UserProfile | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    role: 'student' | 'teacher' | 'dev',
    gender: Gender,
    grade: '10' | '11' | '12',
    classSection: string,
    schoolId?: string,
    dateOfBirth?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// -- Provider ------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      setCurrentUser(session);
      const profile = getProfile(session.id);
      setCurrentProfile(profile ?? null);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authenticateAccount(email, password);
    if (result.success && result.account) {
      saveSession(result.account);
      setCurrentUser(result.account);
      const profile = getProfile(result.account.id);
      setCurrentProfile(profile ?? null);
    }
    return { success: result.success, error: result.error };
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: 'student' | 'teacher' | 'dev',
    gender: Gender,
    grade: '10' | '11' | '12',
    classSection: string,
    schoolId = 'unknown',
    dateOfBirth?: string
  ) => {
    const result = await registerAccount(name, email, password, role);
    if (result.success && result.account) {
      const supervisedClasses = role === 'teacher' ? [{ grade, section: classSection }] : undefined;
      const profile = createProfile(result.account.id, gender, grade, classSection, schoolId, dateOfBirth, supervisedClasses);
      saveSession(result.account);
      setCurrentUser(result.account);
      setCurrentProfile(profile);
    }
    return { success: result.success, error: result.error };
  };

  const logout = () => {
    clearSession();
    setCurrentUser(null);
    setCurrentProfile(null);
  };

  const refreshProfile = () => {
    if (currentUser) {
      const profile = getProfile(currentUser.id);
      setCurrentProfile(profile ?? null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentProfile,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// -- Hook ----------------------------------------------------------------------

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

