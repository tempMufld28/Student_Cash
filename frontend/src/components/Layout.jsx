import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, User, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const navigate = useNavigate();
    const { user, isGuest, logout } = useAuth();
    const [deleteMode, setDeleteMode] = useState(false);

    const userName = user?.name || "Invitado";

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    return (
        <div className="min-h-screen flex flex-col pt-1">
            {/* Top Navbar */}
            <header className="bg-white px-6 py-4 flex justify-between items-center sticky top-0 z-10 mx-4 mt-2 rounded-2xl shadow-sm border border-slate-100">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Student-Cash</h1>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User size={18} className="text-slate-400" />
                        <span className="font-semibold hidden sm:inline-block">{userName}</span>
                        {isGuest && (
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200">
                                Modo Invitado
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold ml-2 shadow-sm"
                    >
                        <LogOut size={16} className="text-slate-600" />
                        Salir
                    </button>
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
                    deleteMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                title={deleteMode ? 'Salir de modo eliminar' : 'Modo eliminar movimientos'}
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </div>
    );
};

export default Layout;
