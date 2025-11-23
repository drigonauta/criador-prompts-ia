import React, { useState } from 'react';
import { UserData, saveUserData } from '../lib/userUtils';
import { CheckIcon, LockIcon } from './icons';

interface UserRegistrationModalProps {
    isOpen: boolean;
    onRegister: (data: { name: string, whatsapp: string, email: string }) => void;
    isLimitReached?: boolean;
}

export const UserRegistrationModal: React.FC<UserRegistrationModalProps> = ({ isOpen, onRegister, isLimitReached }) => {
    const [name, setName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !whatsapp.trim() || !email.trim()) {
            setError('Por favor, preencha todos os campos.');
            return;
        }
        // saveUserData({ name, whatsapp, email }); // Moved to parent
        onRegister({ name, whatsapp, email });
    };

    const handleContactSupport = () => {
        const message = encodeURIComponent("vim pelo app do prompt ia, quero mais acesso");
        window.open(`https://wa.me/5534984278200?text=${message}`, '_blank');
    };

    if (isLimitReached) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl text-center space-y-6">
                    <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto">
                        <LockIcon className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Limite Gratuito Atingido</h2>
                        <p className="text-slate-400">Você já usou sua geração gratuita para esta ferramenta. Para continuar criando prompts incríveis e desbloquear acesso ilimitado, entre em contato!</p>
                    </div>
                    <button
                        onClick={handleContactSupport}
                        className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="text-xl">💬</span> Falar no WhatsApp
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Libere seu Acesso Grátis 🚀</h2>
                    <p className="text-slate-400 text-sm">Preencha seus dados para começar a usar o Criador de Prompts IA agora mesmo.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Nome Completo</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                            placeholder="Seu nome aqui"
                        />
                    </div>
                    <div>
                        <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-300 mb-1">WhatsApp</label>
                        <input
                            type="tel"
                            id="whatsapp"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">E-mail</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                            placeholder="seu@email.com"
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
                    >
                        <CheckIcon className="w-5 h-5" /> Liberar Acesso
                    </button>
                </form>
            </div>
        </div>
    );
};
