"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  getCurrentUser,
  type AuthenticatedUser,
} from "./orders-api";
import { clearSession, getToken } from "./auth";

type AuthContextValue = {
  user: AuthenticatedUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setUser(await getCurrentUser());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const handleAuthChanged = () => void refresh();
    window.addEventListener("auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleAuthChanged);
    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleAuthChanged);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      logout: () => {
        clearSession();
        setUser(null);
        window.dispatchEvent(new Event("auth-changed"));
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải được dùng trong AuthProvider");
  return context;
}

export function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: AuthenticatedUser["role"];
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Đang kiểm tra đăng nhập...</div>;
  }
  if (role && user.role !== role) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Bạn không có quyền truy cập.</div>;
  }
  return <>{children}</>;
}
