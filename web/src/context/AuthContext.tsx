import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface User {
  id: string;
  username?: string;
  language: string;
  isAdmin: boolean;
  customer?: {
    fullName: string;
    phoneNumber: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  requestOtp: (phoneNumber: string, isRegistration?: boolean, fullName?: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phoneNumber: string, otpCode: string, isRegistration?: boolean, fullName?: string) => Promise<{ success: boolean; user?: User; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Check for Telegram auth data in URL
    const urlParams = new URLSearchParams(window.location.search);
    const telegramAuth = urlParams.get('telegram_auth');
    if (telegramAuth) {
      try {
        const authData = JSON.parse(decodeURIComponent(telegramAuth));
        if (authData.id) {
          const userData: User = {
            id: authData.id.toString(),
            username: authData.username,
            language: authData.language_code || 'uz',
            isAdmin: false
          };
          login(userData);
          // Clear auth param from URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (error) {
        console.error('Failed to parse Telegram auth data:', error);
      }
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const requestOtp = async (phoneNumber: string, isRegistration?: boolean, fullName?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, isRegistration, fullName })
      });

      const data = await response.json();
      return {
        success: data.success,
        message: data.message || data.error || 'Failed to request OTP'
      };
    } catch (error) {
      console.error('OTP request error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.'
      };
    }
  };

  const verifyOtp = async (phoneNumber: string, otpCode: string, isRegistration?: boolean, fullName?: string): Promise<{ success: boolean; user?: User; message: string }> => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otpCode, isRegistration, fullName })
      });

      const data = await response.json();
      
      if (data.success && data.userId) {
        // Fetch user data after successful OTP verification
        const userResponse = await fetch(`${apiUrl}/user/${data.userId}`);
        const userData = await userResponse.json();
        
        const user: User = {
          id: data.userId,
          username: userData.username,
          language: userData.language || 'uz',
          isAdmin: userData.isAdmin || false,
          customer: userData.customer
        };
        
        login(user);
        
        return {
          success: true,
          user,
          message: data.message
        };
      }
      
      return {
        success: false,
        message: data.message || data.error || 'Failed to verify OTP'
      };
    } catch (error) {
      console.error('OTP verification error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.'
      };
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        updateUser,
        requestOtp,
        verifyOtp
      }}
    >
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