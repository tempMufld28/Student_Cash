import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import InstallPrompt from './components/InstallPrompt';
import SplashScreen from './components/SplashScreen';

const ProtectedRoute = ({ children }) => {
    const { user, isGuest } = useAuth();
    if (!user && !isGuest) {
        return <Navigate to="/auth" replace />;
    }
    return children;
};

const AuthRedirect = ({ children }) => {
    const { user, isGuest } = useAuth();
    if (user || isGuest) {
        return <Navigate to="/" replace />;
    }
    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/auth" element={<AuthRedirect><Auth /></AuthRedirect>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    // Show splash only once per session
    const [showSplash, setShowSplash] = useState(
        () => !sessionStorage.getItem('sc_splash_shown')
    );

    const handleSplashFinish = useCallback(() => {
        sessionStorage.setItem('sc_splash_shown', '1');
        setShowSplash(false);
    }, []);

    return (
        <AuthProvider>
            {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
            <BrowserRouter>
                <AppRoutes />
                <InstallPrompt />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
