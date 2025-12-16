import React from 'react';
import { audioService } from '../services/audioService';
import { FeriaConfig, StockConfig } from '../types';
import { BEER_STYLES } from '../constants';

interface FeriaConfigFormProps {
  activeFeriaConfig: FeriaConfig | null;
  onSave: (config: FeriaConfig) => Promise<boolean>;
  onFinalizeFeria: () => Promise<boolean>;
}

export const FeriaConfigForm: React.FC<FeriaConfigFormProps> = ({ activeFeriaConfig, onSave, onFinalizeFeria }) => {
  const [formData, setFormData] = React.useState<FeriaConfig>({
    nombreFeria: '',
    fechaInicio: '',
    fechaFin: '',
    valorPinta: 0,
    valorLitro: 0,
    wastePerPint: 0,
    stock: BEER_STYLES.reduce((acc, style) => ({ ...acc, [style]: 0 }), {} as StockConfig),
  });
  const [feedback, setFeedback] = React.useState<{ msg: string | null; isError: boolean }>({ msg: null, isError: false });

  React.useEffect(() => {
    if (activeFeriaConfig) {
      // Merge defaults for new fields if they don't exist in saved data
      const stock = activeFeriaConfig.stock || BEER_STYLES.reduce((acc, style) => ({ ...acc, [style]: 0 }), {} as StockConfig);
      setFormData({
        ...activeFeriaConfig,
        wastePerPint: activeFeriaConfig.wastePerPint || 0,
        stock: stock,
      });
    } else {
      // Reset form data if no active fair, preparing for a new one
      setFormData({
        nombreFeria: '',
        fechaInicio: '',
        fechaFin: '',
        valorPinta: 0,
        valorLitro: 0,
        wastePerPint: 0,
        stock: BEER_STYLES.reduce((acc, style) => ({ ...acc, [style]: 0 }), {} as StockConfig),
      });
    }
  }, [activeFeriaConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    audioService.playClick();
    try {
      await onSave(formData);
      setFeedback({ msg: 'Guardado correctamente.', isError: false });
    } catch (e) {
      setFeedback({ msg: 'Error al guardar.', isError: true });
    }
    setTimeout(() => setFeedback({ msg: null, isError: false }), 3000);
  };

  const handleStockChange = (style: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      stock: { ...prev.stock, [style]: parseFloat(value) || 0 },
    }));
  };

  return (
    <div className="glass shadow-xl rounded-2xl p-8 border border-white/20">
      <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
        <span className="w-2 h-8 bg-primary rounded-full"></span>Configuración de Feria
      </h3>
      {!activeFeriaConfig && (
        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-4 rounded-xl mb-6 flex items-center gap-3 animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="font-semibold text-base">
            ¡Bienvenido Administrador! No hay una feria activa. Por favor, crea una nueva configuración.
          </p>
        </div>
      )}
      {feedback.msg && (
        <div
          className={`p-4 mb-4 rounded-xl font-bold animate-pulse ${
            feedback.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {feedback.msg}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Stock Management Section - FIRST as requested */}
        <div className="bg-gray-100 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-xl font-bold mb-4 text-primary uppercase tracking-wider flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            STOCK INICIAL LITROS
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {BEER_STYLES.map((style) => (
              <div key={style}>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{style}</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-center font-mono font-bold"
                  value={formData.stock[style] || 0}
                  onChange={(e) => handleStockChange(style, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
              DESPERDICIO POR PINTA en ML
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Una pinta carga unos 473 ml. El valor que ingrese se sumara como desperdicio por pinta.
            </p>
            <input
              type="number"
              step="1"
              className="w-full md:w-1/2 p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg font-mono font-bold"
              value={formData.wastePerPint}
              onChange={(e) => setFormData({ ...formData, wastePerPint: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="border-t border-white/20 pt-4"></div>

        {/* General Config */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
            Nombre del Evento
          </label>
          <input
            type="text"
            onFocus={() => audioService.playClick()}
            required
            className="w-full p-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary text-dark dark:text-white transition-all"
            value={formData.nombreFeria}
            onChange={(e) => setFormData({ ...formData, nombreFeria: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
              Inicio
            </label>
            <input
              type="date"
              onFocus={() => audioService.playClick()}
              required
              className="w-full p-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl dark:text-white"
              value={formData.fechaInicio}
              onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
              Fin
            </label>
            <input
              type="date"
              onFocus={() => audioService.playClick()}
              required
              className="w-full p-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl dark:text-white"
              value={formData.fechaFin}
              onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
              Valor Pinta ($)
            </label>
            <input
              type="number"
              step="1"
              onFocus={() => audioService.playClick()}
              required
              className="w-full p-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl dark:text-white text-2xl font-mono font-bold"
              value={formData.valorPinta}
              onChange={(e) => setFormData({ ...formData, valorPinta: Math.round(parseFloat(e.target.value) || 0) })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
              Valor Litro ($)
            </label>
            <input
              type="number"
              step="1"
              onFocus={() => audioService.playClick()}
              required
              className="w-full p-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl dark:text-white text-2xl font-mono font-bold"
              value={formData.valorLitro}
              onChange={(e) => setFormData({ ...formData, valorLitro: Math.round(parseFloat(e.target.value) || 0) })}
            />
          </div>
        </div>

        <div className="pt-6 flex flex-col md:flex-row gap-4">
          <button
            type="submit"
            className="btn-3d flex-1 py-4 px-6 bg-gradient-to-r from-primary to-emerald-600 text-white rounded-xl font-bold shadow-3d-primary active:shadow-3d-primary-active uppercase tracking-wider"
          >
            GUARDAR CAMBIOS
          </button>
          {activeFeriaConfig && (
            <button
              type="button"
              onClick={() => {
                audioService.playClick();
                onFinalizeFeria();
              }}
              className="flex-1 py-4 px-6 bg-surfaceDark dark:bg-black border border-gray-600 text-white rounded-xl font-bold hover:bg-gray-800 transition uppercase tracking-wider"
            >
              ARCHIVAR FERIA ACTUAL
            </button>
          )}
        </div>
      </form>
    </div>
  );
};