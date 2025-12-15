import React, { useState } from 'react';
import { audioService } from '../services/audioService';
import { FeriaConfig, HistoricalFeria, Sale } from '../types';
import FeriaConfigForm from './FeriaConfigForm';
import SalesReport from './SalesReport';
import FeriaHistoryList from './FeriaHistoryList';
import HistoricalFeriaReportModal from './HistoricalFeriaReportModal';

interface Props {
  activeFeriaConfig: FeriaConfig | null;
  activeSales: Sale[];
  feriaHistory: HistoricalFeria[];
  onUpdateFeriaConfig: (config: FeriaConfig) => Promise<boolean>;
  onFinalizeFeria: () => void;
  onActivateHistoricalFeria: (feria: { config: FeriaConfig, sales: Sale[] }) => Promise<boolean>;
  onDeleteHistoricalFeria: (id: string) => void;
  onLogout: () => void;
}

const AdminDashboard: React.FC<Props> = ({ 
    activeFeriaConfig, activeSales, feriaHistory, 
    onUpdateFeriaConfig, onFinalizeFeria, onActivateHistoricalFeria, 
    onDeleteHistoricalFeria, onLogout 
}) => {
    const [view, setView] = useState<'config' | 'report' | 'history'>(activeFeriaConfig ? 'report' : 'config');
    const [showHistoricalReportModal, setShowHistoricalReportModal] = useState(false);
    const [selectedHistoricalFeria, setSelectedHistoricalFeria] = useState<HistoricalFeria | null>(null);

    const setViewWithSound = (v: 'config' | 'report' | 'history') => { 
        audioService.playClick(); 
        setView(v); 
    };

    return (
      <div className="min-h-screen bg-lightbg dark:bg-darkbg text-textdark dark:text-textlight">
        <nav className="glass sticky top-0 z-30 shadow-sm border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <span className="text-2xl font-bold text-primary tracking-tight">ADMIN<span className="text-gray-500 text-lg font-normal">PANEL</span></span>
                    <div className="hidden md:flex space-x-2">
                         <button onClick={() => setViewWithSound('config')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'config' ? 'bg-primary text-white shadow-lg shadow-emerald-500/30' : 'text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Configurar</button>
                         <button onClick={() => setViewWithSound('report')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'report' ? 'bg-primary text-white shadow-lg shadow-emerald-500/30' : 'text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Reporte Activo</button>
                         <button onClick={() => setViewWithSound('history')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'history' ? 'bg-primary text-white shadow-lg shadow-emerald-500/30' : 'text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Historial</button>
                    </div>
                    <button onClick={() => { audioService.playClick(); onLogout(); }} className="text-accent hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-sm border-2 border-accent rounded-lg px-4 py-1.5 transition-colors">SALIR</button>
                </div>
            </div>
            <div className="md:hidden flex border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => setViewWithSound('config')} className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wide transition-colors ${view === 'config' ? 'text-primary border-b-2 border-primary bg-gray-50 dark:bg-gray-800' : 'text-gray-500'}`}>Config</button>
                <button onClick={() => setViewWithSound('report')} className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wide transition-colors ${view === 'report' ? 'text-primary border-b-2 border-primary bg-gray-50 dark:bg-gray-800' : 'text-gray-500'}`}>Reporte</button>
                <button onClick={() => setViewWithSound('history')} className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wide transition-colors ${view === 'history' ? 'text-primary border-b-2 border-primary bg-gray-50 dark:bg-gray-800' : 'text-gray-500'}`}>Historial</button>
            </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-slide-up">
              {view === 'config' && <FeriaConfigForm activeFeriaConfig={activeFeriaConfig} onSave={onUpdateFeriaConfig} onFinalizeFeria={onFinalizeFeria} />}
              {view === 'report' && <SalesReport activeFeriaConfig={activeFeriaConfig} activeSales={activeSales} onFinalizeFeria={onFinalizeFeria} />}
              {view === 'history' && <FeriaHistoryList activeFeriaConfig={activeFeriaConfig} feriaHistory={feriaHistory} onActivateFeria={onActivateHistoricalFeria} onShowReport={(f) => { audioService.playClick(); setSelectedHistoricalFeria(f); setShowHistoricalReportModal(true); }} onDeleteFeria={(id) => { audioService.playClick(); if(window.confirm('Eliminar?')) onDeleteHistoricalFeria(id); }} />}
          </div>
        </main>
        
        {showHistoricalReportModal && selectedHistoricalFeria && <HistoricalFeriaReportModal feria={selectedHistoricalFeria} onClose={() => { audioService.playClick(); setShowHistoricalReportModal(false); }} />}
      </div>
    );
};

export default AdminDashboard;