import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const CATEGORIES = [
    'Alimentación', 'Transporte', 'Entretenimiento', 'Educación',
    'Salud', 'Ropa', 'Vivienda', 'Servicios', 'Otros'
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#64748b'];
const API_URL = 'http://localhost:5000/api';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('resumen');
    const [transactions, setTransactions] = useState([]);
    const [plannedExpenses, setPlannedExpenses] = useState([]);
    const { user, token, isGuest } = useAuth();

    // Load Data
    useEffect(() => {
        if (isGuest) {
            const localTrans = JSON.parse(localStorage.getItem('student_cash_transactions') || '[]');
            const localPlan = JSON.parse(localStorage.getItem('student_cash_planned') || '[]');
            setTransactions(localTrans);
            setPlannedExpenses(localPlan);
        } else if (token) {
            fetchData();
        }
    }, [token, isGuest]);

    const fetchData = async () => {
        try {
            const transRes = await fetch(`${API_URL}/transactions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const transData = await transRes.json();
            if (transRes.ok) setTransactions(transData);

            const planRes = await fetch(`${API_URL}/planned-expenses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const planData = await planRes.json();
            if (planRes.ok) setPlannedExpenses(planData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const saveTransaction = async (newTx) => {
        if (isGuest) {
            const updated = [...transactions, { ...newTx, id: Date.now() }];
            setTransactions(updated);
            localStorage.setItem('student_cash_transactions', JSON.stringify(updated));
        } else {
            const res = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newTx)
            });
            if (res.ok) {
                const saved = await res.json();
                setTransactions([saved, ...transactions]);
            }
        }
    };

    const savePlanned = async (newPlan) => {
        if (isGuest) {
            const updated = [...plannedExpenses, { ...newPlan, id: Date.now() }];
            setPlannedExpenses(updated);
            localStorage.setItem('student_cash_planned', JSON.stringify(updated));
        } else {
            const res = await fetch(`${API_URL}/planned-expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newPlan)
            });
            if (res.ok) {
                const saved = await res.json();
                setPlannedExpenses([...plannedExpenses, saved]);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Pills Container */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-full w-fit mb-6 shadow-inner">
                <button
                    onClick={() => setActiveTab('resumen')}
                    className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${activeTab === 'resumen'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                >
                    Resumen
                </button>
                <button
                    onClick={() => setActiveTab('planificacion')}
                    className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${activeTab === 'planificacion'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                >
                    Planificación
                </button>
            </div>

            {activeTab === 'resumen' ? (
                <ResumenTab transactions={transactions} onAddTransaction={saveTransaction} />
            ) : (
                <PlanificacionTab plannedExpenses={plannedExpenses} onAddPlanned={savePlanned} />
            )}
        </div>
    );
};

// --- Subcomponents ---

const ResumenTab = ({ transactions, onAddTransaction }) => {
    const [type, setType] = useState('Gasto');
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [cat, setCat] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!desc || !amount || !date || (type === 'Gasto' && !cat)) return;
        onAddTransaction({ type, description: desc, amount: parseFloat(amount), category: cat, date });
        setDesc('');
        setAmount('');
        setCat('');
    };

    const expenses = transactions.filter(t => t.type === 'Gasto');
    const incomes = transactions.filter(t => t.type === 'Ingreso');

    const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

    // Chart data
    const chartDataMap = {};
    expenses.forEach(e => {
        chartDataMap[e.category] = (chartDataMap[e.category] || 0) + e.amount;
    });
    const chartData = Object.keys(chartDataMap).map(c => ({ name: c, value: chartDataMap[c] })).filter(d => d.value > 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left: Add Transaction */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="text-xl">+</span> Agregar Transacción
                    </h2>

                    <div className="flex bg-slate-100 p-1.5 rounded-xl w-full mb-6">
                        <button
                            onClick={() => { setType('Gasto'); setCat(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${type === 'Gasto' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Gasto
                        </button>
                        <button
                            onClick={() => { setType('Ingreso'); setCat('Ingreso'); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${type === 'Ingreso' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Ingreso
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
                            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Compra de supermercado" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto ($)</label>
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
                        </div>
                        {type === 'Gasto' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría</label>
                                <select value={cat} onChange={e => setCat(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" required>
                                    <option value="" disabled>Selecciona una categoría</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required />
                        </div>
                        <button type="submit" className="w-full bg-[#0a0a0b] hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-colors mt-4">
                            + Agregar {type}
                        </button>
                    </form>
                </div>

                {/* Right: Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Distribución de Gastos</h2>
                    <div className="flex-1 flex items-center justify-center min-h-[250px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={chartData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-slate-400 font-medium text-sm">No hay gastos registrados aún</p>
                        )}
                    </div>
                    {chartData.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-4 justify-center">
                            {chartData.map((d, i) => (
                                <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                    {d.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom: Summary & List */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-6">Resumen Financiero</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 text-center">
                        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase mb-1">Gastos</p>
                        <p className="text-xl font-bold text-red-500">${totalExpense.toFixed(2)}</p>
                    </div>
                    <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 text-center">
                        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase mb-1">Ingresos</p>
                        <p className="text-xl font-bold text-green-500">${totalIncome.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-center">
                        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase mb-1">Balance</p>
                        <p className="text-xl font-bold text-blue-600">${balance.toFixed(2)}</p>
                    </div>
                </div>

                {transactions.length > 0 ? (
                    <div className="space-y-3">
                        {transactions.map(t => (
                            <div key={t.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                                <div>
                                    <p className="font-semibold text-sm text-slate-800">{t.description}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{t.date} • {t.type === 'Gasto' ? t.category : 'Ingreso'}</p>
                                </div>
                                <p className={`font-bold ${t.type === 'Gasto' ? 'text-slate-800' : 'text-green-600'}`}>
                                    {t.type === 'Gasto' ? '-' : '+'}${t.amount.toFixed(2)}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-slate-400 font-medium text-sm py-8">No hay transacciones registradas</p>
                )}
            </div>
        </div>
    );
};

const PlanificacionTab = ({ plannedExpenses, onAddPlanned }) => {
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isAdding, setIsAdding] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!desc || !amount || !date) return;
        onAddPlanned({ description: desc, amount: parseFloat(amount), date });
        setDesc('');
        setAmount('');
        setIsAdding(false);
    };

    const total = plannedExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Gastos Planificados</h2>
                    <p className="text-sm text-slate-500 mt-1">Total pendiente: <span className="font-semibold text-slate-800">${total.toFixed(2)}</span></p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-[#0a0a0b] hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm flex items-center gap-1.5"
                >
                    <span>{isAdding ? 'Cancelar' : '+ Agregar'}</span>
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
                        <input type="text" value={desc} onChange={e => setDesc(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Monto ($)</label>
                        <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium p-2.5 rounded-lg transition-colors text-sm">
                        Guardar
                    </button>
                </form>
            )}

            {plannedExpenses.length > 0 ? (
                <div className="space-y-3">
                    {plannedExpenses.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                            <div>
                                <p className="font-semibold text-sm text-slate-800">{p.description}</p>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium">{p.date}</p>
                            </div>
                            <p className="font-bold text-slate-800">${p.amount.toFixed(2)}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-48">
                    <p className="text-slate-400 font-medium text-sm">No hay gastos planificados</p>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
