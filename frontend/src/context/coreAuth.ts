import { createContext } from "react";
import type { UserAccount } from "@/data/accounts";
import type { UserProfile, Gender } from "@/data/userProfiles";

export interface AuthContextValue {
  currentUser: UserAccount | null;
  currentProfile: UserProfile | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    role: "student" | "teacher" | "dev",
    gender: Gender,
    grade: "X" | "XI" | "XII",
    classSection: string,
    schoolId?: string,
    dateOfBirth?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateUserAccount: (updates: {
    name?: string;
    email?: string;
    password?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
