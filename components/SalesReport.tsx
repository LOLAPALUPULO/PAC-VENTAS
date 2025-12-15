import React from 'react';
import { audioService } from '../services/audioService';
import { apiService, calculateReportSummary } from '../services/apiService';
import { FeriaConfig, Sale } from '../types';

interface Props {
    activeFeriaConfig: FeriaConfig | null;
    activeSales: Sale[];
    onFinalizeFeria: () => void;
}

const SalesReport: React.FC<Props> = ({ activeFeriaConfig, activeSales, onFinalizeFeria }) => {
    if (!activeFeriaConfig) return <div className="text-center p-10 text-gray-500 text-xl font-light">No hay feria activa.</div>;
    const report = calculateReportSummary(activeFeriaConfig, activeSales);
    
    const handleShare = () => {
         audioService.playClick();
         const message = `*REPORTE: ${activeFeriaConfig.nombreFeria}*\n` +
                         `💰 *Total: $${report.montoTotalGeneral.toLocaleString()}*\n` +
                         `🍺 Volumen: ${report.totalPintas} P / ${report.totalLitros} L\n` +
                         `----------------\n` +
                         `💳 Digital: $${report.montoTotalDigital.toLocaleString()}\n` +
                         `💵 Efectivo: $${report.montoTotalBillete.toLocaleString()}`;
         window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="glass shadow-xl rounded-2xl p-8 border border-white/20 space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h3 className="text-3xl font-bold text-primary mb-2">{activeFeriaConfig.nombreFeria}</h3>
                <div className="flex justify-between items-end">
                    <p className="text-gray-500 font-medium">Resumen en tiempo real</p>
                    <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 font-bold tracking-widest uppercase">{report.totalPintas} PINTAS • {report.totalLitros} LITROS</p>
                    </div>
                </div>
            </div>
            
            {/* Money Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/30 dark:to-gray-800 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-xs tracking-wider">Recaudación Total</span>
                    <div className="text-4xl font-black text-gray-800 dark:text-white mt-2 tracking-tight">${report.montoTotalGeneral.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/30 dark:to-gray-800 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                     <span className="text-blue-600 dark:text-blue-400 font-bold uppercase text-xs tracking-wider">Ventas Digitales</span>
                     <div className="text-3xl font-bold text-gray-800 dark:text-white mt-2 tracking-tight">${report.montoTotalDigital.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/30 dark:to-gray-800 p-6 rounded-2xl border border-amber-100 dark:border-amber-800 shadow-sm hover:shadow-md transition-shadow">
                     <span className="text-amber-600 dark:text-amber-400 font-bold uppercase text-xs tracking-wider">Ventas Efectivo</span>
                     <div className="text-3xl font-bold text-gray-800 dark:text-white mt-2 tracking-tight">${report.montoTotalBillete.toLocaleString()}</div>
                </div>
            </div>

            {/* Stock Progress Bars */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 bg-secondary rounded-full"></span> Control de Stock
                </h4>
                <div className="space-y-4">
                    {report.stockSummary.map((stock) => (
                        <div key={stock.style} className="relative">
                            <div className="flex justify-between text-xs font-bold uppercase mb-1">
                                <span className="text-gray-600 dark:text-gray-400">{stock.style}</span>
                                <span className={stock.percentage < 20 ? 'text-red-500' : 'text-gray-500'}>
                                    {stock.percentage}% ({stock.remaining}L / {stock.initial}L)
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        stock.percentage < 20 ? 'bg-red-500 animate-pulse' : 
                                        stock.percentage < 50 ? 'bg-yellow-500' : 'bg-primary'
                                    }`} 
                                    style={{ width: `${Math.min(100, Math.max(0, stock.percentage))}%` }}
                                ></div>
                            </div>
                            {stock.wastage > 0 && <div className="text-[10px] text-gray-400 text-right mt-0.5">Desperdicio est: {stock.wastage.toFixed(1)}L</div>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <button onClick={handleShare} className="flex-1 btn-3d bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/30 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                    WhatsApp
                </button>
                <button onClick={() => { audioService.playClick(); onFinalizeFeria(); }} className="flex-1 btn-3d bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-4 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors">Cerrar Feria</button>
            </div>
        </div>
    );
};

export default SalesReport;