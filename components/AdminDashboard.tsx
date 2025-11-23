import React, { useEffect, useState } from 'react';
import { getAllLeads, updateLeadLimit, Lead, supabase } from '../lib/supabase';
import { UserCircleIcon, LockIcon } from './icons';

export const AdminDashboard: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');

    useEffect(() => {
        console.log("AdminDashboard mounted RE-ADDED");
        // Simple client-side check for demo purposes
        const params = new URLSearchParams(window.location.search);
        if (params.get('admin_key') === '1234') {
            setIsAuthenticated(true);
            fetchLeads();
        }
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        const data = await getAllLeads();
        setLeads(data || []);
        setLoading(false);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'admin123') { // Simple hardcoded password for MVP
            setIsAuthenticated(true);
            fetchLeads();
        } else {
            alert('Senha incorreta');
        }
    };

    const handleUpdateLimit = async (id: string, currentLimit: number) => {
        const newLimit = prompt("Novo limite de consultas:", (currentLimit + 5).toString());
        if (newLimit && !isNaN(parseInt(newLimit))) {
            await updateLeadLimit(id, parseInt(newLimit));
            fetchLeads(); // Refresh
        }
    };

    const openWhatsApp = (phone: string, name: string) => {
        const message = encodeURIComponent(`Olá ${name}, vi que você está usando nosso Criador de Prompts IA! Como posso ajudar?`);
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    };

    if (!supabase) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white p-4">
                <div className="bg-red-900/50 p-6 rounded-lg border border-red-500 max-w-md text-center">
                    <h2 className="text-2xl font-bold mb-2">Supabase Não Configurado</h2>
                    <p>Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env para acessar o painel.</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-sm space-y-4">
                    <h2 className="text-2xl font-bold text-white text-center">Admin Login</h2>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white"
                        placeholder="Senha"
                    />
                    <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg">Entrar</button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <UserCircleIcon className="w-8 h-8 text-cyan-400" />
                        Gestão de Leads
                    </h1>
                    <button onClick={fetchLeads} className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600">Atualizar</button>
                </div>

                {loading ? (
                    <p>Carregando...</p>
                ) : (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-700">
                                        <th className="p-4">Nome</th>
                                        <th className="p-4">WhatsApp</th>
                                        <th className="p-4">Email</th>
                                        <th className="p-4 text-center">Uso / Limite</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map((lead) => (
                                        <tr key={lead.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                            <td className="p-4 font-medium">{lead.name}</td>
                                            <td className="p-4">{lead.whatsapp}</td>
                                            <td className="p-4 text-slate-400 text-sm">{lead.email}</td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${lead.usage_count >= lead.usage_limit ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {lead.usage_count} / {lead.usage_limit}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <button
                                                    onClick={() => openWhatsApp(lead.whatsapp, lead.name)}
                                                    className="p-2 bg-green-600/20 text-green-400 rounded hover:bg-green-600/40"
                                                    title="Enviar WhatsApp"
                                                >
                                                    💬
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateLimit(lead.id!, lead.usage_limit)}
                                                    className="p-2 bg-cyan-600/20 text-cyan-400 rounded hover:bg-cyan-600/40"
                                                    title="Alterar Limite"
                                                >
                                                    <LockIcon className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {leads.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500">Nenhum lead encontrado.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
