import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken, clearAuthToken, onUnauthorized } from '../api/client';
import { clearCachedUserId, getMe } from '../api/userService';

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  isProfileComplete?: boolean;
  community?: any;
}

interface AuthResponse {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  token: string;
  isNew?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsProfile?: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithFirebase: (idToken: string) => Promise<void>;
  loginWithEmailOtp: (email: string, code: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  completeProfile: (name: string, avatar: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Register global unauthorized handler to auto-logout
    const unsubscribe = onUnauthorized(() => {
      logout();
    });

    const loadToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const userJson = await AsyncStorage.getItem('user');
        if (token) {
          setAuthToken(token);
          let user = userJson ? (JSON.parse(userJson) as User) : null;
          // If no cached user, try to fetch current profile
          if (!user) {
            try {
              clearCachedUserId();
              const me = await getMe();
              user = me;
              await AsyncStorage.setItem('user', JSON.stringify(me));
            } catch {}
          }
          setAuthState({ user, token, isAuthenticated: true, isLoading: false });
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (e) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };
    loadToken();
    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleAuth = useCallback(async (payload: AuthResponse) => {
    const { token, _id, name, email, phone } = payload;
    await SecureStore.setItemAsync('userToken', token);
    setAuthToken(token);
    const user: User = { _id, name, email, phone };
    await AsyncStorage.setItem('user', JSON.stringify(user));
    // Try to refresh profile from backend
    try {
      clearCachedUserId();
      const me = await getMe();
      await AsyncStorage.setItem('user', JSON.stringify(me));
      const needsProfile = !!(payload.isNew || !me?.isProfileComplete);
      setAuthState({ user: me, token, isAuthenticated: true, isLoading: false, needsProfile });
    } catch {
      const needsProfile = !!(payload.isNew || !user?.name);
      setAuthState({ user, token, isAuthenticated: true, isLoading: false, needsProfile });
    }
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      clearCachedUserId();
      const me = await getMe();
      await AsyncStorage.setItem('user', JSON.stringify(me));
      const needsProfile = !!(!me?.isProfileComplete);
      setAuthState(prev => ({ ...prev, user: me, needsProfile }));
    } catch {}
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const resp = await api.post<AuthResponse>('/api/auth/login', { email, password });
    await handleAuth(resp);
  }, [handleAuth]);

  const loginWithFirebase = useCallback(async (idToken: string) => {
    const resp = await api.post<AuthResponse>('/api/auth/firebase-login', { idToken });
    await handleAuth(resp);
  }, [handleAuth]);

  const loginWithEmailOtp = useCallback(async (email: string, code: string) => {
    // Reuse server response shape from verifyEmailOtp endpoint
    const resp = await api.post<AuthResponse>('/api/auth/email-otp/verify', { email, code });
    await handleAuth(resp);
  }, [handleAuth]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const resp = await api.post<AuthResponse>('/api/auth/register', { name, email, password });
    await handleAuth(resp);
  }, [handleAuth]);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('userToken');
    await AsyncStorage.removeItem('user');
    clearAuthToken();
    clearCachedUserId();
    setAuthState({ user: null, token: null, isAuthenticated: false, isLoading: false, needsProfile: false });
  }, []);

  const completeProfile = useCallback(async (name: string, avatar: string) => {
    if (!authState.user?._id) return;
    const body: any = { name };
    if (avatar && avatar.trim()) body.avatar = avatar.trim();
    await api.put<User>(`/api/users/${authState.user._id}`, body);
    await refreshMe();
  }, [authState.user, refreshMe]);

  const value = useMemo(
    () => ({ ...authState, login, register, loginWithFirebase, loginWithEmailOtp, logout, refreshMe, completeProfile }),
    [authState, login, register, loginWithFirebase, loginWithEmailOtp, logout, refreshMe, completeProfile]
  );

  return (
    <AuthContext.Provider value={value}>
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
