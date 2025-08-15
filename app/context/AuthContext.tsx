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
import { supabase } from '../../lib/supabase/client';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    hasProfile: boolean | null;
    refreshProfile: () => Promise<void>;
    signUp: (
        email: string,
        password: string
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
        if (!userId) return setHasProfile(null);

        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, name, title, location, bio')
            .eq('id', userId)
            .maybeSingle<{ id: string; name: string | null; title: string | null; location: string | null; bio: string | null; }>();


        if (profileError) {
            console.error('[AuthContext] Error fetching profile:', profileError);
            return setHasProfile(null);
        }

        if (!profileData && !profileError) {
            console.warn(
                '[AuthContext] No profile found — likely no record or RLS issue'
            );
        }

        // Check if profile exists AND is complete (has all required fields)
        const isProfileComplete = !!(
            profileData && 
            profileData.name && 
            profileData.title && 
            profileData.location && 
            profileData.bio
        );
        
        setHasProfile(isProfileComplete);
    }, []);

    const refreshProfile = useCallback(async () => {
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
            router.push('/onboarding');
        }
    }, [loading, user, hasProfile, router]);

    const signUp = async (
        email: string,
        password: string
    ) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) throw error;
        
        // The trigger creates the profile automatically
        // User will complete profile during onboarding
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
    };

    const signOut = async () => {
        try {
            // Use local scope to avoid 403 errors with global logout
            const { error } = await supabase.auth.signOut({ scope: 'local' });
            
            if (error) {
                console.error('Sign out error:', error);
                // Even if there's an error, clear local state
            }
            
            // Clear local state regardless
            setUser(null);
            setSession(null);
            setHasProfile(null);
            
            // Redirect to home page
            router.push('/');
        } catch (err) {
            console.error('Sign out error:', err);
            // Clear local state even on error
            setUser(null);
            setSession(null);
            setHasProfile(null);
            router.push('/');
        }
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
