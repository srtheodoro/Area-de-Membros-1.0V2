import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Profile, isConfigured } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    if (!isConfigured) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data && !error) setProfile(data as Profile);
    } catch (e) {
      console.error("Profile fetch error", e);
    }
  };

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setProfile(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (isConfigured) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if(session) await fetchProfile(session.user.id);
  }

  const value = {
    session,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    signOut,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);