import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSchool } from "@/hooks/useSchool";
import { SMAN_1_NGORO_FALLBACK } from "@/services/schoolService";
import { generateRandomDemoPayload } from "@/utils/demoSchool";

/**
 * Shared 1-tap handler for logging in as an instant SMAN 1 Ngoro Demo Student
 * directly from landing CTAs, avoiding redundant /login or /school-selection redirects.
 */
export function useDemoStudentLogin() {
  const { login, finalizeLogin } = useAuth();
  const { setSelection } = useSchool();
  const navigate = useNavigate();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleInstantDemoLogin = useCallback(async () => {
    if (isDemoLoading) return;
    setIsDemoLoading(true);
    try {
      const payload = generateRandomDemoPayload("student");
      const result = await login(JSON.stringify(payload));
      if (result?.success && result?.account) {
        setSelection(SMAN_1_NGORO_FALLBACK);
        await finalizeLogin(result.account);
        navigate("/app/dashboard", { replace: true });
        return;
      }
      navigate("/login");
    } catch {
      navigate("/login");
    } finally {
      setIsDemoLoading(false);
    }
  }, [isDemoLoading, login, finalizeLogin, setSelection, navigate]);

  return { isDemoLoading, handleInstantDemoLogin };
}
