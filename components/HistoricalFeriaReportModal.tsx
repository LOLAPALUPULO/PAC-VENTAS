import React, { useMemo } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { audioService } from '../services/audioService';
import { calculateReportSummary } from '../services/apiService';
import { HistoricalFeria, TipoPago, TipoUnidad } from '../types';

interface Props {
  feria: HistoricalFeria;
  onClose: () => void;
}

const HistoricalFeriaReportModal: React.FC<Props> = ({ feria, onClose }) => {
    const report = calculateReportSummary(feria.config, feria.sales);

    const dailyStats = useMemo(() => {
        const stats: any = {};
        feria.sales.forEach(sale => {
            const dateObj = new Date(sale.fechaVenta);
            const dateKey = dateObj.toLocaleDateString();
            
            if (!stats[dateKey]) {
                stats[dateKey] = {
                    date: dateKey,
                    timestamp: dateObj.setHours(0,0,0,0),
                    totalMoney: 0,
                    totalDigital: 0,
                    totalBillete: 0,
                    totalPintas: 0,
                    totalLitros: 0
                };
            }
            
            stats[dateKey].totalMoney += sale.montoTotal;
            if (sale.tipoPago === TipoPago.Digital) {
                stats[dateKey].totalDigital += sale.montoTotal;
            } else {
                stats[dateKey].totalBillete += sale.montoTotal;
            }
            
            if (sale.tipoUnidad === TipoUnidad.Pinta) {
                stats[dateKey].totalPintas += sale.cantidadUnidades;
            } else if (sale.tipoUnidad === TipoUnidad.Litro) {
                stats[dateKey].totalLitros += sale.cantidadUnidades;
            } else if (sale.tipoUnidad === TipoUnidad.Mixed) {
                stats[dateKey].totalPintas += sale.cantidadUnidades / 2;
                stats[dateKey].totalLitros += sale.cantidadUnidades / 2;
            }
        });
        return Object.values(stats).sort((a: any, b: any) => a.timestamp - b.timestamp);
    }, [feria.sales]);

    const handleDownloadPdf = () => {
        audioService.playClick();
        const doc = new jsPDF();
        doc.setFontSize(22); doc.setTextColor('#10B981'); doc.text(`${feria.config.nombreFeria}`, 14, 20);
        doc.setFontSize(14); doc.setTextColor('#000'); doc.text(`Total: $${report.montoTotalGeneral.toLocaleString()}`, 14, 40);
        doc.setFontSize(10); 
        doc.text(`Digital: $${report.montoTotalDigital.toLocaleString()} | Billete: $${report.montoTotalBillete.toLocaleString()}`, 14, 48);
        doc.text(`Volumen: ${report.totalPintas} P / ${report.totalLitros} L`, 14, 56);
        
        // Add Stock Summary to PDF
        let startY = 65;
        doc.setFontSize(12); doc.setTextColor('#000'); doc.text('Resumen de Stock:', 14, startY);
        const stockRows = report.stockSummary.map(s => [s.style, `${s.sold.toFixed(1)}L`, `${s.remaining.toFixed(1)}L`, `${s.percentage}%`]);
        (doc as any).autoTable({
            startY: startY + 5,
            head: [['Estilo', 'Vendido', 'Restante', '%']],
            body: stockRows,
            theme: 'plain',
            styles: { fontSize: 8 }
        });
        
        startY = (doc as any).lastAutoTable.finalY + 10;

        const rows = dailyStats.map((d: any) => [d.date, `$${d.totalMoney.toLocaleString()}`, `$${d.totalDigital.toLocaleString()}`, `$${d.totalBillete.toLocaleString()}`, Math.round(d.totalPintas), Math.round(d.totalLitros)]);
        
        (doc as any).autoTable({ 
            startY: startY, 
            head: [['Fecha', 'Total', '$ Dig', '$ Efe', 'P', 'L']], 
            body: rows, 
            theme: 'striped', 
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 8 }
        });
        doc.save(`Reporte_${feria.config.nombreFeria}.pdf`);
    };

    const handleShare = () => {
         audioService.playClick();
         const msg = `*HISTORICO: ${feria.config.nombreFeria}*\nTotal: $${report.montoTotalGeneral.toLocaleString()}\n(D: $${report.montoTotalDigital.toLocaleString()} / B: $${report.montoTotalBillete.toLocaleString()})`;
         window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-surfaceDark w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-pop-in">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white truncate">{feria.config.nombreFeria}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-4xl leading-none transition-colors">&times;</button>
                </div>
                <div className="p-8 overflow-y-auto flex-grow bg-lightbg dark:bg-darkbg">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm text-center border-b-4 border-primary">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">TOTAL</div>
                            <div className="text-3xl font-black text-primary">${report.montoTotalGeneral.toLocaleString()}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm text-center border-b-4 border-gray-400">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">VOLUMEN</div>
                            <div className="text-xl font-bold text-gray-700 dark:text-gray-300">{report.totalPintas}P / {report.totalLitros}L</div>
                        </div>
                    </div>
                    
                    {/* Stock Summary Mini Table */}
                    <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Resumen de Stock</h4>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                             {report.stockSummary.map(s => (
                                 <div key={s.style} className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                     <div className="text-[10px] font-bold text-gray-400">{s.style}</div>
                                     <div className={`text-sm font-black ${s.percentage < 20 ? 'text-red-500' : 'text-primary'}`}>{s.percentage}%</div>
                                 </div>
                             ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                         <div className="overflow-x-auto">
                             <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                 <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                     <tr>
                                         <th className="px-6 py-3">Fecha</th>
                                         <th className="px-6 py-3 text-center">Cant.</th>
                                         <th className="px-6 py-3 text-right">Total</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {dailyStats.map((day: any, i: number) => (
                                         <tr key={i} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                             <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                 {day.date}
                                                 <div className="text-[10px] text-gray-400 uppercase font-bold mt-1">
                                                    <span className="text-blue-500">D: ${day.totalDigital.toLocaleString()}</span> • <span className="text-green-500">E: ${day.totalBillete.toLocaleString()}</span>
                                                 </div>
                                             </td>
                                             <td className="px-6 py-4 text-center">
                                                 <div className="font-bold text-gray-700 dark:text-gray-300">
                                                     {Math.round(day.totalPintas)} P / {Math.round(day.totalLitros)} L
                                                 </div>
                                             </td>
                                             <td className="px-6 py-4 text-right font-black text-gray-900 dark:text-white">
                                                 ${day.totalMoney.toLocaleString()}
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                    </div>
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-4">
                    <button onClick={handleShare} className="btn-3d flex-1 py-4 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-3d-primary active:shadow-3d-primary-active">WhatsApp</button>
                    <button onClick={handleDownloadPdf} className="btn-3d flex-1 py-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 shadow-3d-blue active:shadow-3d-blue-active">PDF</button>
                </div>
            </div>
        </div>
    );
};

export default HistoricalFeriaReportModal;