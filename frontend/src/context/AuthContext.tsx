import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSchool } from "@/hooks/useSchool";
import { getSchoolById } from "@/services/schoolService";
import { apiClient } from "@/services/apiClient";
import {
  type UserAccount,
  authenticateAccount,
  registerAccount,
  getToken,
  clearSession,
} from "@/data/accounts";
import {
  type UserProfile,
  type Gender,
  getProfile,
  createProfile,
  updateProfile,
} from "@/data/userProfiles";

import { AuthContext } from "./coreAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const { setSelection, clearSelection } = useSchool();

  useEffect(() => {
    if (currentProfile?.schoolId && currentProfile.schoolId !== "unknown") {
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
        const data = await apiClient.get("/api/auth/me");
        setCurrentUser(data.account);
        const prof = await getProfile();
        setCurrentProfile(prof ?? null);
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

  const register = async (
    name: string,
    email: string,
    password: string,
    role: "student" | "teacher" | "dev",
    gender: Gender,
    grade: "X" | "XI" | "XII",
    classSection: string,
    schoolId = "unknown",
    dateOfBirth?: string,
  ) => {
    const result = await registerAccount(name, email, password, role);
    if (result.success && result.account) {
      const supervisedClasses =
        role === "teacher" ? [{ grade, section: classSection }] : undefined;
      const prof = await createProfile(
        "ignore",
        gender,
        grade,
        classSection,
        schoolId,
        dateOfBirth,
        supervisedClasses,
      );
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

  const updateUserAccountLocal = async (updates: {
    name?: string;
    email?: string;
    password?: string;
  }) => {
    return { success: false, error: "Not implemented" };
  };

  const updateUserProfileLocal = async (updates: Partial<UserProfile>) => {
    const prof = await updateProfile(updates);
    if (prof) setCurrentProfile(prof);
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
        updateUserAccount: updateUserAccountLocal,
        updateUserProfile: updateUserProfileLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
