import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext(null);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const apiCache = new Map();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refs to prevent stale closures in auth state changes
  const userRef = React.useRef(null);
  const profileRef = React.useRef(null);

  const setUserWithRef = (val) => {
    userRef.current = val;
    setUser(val);
  };

  const setProfileWithRef = (val) => {
    profileRef.current = val;
    setProfile(val);
  };

  // Helper function to fetch from the Node.js API with credentials with caching
  const apiFetch = async (endpoint, options = {}) => {
    const method = options.method || 'GET';
    const isGet = method.toUpperCase() === 'GET';

    if (isGet) {
      if (apiCache.has(endpoint)) {
        return apiCache.get(endpoint);
      }
    } else {
      // Clear cache on any modification
      apiCache.clear();
    }

    const token = session?.access_token;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    
    const fetchPromise = (async () => {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${response.status}: ${response.statusText}`);
      }

      return response.json();
    })();

    if (isGet) {
      apiCache.set(endpoint, fetchPromise);
      fetchPromise.catch(() => {
        apiCache.delete(endpoint);
      });
    }

    return fetchPromise;
  };

  const fetchProfile = async (userId, currentSession) => {
    try {
      // We can fetch profile using backend /auth/me to bypass local RLS check on login/session load,
      // or directly via supabase since profiles allow read if logged in.
      // Fetching via backend /auth/me ensures it runs properly with RLS rules.
      const headers = {
        'Authorization': `Bearer ${currentSession.access_token}`
      };
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/auth/me`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProfileWithRef(data.user);
      } else {
        setProfileWithRef(null);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setProfileWithRef(null);
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      setUserWithRef(activeSession?.user ?? null);
      if (activeSession?.user) {
        fetchProfile(activeSession.user.id, activeSession).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, activeSession) => {
      setSession(activeSession);
      
      const currentUser = activeSession?.user ?? null;
      const prevUser = userRef.current;
      const prevProfile = profileRef.current;
      
      setUserWithRef(currentUser);
      
      if (currentUser) {
        // Only trigger fullscreen loading if user changed or profile isn't loaded yet
        const isNewUser = !prevUser || prevUser.id !== currentUser.id;
        if (isNewUser || !prevProfile) {
          setLoading(true);
          await fetchProfile(currentUser.id, activeSession);
          setLoading(false);
        } else {
          // Silent background refresh without setting loading to true
          await fetchProfile(currentUser.id, activeSession);
        }
      } else {
        setProfileWithRef(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUserWithRef(null);
      setProfileWithRef(null);
      apiCache.clear(); // Clear cache on logout
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
