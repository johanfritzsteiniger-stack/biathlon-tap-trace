import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Role = 'admin' | 'athlete';

type AuthUser = {
  id: string;
  name: string;
  role: Role;
  athleteName?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (name: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prüfe ob Benutzer bereits eingeloggt ist (Token in localStorage)
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (name: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-login', {
        body: { name, password },
      });

      // Check data.error first for specific error message from edge function
      if (data?.error) {
        return { error: data.error };
      }

      // Then check for general errors
      if (error) {
        console.error('Login error:', error);
        return { error: 'Login fehlgeschlagen' };
      }

      // Speichere Token und User
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setUser(data.user);

      return {};
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Login fehlgeschlagen' };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
