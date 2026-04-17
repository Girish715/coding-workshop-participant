import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clearApiCache, getMe } from './services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await getMe();
      setUser(data.user);
      setEmployee(data.employee);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const handleLogin = (token, userData, empData) => {
    localStorage.setItem('token', token);
    clearApiCache();
    setUser(userData);
    setEmployee(empData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    clearApiCache();
    setUser(null);
    setEmployee(null);
  };

  return (
    <AuthContext.Provider value={{ user, employee, loading, login: handleLogin, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
