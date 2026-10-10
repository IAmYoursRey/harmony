import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSchool } from "@/hooks/useSchool";
import { getSchoolById, SMAN_1_NGORO_FALLBACK } from "@/services/schoolService";
import { apiClient } from "@/services/apiClient";
import {
  type UserAccount,
  authenticateAccount,
  registerAccount,
  registerGoogleAccount,
  getToken,
  clearSession,
  updateAccount,
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
    const schoolId = currentProfile?.schoolId;
    if (schoolId && schoolId !== "unknown") {
      getSchoolById(schoolId).then((foundSchool) => {
        if (foundSchool) {
          setSelection(foundSchool);
        } else if (schoolId === "ffdcdf34-fc99-4209-913e-5a6042e957ad") {
          setSelection(SMAN_1_NGORO_FALLBACK);
        }
      });
    } else if (
      currentUser &&
      (currentUser.email === "raihanansari3345@gmail.com" ||
        currentUser.email.includes("sman1ngoro") ||
        currentUser.role === "developer")
    ) {
      getSchoolById("ffdcdf34-fc99-4209-913e-5a6042e957ad").then((foundSchool) => {
        setSelection(foundSchool || SMAN_1_NGORO_FALLBACK);
      });
    } else {
      clearSelection();
    }
  }, [currentProfile?.schoolId, currentUser, setSelection, clearSelection]);

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
        if (
          data.account?.email === "raihanansari3345@gmail.com" ||
          data.account?.email?.includes("sman1ngoro") ||
          data.account?.role === "developer" ||
          prof?.schoolId === "ffdcdf34-fc99-4209-913e-5a6042e957ad"
        ) {
          const ngoro = await getSchoolById("ffdcdf34-fc99-4209-913e-5a6042e957ad");
          setSelection(ngoro || SMAN_1_NGORO_FALLBACK);
        }
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [setSelection]);

  const login = async (token: string, role?: string) => {
    // Only verifies and returns status, DOES NOT set currentUser yet to allow confirmation screen
    const result = await authenticateAccount(token, role);
    return result;
  };

  const finalizeLogin = async (account: UserAccount) => {
    setCurrentUser(account);
    const prof = await getProfile();
    setCurrentProfile(prof ?? null);
    if (
      account.email === "raihanansari3345@gmail.com" ||
      account.email?.includes("sman1ngoro") ||
      account.role === "developer" ||
      prof?.schoolId === "ffdcdf34-fc99-4209-913e-5a6042e957ad"
    ) {
      const ngoro = await getSchoolById("ffdcdf34-fc99-4209-913e-5a6042e957ad");
      setSelection(ngoro || SMAN_1_NGORO_FALLBACK);
    }
  };

  const registerGoogle = async (
    token: string, 
    role?: string,
    name?: string,
    schoolId?: string,
    grade?: string,
    classSection?: string
  ) => {
    const result = await registerGoogleAccount(token, role, name, schoolId, grade, classSection);
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
    role: "student" | "teacher" | "developer",
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
    if (!currentUser) return { success: false, error: "Not logged in" };
    try {
      const result = await updateAccount(currentUser.id, updates);
      if (result.success && result.account) {
        setCurrentUser(result.account);
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
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
        finalizeLogin,
        register,
        registerGoogle,
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
