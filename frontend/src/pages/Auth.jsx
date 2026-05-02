import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
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
    // step can be: 'login', 'register', 'verify_otp', 'recover', 'recover_otp', 'new_password'
    const [step, setStep] = useState('login');
    const [formData, setFormData] = useState({ name: '', email: '', password: '', newPassword: '' });
    const [otpInput, setOtpInput] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(0);

    const navigate = useNavigate();
    const { login, register } = useAuth();

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setInfo('');
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError(''); setInfo(''); setIsSubmitting(true);
        try {
            await login(formData.email, formData.password);
            navigate('/');
        } catch (err) {
            setFailedAttempts(prev => prev + 1);
            if (err.message?.includes('Invalid login credentials')) {
                setError('Email o contraseña incorrectos');
            } else {
                setError(err.message || 'Algo salió mal');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setError(''); setInfo(''); setIsSubmitting(true);
        try {
            const data = await register(formData.name, formData.email, formData.password);
            if (data?.user?.identities?.length === 0) {
                 setError('Ya existe una cuenta con este email.');
                 setIsSubmitting(false);
                 return;
            }
            // Supabase sends OTP by default if email confirmation is enabled
            setStep('verify_otp');
            setInfo('Te hemos enviado un código de 6 dígitos a tu correo.');
        } catch (err) {
            if (err.message?.includes('Password should be')) {
                setError('La contraseña debe tener al menos 6 caracteres');
            } else {
                setError(err.message || 'Algo salió mal');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError(''); setInfo(''); setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: formData.email,
                token: otpInput,
                type: 'signup',
            });
            if (error) throw error;
            navigate('/');
        } catch (err) {
            setError(err.message || 'Código incorrecto o expirado');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRecoverSubmit = async (e) => {
        e.preventDefault();
        setError(''); setInfo(''); setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(formData.email);
            if (error) throw error;
            setStep('recover_otp');
            setInfo('Te hemos enviado un código de 6 dígitos para recuperar tu contraseña.');
        } catch (err) {
            setError(err.message || 'Error al solicitar recuperación');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRecoverOtpVerify = async (e) => {
        e.preventDefault();
        setError(''); setInfo(''); setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: formData.email,
                token: otpInput,
                type: 'recovery',
            });
            if (error) throw error;
            setStep('new_password');
        } catch (err) {
            setError(err.message || 'Código incorrecto o expirado');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNewPasswordSubmit = async (e) => {
        e.preventDefault();
        setError(''); setInfo(''); setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: formData.newPassword });
            if (error) throw error;
            navigate('/');
        } catch (err) {
            setError(err.message || 'Error al actualizar contraseña');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-finance-bg flex flex-col items-center justify-center p-4 font-sans">
            <div className="text-center mb-6">
                <h1 className="text-4xl font-bold text-finance-text tracking-tight">Student-Cash</h1>
                <p className="text-finance-text/70 mt-2 text-sm font-medium">Controla tus finanzas de manera simple</p>
            </div>

            {(step === 'login' || step === 'register') && (
                <div className="flex bg-finance-primary p-1 rounded-xl w-full max-w-md mb-4 shadow-sm gap-1">
                    <button
                        onClick={() => { setStep('login'); setError(''); setInfo(''); }}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${step === 'login'
                            ? 'bg-white text-finance-primary shadow-sm'
                            : 'text-white hover:bg-white/20'
                        }`}
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        onClick={() => { setStep('register'); setError(''); setInfo(''); }}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${step === 'register'
                            ? 'bg-white text-finance-primary shadow-sm'
                            : 'text-white hover:bg-white/20'
                        }`}
                    >
                        Crear Cuenta
                    </button>
                </div>
            )}

            <div className="w-full max-w-md bg-finance-card rounded-2xl shadow-xl overflow-hidden border border-finance-inputBorder">
                <div className="p-8">
                    {/* LOGIN FORM */}
                    {step === 'login' && (
                        <>
                            <h2 className="text-xl font-bold text-finance-text mb-1">Iniciar Sesión</h2>
                            <p className="text-sm text-finance-text/70 mb-6 font-medium">Ingresa tus credenciales para acceder</p>
                            <form onSubmit={handleLoginSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-finance-text mb-1.5">Email</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="tu@email.com" className="w-full bg-finance-input border border-finance-inputBorder text-finance-text text-sm rounded-lg focus:ring-2 focus:ring-finance-primary/40 focus:border-finance-primary block p-3 outline-none transition-all placeholder:text-finance-text/40" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-finance-text mb-1.5">Contraseña</label>
                                    <PasswordField id="auth-password" name="password" value={formData.password} onChange={handleInputChange} placeholder="••••••••" required />
                                </div>
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => { setStep('recover'); setError(''); setInfo(''); }}
                                        className={`text-sm font-semibold transition-all ${failedAttempts >= 3 ? 'text-red-500 animate-pulse' : 'text-finance-primary hover:text-finance-primary/80'}`}
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                                {error && <p className="text-red-500 text-sm mt-2 font-medium bg-red-50 p-2 rounded">{error}</p>}
                                {info && <p className="text-blue-600 text-sm mt-2 font-medium bg-blue-50 p-2 rounded">{info}</p>}
                                <button type="submit" disabled={isSubmitting} className={`w-full text-white font-medium py-3 rounded-xl transition-colors mt-2 shadow-md ${isSubmitting ? 'bg-finance-primary/60 cursor-not-allowed' : 'bg-finance-primary hover:brightness-95'}`}>
                                    {isSubmitting ? 'Cargando...' : 'Entrar'}
                                </button>
                            </form>
                        </>
                    )}

                    {/* REGISTER FORM */}
                    {step === 'register' && (
                        <>
                            <h2 className="text-xl font-bold text-finance-text mb-1">Crear Cuenta</h2>
                            <p className="text-sm text-finance-text/70 mb-6 font-medium">Registra una nueva cuenta</p>
                            <form onSubmit={handleRegisterSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-finance-text mb-1.5">Nombre</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Tu nombre" className="w-full bg-finance-input border border-finance-inputBorder text-finance-text text-sm rounded-lg focus:ring-2 focus:ring-finance-primary/40 focus:border-finance-primary block p-3 outline-none transition-all placeholder:text-finance-text/40" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-finance-text mb-1.5">Email</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="tu@email.com" className="w-full bg-finance-input border border-finance-inputBorder text-finance-text text-sm rounded-lg focus:ring-2 focus:ring-finance-primary/40 focus:border-finance-primary block p-3 outline-none transition-all placeholder:text-finance-text/40" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-finance-text mb-1.5">Contraseña</label>
                                    <PasswordField id="auth-password-reg" name="password" value={formData.password} onChange={handleInputChange} placeholder="••••••••" required />
                                </div>
                                {error && <p className="text-red-500 text-sm mt-2 font-medium bg-red-50 p-2 rounded">{error}</p>}
                                {info && <p className="text-blue-600 text-sm mt-2 font-medium bg-blue-50 p-2 rounded">{info}</p>}
                                <button type="submit" disabled={isSubmitting} className={`w-full text-white font-medium py-3 rounded-xl transition-colors mt-2 shadow-md ${isSubmitting ? 'bg-finance-primary/60 cursor-not-allowed' : 'bg-finance-primary hover:brightness-95'}`}>
                                    {isSubmitting ? 'Cargando...' : 'Crear Cuenta'}
                                </button>
                            </form>
                        </>
                    )}

                    {/* VERIFY OTP FORM (SIGNUP) */}
                    {step === 'verify_otp' && (
                        <>
                            <h2 className="text-xl font-bold text-finance-text mb-1">Verificar Correo</h2>
                            <p className="text-sm text-finance-text/70 mb-6 font-medium">Ingresa el código de 6 dígitos</p>
                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                <div>
                                    <input type="text" maxLength={6} value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="123456" className="w-full text-center tracking-[1em] font-mono bg-finance-input border border-finance-inputBorder text-finance-text text-lg rounded-lg focus:ring-2 focus:ring-finance-primary/40 focus:border-finance-primary block p-3 outline-none transition-all" required />
                                </div>
                                {error && <p className="text-red-500 text-sm mt-2 font-medium bg-red-50 p-2 rounded">{error}</p>}
                                {info && <p className="text-blue-600 text-sm mt-2 font-medium bg-blue-50 p-2 rounded">{info}</p>}
                                <button type="submit" disabled={isSubmitting} className={`w-full text-white font-medium py-3 rounded-xl transition-colors mt-2 shadow-md ${isSubmitting ? 'bg-finance-primary/60 cursor-not-allowed' : 'bg-finance-primary hover:brightness-95'}`}>
                                    {isSubmitting ? 'Verificando...' : 'Confirmar'}
                                </button>
                                <button type="button" onClick={() => setStep('register')} className="w-full text-sm font-semibold text-finance-text/70 hover:text-finance-text mt-2">
                                    Volver al registro
                                </button>
                            </form>
                        </>
                    )}

                    {/* RECOVER PASSWORD FORM */}
                    {step === 'recover' && (
                        <>
                            <h2 className="text-xl font-bold text-finance-text mb-1">Recuperar Contraseña</h2>
                            <p className="text-sm text-finance-text/70 mb-6 font-medium">Te enviaremos un código para restablecerla</p>
                            <form onSubmit={handleRecoverSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-finance-text mb-1.5">Email</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="tu@email.com" className="w-full bg-finance-input border border-finance-inputBorder text-finance-text text-sm rounded-lg focus:ring-2 focus:ring-finance-primary/40 focus:border-finance-primary block p-3 outline-none transition-all placeholder:text-finance-text/40" required />
                                </div>
                                {error && <p className="text-red-500 text-sm mt-2 font-medium bg-red-50 p-2 rounded">{error}</p>}
                                {info && <p className="text-blue-600 text-sm mt-2 font-medium bg-blue-50 p-2 rounded">{info}</p>}
                                <button type="submit" disabled={isSubmitting} className={`w-full text-white font-medium py-3 rounded-xl transition-colors mt-2 shadow-md ${isSubmitting ? 'bg-finance-primary/60 cursor-not-allowed' : 'bg-finance-primary hover:brightness-95'}`}>
                                    {isSubmitting ? 'Cargando...' : 'Enviar Código'}
                                </button>
                                <button type="button" onClick={() => setStep('login')} className="w-full text-sm font-semibold text-finance-text/70 hover:text-finance-text mt-2">
                                    Volver al inicio de sesión
                                </button>
                            </form>
                        </>
                    )}

                    {/* RECOVER OTP FORM */}
                    {step === 'recover_otp' && (
                        <>
                            <h2 className="text-xl font-bold text-finance-text mb-1">Código de Recuperación</h2>
                            <p className="text-sm text-finance-text/70 mb-6 font-medium">Ingresa el código que enviamos a tu correo</p>
                            <form onSubmit={handleRecoverOtpVerify} className="space-y-4">
                                <div>
                                    <input type="text" maxLength={6} value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="123456" className="w-full text-center tracking-[1em] font-mono bg-finance-input border border-finance-inputBorder text-finance-text text-lg rounded-lg focus:ring-2 focus:ring-finance-primary/40 focus:border-finance-primary block p-3 outline-none transition-all" required />
                                </div>
                                {error && <p className="text-red-500 text-sm mt-2 font-medium bg-red-50 p-2 rounded">{error}</p>}
                                {info && <p className="text-blue-600 text-sm mt-2 font-medium bg-blue-50 p-2 rounded">{info}</p>}
                                <button type="submit" disabled={isSubmitting} className={`w-full text-white font-medium py-3 rounded-xl transition-colors mt-2 shadow-md ${isSubmitting ? 'bg-finance-primary/60 cursor-not-allowed' : 'bg-finance-primary hover:brightness-95'}`}>
                                    {isSubmitting ? 'Verificando...' : 'Verificar Código'}
                                </button>
                                <button type="button" onClick={() => setStep('recover')} className="w-full text-sm font-semibold text-finance-text/70 hover:text-finance-text mt-2">
                                    Volver
                                </button>
                            </form>
                        </>
                    )}

                    {/* NEW PASSWORD FORM */}
                    {step === 'new_password' && (
                        <>
                            <h2 className="text-xl font-bold text-finance-text mb-1">Nueva Contraseña</h2>
                            <p className="text-sm text-finance-text/70 mb-6 font-medium">Ingresa tu nueva contraseña</p>
                            <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-finance-text mb-1.5">Nueva Contraseña</label>
                                    <PasswordField id="auth-new-password" name="newPassword" value={formData.newPassword} onChange={handleInputChange} placeholder="••••••••" required />
                                </div>
                                {error && <p className="text-red-500 text-sm mt-2 font-medium bg-red-50 p-2 rounded">{error}</p>}
                                {info && <p className="text-blue-600 text-sm mt-2 font-medium bg-blue-50 p-2 rounded">{info}</p>}
                                <button type="submit" disabled={isSubmitting} className={`w-full text-white font-medium py-3 rounded-xl transition-colors mt-2 shadow-md ${isSubmitting ? 'bg-finance-primary/60 cursor-not-allowed' : 'bg-finance-primary hover:brightness-95'}`}>
                                    {isSubmitting ? 'Guardando...' : 'Guardar Contraseña'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>

            <button
                onClick={toggleTheme}
                className="fixed bottom-6 left-6 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-105 z-50 bg-finance-card border border-finance-inputBorder text-finance-text hover:bg-finance-input"
                title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
                {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
            </button>
        </div>
    );
};

export default Auth;
