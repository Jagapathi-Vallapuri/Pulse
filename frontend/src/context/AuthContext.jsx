import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { injectLogoutHandler, injectTokenUpdateHandler } from '../../client.js';
import { useUI } from './UIContext.jsx';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const { toastInfo } = useUI();
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const expiryTimerRef = useRef(null);
    const navigate = useNavigate();

    const scheduleAutoLogout = (jwtToken) => {
        try {
            if (!jwtToken) return;
            const [, payloadB64] = jwtToken.split('.');
            if (!payloadB64) return;
            const json = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
            if (!json?.exp) return;
            const msUntilExpiry = json.exp * 1000 - Date.now();
            if (msUntilExpiry <= 0) {
                toastInfo?.('Session expired. Please sign in again.');
                logout();
                return;
            }
            if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
            expiryTimerRef.current = setTimeout(() => {
                toastInfo?.('Session expired. Please sign in again.');
                logout();
            }, msUntilExpiry);
        } catch (_) {
            // ignore decode errors
        }
    };

    useEffect(() => {
        injectLogoutHandler(() => logout(false));
        injectTokenUpdateHandler((newToken) => {
            setToken(newToken);
            if (typeof window !== 'undefined') {
                localStorage.setItem('token', newToken);
            }
            scheduleAutoLogout(newToken);
        });
        let cancelled = false;
        const bootstrap = async () => {
            try {
                const t = localStorage.getItem('token');
                const rt = localStorage.getItem('refreshToken');
                const u = localStorage.getItem('user');
                if (t) {
                    setToken(t);
                    scheduleAutoLogout(t);
                }
                if (u) setUser(JSON.parse(u));
                if (t) {
                    try {
                        const res = await api.get('/auth/validate');
                        if (res.data?.valid) {
                            if (res.data.user) {
                                setUser(res.data.user);
                                localStorage.setItem('user', JSON.stringify(res.data.user));
                            }
                        } else {
                            if (!cancelled) logout(false);
                        }
                    } catch (err) {
                        const status = err?.response?.status;
                        if (status === 401 || status === 403) {
                            if (!cancelled) logout(false);
                        } // else ignore transient errors
                    }
                }
            } finally {
                if (!cancelled) setAuthLoading(false);
            }
        };
        bootstrap();
        return () => { cancelled = true; };
    }, []);

    const login = (newToken, newUser, newRefreshToken) => {
        setToken(newToken);
        setUser(newUser);
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(newUser));
            if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
        }
        scheduleAutoLogout(newToken);
    };

    const logout = (navigateAway = true) => {
        if (expiryTimerRef.current) {
            clearTimeout(expiryTimerRef.current);
            expiryTimerRef.current = null;
        }
        setToken(null);
        setUser(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            sessionStorage.removeItem('pendingEmail');
            sessionStorage.removeItem('pendingSessionId');
        }
        if (navigateAway) navigate('/');
    };

    const updateUser = (partial) => {
        setUser(prev => {
            const updated = { ...(prev || {}), ...(typeof partial === 'function' ? partial(prev) : partial) };
            try { localStorage.setItem('user', JSON.stringify(updated)); } catch (_) { }
            return updated;
        });
    };

    const value = {
        token,
        user,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token,
        authLoading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};

export default AuthContext;
