import React from 'react';
import { audioService } from '../services/audioService';
import { FeriaConfig, HistoricalFeria, Sale } from '../types';

interface Props {
  activeFeriaConfig: FeriaConfig | null;
  feriaHistory: HistoricalFeria[];
  onActivateFeria: (feria: { config: FeriaConfig, sales: Sale[] }) => Promise<boolean>;
  onShowReport: (feria: HistoricalFeria) => void;
  onDeleteFeria: (id: string) => void;
}

const FeriaHistoryList: React.FC<Props> = ({ feriaHistory, onActivateFeria, onShowReport, onDeleteFeria }) => {
  return (
      <div className="space-y-4">
          {feriaHistory.map(feria => (
              <div key={feria.id} className="glass p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all border border-transparent hover:border-primary/30 flex flex-col md:flex-row justify-between items-center gap-4 group">
                  <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-800 dark:text-white group-hover:text-primary transition-colors">{feria.config.nombreFeria}</h4>
                      <p className="text-sm text-gray-500 font-medium flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {new Date(feria.archivedAt).toLocaleDateString()}
                      </p>
                  </div>
                  <div className="text-right px-4 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                      <span className="block text-2xl font-black text-primary tracking-tight">${feria.reportSummary.montoTotalGeneral.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => onShowReport(feria)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 transition-colors">Ver</button>
                      <button onClick={() => onDeleteFeria(feria.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors">Borrar</button>
                      <button 
                        onClick={async () => { 
                            audioService.playClick(); 
                            if(window.confirm('Activar esta feria archivará la actual. Continuar?')) {
                                try {
                                    await onActivateFeria(feria);
                                } catch (e) {
                                    console.error(e);
                                }
                            }
                        }} 
                        className="px-4 py-2 bg-green-50 text-green-600 rounded-lg font-bold text-sm hover:bg-green-100 transition-colors"
                      >
                        Reactivar
                      </button>
                  </div>
              </div>
          ))}
          {feriaHistory.length === 0 && <p className="text-center text-gray-400 py-10 font-light italic">Sin historial disponible.</p>}
      </div>
  );
};

export default FeriaHistoryList;