import React from 'react';
import { audioService } from '../services/audioService';
import { FeriaHistory } from '../types';
import { calculateReportSummary } from '../services/apiService';
import { BEER_STYLES } from '../constants';

// Declare jspdf and its autotable plugin from global scope
declare const jspdf: { jsPDF: any };

interface HistoricalFeriaReportModalProps {
  feria: FeriaHistory;
  onClose: () => void;
}

export const HistoricalFeriaReportModal: React.FC<HistoricalFeriaReportModalProps> = ({ feria, onClose }) => {
  const report = calculateReportSummary(feria.config, feria.sales);
  // Ensure jsPDF is accessed safely, potentially providing a fallback if needed
  const { jsPDF } = typeof jspdf !== 'undefined' ? jspdf : { jsPDF: null };

  const generatePdfReport = () => {
    if (!jsPDF) {
      console.error('jsPDF library not loaded.');
      audioService.playError();
      alert('Error: La librería de PDF no está cargada. Por favor, recarga la página.');
      return;
    }

    audioService.playClick();
    const doc = new jsPDF();
    const startX = 14;
    let currentY = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor('#10B981'); // Primary color
    doc.text(`Reporte de Feria: ${feria.config.nombreFeria}`, startX, currentY);
    currentY += 10;
    doc.setFontSize(12);
    doc.setTextColor('#333'); // Dark text
    doc.text(
      `Archivada el: ${new Date(feria.archivedAt).toLocaleDateString()} ${new Date(feria.archivedAt).toLocaleTimeString()}`,
      startX,
      currentY,
    );
    currentY += 7;
    doc.text(
      `Inicio: ${new Date(feria.config.fechaInicio).toLocaleDateString()} - Fin: ${new Date(feria.config.fechaFin).toLocaleDateString()}`,
      startX,
      currentY,
    );
    currentY += 15;

    // Summary
    doc.setFontSize(18);
    doc.setTextColor('#1F2937'); // Dark background text
    doc.text('Resumen Financiero', startX, currentY);
    currentY += 8;
    doc.setFontSize(12);
    doc.setTextColor('#4B5563'); // Gray text
    doc.text(`Recaudación Total: $${report.montoTotalGeneral.toLocaleString()}`, startX, currentY);
    currentY += 7;
    doc.text(`Ventas Digitales: $${report.montoTotalDigital.toLocaleString()}`, startX, currentY);
    currentY += 7;
    doc.text(`Ventas Efectivo: $${report.montoTotalBillete.toLocaleString()}`, startX, currentY);
    currentY += 7;
    doc.text(`Total Pintas: ${report.totalPintas} P`, startX, currentY);
    currentY += 7;
    doc.text(`Total Litros: ${report.totalLitros} L`, startX, currentY);
    currentY += 15;

    // Stock
    doc.setFontSize(18);
    doc.setTextColor('#1F2937');
    doc.text('Resumen de Stock (Litros)', startX, currentY);
    currentY += 8;

    const stockData = BEER_STYLES.map((style) => {
      const initial = feria.config.stock ? feria.config.stock[style] || 0 : 0;
      const consumed = report.consumptionByStyle ? report.consumptionByStyle[style] || 0 : 0;
      const remaining = Math.max(0, initial - consumed);
      return [style, `${initial} L`, `${consumed.toFixed(1)} L`, `${remaining.toFixed(1)} L`];
    });

    (doc as any).autoTable({
      startY: currentY,
      head: [['Estilo', 'Stock Inicial', 'Consumido', 'Restante']],
      body: stockData,
      styles: { fontSize: 10, cellPadding: 2, textColor: '#4B5563' }, // Gray text for body
      headStyles: { fillColor: '#10B981', textColor: 255, fontStyle: 'bold' }, // Primary color
      margin: { left: startX, right: startX },
      didDrawPage: function (data: any) {
        currentY = data.cursor.y; // Update currentY after table
      },
    });
    currentY = (doc as any).autoTable.previous.finalY + 15; // Update currentY after table

    // Sales list (optional, can be very long)
    if (feria.sales && feria.sales.length > 0) {
      // Check if enough space for new section, otherwise add new page
      if (currentY + 30 > doc.internal.pageSize.height - 20) {
        doc.addPage();
        currentY = startX;
      }
      doc.setFontSize(18);
      doc.setTextColor('#1F2937');
      doc.text('Detalle de Ventas', startX, currentY);
      currentY += 8;

      const salesDetail = feria.sales.map((sale) => {
        const itemsSummary = sale.items
          ? sale.items.map((item) => `${item.quantity} ${item.unit} ${item.style}`).join(', ')
          : `${sale.cantidadUnidades} ${sale.tipoUnidad}`; // Fallback for old data
        return [
          new Date(sale.fechaVenta).toLocaleString(),
          itemsSummary,
          `$${sale.montoTotal.toLocaleString()}`,
          sale.tipoPago,
          sale.usuarioVenta,
        ];
      });

      (doc as any).autoTable({
        startY: currentY,
        head: [['Fecha', 'Ítems', 'Monto', 'Pago', 'Usuario']],
        body: salesDetail,
        styles: { fontSize: 8, cellPadding: 1, textColor: '#4B5563' },
        headStyles: { fillColor: '#F59E0B', textColor: 255, fontStyle: 'bold' }, // Secondary color
        margin: { left: startX, right: startX },
      });
    }

    doc.save(`reporte-${feria.config.nombreFeria}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4 overflow-y-auto">
      <div className="glass w-full max-w-3xl rounded-2xl p-6 md:p-8 border border-white/20 shadow-2xl animate-pop-in relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-accent transition-colors text-3xl font-bold">
          &times;
        </button>

        <h3 className="text-3xl font-bold text-primary mb-4 flex items-center gap-2">
          <span className="w-2 h-8 bg-primary rounded-full"></span>Reporte Histórico: {feria.config.nombreFeria}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Archivada el: {new Date(feria.archivedAt).toLocaleDateString()} {new Date(feria.archivedAt).toLocaleTimeString()}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/30 dark:to-gray-800 p-5 rounded-xl border border-emerald-100 dark:border-emerald-800">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-xs tracking-wider">
              Total Recaudado
            </span>
            <div className="text-3xl font-black text-gray-800 dark:text-white mt-1">
              ${report.montoTotalGeneral.toLocaleString()}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/30 dark:to-gray-800 p-5 rounded-xl border border-blue-100 dark:border-blue-800">
            <span className="text-blue-600 dark:text-blue-400 font-bold uppercase text-xs tracking-wider">
              Ventas Digitales
            </span>
            <div className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
              ${report.montoTotalDigital.toLocaleString()}
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/30 dark:to-gray-800 p-5 rounded-xl border border-amber-100 dark:border-amber-800">
            <span className="text-amber-600 dark:text-amber-400 font-bold uppercase text-xs tracking-wider">
              Ventas Efectivo
            </span>
            <div className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
              ${report.montoTotalBillete.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 mb-6">
          <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            STOCK DE CERVEZAS (LITROS)
          </h4>
          <div className="space-y-4">
            {BEER_STYLES.map((style) => {
              const initialStock = feria.config.stock ? feria.config.stock[style] || 0 : 0;
              const consumed = report.consumptionByStyle ? report.consumptionByStyle[style] || 0 : 0;
              const remaining = Math.max(0, initialStock - consumed);
              const percent = initialStock > 0 ? (remaining / initialStock) * 100 : 0;

              return (
                <div key={style}>
                  <div className="flex justify-between text-sm mb-1 font-bold">
                    <span className="text-gray-700 dark:text-gray-300">{style}</span>
                    <span className="text-gray-500">
                      {remaining.toFixed(1)}L / {initialStock}L{' '}
                      <span className="text-xs ml-1 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{Math.round(percent)}%</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                        percent < 20 ? 'bg-red-500' : percent < 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            onClick={generatePdfReport}
            className="flex-1 btn-3d bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm4 11H7v-2h10v2zm0-4H7v-2h10v2z" />
            </svg>
            Descargar Reporte (PDF)
          </button>
          <button
            onClick={onClose}
            className="flex-1 btn-3d bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-4 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};