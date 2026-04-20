import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';

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
    const [info, setInfo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();
    const { login, register, loginAsGuest } = useAuth();

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setInfo('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setIsSubmitting(true);

        try {
            if (isLogin) {
                await login(formData.email, formData.password);
                navigate('/');
            } else {
                const data = await register(formData.name, formData.email, formData.password);
                if (data?.session) {
                    navigate('/');
                } else {
                    setInfo('Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.');
                    setIsLogin(true);
                }
            }
        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('Invalid login credentials')) {
                setError('Email o contraseña incorrectos');
            } else if (msg.includes('User already registered')) {
                setError('Ya existe una cuenta con ese email');
            } else if (msg.includes('Password should be')) {
                setError('La contraseña debe tener al menos 6 caracteres');
            } else {
                setError(msg || 'Algo salió mal');
            }
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

            <div className="text-center mb-6">
                <h1 className="text-4xl font-bold text-finance-text tracking-tight">Student-Cash</h1>
                <p className="text-finance-text/70 mt-2 text-sm font-medium">Controla tus finanzas de manera simple</p>
            </div>

            <div className="flex bg-finance-primary p-1 rounded-xl w-full max-w-md mb-4 shadow-sm gap-1">
                <button
                    onClick={() => { setIsLogin(true); setError(''); setInfo(''); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${isLogin
                        ? 'bg-white text-finance-primary shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                >
                    Iniciar Sesión
                </button>
                <button
                    onClick={() => { setIsLogin(false); setError(''); setInfo(''); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${!isLogin
                        ? 'bg-white text-finance-primary shadow-sm'
                        : 'text-white hover:bg-white/20'
                    }`}
                >
                    Crear Cuenta
                </button>
            </div>

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
                        {info && <p className="text-blue-600 text-sm mt-2 font-medium bg-blue-50 p-2 rounded">{info}</p>}

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

            <div className="w-full max-w-md mt-8 flex items-center justify-center space-x-4">
                <div className="h-px bg-finance-inputBorder/60 flex-1"></div>
                <span className="text-xs font-semibold text-finance-text/50 tracking-wider">O CONTINÚA COMO</span>
                <div className="h-px bg-finance-inputBorder/60 flex-1"></div>
            </div>

            <button
                onClick={handleGuestMode}
                className="w-full max-w-md bg-finance-card border border-finance-inputBorder hover:bg-finance-input text-finance-text font-semibold py-3 rounded-xl transition-colors mt-6 shadow-sm"
            >
                Modo Invitado (Sin registro)
            </button>

            <p className="w-full max-w-md text-center text-xs font-medium text-finance-text/50 mt-4">
                En modo invitado tus datos se guardan solo en este navegador
            </p>

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
