import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

// Reusable password field with visibility toggle
const PasswordField = ({ name, value, onChange, placeholder, required, id }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                id={id}
                type={show ? 'text' : 'password'}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full bg-finance-input border border-finance-inputBorder text-finance-text text-sm rounded-lg focus:ring-2 focus:ring-finance-primary/40 focus:border-finance-primary block p-3 pr-10 outline-none transition-all placeholder:text-finance-text/40"
                required={required}
            />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-finance-text/40 hover:text-finance-text/70 transition-colors"
                tabIndex={-1}
            >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
};

const Auth = () => {
    const { isDark, toggleTheme } = useTheme();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();
    const { login, loginAsGuest } = useAuth();

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const payload = isLogin
                ? { email: formData.email, password: formData.password }
                : { name: formData.name, email: formData.email, password: formData.password };

            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Algo salió mal');
            }

            if (isLogin) {
                login(data.user, data.token);
                navigate('/');
            } else {
                // Auto-login after register
                const loginRes = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: formData.email, password: formData.password })
                });
                const loginData = await loginRes.json();
                if (loginRes.ok) {
                    login(loginData.user, loginData.token);
                    navigate('/');
                }
            }
        } catch (err) {
            console.error('Submit error:', err);
            setError(err.message === 'Failed to fetch' ? 'No se pudo conectar con el servidor (Revisa que el backend esté corriendo)' : err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGuestMode = () => {
        loginAsGuest();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-finance-bg flex flex-col items-center justify-center p-4 font-sans">

            {/* Header */}
            <div className="text-center mb-6">
                <h1 className="text-4xl font-bold text-finance-text tracking-tight">Student-Cash</h1>
                <p className="text-finance-text/70 mt-2 text-sm font-medium">Controla tus finanzas de manera simple</p>
            </div>

            {/* Auth Toggle — finance-primary style */}
            <div className="flex bg-finance-primary p-1 rounded-xl w-full max-w-md mb-4 shadow-sm gap-1">
                <button
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${isLogin
                        ? 'bg-white text-finance-primary shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                >
                    Iniciar Sesión
                </button>
                <button
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${!isLogin
                        ? 'bg-white text-finance-primary shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                >
                    Crear Cuenta
                </button>
            </div>

            {/* Main Card */}
            <div className="w-full max-w-md bg-finance-card rounded-2xl shadow-xl overflow-hidden border border-finance-inputBorder">
                <div className="p-8">
                    <h2 className="text-xl font-bold text-finance-text mb-1">
                        {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                    </h2>
                    <p className="text-sm text-finance-text/70 mb-6 font-medium">
                        {isLogin ? 'Ingresa tus credenciales para acceder' : 'Registra una nueva cuenta'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-semibold text-finance-text mb-1.5">Nombre</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="auth-name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Tu nombre"
                                    className="w-full bg-finance-input border border-finance-inputBorder text-finance-text text-sm rounded-lg focus:ring-2 focus:ring-finance-primary/40 focus:border-finance-primary block p-3 outline-none transition-all placeholder:text-finance-text/40"
                                    required={!isLogin}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-semibold text-finance-text mb-1.5">Email</label>
                            <input
                                type="email"
                                name="email"
                                id="auth-email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="tu@email.com"
                                className="w-full bg-finance-input border border-finance-inputBorder text-finance-text text-sm rounded-lg focus:ring-2 focus:ring-finance-primary/40 focus:border-finance-primary block p-3 outline-none transition-all placeholder:text-finance-text/40"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-finance-text mb-1.5">Contraseña</label>
                            <PasswordField
                                id="auth-password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm mt-2 font-medium bg-red-50 p-2 rounded">{error}</p>}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full text-white font-medium py-3 rounded-xl transition-colors mt-2 shadow-md ${isSubmitting ? 'bg-finance-primary/60 cursor-not-allowed' : 'bg-finance-primary hover:brightness-95'}`}
                        >
                            {isSubmitting ? 'Cargando...' : (isLogin ? 'Entrar' : 'Crear Cuenta')}
                        </button>
                    </form>
                </div>
            </div>

            {/* Guest Divider */}
            <div className="w-full max-w-md mt-8 flex items-center justify-center space-x-4">
                <div className="h-px bg-finance-inputBorder/60 flex-1"></div>
                <span className="text-xs font-semibold text-finance-text/50 tracking-wider">O CONTINÚA COMO</span>
                <div className="h-px bg-finance-inputBorder/60 flex-1"></div>
            </div>

            {/* Guest Button */}
            <button
                onClick={handleGuestMode}
                className="w-full max-w-md bg-finance-card border border-finance-inputBorder hover:bg-finance-input text-finance-text font-semibold py-3 rounded-xl transition-colors mt-6 shadow-sm"
            >
                Modo Invitado (Sin registro)
            </button>

            <p className="w-full max-w-md text-center text-xs font-medium text-finance-text/50 mt-4">
                En modo invitado tus datos se guardan solo en este navegador
            </p>

            {/* Dark mode toggle — bottom-left */}
            <button
                onClick={toggleTheme}
                className="fixed bottom-6 left-6 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-105 z-50 bg-finance-card border border-finance-inputBorder text-finance-text hover:bg-finance-input"
                title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
                {isDark
                    ? <Sun className="w-5 h-5 text-yellow-400" />
                    : <Moon className="w-5 h-5" />
                }
            </button>
        </div>
    );
};

export default Auth;
