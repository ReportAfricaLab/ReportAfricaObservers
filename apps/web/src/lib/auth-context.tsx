'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface User {
  id: string;
  email: string;
  username: string;
  country: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  getValidToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  getValidToken: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('ra_token');
    const savedUser = localStorage.getItem('ra_user');
    const savedRefresh = localStorage.getItem('ra_refresh');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setRefreshToken(savedRefresh);
    }
  }, []);

  const login = (user: User, token: string, refreshToken: string) => {
    setUser(user);
    setToken(token);
    setRefreshToken(refreshToken);
    localStorage.setItem('ra_token', token);
    localStorage.setItem('ra_user', JSON.stringify(user));
    localStorage.setItem('ra_refresh', refreshToken);
  };

  const logout = async () => {
    const rt = refreshToken || localStorage.getItem('ra_refresh');
    // Call backend to blacklist token
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
    } catch {}
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('ra_token');
    localStorage.removeItem('ra_user');
    localStorage.removeItem('ra_refresh');
  };

  // Auto-refresh access token when it's about to expire
  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (!token) return null;

    // Check if token is expired (decode JWT without verifying)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresIn = payload.exp * 1000 - Date.now();

      // If token expires in less than 2 minutes, refresh it
      if (expiresIn < 120000) {
        const rt = refreshToken || localStorage.getItem('ra_refresh');
        if (!rt) { logout(); return null; }

        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        });

        if (!res.ok) { logout(); return null; }

        const data = await res.json();
        setToken(data.token);
        localStorage.setItem('ra_token', data.token);
        return data.token;
      }
    } catch {}

    return token;
  }, [token, refreshToken]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, getValidToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
