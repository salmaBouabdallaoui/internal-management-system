import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../config/api';

const AuthContext = createContext();
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export const useAuth = () => useContext(AuthContext);

const getStoredUser = () => {
  const username = localStorage.getItem('username');
  const fullName = localStorage.getItem('fullName');
  const role = localStorage.getItem('role');
  const jobTitle = localStorage.getItem('jobTitle');
  const department = localStorage.getItem('department');
  const phoneNumber = localStorage.getItem('phoneNumber');
  const email = localStorage.getItem('email');
  const forcePasswordChange = localStorage.getItem('forcePasswordChange') === 'true';

  if (!username && !role) {
    return null;
  }

  return { username, fullName, role, jobTitle, department, phoneNumber, email, forcePasswordChange };
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(getStoredUser);
  const [forcePasswordChange, setForcePasswordChange] = useState(localStorage.getItem('forcePasswordChange') === 'true');
  const [isSessionLoading, setIsSessionLoading] = useState(Boolean(localStorage.getItem('token')));

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setForcePasswordChange(false);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('fullName');
    localStorage.removeItem('role');
    localStorage.removeItem('jobTitle');
    localStorage.removeItem('department');
    localStorage.removeItem('phoneNumber');
    localStorage.removeItem('email');
    localStorage.removeItem('forcePasswordChange');
  }, []);

  const logout = useCallback(async ({ forceLogout = false, reason = 'MANUAL' } = {}) => {
    const currentToken = token;
    if (currentToken) {
      try {
        await axios.post(apiUrl('/api/auth/logout'), {
          forceLogout,
          reason,
        });
      } catch (error) {
        // Best effort only. Session state is still cleared locally.
      }
    }

    clearSession();
  }, [token, clearSession]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    let active = true;

    const syncCurrentUser = async () => {
      if (!token) {
        setIsSessionLoading(false);
        return;
      }

      try {
        const response = await axios.get(apiUrl('/api/auth/me'));
        if (!active) {
          return;
        }

        const {
          username: currentUsername,
          fullName,
          role,
          jobTitle,
          department,
          phoneNumber,
          email,
          forcePasswordChange: mustChangePassword,
        } = response.data;

        setUser({
          username: currentUsername,
          fullName,
          role,
          jobTitle,
          department,
          phoneNumber,
          email,
          forcePasswordChange: Boolean(mustChangePassword),
        });
        setForcePasswordChange(Boolean(mustChangePassword));
        localStorage.setItem('username', currentUsername);
        localStorage.setItem('fullName', fullName || '');
        localStorage.setItem('role', role);
        localStorage.setItem('jobTitle', jobTitle || '');
        localStorage.setItem('department', department || '');
        localStorage.setItem('phoneNumber', phoneNumber || '');
        localStorage.setItem('email', email || '');
        localStorage.setItem('forcePasswordChange', String(Boolean(mustChangePassword)));
      } catch (error) {
        if (active) {
          await clearSession();
        }
      } finally {
        if (active) {
          setIsSessionLoading(false);
        }
      }
    };

    setIsSessionLoading(Boolean(token));
    void syncCurrentUser();

    return () => {
      active = false;
    };
  }, [token, clearSession]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let timeoutId = null;
    const scheduleAutoLogout = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        void logout({ forceLogout: true, reason: 'INACTIVITY' });
      }, INACTIVITY_TIMEOUT_MS);
    };

    const resetTimer = () => scheduleAutoLogout();
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    scheduleAutoLogout();

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  }, [token, logout]);

  const login = async (username, password) => {
    try {
      delete axios.defaults.headers.common['Authorization'];
      const response = await axios.post(apiUrl('/api/auth/login'), {
        username: username.trim(),
        password: password.trim(),
      });
        const {
          token,
          role,
          username: loggedUsername,
          fullName,
          jobTitle,
          department,
          phoneNumber,
          email,
          forcePasswordChange: mustChangePassword,
        } = response.data;
      setIsSessionLoading(true);
      setToken(token);
        setUser({
          username: loggedUsername,
          fullName,
          role,
          jobTitle,
          department,
          phoneNumber,
          email,
          forcePasswordChange: Boolean(mustChangePassword),
        });
      setForcePasswordChange(Boolean(mustChangePassword));
      localStorage.setItem('token', token);
      localStorage.setItem('username', loggedUsername);
      localStorage.setItem('fullName', fullName || '');
        localStorage.setItem('role', role);
        localStorage.setItem('jobTitle', jobTitle || '');
        localStorage.setItem('department', department || '');
        localStorage.setItem('phoneNumber', phoneNumber || '');
        localStorage.setItem('email', email || '');
        localStorage.setItem('forcePasswordChange', String(Boolean(mustChangePassword)));
        return { ok: true, forcePasswordChange: Boolean(mustChangePassword) };
    } catch (error) {
      if (error.response?.status === 423) {
        return { ok: false, error: error.response.data || 'Account locked temporarily.' };
      }

      if (error.response?.status === 401) {
        return { ok: false, error: "Nom d'utilisateur ou mot de passe invalide." };
      }

      if (error.response) {
        return { ok: false, error: error.response.data || 'Erreur serveur pendant la connexion.' };
      }

      return {
        ok: false,
        error: "Impossible de joindre le serveur. Vérifiez que le backend est lancé sur le même hôte que l'application.",
      };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.post(apiUrl('/api/auth/change-password'), {
        currentPassword,
        newPassword,
      });
      setForcePasswordChange(false);
      setUser((current) => (current ? { ...current, forcePasswordChange: false } : current));
      localStorage.setItem('forcePasswordChange', 'false');
      return { ok: true };
    } catch (error) {
      if (error.response) {
        return { ok: false, error: error.response.data || 'Erreur serveur pendant la mise à jour du mot de passe.' };
      }

      return {
        ok: false,
        error: "Impossible de joindre le serveur. Vérifiez que le backend est lancé sur le même hôte que l'application.",
      };
    }
  };

  const updateProfile = async ({ phoneNumber, email }) => {
    try {
      const response = await axios.put(apiUrl('/api/auth/me'), {
        phoneNumber,
        email,
      });

      const {
        username: currentUsername,
        fullName,
        role,
        jobTitle,
        department,
        phoneNumber: nextPhoneNumber,
        email: nextEmail,
        forcePasswordChange: mustChangePassword,
      } = response.data;

      const nextUser = {
        username: currentUsername,
        fullName,
        role,
        jobTitle,
        department,
        phoneNumber: nextPhoneNumber,
        email: nextEmail,
        forcePasswordChange: Boolean(mustChangePassword),
      };

      setUser(nextUser);
      setForcePasswordChange(Boolean(mustChangePassword));
      localStorage.setItem('username', currentUsername);
      localStorage.setItem('fullName', fullName || '');
      localStorage.setItem('role', role);
      localStorage.setItem('jobTitle', jobTitle || '');
      localStorage.setItem('department', department || '');
      localStorage.setItem('phoneNumber', nextPhoneNumber || '');
      localStorage.setItem('email', nextEmail || '');
      localStorage.setItem('forcePasswordChange', String(Boolean(mustChangePassword)));

      return { ok: true, user: nextUser };
    } catch (error) {
      if (error.response) {
        return { ok: false, error: error.response.data || 'Erreur serveur pendant la mise a jour du profil.' };
      }

      return {
        ok: false,
        error: "Impossible de joindre le serveur. Verifiez que le backend est lance sur le meme hote que l'application.",
      };
    }
  };

  const isAuthenticated = !!token;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const normalizedJobTitle = (user?.jobTitle || '').toLowerCase();
  const isDivisionChief = normalizedJobTitle.includes('chef de division');
  const isServiceChief = normalizedJobTitle.includes('chef de service');
  const canAccessEmployeesDirectory = isAdmin || isDivisionChief || isServiceChief;

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isAdmin,
      isSuperAdmin,
      isDivisionChief,
      isServiceChief,
      canAccessEmployeesDirectory,
      login,
      logout,
      changePassword,
      updateProfile,
      isAuthenticated,
      forcePasswordChange,
      isSessionLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
