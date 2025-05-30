'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    hasProfile: boolean | null;
    refreshProfile: () => Promise<void>;
    signUp: (
        email: string,
        password: string,
        fullName: string
    ) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasProfile, setHasProfile] = useState<boolean | null>(null);
    const router = useRouter();

    const checkProfile = useCallback(async (userId: string | undefined) => {
        console.log('[AuthContext] checkProfile called with userId:', userId);
        if (!userId) return setHasProfile(null);

        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle<{ id: string }>();

        console.log('[AuthContext] checkProfile Supabase call result:', {
            userId,
            profileData,
            profileError,
        });

        if (profileError) {
            console.error('[AuthContext] Error fetching profile:', profileError);
            return setHasProfile(null);
        }

        if (!profileData && !profileError) {
            console.warn(
                '[AuthContext] No profile found — likely no record or RLS issue'
            );
        }

        setHasProfile(!!profileData);
    }, []);

    const refreshProfile = useCallback(async () => {
        console.log('[AuthContext] refreshProfile called');
        await checkProfile(user?.id);
    }, [user, checkProfile]);

    // Setup Supabase session and auth change listeners
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            checkProfile(session?.user?.id);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            checkProfile(session?.user?.id);
        });

        return () => subscription.unsubscribe();
    }, [checkProfile]);

    // Redirect to /onboarding if no profile
    useEffect(() => {
        if (!loading && user && hasProfile === false) {
            console.log(
                '[AuthContext] No profile found — redirecting to /onboarding'
            );
            router.push('/onboarding');
        }
    }, [loading, user, hasProfile, router]);

    const signUp = async (
        email: string,
        password: string,
        fullName: string
    ) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) throw error;

        if (data.user) {
            const { error: profileError } = await supabase.from('profiles').insert({
                id: data.user.id,
                full_name: fullName,
                email,
            });

            if (profileError) {
                console.error('[AuthContext] Failed to create profile:', profileError);
                throw profileError;
            }
        }
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setHasProfile(null);
    };

    const value = {
        user,
        session,
        loading,
        hasProfile,
        refreshProfile,
        signUp,
        signIn,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
