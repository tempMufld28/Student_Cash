import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isGuest, setIsGuest] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (localStorage.getItem('student_cash_guest') === 'true') {
            setIsGuest(true);
            setUser({ name: 'Invitado', email: '' });
            setIsLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                loadProfile(session.user);
            } else {
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                loadProfile(session.user);
            } else if (!localStorage.getItem('student_cash_guest')) {
                setUser(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadProfile = async (authUser) => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('name, gender, avatar')
            .eq('id', authUser.id)
            .single();

        setUser({
            id: authUser.id,
            email: authUser.email,
            name: profile?.name || authUser.user_metadata?.name || 'Usuario',
            gender: profile?.gender || '',
            avatar: profile?.avatar || '',
        });
        setIsLoading(false);
    };

    const login = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const register = async (name, email, password) => {
        const redirectUrl = import.meta.env.DEV 
            ? 'http://localhost:5173/auth' 
            : 'https://student-cash.vercel.app/auth';
    
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { 
                data: { name },
                emailRedirectTo: redirectUrl
            },
        });
        if (error) throw error;
        return data;
    };

    const loginAsGuest = () => {
        localStorage.setItem('student_cash_guest', 'true');
        setIsGuest(true);
        setUser({ name: 'Invitado', email: '' });
    };

    const logout = async () => {
        localStorage.removeItem('student_cash_guest');
        setIsGuest(false);
        setUser(null);
        if (!isGuest) await supabase.auth.signOut();
    };

    const updateUser = async ({ name, gender, avatar }) => {
        if (isGuest) return;
        await supabase.from('profiles').update({ name, gender, avatar }).eq('id', user.id);
        setUser(prev => ({ ...prev, name, gender, avatar }));
    };

    return (
        <AuthContext.Provider value={{ user, isGuest, isLoading, login, register, loginAsGuest, logout, updateUser }}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
