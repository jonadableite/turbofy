"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";
import {
  isTokenValid,
  clearTokens,
  updateLastActivity,
  checkInactivity,
  validateToken,
  setAccessToken,
  setCsrfToken,
} from "@/lib/auth";

interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  name?: string;
  merchantId?: string | null;
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_CHECK_INTERVAL = 60000; // 1 minuto
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const inactivityCheckRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar autenticação inicial com retry
  const checkAuth = useCallback(async (retryCount = 0) => {
    if (!isTokenValid()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Buscar dados do usuário diretamente (o endpoint já valida o token)
      const response = await api.get<AuthenticatedUser>("/auth/me");
      setUser(response.data);
      setError(null);
      setLoading(false);
    } catch (err: unknown) {
      // Verificar se é um erro 401 (não autorizado) ou outro tipo de erro
      const axiosError = err as { response?: { status?: number }; code?: string; message?: string };
      
      if (axiosError.response?.status === 401) {
        // Token inválido ou expirado - fazer logout
        clearTokens();
        setUser(null);
        setError("Sessão expirada. Faça login novamente.");
        setLoading(false);
      } else if (retryCount < 2 && (axiosError.code === "ECONNABORTED" || axiosError.code === "ERR_NETWORK" || !axiosError.response)) {
        // Erro de rede - tentar novamente após 1 segundo
        setTimeout(() => {
          checkAuth(retryCount + 1);
        }, 1000);
      } else {
        // Erro persistente ou não é erro de rede - manter usuário logado mas mostrar erro
        setError("Erro ao verificar autenticação. Tente recarregar a página.");
        setLoading(false);
        // Não limpar tokens em caso de erro de rede
      }
    }
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Obter token CSRF primeiro
      const csrfResponse = await api.get<{ csrfToken: string }>("/api/auth/csrf");
      const csrfToken = csrfResponse.data.csrfToken;
      setCsrfToken(csrfToken);

      // Fazer login (tokens serão armazenados em cookies HttpOnly pelo servidor)
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>("/auth/login", {
        email,
        password,
      }, {
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });

      const { accessToken, expiresIn } = response.data;

      // Armazenar token no sessionStorage para validação no cliente
      // O servidor já armazenou em cookies HttpOnly
      setAccessToken(accessToken, expiresIn);
      updateLastActivity();

      // Buscar dados do usuário (sem retry no login - já temos token válido)
      try {
        const userResponse = await api.get<AuthenticatedUser>("/auth/me");
        setUser(userResponse.data);
        setError(null);
      } catch (err: unknown) {
        // Se falhar ao buscar usuário após login, ainda assim redirecionar
        // O RouteGuard vai verificar novamente
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          // Token inválido mesmo após login - limpar e mostrar erro
          clearTokens();
          setError("Erro ao obter dados do usuário. Tente fazer login novamente.");
          return;
        }
      }

      // Aguardar um pouco para garantir que o estado foi atualizado
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Redirecionar para dashboard ou rota original
      const redirectUrl = new URLSearchParams(window.location.search).get("redirect") || "/dashboard";
      router.push(redirectUrl);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(apiError.response?.data?.error?.message || "Erro ao fazer login");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router, checkAuth]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignorar erros no logout
    } finally {
      clearTokens();
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!isTokenValid()) {
      setUser(null);
      return;
    }

    try {
      const response = await api.get<AuthenticatedUser>("/auth/me");
      setUser(response.data);
      updateLastActivity();
      setError(null);
    } catch (err: unknown) {
      // Verificar se é erro 401 antes de fazer logout
      const axiosError = err as { response?: { status?: number } };
      
      if (axiosError.response?.status === 401) {
        // Token inválido - fazer logout
        await logout();
      } else {
        // Erro de rede - não fazer logout, apenas logar o erro silenciosamente
        // Manter usuário logado em caso de erros temporários
      }
    }
  }, [logout]);

  // Verificar inatividade
  useEffect(() => {
    const checkInactivityPeriodically = () => {
      if (checkInactivity() && user) {
        logout();
      }
    };

    inactivityCheckRef.current = setInterval(checkInactivityPeriodically, INACTIVITY_CHECK_INTERVAL);

    // Atualizar atividade em eventos do usuário
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    const updateActivity = () => {
      if (user) {
        updateLastActivity();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      if (inactivityCheckRef.current) {
        clearInterval(inactivityCheckRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [user, logout]);

  // Refresh token periodicamente
  useEffect(() => {
    if (!user) return;

    const refreshTokenPeriodically = async () => {
      if (!isTokenValid()) {
        await logout();
        return;
      }

      try {
        await refreshUser();
      } catch (err: unknown) {
        // Logar erro mas não fazer logout em erros de rede
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          // Apenas fazer logout se for erro 401
          await logout();
        }
        // Ignorar outros erros (rede, timeout, etc)
      }
    };

    tokenRefreshRef.current = setInterval(refreshTokenPeriodically, TOKEN_REFRESH_INTERVAL);

    return () => {
      if (tokenRefreshRef.current) {
        clearInterval(tokenRefreshRef.current);
      }
    };
  }, [user, refreshUser, logout]);

  // Verificar autenticação inicial (apenas uma vez no mount)
  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      if (mounted) {
        await checkAuth();
      }
    };
    
    initAuth();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez no mount

  // Proteger rotas no cliente (comentado - RouteGuard já faz isso)
  // useEffect(() => {
  //   if (loading) return;

  //   const isPublicRoute = pathname === "/login" || pathname === "/register" || pathname === "/forgot" || pathname === "/forgot-password" || pathname === "/";
  //   const isProtectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/vitrine") || pathname.startsWith("/vendas") || pathname.startsWith("/financeiro") || pathname.startsWith("/clientes") || pathname.startsWith("/afiliados") || pathname.startsWith("/produtos") || pathname.startsWith("/configuracoes") || pathname.startsWith("/integracoes") || pathname.startsWith("/profile");

  //   if (isProtectedRoute && !user) {
  //     router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
  //   } else if (isPublicRoute && user && pathname !== "/") {
  //     router.push("/dashboard");
  //   }
  // }, [user, loading, pathname, router]);

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
};
