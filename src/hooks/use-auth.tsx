import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  github_id: number;
  handle: string | null;
  display_name: string;
  avatar_url: string;
  email: string;
  created_at: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  needsHandle: boolean;
  isMeepoWriter: boolean;
  isActuallyMeepoWriter: boolean;
  viewAsUser: boolean;
  setViewAsUser: (v: boolean) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAuthenticated: false,
  needsHandle: false,
  isMeepoWriter: false,
  isActuallyMeepoWriter: false,
  viewAsUser: false,
  setViewAsUser: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

const VIEW_AS_USER_KEY = "mio:viewAsUser";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActuallyMeepoWriter, setIsActuallyMeepoWriter] = useState(false);
  const [viewAsUser, setViewAsUserState] = useState<boolean>(() => {
    try { return localStorage.getItem(VIEW_AS_USER_KEY) === "1"; } catch { return false; }
  });

  const setViewAsUser = useCallback((v: boolean) => {
    setViewAsUserState(v);
    try { localStorage.setItem(VIEW_AS_USER_KEY, v ? "1" : "0"); } catch { /* ignore */ }
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        setIsActuallyMeepoWriter(!!data.is_meepo_writer);
      } else {
        setUser(null);
        setIsActuallyMeepoWriter(false);
      }
    } catch {
      setUser(null);
      setIsActuallyMeepoWriter(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        needsHandle: !!user && !user.handle,
        isMeepoWriter: isActuallyMeepoWriter && !viewAsUser,
        isActuallyMeepoWriter,
        viewAsUser,
        setViewAsUser,
        logout,
        refreshUser: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
