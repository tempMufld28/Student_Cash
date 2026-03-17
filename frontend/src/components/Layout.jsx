import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, User, Trash2, Eye, EyeOff, ChevronDown, Camera, Lock, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://127.0.0.1:5000/api';

// --- Password field with eye toggle ---
const PasswordField = ({ value, onChange, placeholder, id }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                id={id}
                type={show ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full bg-finance-input border border-finance-inputBorder text-finance-text text-sm rounded-lg p-3 pr-10 outline-none focus:ring-2 focus:ring-finance-primary/40 focus:border-finance-primary placeholder:text-finance-text/40 transition-all"
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

// --- Account Dropdown Panel ---
const AccountDropdown = ({ onClose }) => {
    const { user, token, isGuest, logout, updateUser } = useAuth();
    const navigate = useNavigate();

    // Profile state
    const [name, setName] = useState(user?.name || '');
    const [gender, setGender] = useState(user?.gender || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [profileMsg, setProfileMsg] = useState('');
    const [profileError, setProfileError] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    // Password state
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwMsg, setPwMsg] = useState('');
    const [pwError, setPwError] = useState('');
    const [changingPw, setChangingPw] = useState(false);

    // Delete account state
    const [deleteChecked, setDeleteChecked] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const fileInputRef = useRef();

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setAvatar(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async () => {
        setProfileMsg('');
        setProfileError('');
        setSavingProfile(true);
        try {
            const res = await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name, gender, avatar }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al guardar');
            updateUser(data.user);
            setProfileMsg('¡Perfil actualizado correctamente!');
        } catch (err) {
            setProfileError(err.message);
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        setPwMsg('');
        setPwError('');
        if (newPw !== confirmPw) { setPwError('Las contraseñas nuevas no coinciden'); return; }
        if (newPw.length < 6) { setPwError('La contraseña debe tener al menos 6 caracteres'); return; }
        setChangingPw(true);
        try {
            const res = await fetch(`${API_URL}/auth/change-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña');
            setPwMsg('¡Contraseña actualizada!');
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
        } catch (err) {
            setPwError(err.message);
        } finally {
            setChangingPw(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deleteChecked) {
            setDeleteError('Debes marcar la casilla de confirmación primero');
            return;
        }
        setDeleting(true);
        setDeleteError('');
        console.log('[Delete Account] Iniciando borrado...');
        try {
            const res = await fetch(`${API_URL}/auth/account`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            console.log('[Delete Account] Respuesta:', res.status);
            if (!res.ok) throw new Error('Error al borrar la cuenta');
            logout();
            navigate('/auth');
        } catch (err) {
            console.error('[Delete Account] Error:', err);
            setDeleteError(err.message);
            setDeleting(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    const initials = (user?.name || 'U').charAt(0).toUpperCase();

    return (
        <div className="absolute top-full right-0 mt-2 w-80 bg-finance-card border border-finance-inputBorder rounded-2xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-finance-inputBorder bg-finance-input/60">
                <span className="text-sm font-bold text-finance-text flex items-center gap-2">
                    <User size={15} className="text-finance-primary" /> Configuración de Cuenta
                </span>
                <button onClick={onClose} className="text-finance-text/50 hover:text-finance-text transition-colors">
                    <X size={16} />
                </button>
            </div>

            <div className="overflow-y-auto max-h-[80vh] p-5 space-y-5">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-finance-primary/20 border-2 border-finance-primary/40 flex items-center justify-center overflow-hidden">
                            {avatar ? (
                                <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-finance-primary">{initials}</span>
                            )}
                        </div>
                        {!isGuest && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 w-7 h-7 bg-finance-primary rounded-full flex items-center justify-center shadow-md hover:brightness-95 transition-all"
                                title="Cambiar foto"
                            >
                                <Camera size={13} className="text-white" />
                            </button>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </div>
                    <p className="font-bold text-finance-text text-sm">{user?.name}</p>
                    {isGuest && <span className="text-xs text-finance-text/50 bg-finance-input px-2 py-0.5 rounded-full border border-finance-inputBorder">Modo Invitado</span>}
                </div>

                {/* Profile Info */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-finance-text mb-1">Nombre</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            disabled={isGuest}
                            className="w-full bg-finance-input border border-finance-inputBorder text-finance-text text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-finance-primary/40 focus:border-finance-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-finance-text mb-1">Correo Electrónico</label>
                        <div className="flex items-center gap-2 w-full bg-finance-input border border-finance-inputBorder text-finance-text/60 text-sm rounded-lg p-2.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                            <span className="truncate">{user?.email || 'tu@email.com'}</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-finance-text mb-1">Género</label>
                        <select
                            value={gender}
                            onChange={e => setGender(e.target.value)}
                            disabled={isGuest}
                            className="w-full bg-finance-input border border-finance-inputBorder text-finance-text text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-finance-primary/40 focus:border-finance-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <option value="">Selecciona tu género</option>
                            <option value="Mujer">Mujer</option>
                            <option value="Hombre">Hombre</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>

                    {profileMsg && <p className="text-xs text-green-600 font-medium bg-green-50 border border-green-200 rounded-lg p-2">{profileMsg}</p>}
                    {profileError && <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg p-2">{profileError}</p>}

                    <button
                        onClick={handleSaveProfile}
                        disabled={isGuest || savingProfile}
                        className="w-full bg-finance-primary hover:brightness-95 text-white font-semibold py-2.5 rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-finance-inputBorder" />

                {/* Change Password */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-finance-text flex items-center gap-1.5">
                        <Lock size={13} className="text-finance-primary" /> Cambiar Contraseña
                    </h3>
                    <PasswordField id="cur-pw" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Contraseña actual" />
                    <PasswordField id="new-pw" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Nueva contraseña" />
                    <PasswordField id="conf-pw" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirmar contraseña" />

                    {pwMsg && <p className="text-xs text-green-600 font-medium bg-green-50 border border-green-200 rounded-lg p-2">{pwMsg}</p>}
                    {pwError && <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg p-2">{pwError}</p>}

                    <button
                        onClick={handleChangePassword}
                        disabled={isGuest || changingPw}
                        className="w-full bg-finance-primary hover:brightness-95 text-white font-semibold py-2.5 rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {changingPw ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-finance-inputBorder" />

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 border border-finance-inputBorder hover:bg-finance-input text-finance-text font-semibold py-2.5 rounded-xl transition-all text-sm"
                >
                    <LogOut size={15} /> Cerrar Sesión
                </button>

                {/* Danger Zone */}
                {!isGuest && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                            <AlertTriangle size={13} /> Zona Peligrosa
                        </h3>
                        <p className="text-xs text-red-500">Una vez que elimines tu cuenta, no hay vuelta atrás.</p>
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={deleteChecked}
                                onChange={e => setDeleteChecked(e.target.checked)}
                                className="mt-0.5 accent-red-600"
                            />
                            <span className="text-xs text-red-600 font-medium">Confirmo que deseo borrar mi cuenta permanentemente</span>
                        </label>
                        {deleteError && <p className="text-xs text-red-600 font-medium">{deleteError}</p>}
                        <button
                            type="button"
                            onClick={handleDeleteAccount}
                            className={`w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-xl transition-all text-sm ${
                                deleteChecked && !deleting
                                    ? 'bg-red-500 hover:bg-red-600 cursor-pointer'
                                    : 'bg-red-300 cursor-not-allowed'
                            }`}
                        >
                            <Trash2 size={14} /> {deleting ? 'Borrando...' : 'Borrar Cuenta'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Layout ---
const Layout = () => {
    const navigate = useNavigate();
    const { user, isGuest, logout } = useAuth();
    const [deleteMode, setDeleteMode] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef();

    const userName = user?.name || 'Invitado';
    const initials = userName.charAt(0).toUpperCase();
    const avatar = user?.avatar;

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="min-h-screen flex flex-col pt-1">
            {/* Top Navbar */}
            <header className="bg-finance-card px-6 py-4 flex justify-between items-center sticky top-0 z-10 mx-4 mt-2 rounded-2xl shadow-sm border border-finance-inputBorder">
                <h1 className="text-xl md:text-2xl font-bold text-finance-text tracking-tight">Student-Cash</h1>

                <div className="flex items-center gap-3">
                    {isGuest && (
                        <span className="bg-finance-input text-finance-text/80 px-2.5 py-1 rounded-md text-xs font-semibold border border-finance-inputBorder">
                            Modo Invitado
                        </span>
                    )}

                    {/* Account button with dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowDropdown(s => !s)}
                            className="flex items-center gap-2 px-3 py-1.5 border border-finance-inputBorder rounded-xl hover:bg-finance-input transition-colors text-sm font-semibold shadow-sm text-finance-text"
                        >
                            <div className="w-7 h-7 rounded-full bg-finance-primary/20 border border-finance-primary/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {avatar ? (
                                    <img src={avatar} alt="av" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-finance-primary">{initials}</span>
                                )}
                            </div>
                            <span className="hidden sm:inline-block max-w-[100px] truncate">{userName}</span>
                            <ChevronDown size={14} className={`text-finance-text/50 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showDropdown && (
                            <AccountDropdown onClose={() => setShowDropdown(false)} />
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6 pb-24">
                <Outlet context={{ deleteMode }} />
            </main>

            {/* Delete Mode Button */}
            <button
                onClick={() => setDeleteMode((prev) => !prev)}
                className={`fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-transform z-50 hover:scale-105 ${
                    deleteMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-finance-primary hover:brightness-95 text-white'
                }`}
                title={deleteMode ? 'Salir de modo eliminar' : 'Modo eliminar movimientos'}
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </div>
    );
};

export default Layout;
