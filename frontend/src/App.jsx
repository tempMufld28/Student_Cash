import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import InstallPrompt from './components/InstallPrompt';

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
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
                <InstallPrompt />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
