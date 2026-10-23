import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { clearToken, readToken, saveToken } from './tokenStorage';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  token: string | null;
  status: AuthStatus;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    readToken()
      .then((storedToken) => {
        if (isMounted) {
          setToken(storedToken);
        }
      })
      .catch(() => {
        if (isMounted) {
          setToken(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsHydrating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(async (nextToken: string) => {
    await saveToken(nextToken);
    setToken(nextToken);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await clearToken();
    } catch (error) {
      console.warn('Could not remove the stored session:', error);
    } finally {
      setToken(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      status: isHydrating
        ? 'loading'
        : token
          ? 'authenticated'
          : 'unauthenticated',
      signIn,
      signOut,
    }),
    [isHydrating, signIn, signOut, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
