import React from 'react';
import { audioService } from '../services/audioService';
import { FeriaConfig, FeriaHistory } from '../types';

interface FeriaHistoryListProps {
  activeFeriaConfig: FeriaConfig | null;
  feriaHistory: FeriaHistory[];
  onActivateFeria: (feria: FeriaHistory) => Promise<boolean>;
  onShowReport: (feria: FeriaHistory) => void;
  onDeleteFeria: (feriaId: string) => Promise<boolean>;
}

export const FeriaHistoryList: React.FC<FeriaHistoryListProps> = ({
  activeFeriaConfig,
  feriaHistory,
  onActivateFeria,
  onShowReport,
  onDeleteFeria,
}) => {
  return (
    <div className="glass shadow-xl rounded-2xl p-8 border border-white/20 space-y-6">
      <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
        <span className="w-2 h-8 bg-primary rounded-full"></span>Historial de Ferias
      </h3>
      {feriaHistory.length === 0 ? (
        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="font-semibold text-base">No hay ferias archivadas todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feriaHistory.map((feria) => (
            <div key={feria.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <h4 className="text-xl font-bold text-primary mb-2">{feria.config.nombreFeria}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Inicio: {new Date(feria.config.fechaInicio).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Fin: {new Date(feria.config.fechaFin).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-bold">
                Total: ${feria.reportSummary.montoTotalGeneral.toLocaleString()}
              </p>
              {activeFeriaConfig && activeFeriaConfig.nombreFeria === feria.config.nombreFeria && (
                <p className="text-sm text-blue-500 font-bold mt-2">Feria activa actualmente.</p>
              )}
              <div className="mt-4 flex flex-col space-y-2">
                <button
                  onClick={() => onShowReport(feria)}
                  className="w-full py-2 px-4 bg-primary text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors"
                >
                  Ver Reporte
                </button>
                <button
                  onClick={() => {
                    audioService.playClick();
                    onActivateFeria(feria);
                  }}
                  disabled={activeFeriaConfig && activeFeriaConfig.nombreFeria === feria.config.nombreFeria}
                  className={`w-full py-2 px-4 rounded-lg font-bold transition-colors ${
                    activeFeriaConfig && activeFeriaConfig.nombreFeria === feria.config.nombreFeria
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-secondary text-white hover:bg-amber-600'
                  }`}
                >
                  Activar
                </button>
                <button
                  onClick={() => {
                    audioService.playClick();
                    onDeleteFeria(feria.id!);
                  }}
                  className="w-full py-2 px-4 bg-accent text-white rounded-lg font-bold hover:bg-red-600 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};