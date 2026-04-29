import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

const CATEGORIES = [
    'Alimentación', 'Transporte', 'Entretenimiento', 'Educación',
    'Salud', 'Ropa', 'Belleza', 'Vivienda', 'Servicios', 'Otros'
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#64748b'];

const CATEGORY_CONFIG = {
    'Alimentación':    { color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
    'Transporte':      { color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
    'Entretenimiento': { color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
    'Educación':       { color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
    'Salud':           { color: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
    'Ropa':            { color: 'bg-pink-100 text-pink-700', dot: 'bg-pink-400' },
    'Belleza':         { color: 'bg-pink-100 text-pink-700', dot: 'bg-pink-400' },
    'Vivienda':        { color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
    'Servicios':       { color: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-400' },
    'Otros':           { color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
    'Ingreso':         { color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const [y, m, d] = String(dateStr).split('T')[0].split('-');
        const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
        return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
    } catch { return dateStr; }
};

const parseAmount = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const clean = String(value).replace(/,/g, '');
    const num = parseFloat(clean);
    return Number.isNaN(num) ? 0 : num;
};

const formatInputAmount = (value) => {
    const numeric = String(value || '').replace(/[^\d.]/g, '');
    if (!numeric) return '';
    const [intPart, decPart] = numeric.split('.');
    const intNumber = intPart ? parseInt(intPart, 10) : 0;
    const formattedInt = Number.isNaN(intNumber) ? '' : intNumber.toLocaleString('en-US');
    if (decPart !== undefined) {
        return `${formattedInt || '0'}.${decPart.slice(0, 2)}`;
    }
    return formattedInt;
};

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('resumen');
    const [transactions, setTransactions] = useState([]);
    const [plannedExpenses, setPlannedExpenses] = useState([]);
    const [addToPlanModal, setAddToPlanModal] = useState(null);
    const { user } = useAuth();
    const { deleteMode } = useOutletContext() || {};

    useEffect(() => {
        if (user?.id) fetchData();
    }, [user?.id]);

    const fetchData = async () => {
        const [transRes, planRes] = await Promise.all([
            supabase.from('transactions').select('*').order('date', { ascending: false }),
            supabase.from('planned_expenses').select('*, plan_members(*)').order('date', { ascending: true }),
        ]);

        if (!transRes.error) setTransactions(transRes.data);
        if (!planRes.error) setPlannedExpenses(planRes.data);
    };

    const saveTransaction = async (newTx) => {
        const { data, error } = await supabase
            .from('transactions')
            .insert({ ...newTx, user_id: user.id })
            .select()
            .single();
        if (!error) setTransactions(prev => [data, ...prev]);
    };

    const savePlanned = async (newPlan) => {
        const { data, error } = await supabase
            .from('planned_expenses')
            .insert({ ...newPlan, user_id: user.id })
            .select('*, plan_members(*)')
            .single();
        if (!error) setPlannedExpenses(prev => [...prev, data]);
    };

    const deleteTransaction = async (id) => {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (!error) setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const deletePlanned = async (id) => {
        const { error } = await supabase.from('planned_expenses').delete().eq('id', id);
        if (!error) setPlannedExpenses(prev => prev.filter(p => p.id !== id));
    };

    const updatePlanned = async (updated) => {
        const { id, user_id: _uid, created_at: _ca, plan_members: _pm, ...fields } = updated;
        const { data, error } = await supabase
            .from('planned_expenses')
            .update(fields)
            .eq('id', id)
            .select('*, plan_members(*)')
            .single();
        if (!error) setPlannedExpenses(prev => prev.map(p => p.id === id ? data : p));
        return error ? null : data;
    };

    const handleAddCollaborator = async (planId, email) => {
        const { data: userId, error: rpcErr } = await supabase.rpc('get_user_id_by_email', { lookup_email: email });
        if (rpcErr || !userId) return { error: 'El correo no está registrado en Student-Cash' };
        const { error } = await supabase.from('plan_members').insert({
            plan_id: planId,
            invited_by: user.id,
            member_email: email,
            member_id: userId,
            role: 'editor',
            status: 'accepted',
        });
        if (!error) fetchData();
        return { error: error?.message || null };
    };

    const handleRemoveCollaborator = async (memberId) => {
        const { error } = await supabase.from('plan_members').delete().eq('id', memberId);
        if (!error) fetchData();
    };

    const handleAddTransactionToPlan = async (transaction, planId) => {
        const plan = plannedExpenses.find(p => p.id === planId);
        if (!plan) return;
        const newModule = { label: transaction.description, amount: transaction.amount, multiplier: 1 };
        const { error } = await supabase
            .from('planned_expenses')
            .update({ modules: [...(plan.modules || []), newModule] })
            .eq('id', planId);
        if (!error) { setAddToPlanModal(null); fetchData(); }
    };

    return (
        <div className="space-y-6">
            <div className="flex bg-finance-primary p-1 rounded-xl w-fit mb-6 shadow-sm gap-1">
                <button
                    onClick={() => setActiveTab('resumen')}
                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'resumen'
                            ? 'bg-white text-finance-primary shadow-sm'
                            : 'text-white hover:bg-white/20'
                    }`}
                >
                    Resumen
                </button>
                <button
                    onClick={() => setActiveTab('planificacion')}
                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'planificacion'
                            ? 'bg-white text-finance-primary shadow-sm'
                            : 'text-white hover:bg-white/20'
                    }`}
                >
                    Planificación
                </button>
            </div>

            {activeTab === 'resumen' ? (
                <ResumenTab
                    transactions={transactions}
                    plannedExpenses={plannedExpenses}
                    onAddTransaction={saveTransaction}
                    onDeleteTransaction={deleteTransaction}
                    deleteMode={deleteMode}
                    onOpenAddToPlan={(tx) => setAddToPlanModal(tx)}
                />
            ) : (
                <PlanificacionTab
                    plannedExpenses={plannedExpenses}
                    currentUserId={user?.id}
                    onAddPlanned={savePlanned}
                    onDeletePlanned={deletePlanned}
                    onUpdatePlanned={updatePlanned}
                    onAddCollaborator={handleAddCollaborator}
                    onRemoveCollaborator={handleRemoveCollaborator}
                    deleteMode={deleteMode}
                />
            )}

            {addToPlanModal && (
                <AddToPlanModal
                    transaction={addToPlanModal}
                    plans={plannedExpenses}
                    currentUserId={user?.id}
                    onConfirm={handleAddTransactionToPlan}
                    onClose={() => setAddToPlanModal(null)}
                />
            )}
        </div>
    );
};

// --- Subcomponents ---

const ResumenTab = ({ transactions, plannedExpenses, onAddTransaction, onDeleteTransaction, deleteMode, onOpenAddToPlan }) => {
    const [type, setType] = useState('Gasto');
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [cat, setCat] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!desc || !amount || !date || (type === 'Gasto' && !cat)) return;
        const numericAmount = parseAmount(amount);
        if (!numericAmount) return;
        onAddTransaction({ type, description: desc, amount: numericAmount, category: cat, date });
        setDesc('');
        setAmount('');
        setCat('');
    };

    const expenses = transactions.filter(t => t.type === 'Gasto');
    const incomes = transactions.filter(t => t.type === 'Ingreso');
    const totalExpense = expenses.reduce((acc, curr) => acc + parseAmount(curr.amount), 0);
    const totalIncome = incomes.reduce((acc, curr) => acc + parseAmount(curr.amount), 0);
    const balance = totalIncome - totalExpense;

    const chartDataMap = {};
    expenses.forEach(e => { chartDataMap[e.category] = (chartDataMap[e.category] || 0) + parseAmount(e.amount); });
    const chartData = Object.keys(chartDataMap).map(c => ({ name: c, value: chartDataMap[c] })).filter(d => d.value > 0);

    const [chartType, setChartType] = useState('pie');

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-finance-card p-6 rounded-2xl shadow-sm border border-finance-inputBorder h-full">
                    <h2 className="text-lg font-bold text-finance-text mb-6 flex items-center gap-2">
                        <span className="text-xl">+</span> Agregar Transacción
                    </h2>

                    <div className="flex bg-finance-primary p-1 rounded-xl w-full mb-6 gap-1">
                        <button
                            onClick={() => { setType('Gasto'); setCat(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                type === 'Gasto'
                                    ? 'bg-white text-finance-primary shadow-sm'
                                    : 'text-white hover:bg-white/20'
                            }`}
                        >
                            Gasto
                        </button>
                        <button
                            onClick={() => { setType('Ingreso'); setCat('Ingreso'); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                type === 'Ingreso'
                                    ? 'bg-white text-finance-primary shadow-sm'
                                    : 'text-white hover:bg-white/20'
                            }`}
                        >
                            Ingreso
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-finance-text mb-1.5">Descripción</label>
                            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder={type === 'Ingreso' ? 'Ej: Beca' : 'Ej: Compra de supermercado'} className="w-full bg-finance-input border border-finance-inputBorder rounded-lg p-3 text-sm focus:ring-2 focus:ring-finance-primary/40 outline-none text-finance-text placeholder:text-finance-text/40" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-finance-text mb-1.5">Monto ($)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={e => setAmount(formatInputAmount(e.target.value))}
                                placeholder="0.00"
                                className="w-full bg-finance-input border border-finance-inputBorder rounded-lg p-3 text-sm focus:ring-2 focus:ring-finance-primary/40 outline-none text-finance-text placeholder:text-finance-text/40"
                                required
                            />
                        </div>
                        {type === 'Gasto' && (
                            <div>
                                <label className="block text-sm font-medium text-finance-text mb-1.5">Categoría</label>
                                <select value={cat} onChange={e => setCat(e.target.value)} className="w-full bg-finance-input border border-finance-inputBorder rounded-lg p-3 text-sm text-finance-text focus:ring-2 focus:ring-finance-primary/40 outline-none" required>
                                    <option value="" disabled>Selecciona una categoría</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-finance-text mb-1.5">Fecha</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-finance-input border border-finance-inputBorder rounded-lg p-3 text-sm focus:ring-2 focus:ring-finance-primary/40 outline-none text-finance-text" required />
                        </div>
                        <button type="submit" className="w-full bg-finance-primary hover:brightness-95 text-white font-medium py-3 rounded-xl transition-colors mt-4">
                            + Agregar {type}
                        </button>
                    </form>
                </div>

                <div className="bg-finance-card p-6 rounded-2xl shadow-sm border border-finance-inputBorder h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-finance-text">Distribución de Gastos</h2>
                        <div className="inline-flex bg-finance-input rounded-full p-1 text-xs font-medium border border-finance-inputBorder">
                            <button
                                type="button"
                                onClick={() => setChartType('pie')}
                                className={`px-3 py-1 rounded-full transition-colors ${chartType === 'pie' ? 'bg-finance-card shadow text-finance-text' : 'text-finance-text/70 hover:text-finance-text'}`}
                            >
                                Pastel
                            </button>
                            <button
                                type="button"
                                onClick={() => setChartType('bar')}
                                className={`px-3 py-1 rounded-full transition-colors ${chartType === 'bar' ? 'bg-finance-card shadow text-finance-text' : 'text-finance-text/70 hover:text-finance-text'}`}
                            >
                                Barras
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center min-h-[250px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                {chartType === 'pie' ? (
                                    <PieChart>
                                        <Pie data={chartData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                                    </PieChart>
                                ) : (
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                                        <Legend />
                                        <Bar dataKey="value">
                                            {chartData.map((entry, index) => (
                                                <Cell key={`bar-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-finance-text/50 font-medium text-sm">No hay gastos registrados aún</p>
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

            <div className="bg-finance-card p-6 rounded-2xl shadow-sm border border-finance-inputBorder">
                <h2 className="text-lg font-bold text-finance-text mb-6">Resumen Financiero</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-red-50/60 border-l-4 border-red-400 border border-red-100 rounded-xl p-4">
                        <p className="text-xs font-semibold tracking-wider text-red-500 uppercase mb-1">Gastos</p>
                        <p className="text-2xl font-bold text-red-500">${totalExpense.toFixed(2)}</p>
                    </div>
                    <div className="bg-green-50/60 border-l-4 border-green-400 border border-green-100 rounded-xl p-4">
                        <p className="text-xs font-semibold tracking-wider text-green-600 uppercase mb-1">Ingresos</p>
                        <p className="text-2xl font-bold text-green-600">${totalIncome.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50/60 border-l-4 border-blue-400 border border-blue-100 rounded-xl p-4">
                        <p className="text-xs font-semibold tracking-wider text-blue-600 uppercase mb-1">Balance</p>
                        <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-500'}`}>${balance.toFixed(2)}</p>
                    </div>
                </div>

                {transactions.length > 0 ? (
                    <div className="space-y-2">
                        {transactions.map(t => {
                            const catKey = t.type === 'Ingreso' ? 'Ingreso' : (t.category || 'Otros');
                            const catInfo = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG['Otros'];
                            return (
                                <div key={t.id} className="flex justify-between items-center p-4 border border-finance-inputBorder rounded-xl hover:bg-finance-input/60 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${catInfo.color}`}>
                                            <div className={`w-3 h-3 rounded-full ${catInfo.dot}`} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-finance-text">{t.description}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catInfo.color}`}>
                                                    {catKey}
                                                </span>
                                                <span className="text-[10px] text-finance-text/50 font-medium">{formatDate(t.date)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => onOpenAddToPlan(t)}
                                            className="text-xs text-indigo-500 hover:text-indigo-700 border border-indigo-300 rounded px-2 py-0.5"
                                            title="Agregar como módulo a un plan"
                                        >
                                            + Plan
                                        </button>
                                        {deleteMode && (
                                            <button
                                                type="button"
                                                onClick={() => onDeleteTransaction(t.id)}
                                                className="text-xs font-semibold text-red-600 hover:text-red-700"
                                            >
                                                Quitar
                                            </button>
                                        )}
                                        <p className={`font-bold text-sm ${t.type === 'Gasto' ? 'text-red-500' : 'text-green-600'}`}>
                                            {t.type === 'Gasto' ? '-' : '+'}${parseFloat(t.amount).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center text-finance-text/40 font-medium text-sm py-8">No hay transacciones registradas</p>
                )}
            </div>
        </div>
    );
};

const PlanificacionTab = ({ plannedExpenses, currentUserId, onAddPlanned, onDeletePlanned, onUpdatePlanned, onAddCollaborator, onRemoveCollaborator, deleteMode }) => {
    const [desc, setDesc] = useState('');
    const [baseAmount, setBaseAmount] = useState('');
    const [modules, setModules] = useState([]);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [deadlineDate, setDeadlineDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [collaborators, setCollaborators] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [isViewing, setIsViewing] = useState(false);

    const openPlan = (plan) => { setSelectedPlan(plan); setIsViewing(true); };
    const closePlan = () => { setIsViewing(false); setSelectedPlan(null); };

    const handleAddModule = () => {
        setModules(prev => [...prev, { id: Date.now(), label: '', amount: '', multiplier: '1' }]);
    };

    const handleModuleChange = (id, field, value) => {
        setModules(prev => prev.map(m =>
            m.id === id ? { ...m, [field]: field === 'amount' ? formatInputAmount(value) : value } : m
        ));
    };

    const handleRemoveModule = (id) => setModules(prev => prev.filter(m => m.id !== id));

    const handleAddCollaborator = () => {
        setCollaborators(prev => [...prev, { id: Date.now(), name: '', email: '', mode: 'percent', percent: '', moduleId: '' }]);
    };

    const handleCollaboratorChange = (id, field, value) => {
        setCollaborators(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleRemoveCollaborator = (id) => setCollaborators(prev => prev.filter(c => c.id !== id));

    const handleSubmit = (e) => {
        e.preventDefault();
        const numericBase = parseAmount(baseAmount);
        const numericModules = modules
            .map(m => ({ ...m, amount: parseAmount(m.amount), multiplier: parseAmount(m.multiplier || 1) }))
            .filter(m => m.label && m.amount > 0 && m.multiplier > 0);

        if (!desc || (!numericBase && numericModules.length === 0) || !date) return;

        const extrasTotal = numericModules.reduce((acc, curr) => acc + curr.amount * curr.multiplier, 0);
        const total = numericBase + extrasTotal;

        const moduleTotalsById = new Map(numericModules.map(m => [String(m.id), m.amount * m.multiplier]));
        const cleanCollaborators = collaborators
            .map(c => {
                const percent = parseAmount(c.percent);
                const share = c.mode === 'module'
                    ? (moduleTotalsById.get(String(c.moduleId)) || 0)
                    : (total * (percent / 100));
                return { ...c, percent, share };
            })
            .filter(c => c.name && c.share > 0);

        onAddPlanned({ description: desc, amount: total, date, modules: numericModules, deadline_date: deadlineDate, event_date: eventDate, collaborators: cleanCollaborators });
        setDesc(''); setBaseAmount(''); setModules([]); setCollaborators([]); setIsAdding(false);
    };

    const total = plannedExpenses.reduce((acc, curr) => acc + parseAmount(curr.amount), 0);

    const handleUpdatePlanned = async (updated) => {
        const saved = await onUpdatePlanned(updated);
        if (saved) setSelectedPlan(saved);
    };

    return (
        <div className="bg-finance-card p-6 rounded-2xl shadow-sm border border-finance-inputBorder min-h-[400px]">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-lg font-bold text-finance-text">Gastos Planificados</h2>
                    <p className="text-sm text-finance-text/70 mt-1">Total pendiente: <span className="font-semibold text-finance-text">${total.toFixed(2)}</span></p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-finance-primary hover:brightness-95 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm flex items-center gap-1.5"
                >
                    {isAdding ? 'Cancelar' : '+ Agregar'}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="mb-8 p-4 bg-finance-input rounded-xl border border-finance-inputBorder grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-finance-text mb-1">Descripción principal</label>
                        <input type="text" value={desc} onChange={e => setDesc(e.target.value)} required className="w-full bg-finance-card border border-finance-inputBorder rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-finance-primary/40 outline-none text-finance-text placeholder:text-finance-text/40" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-finance-text mb-1">Monto principal ($)</label>
                        <input type="text" inputMode="decimal" value={baseAmount} onChange={e => setBaseAmount(formatInputAmount(e.target.value))} placeholder="0.00" className="w-full bg-finance-card border border-finance-inputBorder rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-finance-primary/40 outline-none text-finance-text placeholder:text-finance-text/40" />
                    </div>
                    <div className="sm:col-span-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-medium text-finance-text">Módulos de gasto extra</label>
                            <button type="button" onClick={handleAddModule} className="text-xs font-semibold text-finance-primary hover:brightness-95">+ Agregar módulo</button>
                        </div>
                        {modules.length > 0 && (
                            <div className="space-y-2">
                                {modules.map(m => (
                                    <div key={m.id} className="grid grid-cols-6 gap-2 items-center">
                                        <input type="text" value={m.label} onChange={e => handleModuleChange(m.id, 'label', e.target.value)} placeholder="Ej: Transporte" className="col-span-3 bg-finance-card border border-finance-inputBorder rounded-lg p-2 text-xs focus:ring-2 focus:ring-finance-primary/40 outline-none text-finance-text placeholder:text-finance-text/40" />
                                        <input type="text" inputMode="decimal" value={m.amount} onChange={e => handleModuleChange(m.id, 'amount', e.target.value)} placeholder="0.00" className="col-span-1 bg-finance-card border border-finance-inputBorder rounded-lg p-2 text-xs focus:ring-2 focus:ring-finance-primary/40 outline-none text-right text-finance-text placeholder:text-finance-text/40" />
                                        <input type="number" min="1" value={m.multiplier} onChange={e => handleModuleChange(m.id, 'multiplier', e.target.value)} placeholder="1" className="col-span-1 bg-finance-card border border-finance-inputBorder rounded-lg p-2 text-xs focus:ring-2 focus:ring-finance-primary/40 outline-none text-right text-finance-text" />
                                        <button type="button" onClick={() => handleRemoveModule(m.id)} className="text-[11px] text-red-500 hover:text-red-600 font-semibold">Quitar</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-finance-text mb-1">Fecha límite para reunir el dinero</label>
                        <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} className="w-full bg-finance-card border border-finance-inputBorder rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-finance-primary/40 outline-none text-finance-text" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-finance-text mb-1">Fecha del evento / gasto</label>
                        <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-finance-card border border-finance-inputBorder rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-finance-primary/40 outline-none text-finance-text" />
                    </div>
                    <div className="sm:col-span-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-medium text-finance-text">Colaboración (opcional)</label>
                            <button type="button" onClick={handleAddCollaborator} className="text-xs font-semibold text-finance-primary hover:brightness-95">+ Agregar colaborador</button>
                        </div>
                        {collaborators.length > 0 && (
                            <div className="space-y-2">
                                {collaborators.map(c => (
                                    <div key={c.id} className="grid grid-cols-7 gap-2 items-center">
                                        <input type="text" value={c.name} onChange={e => handleCollaboratorChange(c.id, 'name', e.target.value)} placeholder="Nombre" className="col-span-2 bg-finance-card border border-finance-inputBorder rounded-lg p-2 text-xs focus:ring-2 focus:ring-finance-primary/40 outline-none text-finance-text placeholder:text-finance-text/40" />
                                        <input type="email" value={c.email} onChange={e => handleCollaboratorChange(c.id, 'email', e.target.value)} placeholder="Email" className="col-span-2 bg-finance-card border border-finance-inputBorder rounded-lg p-2 text-xs focus:ring-2 focus:ring-finance-primary/40 outline-none text-finance-text placeholder:text-finance-text/40" />
                                        <select value={c.mode} onChange={e => handleCollaboratorChange(c.id, 'mode', e.target.value)} className="col-span-1 bg-finance-card border border-finance-inputBorder rounded-lg p-2 text-xs focus:ring-2 focus:ring-finance-primary/40 outline-none text-finance-text">
                                            <option value="percent">%</option>
                                            <option value="module">Módulo</option>
                                        </select>
                                        {c.mode === 'module' ? (
                                            <select value={c.moduleId} onChange={e => handleCollaboratorChange(c.id, 'moduleId', e.target.value)} className="col-span-1 bg-finance-card border border-finance-inputBorder rounded-lg p-2 text-xs focus:ring-2 focus:ring-finance-primary/40 outline-none text-finance-text">
                                                <option value="">Módulo</option>
                                                {modules.map(m => <option key={m.id} value={String(m.id)}>{m.label || 'Sin nombre'}</option>)}
                                            </select>
                                        ) : (
                                            <input type="number" min="1" value={c.percent} onChange={e => handleCollaboratorChange(c.id, 'percent', e.target.value)} placeholder="%" className="col-span-1 bg-finance-card border border-finance-inputBorder rounded-lg p-2 text-xs focus:ring-2 focus:ring-finance-primary/40 outline-none text-right text-finance-text" />
                                        )}
                                        <button type="button" onClick={() => handleRemoveCollaborator(c.id)} className="text-[11px] text-red-500 hover:text-red-600 font-semibold">Quitar</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button type="submit" className="w-full bg-finance-primary hover:brightness-95 text-white font-medium p-2.5 rounded-lg transition-colors text-sm">Guardar</button>
                </form>
            )}

            {plannedExpenses.length > 0 ? (
                <div className="space-y-3">
                    {plannedExpenses.map(p => (
                        <button
                            type="button"
                            key={p.id}
                            onClick={() => openPlan(p)}
                            className="w-full text-left flex justify-between items-center p-4 border border-finance-inputBorder rounded-xl hover:bg-finance-input transition-colors"
                        >
                            <div>
                                <p className="font-semibold text-sm text-finance-text">{p.description}</p>
                                <p className="text-xs text-finance-text/70 mt-0.5 font-medium">
                                    Creado: {p.date}
                                    {p.deadline_date && ` • Límite: ${p.deadline_date}`}
                                    {p.event_date && ` • Evento: ${p.event_date}`}
                                </p>
                                {p.modules && p.modules.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                        {p.modules.map((m, idx) => (
                                            <p key={idx} className="text-[11px] text-finance-text/70">
                                                - {m.label}: ${Number(m.amount).toFixed(2)} x {m.multiplier ?? 1}
                                            </p>
                                        ))}
                                    </div>
                                )}
                                {p.collaborators && p.collaborators.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                        <p className="text-[11px] text-finance-text/70 font-semibold">Colaboradores:</p>
                                        {p.collaborators.map((c, idx) => (
                                            <p key={idx} className="text-[11px] text-finance-text/70">
                                                - {c.name}{c.email ? ` (${c.email})` : ''}: {c.mode === 'module' ? 'Módulo' : `${c.percent ?? 0}%`}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {deleteMode && (
                                    <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); onDeletePlanned(p.id); }}
                                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                                    >
                                        Quitar
                                    </button>
                                )}
                                <p className="font-bold text-finance-text">${parseAmount(p.amount).toFixed(2)}</p>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-48">
                    <p className="text-finance-text/50 font-medium text-sm">No hay gastos planificados</p>
                </div>
            )}

            {isViewing && selectedPlan && (
                <PlannedExpenseModal
                    plan={selectedPlan}
                    currentUserId={currentUserId}
                    onClose={closePlan}
                    onSave={handleUpdatePlanned}
                    onAddCollaborator={onAddCollaborator}
                    onRemoveCollaborator={onRemoveCollaborator}
                />
            )}
        </div>
    );
};

const PlannedExpenseModal = ({ plan, currentUserId, onClose, onSave, onAddCollaborator, onRemoveCollaborator }) => {
    const [tab, setTab] = useState('graficas');
    const [collabEmail, setCollabEmail] = useState('');
    const [collabError, setCollabError] = useState('');
    const [collabLoading, setCollabLoading] = useState(false);
    const [emailSuggestions, setEmailSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimeout = React.useRef(null);
    const [draft, setDraft] = useState(() => ({
        ...plan,
        modules: Array.isArray(plan.modules) ? plan.modules : [],
        collaborators: Array.isArray(plan.collaborators) ? plan.collaborators : [],
    }));

    const isMember =
        plan.user_id === currentUserId ||
        (plan.plan_members || []).some(m => m.member_id === currentUserId && m.status === 'accepted');
    const isOwner = plan.user_id === currentUserId;

    useEffect(() => {
        setDraft({
            ...plan,
            modules: Array.isArray(plan.modules) ? plan.modules : [],
            collaborators: Array.isArray(plan.collaborators) ? plan.collaborators : [],
        });
    }, [plan]);

    const moduleData = (draft.modules || []).map(m => ({
        name: m.label || 'Sin nombre',
        value: Number(m.amount || 0) * Number(m.multiplier || 1),
    })).filter(d => d.value > 0);

    const handleSave = () => {
        const numericModules = (draft.modules || []).map(m => ({
            ...m,
            amount: Number(m.amount || 0),
            multiplier: Number(m.multiplier || 1),
        }));
        const moduleTotalsById = new Map(numericModules.map(m => [String(m.id), m.amount * m.multiplier]));
        const collaborators = (draft.collaborators || []).map(c => {
            const percent = Number(c.percent || 0);
            const share = c.mode === 'module'
                ? (moduleTotalsById.get(String(c.moduleId)) || 0)
                : (Number(draft.amount || 0) * (percent / 100));
            return { ...c, percent, share };
        });
        onSave({ ...draft, modules: numericModules, collaborators, amount: Number(draft.amount || 0) });
    };

    const handleAddCollab = async () => {
        if (!collabEmail.trim()) return;
        setCollabLoading(true); setCollabError('');
        const result = await onAddCollaborator(plan.id, collabEmail.trim());
        setCollabLoading(false);
        if (result?.error) setCollabError(result.error);
        else { setCollabEmail(''); setEmailSuggestions([]); setShowSuggestions(false); }
    };

    const handleEmailChange = (value) => {
        setCollabEmail(value);
        setCollabError('');
        clearTimeout(searchTimeout.current);
        if (value.length < 2) { setEmailSuggestions([]); setShowSuggestions(false); return; }
        searchTimeout.current = setTimeout(async () => {
            const { data } = await supabase.rpc('search_users_by_email', { query: value });
            if (data && data.length > 0) {
                setEmailSuggestions(data.map(r => r.email));
                setShowSuggestions(true);
            } else {
                setEmailSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);
    };

    const selectSuggestion = (email) => {
        setCollabEmail(email);
        setEmailSuggestions([]);
        setShowSuggestions(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-3xl bg-finance-card rounded-2xl shadow-xl border border-finance-inputBorder overflow-hidden">
                <div className="p-5 flex items-start justify-between gap-4 border-b border-finance-inputBorder">
                    <div>
                        <h3 className="text-lg font-bold text-finance-text">{plan.description}</h3>
                        <p className="text-xs text-finance-text/70 mt-1">
                            Total: ${Number(plan.amount || 0).toFixed(2)}
                            {plan.deadline_date && ` • Límite: ${plan.deadline_date}`}
                            {plan.event_date && ` • Evento: ${plan.event_date}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-sm font-semibold text-finance-text/70 hover:text-finance-text">Cerrar</button>
                </div>

                <div className="p-5">
                    {(() => {
                        const tabs = isMember ? ['graficas', 'detalle', 'editar', 'compartir'] : ['graficas', 'detalle'];
                        return (
                            <div className="inline-flex bg-finance-input rounded-full p-1 text-xs font-medium border border-finance-inputBorder">
                                {tabs.map(t => (
                                    <button key={t} type="button" onClick={() => setTab(t)} className={`px-3 py-1 rounded-full transition-colors capitalize ${tab === t ? 'bg-finance-card shadow text-finance-text' : 'text-finance-text/70 hover:text-finance-text'}`}>
                                        {t === 'graficas' ? 'Gráficas' : t === 'compartir' ? 'Compartir' : t.charAt(0).toUpperCase() + t.slice(1)}
                                    </button>
                                ))}
                            </div>
                        );
                    })()}

                    {tab === 'graficas' && (
                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['pie', 'bar'].map(chartType => (
                                <div key={chartType} className="border border-finance-inputBorder rounded-xl p-4">
                                    <p className="text-sm font-bold text-finance-text mb-3">Módulos ({chartType === 'pie' ? 'Pastel' : 'Barras'})</p>
                                    {moduleData.length ? (
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                {chartType === 'pie' ? (
                                                    <PieChart>
                                                        <Pie data={moduleData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                                                            {moduleData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                                        </Pie>
                                                        <Tooltip formatter={v => `$${Number(v).toFixed(2)}`} />
                                                    </PieChart>
                                                ) : (
                                                    <BarChart data={moduleData}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="name" />
                                                        <YAxis />
                                                        <Tooltip formatter={v => `$${Number(v).toFixed(2)}`} />
                                                        <Bar dataKey="value">
                                                            {moduleData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                                        </Bar>
                                                    </BarChart>
                                                )}
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-finance-text/60">No hay módulos para graficar.</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'detalle' && (
                        <div className="mt-5 space-y-3">
                            <div className="border border-finance-inputBorder rounded-xl p-4">
                                <p className="text-sm font-bold text-finance-text mb-2">Módulos</p>
                                {(draft.modules || []).length ? (
                                    <div className="space-y-1">
                                        {draft.modules.map((m, idx) => (
                                            <p key={idx} className="text-xs text-finance-text/70">
                                                - {m.label}: ${Number(m.amount || 0).toFixed(2)} x {m.multiplier ?? 1}
                                            </p>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-finance-text/60">Sin módulos.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {tab === 'editar' && isMember && (
                        <div className="mt-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-finance-text mb-1">Descripción</label>
                                    <input value={draft.description || ''} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} className="w-full bg-finance-input border border-finance-inputBorder rounded-lg p-2.5 text-sm outline-none text-finance-text" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-finance-text mb-1">Monto total ($)</label>
                                    <input value={String(draft.amount ?? '')} onChange={e => setDraft(d => ({ ...d, amount: parseAmount(e.target.value) }))} className="w-full bg-finance-input border border-finance-inputBorder rounded-lg p-2.5 text-sm outline-none text-finance-text" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-finance-text mb-1">Fecha (creación)</label>
                                    <input type="date" value={draft.date || ''} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} className="w-full bg-finance-input border border-finance-inputBorder rounded-lg p-2.5 text-sm outline-none text-finance-text" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-finance-text mb-1">Fecha límite</label>
                                    <input type="date" value={draft.deadline_date || ''} onChange={e => setDraft(d => ({ ...d, deadline_date: e.target.value }))} className="w-full bg-finance-input border border-finance-inputBorder rounded-lg p-2.5 text-sm outline-none text-finance-text" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-finance-text mb-1">Fecha del evento</label>
                                    <input type="date" value={draft.event_date || ''} onChange={e => setDraft(d => ({ ...d, event_date: e.target.value }))} className="w-full bg-finance-input border border-finance-inputBorder rounded-lg p-2.5 text-sm outline-none text-finance-text" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={handleSave} className="bg-finance-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:brightness-95">
                                    Guardar cambios
                                </button>
                            </div>
                        </div>
                    )}

                    {tab === 'compartir' && (
                        <div className="mt-5 space-y-4">
                            <p className="text-sm font-bold text-finance-text">Colaboradores del plan</p>
                            {(plan.plan_members || []).length === 0 && (
                                <p className="text-xs text-finance-text/60">Sin colaboradores aún.</p>
                            )}
                            {(plan.plan_members || []).map(m => (
                                <div key={m.id} className="flex items-center justify-between p-3 bg-finance-input border border-finance-inputBorder rounded-xl">
                                    <div>
                                        <p className="text-xs font-semibold text-finance-text">{m.member_email}</p>
                                        <p className="text-[10px] text-finance-text/60">{m.role} • {m.status}</p>
                                    </div>
                                    {isOwner && (
                                        <button
                                            type="button"
                                            onClick={() => onRemoveCollaborator(m.id)}
                                            className="text-[11px] text-red-500 hover:text-red-700 font-semibold"
                                        >
                                            Quitar
                                        </button>
                                    )}
                                </div>
                            ))}
                            {isOwner && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-finance-text">Agregar colaborador por correo</p>
                                    <div className="relative">
                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                value={collabEmail}
                                                onChange={e => handleEmailChange(e.target.value)}
                                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                                onFocus={() => emailSuggestions.length > 0 && setShowSuggestions(true)}
                                                placeholder="correo@ejemplo.com"
                                                className="flex-1 bg-finance-input border border-finance-inputBorder rounded-lg p-2.5 text-sm outline-none text-finance-text placeholder:text-finance-text/40 focus:ring-2 focus:ring-finance-primary/40"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddCollab}
                                                disabled={collabLoading}
                                                className="bg-finance-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:brightness-95 disabled:opacity-50"
                                            >
                                                {collabLoading ? '...' : 'Agregar'}
                                            </button>
                                        </div>
                                        {showSuggestions && emailSuggestions.length > 0 && (
                                            <ul className="absolute z-20 left-0 right-[88px] mt-1 bg-finance-card border border-finance-inputBorder rounded-xl shadow-lg overflow-hidden">
                                                {emailSuggestions.map(s => (
                                                    <li
                                                        key={s}
                                                        onMouseDown={() => selectSuggestion(s)}
                                                        className="px-3 py-2 text-sm text-finance-text hover:bg-finance-primary hover:text-white cursor-pointer transition-colors"
                                                    >
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    {collabError && <p className="text-xs text-red-500 font-medium">{collabError}</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

const AddToPlanModal = ({ transaction, plans, currentUserId, onConfirm, onClose }) => {
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const eligiblePlans = plans.filter(p =>
        p.user_id === currentUserId ||
        (p.plan_members || []).some(m => m.member_id === currentUserId && m.status === 'accepted')
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm bg-finance-card rounded-2xl shadow-xl border border-finance-inputBorder overflow-hidden">
                <div className="p-5 border-b border-finance-inputBorder flex justify-between items-center">
                    <h3 className="text-base font-bold text-finance-text">Agregar a un Plan</h3>
                    <button onClick={onClose} className="text-sm font-semibold text-finance-text/70 hover:text-finance-text">Cerrar</button>
                </div>
                <div className="p-5 space-y-4">
                    <p className="text-xs text-finance-text/70">
                        Transacción: <span className="font-semibold text-finance-text">{transaction.description}</span> — ${parseFloat(transaction.amount).toFixed(2)}
                    </p>
                    {eligiblePlans.length === 0 ? (
                        <p className="text-xs text-finance-text/50">No tienes planes aún.</p>
                    ) : (
                        <select
                            value={selectedPlanId}
                            onChange={e => setSelectedPlanId(e.target.value)}
                            className="w-full bg-finance-input border border-finance-inputBorder rounded-lg p-2.5 text-sm text-finance-text outline-none focus:ring-2 focus:ring-finance-primary/40"
                        >
                            <option value="" disabled>Selecciona un plan</option>
                            {eligiblePlans.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.description} — ${parseFloat(p.amount).toFixed(2)}
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        type="button"
                        disabled={!selectedPlanId}
                        onClick={() => onConfirm(transaction, Number(selectedPlanId))}
                        className="w-full bg-finance-primary text-white font-semibold py-2.5 rounded-xl text-sm hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        Agregar al plan
                    </button>
                </div>
            </div>
        </div>
    );
};
