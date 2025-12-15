import React, { useState, useEffect } from 'react';
import { audioService } from '../services/audioService';
import { FeriaConfig } from '../types';
import { BEER_STYLES } from '../constants';

interface Props {
    activeFeriaConfig: FeriaConfig | null;
    onSave: (config: FeriaConfig) => Promise<boolean>;
    onFinalizeFeria: () => void;
}

const FeriaConfigForm: React.FC<Props> = ({ activeFeriaConfig, onSave, onFinalizeFeria }) => {
    const [formData, setFormData] = useState<FeriaConfig>({ 
        nombreFeria: '', 
        fechaInicio: '', 
        fechaFin: '', 
        valorPinta: 0, 
        valorLitro: 0,
        stock: {},
        desperdicio: 0
    });
    const [feedback, setFeedback] = useState<{ msg: string | null, isError: boolean }>({ msg: null, isError: false });
    
    useEffect(() => {
        if (activeFeriaConfig) {
            setFormData({
                ...activeFeriaConfig,
                stock: activeFeriaConfig.stock || {},
                desperdicio: activeFeriaConfig.desperdicio || 0
            });
        } else {
            setFormData({ 
                nombreFeria: '', 
                fechaInicio: '', 
                fechaFin: '', 
                valorPinta: 0, 
                valorLitro: 0,
                stock: {},
                desperdicio: 0
            });
        }
    }, [activeFeriaConfig]);

    const handleStockChange = (style: string, val: string) => {
        setFormData(prev => ({
            ...prev,
            stock: {
                ...prev.stock,
                [style]: parseFloat(val) || 0
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        audioService.playClick();
        try {
            await onSave(formData);
            setFeedback({ msg: 'Guardado correctamente.', isError: false });
        } catch(e) { setFeedback({ msg: 'Error al guardar.', isError: true }); }
        setTimeout(() => setFeedback({msg: null, isError: false}), 3000);
    };

    return (
        <div className="glass shadow-xl rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2"><span className="w-2 h-8 bg-primary rounded-full"></span>Configuración de Feria</h3>
            {feedback.msg && <div className={`p-4 mb-4 rounded-xl font-bold animate-pulse ${feedback.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{feedback.msg}</div>}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Nombre del Evento</label>
                    <input type="text" onFocus={() => audioService.playClick()} required className="w-full p-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary text-dark dark:text-white transition-all" value={formData.nombreFeria} onChange={e => setFormData({...formData, nombreFeria: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Inicio</label><input type="date" onFocus={() => audioService.playClick()} required className="w-full p-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl dark:text-white" value={formData.fechaInicio} onChange={e => setFormData({...formData, fechaInicio: e.target.value})} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Fin</label><input type="date" onFocus={() => audioService.playClick()} required className="w-full p-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl dark:text-white" value={formData.fechaFin} onChange={e => setFormData({...formData, fechaFin: e.target.value})} /></div>
                </div>
                
                {/* Stock Configuration Section Reordered */}
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xl font-bold text-primary mb-6 uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                        STOCK INICIAL LITROS
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                        {BEER_STYLES.map(style => (
                            <div key={style}>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{style} (L)</label>
                                <input 
                                    type="number" 
                                    step="1" 
                                    placeholder="0"
                                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white font-mono text-lg font-bold"
                                    value={formData.stock?.[style] || ''}
                                    onChange={e => handleStockChange(style, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">DESPERDICIO POR PINTA en ML</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" 
                                step="1" 
                                className="w-full md:w-1/3 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl dark:text-white text-xl font-bold"
                                value={formData.desperdicio}
                                onChange={e => setFormData({...formData, desperdicio: parseFloat(e.target.value) || 0})}
                            />
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Una pinta carga unos 473 ml. Ingrese cuantos ML se pierden por cada pinta servida.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Valor Pinta ($)</label><input type="number" step="1" onFocus={() => audioService.playClick()} required className="w-full p-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl dark:text-white text-2xl font-mono font-bold" value={formData.valorPinta} onChange={e => setFormData({...formData, valorPinta: Math.round(parseFloat(e.target.value) || 0)})} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Valor Litro ($)</label><input type="number" step="1" onFocus={() => audioService.playClick()} required className="w-full p-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-xl dark:text-white text-2xl font-mono font-bold" value={formData.valorLitro} onChange={e => setFormData({...formData, valorLitro: Math.round(parseFloat(e.target.value) || 0)})} /></div>
                </div>

                <div className="pt-6 flex flex-col md:flex-row gap-4">
                    <button type="submit" className="btn-3d flex-1 py-4 px-6 bg-gradient-to-r from-primary to-emerald-600 text-white rounded-xl font-bold shadow-3d-primary active:shadow-3d-primary-active uppercase tracking-wider">GUARDAR CAMBIOS</button>
                    {activeFeriaConfig && <button type="button" onClick={() => { audioService.playClick(); onFinalizeFeria(); }} className="flex-1 py-4 px-6 bg-surfaceDark dark:bg-black border border-gray-600 text-white rounded-xl font-bold hover:bg-gray-800 transition uppercase tracking-wider">ARCHIVAR FERIA ACTUAL</button>}
                </div>
            </form>
        </div>
    );
};

export default FeriaConfigForm;