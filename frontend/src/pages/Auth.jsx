import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const { login, loginAsGuest } = useAuth();

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

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
            setError(err.message);
        }
    };

    const handleGuestMode = () => {
        loginAsGuest();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-indigo-50/40 flex flex-col items-center justify-center p-4 font-sans">

            {/* Header */}
            <div className="text-center mb-6">
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Student-Cash</h1>
                <p className="text-slate-500 mt-2 text-sm font-medium">Controla tus finanzas de manera simple</p>
            </div>

            {/* Auth Toggle Pills */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-full w-full max-w-md mb-4 shadow-inner">
                <button
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${isLogin
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                >
                    Iniciar Sesión
                </button>
                <button
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${!isLogin
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                >
                    Crear Cuenta
                </button>
            </div>

            {/* Main Card */}
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                <div className="p-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-1">
                        {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                    </h2>
                    <p className="text-sm text-slate-500 mb-6 font-medium">
                        {isLogin ? 'Ingresa tus credenciales para acceder' : 'Registra una nueva cuenta'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Tu nombre"
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none transition-all placeholder:text-slate-400"
                                    required={!isLogin}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="tu@email.com"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none transition-all placeholder:text-slate-400"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none transition-all placeholder:text-slate-400"
                                required
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm mt-2 font-medium bg-red-50 p-2 rounded">{error}</p>}

                        <button
                            type="submit"
                            className="w-full bg-[#0a0a0b] hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-colors mt-2 shadow-md"
                        >
                            {isLogin ? 'Entrar' : 'Crear Cuenta'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Guest Divider */}
            <div className="w-full max-w-md mt-8 flex items-center justify-center space-x-4">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-xs font-semibold text-slate-400 tracking-wider">O CONTINÚA COMO</span>
                <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            {/* Guest Button */}
            <button
                onClick={handleGuestMode}
                className="w-full max-w-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl transition-colors mt-6 shadow-sm"
            >
                Modo Invitado (Sin registro)
            </button>

            <p className="w-full max-w-md text-center text-xs font-medium text-slate-400 mt-4">
                En modo invitado tus datos se guardan solo en este navegador
            </p>

            {/* Help Button */}
            <button className="fixed bottom-6 right-6 w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-700 transition-transform z-50 hover:scale-105">
                <span className="font-bold">?</span>
            </button>
        </div>
    );
};

export default Auth;
