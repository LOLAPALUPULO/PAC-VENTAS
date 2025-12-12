import React, { useState, useEffect, useRef } from 'react';
import { FeriaConfig, Sale, TipoPago, TipoUnidad } from '../types';
import { DIGITAL_PAYMENT_SOUND_BASE64, CASH_PAYMENT_SOUND_BASE64, PINTA_ADD_SOUND_BASE64, PINTA_SUB_SOUND_BASE64, LITRO_ADD_SOUND_BASE64, LITRO_SUB_SOUND_BASE64, UI_CLICK_SOUND_BASE64 } from '../constants';
import { localStorageService } from '../services/localStorageService';
import { ADMIN_USER_EMAIL } from '../constants';

interface SalesTPVProps {
    activeFeriaConfig: FeriaConfig | null;
    onAddSale: (sale: Sale) => void;
    onLogout: () => void;
}

export const SalesTPV: React.FC<SalesTPVProps> = ({ activeFeriaConfig, onAddSale, onLogout }) => {
    const [pintaCount, setPintaCount] = useState(0);
    const [litroCount, setLitroCount] = useState(0);
    const [activeButton, setActiveButton] = useState<string | null>(null); 
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingOrders, setPendingOrders] = useState<Sale[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);

    const digitalSoundRef = useRef(new Audio(DIGITAL_PAYMENT_SOUND_BASE64));
    const billeteSoundRef = useRef(new Audio(CASH_PAYMENT_SOUND_BASE64));
    const pintaAddSoundRef = useRef(new Audio(PINTA_ADD_SOUND_BASE64));
    const pintaSubSoundRef = useRef(new Audio(PINTA_SUB_SOUND_BASE64));
    const litroAddSoundRef = useRef(new Audio(LITRO_ADD_SOUND_BASE64));
    const litroSubSoundRef = useRef(new Audio(LITRO_SUB_SOUND_BASE64));
    const uiClickSoundRef = useRef(new Audio(UI_CLICK_SOUND_BASE64));

    useEffect(() => {
      const storedPending = localStorageService.getPendingOrders();
      if (storedPending.length > 0) setPendingOrders(storedPending);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
    }, []);

    const total = Math.round((pintaCount * (activeFeriaConfig?.pintaPrice || 0)) + (litroCount * (activeFeriaConfig?.litroPrice || 0)));

    const handleIncrement = (type: TipoUnidad) => {
        if (type === 'PINTA') {
            setPintaCount(p => p + 1);
            pintaAddSoundRef.current.currentTime = 0;
            pintaAddSoundRef.current.play().catch(() => {});
        } else {
            setLitroCount(l => l + 1);
            litroAddSoundRef.current.currentTime = 0;
            litroAddSoundRef.current.play().catch(() => {});
        }
    };

    const handleDecrement = (type: TipoUnidad) => {
        if (type === 'PINTA' && pintaCount > 0) {
            setPintaCount(p => p - 1);
            pintaSubSoundRef.current.currentTime = 0;
            pintaSubSoundRef.current.play().catch(() => {});
        } else if (type === 'LITRO' && litroCount > 0) {
            setLitroCount(l => l - 1);
            litroSubSoundRef.current.currentTime = 0;
            litroSubSoundRef.current.play().catch(() => {});
        }
    };

    const handlePayment = (method: TipoPago) => {
        if (total === 0) return;
        
        if (method === 'DIGITAL') {
             digitalSoundRef.current.currentTime = 0;
             digitalSoundRef.current.play().catch(() => {});
        } else {
             billeteSoundRef.current.currentTime = 0;
             billeteSoundRef.current.play().catch(() => {});
        }

        const newSale: Sale = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            items: { pinta: pintaCount, litro: litroCount },
            total: total,
            paymentMethod: method
        };

        setActiveButton(method);
        setShowSuccess(true);
        onAddSale(newSale); 

        setTimeout(() => {
            setPintaCount(0);
            setLitroCount(0);
            setActiveButton(null);
            setShowSuccess(false);
        }, 1500);
    };

    if (!activeFeriaConfig) return <div className="flex items-center justify-center h-screen text-gray-500">No hay feria activa</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    {/* LOLA ICON - Animated */}
                    <div className="text-pink-500 transform hover:scale-110 transition-transform duration-300 cursor-pointer">
                         <svg className="w-10 h-10 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                         </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">LOLA <span className="text-primary text-sm font-normal">Ventas</span></h1>
                        <div className={`text-xs font-bold flex items-center gap-1 ${isOnline ? 'text-green-500' : 'text-amber-500'}`}>
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </div>
                    </div>
                </div>
                <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
            </div>

            {/* Content */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 h-full">
                     {/* Pinta Card */}
                     <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col justify-between">
                        <div className="text-center z-10">
                            <h2 className="text-lg font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pinta</h2>
                            <div className="text-4xl font-black text-gray-800 dark:text-white mt-2">${Math.round(activeFeriaConfig.pintaPrice)}</div>
                        </div>
                        <div className="flex flex-col items-center gap-4 z-10 flex-1 justify-center py-4">
                            <div className="text-6xl font-bold text-primary">{pintaCount}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 z-10">
                             <button onClick={() => handleDecrement('PINTA')} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 rounded-xl p-4 font-bold text-xl transition active:scale-95">-</button>
                             <button onClick={() => handleIncrement('PINTA')} className="bg-primary/10 hover:bg-primary/20 text-primary rounded-xl p-4 font-bold text-xl transition active:scale-95 border-2 border-primary/20">+</button>
                        </div>
                     </div>

                     {/* Litro Card */}
                     <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col justify-between">
                        <div className="text-center z-10">
                            <h2 className="text-lg font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Litro</h2>
                            <div className="text-4xl font-black text-gray-800 dark:text-white mt-2">${Math.round(activeFeriaConfig.litroPrice)}</div>
                        </div>
                        <div className="flex flex-col items-center gap-4 z-10 flex-1 justify-center py-4">
                            <div className="text-6xl font-bold text-secondary">{litroCount}</div>
                        </div>
                         <div className="grid grid-cols-2 gap-3 z-10">
                             <button onClick={() => handleDecrement('LITRO')} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 rounded-xl p-4 font-bold text-xl transition active:scale-95">-</button>
                             <button onClick={() => handleIncrement('LITRO')} className="bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl p-4 font-bold text-xl transition active:scale-95 border-2 border-secondary/20">+</button>
                        </div>
                     </div>
                </div>
            </div>

            {/* Footer Total & Actions */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-end mb-4">
                    <span className="text-gray-500 font-bold uppercase text-sm">Total a cobrar</span>
                    <span className="text-5xl font-black text-gray-900 dark:text-white">${total.toLocaleString()}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => handlePayment('EFECTIVO')}
                        disabled={total === 0}
                        className={`
                            py-4 rounded-xl font-bold text-lg flex flex-col items-center justify-center gap-1 transition-all duration-200
                            ${activeButton === 'EFECTIVO' ? 'bg-green-500 text-white scale-95' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'}
                            ${total === 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'active:scale-95'}
                        `}
                    >
                        <span>EFECTIVO</span>
                    </button>
                    <button 
                         onClick={() => handlePayment('DIGITAL')}
                         disabled={total === 0}
                         className={`
                            py-4 rounded-xl font-bold text-lg flex flex-col items-center justify-center gap-1 transition-all duration-200
                            ${activeButton === 'DIGITAL' ? 'bg-blue-500 text-white scale-95' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'}
                            ${total === 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'active:scale-95'}
                         `}
                    >
                         <span>DIGITAL</span>
                    </button>
                </div>
            </div>

            {/* Success Overlay */}
            {showSuccess && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center animate-bounce-in">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">¡Venta Guardada!</h3>
                    </div>
                </div>
            )}
        </div>
    );
};