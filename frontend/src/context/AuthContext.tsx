import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSchool } from '@/context/SchoolContext';
import { getSchoolById } from '@/services/schoolService';
import {
  type UserAccount,
  authenticateAccount,
  registerAccount,
  updateAccount,
  getToken,
  clearSession,
} from '@/data/accounts';
import {
  type UserProfile,
  type Gender,
  getProfile,
  createProfile,
  updateProfile,
} from '@/data/userProfiles';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface AuthContextValue {
  currentUser: UserAccount | null;
  currentProfile: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role: 'student' | 'teacher' | 'dev', gender: Gender, grade: 'X' | 'XI' | 'XII', classSection: string, schoolId?: string, dateOfBirth?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateUserAccount: (updates: { name?: string; email?: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setSelection, clearSelection } = useSchool();

  // Sync profile school to SchoolContext
  useEffect(() => {
    if (currentProfile?.schoolId && currentProfile.schoolId !== 'unknown') {
      getSchoolById(currentProfile.schoolId).then((foundSchool) => {
        if (foundSchool) {
          setSelection(foundSchool);
        }
      });
    } else {
      clearSelection();
    }
  }, [currentProfile?.schoolId, setSelection, clearSelection]);

  useEffect(() => {
    async function loadUser() {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.account);
          const prof = await getProfile();
          setCurrentProfile(prof ?? null);
        } else {
          clearSession();
        }
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authenticateAccount(email, password);
    if (result.success && result.account) {
      setCurrentUser(result.account);
      const prof = await getProfile();
      setCurrentProfile(prof ?? null);
    }
    return { success: result.success, error: result.error };
  };

  const register = async (name: string, email: string, password: string, role: 'student' | 'teacher' | 'dev', gender: Gender, grade: 'X' | 'XI' | 'XII', classSection: string, schoolId = 'unknown', dateOfBirth?: string) => {
    const result = await registerAccount(name, email, password, role);
    if (result.success && result.account) {
      const supervisedClasses = role === 'teacher' ? [{ grade, section: classSection }] : undefined;
      const prof = await createProfile('ignore', gender, grade, classSection, schoolId, dateOfBirth, supervisedClasses);
      setCurrentUser(result.account);
      setCurrentProfile(prof ?? null);
    }
    return { success: result.success, error: result.error };
  };

  const logout = () => {
    clearSession();
    setCurrentUser(null);
    setCurrentProfile(null);
    clearSelection();
  };

  const refreshProfile = async () => {
    if (currentUser) {
      const prof = await getProfile();
      setCurrentProfile(prof ?? null);
    }
  };

  const updateUserAccountLocal = async (updates: { name?: string; email?: string; password?: string }) => {
    // Stub
    return { success: false, error: 'Not implemented' };
  };

  const updateUserProfileLocal = async (updates: Partial<UserProfile>) => {
    const prof = await updateProfile(updates);
    if (prof) setCurrentProfile(prof);
  };

  return (
    <AuthContext.Provider value={{
      currentUser, currentProfile, isLoading, login, register, logout, refreshProfile,
      updateUserAccount: updateUserAccountLocal, updateUserProfile: updateUserProfileLocal
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
