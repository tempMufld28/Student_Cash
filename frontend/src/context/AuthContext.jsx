import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isGuest, setIsGuest] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('student_cash_token');
        const savedUser = localStorage.getItem('student_cash_user');
        const guestMode = localStorage.getItem('student_cash_guest');

        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        } else if (guestMode === 'true') {
            setIsGuest(true);
            setUser({ name: 'Invitado', email: '' });
        }
        setIsLoading(false);
    }, []);

    const login = (userData, authToken) => {
        localStorage.setItem('student_cash_token', authToken);
        localStorage.setItem('student_cash_user', JSON.stringify(userData));
        localStorage.removeItem('student_cash_guest');
        setToken(authToken);
        setUser(userData);
        setIsGuest(false);
    };

    const loginAsGuest = () => {
        localStorage.setItem('student_cash_guest', 'true');
        localStorage.removeItem('student_cash_token');
        localStorage.removeItem('student_cash_user');
        setIsGuest(true);
        setUser({ name: 'Invitado', email: '' });
        setToken(null);
    };

    const logout = () => {
        localStorage.removeItem('student_cash_token');
        localStorage.removeItem('student_cash_user');
        localStorage.removeItem('student_cash_guest');
        setToken(null);
        setUser(null);
        setIsGuest(false);
    };

    const updateUser = (updatedUserData) => {
        const merged = { ...user, ...updatedUserData };
        setUser(merged);
        if (!isGuest) {
            localStorage.setItem('student_cash_user', JSON.stringify(merged));
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, isGuest, isLoading, login, loginAsGuest, logout, updateUser }}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
