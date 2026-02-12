import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User } from '@/lib/api';
import { LanguageProvider } from '@/lib/LanguageContext';
import { BetslipProvider } from '@/lib/BetslipContext';
import BetslipBar from '@/components/BetslipBar';

// Auth Context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  register: (email: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch {
      setUser(null);
      api.logout();
    }
  };

  useEffect(() => {
    if (api.getToken()) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string) => {
    await api.login(email);
    await refreshUser();
  };

  const register = async (email: string, name: string) => {
    await api.register(email, name);
    await refreshUser();
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BetslipProvider>
          <Component {...pageProps} />
          <BetslipBar />
        </BetslipProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
