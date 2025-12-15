import React, { useState, useEffect } from 'react';
import { audioService } from '../services/audioService';
import { apiService } from '../services/apiService';
import { auth } from '../services/firebase';
import { FeriaConfig, Sale, TipoPago, TipoUnidad } from '../types';
import { LOLA_SVG_URL, BEER_STYLES } from '../constants';

interface SalesTPVProps {
  activeFeriaConfig: FeriaConfig | null;
  onAddSale: (sale: Sale) => void;
  onLogout: () => void;
}

const SalesTPV: React.FC<SalesTPVProps> = ({ activeFeriaConfig, onLogout }) => {
  const [pintaCount, setPintaCount] = useState(0);
  const [litroCount, setLitroCount] = useState(0);
  const [activeButton, setActiveButton] = useState<string | null>(null); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOrders, setPendingOrders] = useState<Sale[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  
  // Multi-select state
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  useEffect(() => {
    const storedPending = localStorage.getItem('pendingOrders');
    if (storedPending) setPendingOrders(JSON.parse(storedPending));
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
      if (isOnline && pendingOrders.length > 0) {
          const syncOrders = async () => {
              const ordersToSync = [...pendingOrders];
              setPendingOrders([]); 
              localStorage.removeItem('pendingOrders');
              for (const sale of ordersToSync) {
                  try { 
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { id, ...cleanSale } = sale; 
                      await apiService.addSale(cleanSale); 
                  } catch (e) { 
                       console.error("Sync failed for item", e); 
                  }
              }
          };
          syncOrders();
      }
  }, [isOnline, pendingOrders]);

  const triggerVisualFeedback = (buttonId: string) => {
      setActiveButton(buttonId);
      setTimeout(() => setActiveButton(null), 150);
  };

  const handleStyleToggle = (style: string) => {
      audioService.playClick();
      setSelectedStyles(prev => {
          if (prev.includes(style)) {
              return prev.filter(s => s !== style);
          } else {
              return [...prev, style];
          }
      });
  };

  if (!activeFeriaConfig) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-lightbg dark:bg-darkbg p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-gray-200 dark:to-black opacity-20"></div>
        <h2 className="text-6xl font-display font-bold text-gray-400 mb-8 opacity-50">CERRADO</h2>
        <p className="text-xl text-gray-500 mb-8 z-10">No hay feria activa.</p>
        <button onClick={() => { audioService.playClick(); onLogout(); }} className="py-3 px-8 bg-surfaceDark text-white rounded-full hover:bg-black transition-colors shadow-lg z-10">Salir</button>
      </div>
    );
  }

  // Calculate total for ONE set of items (pintas+litros)
  const singleSetTotal = Math.round(pintaCount * activeFeriaConfig.valorPinta + litroCount * activeFeriaConfig.valorLitro);
  
  // Total is singleSet * number of selected styles (because we apply the counts to EACH style)
  const styleCount = selectedStyles.length;
  const total = singleSetTotal * (styleCount > 0 ? styleCount : 0);
  
  const hasItems = pintaCount > 0 || litroCount > 0;
  const hasStyles = styleCount > 0;

  const handleRegisterSale = async (tipoPago: TipoPago) => {
    if (!hasItems || !hasStyles) return;
    
    audioService.playSuccess();
    
    // Create sales for each selected style
    const salesToAdd: Sale[] = selectedStyles.map(style => ({
      fechaVenta: new Date().toISOString(),
      tipoUnidad: (pintaCount > 0 && litroCount > 0) ? TipoUnidad.Mixed : (pintaCount > 0 ? TipoUnidad.Pinta : TipoUnidad.Litro),
      cantidadUnidades: pintaCount + litroCount,
      montoTotal: singleSetTotal, // Total per style record
      tipoPago,
      usuarioVenta: auth.currentUser ? (auth.currentUser.email || 'unknown') : 'offline_user',
      estilo: style
    }));

    if (isOnline) {
        // Add all sales
        await Promise.all(salesToAdd.map(s => apiService.addSale(s)));
    } else {
       const newPending = salesToAdd.map(s => ({ ...s, id: `temp-${Date.now()}-${Math.random()}` }));
       const updatedPending = [...pendingOrders, ...newPending];
       setPendingOrders(updatedPending);
       localStorage.setItem('pendingOrders', JSON.stringify(updatedPending));
    }

    setPintaCount(0); setLitroCount(0);
    // Keep styles selected or clear? "que no quede encendido todo el tiempo" implies user wants control.
    // If I just paid, maybe clear styles to avoid accidental double charge next time? 
    // Usually POS clears selection after sale.
    setSelectedStyles([]);
    
    triggerVisualFeedback(tipoPago === TipoPago.Digital ? 'digital' : 'billete');
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handlePintaChange = (delta: number) => {
      if (!hasStyles) return;
      triggerVisualFeedback('pinta');
      if(delta > 0) audioService.playAdd(); else audioService.playSub();
      setPintaCount(prev => Math.max(0, prev + delta));
  };

  const handleLitroChange = (delta: number) => {
      if (!hasStyles) return;
      triggerVisualFeedback('litro');
      if(delta > 0) audioService.playAdd(); else audioService.playSub();
      setLitroCount(prev => Math.max(0, prev + delta));
  };

  return (
    <div className="flex flex-col min-h-screen bg-lightbg dark:bg-darkbg overflow-hidden relative">
      {/* Success Overlay */}
      {showSuccess && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white dark:bg-surfaceDark border-4 border-primary rounded-3xl w-80 h-80 flex flex-col items-center justify-center shadow-glow-primary animate-pop-in p-4 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/10 animate-pulse"></div>
                  {isOnline ? (
                       <div className="relative z-10">
                           <svg className="w-24 h-24 text-primary mb-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                           <span className="text-4xl md:text-5xl font-extrabold text-primary tracking-widest drop-shadow-sm">CARGADO!</span>
                       </div>
                  ) : (
                       <React.Fragment>
                          <svg className="w-20 h-20 text-secondary mb-4 animate-bounce relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" /></svg>
                          <span className="text-3xl font-bold text-secondary tracking-widest leading-none mb-2 relative z-10">GUARDADO OFFLINE</span>
                          <span className="text-lg text-gray-400 font-medium relative z-10">PENDIENTE DE ENVIO</span>
                       </React.Fragment>
                  )}
              </div>
          </div>
      )}
      
      {/* Pending Orders Modal */}
      {showPendingModal && (
          <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
              <div className="w-full max-w-lg bg-surfaceDark border border-gray-600 rounded-2xl flex flex-col max-h-[80vh] shadow-2xl animate-slide-up">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></span>
                          PENDIENTES DE ENVIO
                      </h3>
                      <button onClick={() => { audioService.playClick(); setShowPendingModal(false); }} className="text-gray-400 hover:text-white text-2xl transition-colors">&times;</button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1 space-y-2">
                      {pendingOrders.length === 0 ? (
                          <p className="text-gray-500 text-center py-8">No hay ordenes pendientes.</p>
                      ) : (
                          pendingOrders.map((order, idx) => (
                              <div key={idx} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center border border-gray-700 hover:border-gray-500 transition-colors">
                                  <div>
                                      <div className="text-primary font-bold text-lg">${order.montoTotal}</div>
                                      <div className="text-xs text-gray-400">{new Date(order.fechaVenta).toLocaleTimeString()}</div>
                                      {order.estilo && <div className="text-xs text-secondary font-bold uppercase">{order.estilo}</div>}
                                  </div>
                                  <div className="text-right">
                                      <div className="text-sm font-medium text-white">{order.tipoUnidad} ({order.cantidadUnidades})</div>
                                      <div className="text-xs text-secondary uppercase">{order.tipoPago}</div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
                  <div className="p-4 bg-gray-900 rounded-b-2xl border-t border-gray-700">
                      <button onClick={() => { audioService.playClick(); setShowPendingModal(false); }} className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all">CERRAR</button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className={`flex justify-between items-center p-3 shadow-lg z-20 transition-all duration-300 backdrop-blur-md ${isOnline ? 'bg-white/90 dark:bg-surfaceDark/90' : 'bg-red-900/90 border-b-2 border-red-500'}`}>
        <div>
            <div className="flex items-center gap-2 group cursor-pointer">
                 <img src={LOLA_SVG_URL} alt="Logo" className="h-10 w-10 animate-pulse group-hover:scale-110 transition-transform duration-300 drop-shadow-md" />
                 <h1 className="text-2xl font-display text-gray-800 dark:text-white leading-tight group-hover:text-primary transition-colors">VENTAS</h1>
            </div>
            <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider leading-none mt-1 drop-shadow-sm">{activeFeriaConfig.nombreFeria}</p>
        </div>
        <div className="flex items-center gap-3">
            {isOnline ? (
                <div className="bg-green-500/10 border border-green-500 text-green-600 dark:text-green-400 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1 shadow-glow-primary">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  ONLINE
                </div>
            ) : (
                <button 
                  onClick={() => { audioService.playClick(); setShowPendingModal(true); }}
                  className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-full font-bold animate-pulse hover:bg-red-600 transition-colors flex items-center gap-1 shadow-lg border-2 border-white/20"
                >
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                  OFFLINE ({pendingOrders.length})
                </button>
            )}
            
            <button onClick={() => { audioService.playClick(); onLogout(); }} className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-red-100 hover:text-red-500 transition-all active:scale-95 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
        </div>
      </div>

      {/* Style Selector */}
      <div className="bg-gray-100 dark:bg-gray-800/50 p-3 border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
            {BEER_STYLES.map(style => {
                const isSelected = selectedStyles.includes(style);
                return (
                    <button
                        key={style}
                        onClick={() => handleStyleToggle(style)}
                        className={`py-6 px-4 rounded-xl font-display text-2xl md:text-3xl tracking-wider transition-all transform shadow-md relative overflow-hidden
                            ${isSelected 
                                ? 'bg-primary text-white scale-[1.02] shadow-glow-primary ring-2 ring-white/50' 
                                : 'bg-white dark:bg-surfaceDark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                            }`}
                    >
                        {isSelected && <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full animate-pulse shadow-md"></div>}
                        {style}
                    </button>
                );
            })}
        </div>
      </div>

      {/* Main Product Area */}
      <div className="flex-grow flex flex-row p-3 gap-3 overflow-y-auto">
         {/* Pinta Button */}
         <div className={`btn-3d flex-1 relative rounded-3xl overflow-hidden transition-all duration-150 ${activeButton === 'pinta' ? 'transform scale-[0.98]' : ''} ${!hasStyles ? 'opacity-50 grayscale' : 'hover:-translate-y-1'}`}>
             <button 
                  onClick={() => handlePintaChange(1)} 
                  disabled={!hasStyles}
                  className={`w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 active:from-blue-700 active:to-blue-800 flex flex-col items-center justify-center text-white shadow-3d-blue active:shadow-3d-blue-active rounded-3xl border-t border-white/20 ${!hasStyles ? 'cursor-not-allowed shadow-none' : ''}`}
             >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
                 
                 <svg className="w-12 h-12 md:w-20 md:h-20 mb-2 opacity-90 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M5 2l1.2 16.8c.1 1.7 1.5 3.2 3.3 3.2h5c1.8 0 3.2-1.5 3.3-3.2L19 2H5zm12 2l-1 14.5c0 .7-.7 1.5-1.5 1.5h-5c-.8 0-1.5-.8-1.5-1.5L7 4h10z" />
                     <path d="M6 5h12v2H6z" opacity="0.3"/>
                 </svg>

                 <span className="text-2xl md:text-5xl font-display mb-0 drop-shadow-md">PINTA</span>
                 <span className="text-base font-bold opacity-90 bg-black/20 px-3 py-1 rounded-full mt-1">${Math.round(activeFeriaConfig.valorPinta)}</span>
                 
                 <div className="mt-3 bg-blue-900/40 backdrop-blur-sm rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center border border-white/10 shadow-inner">
                     <span key={pintaCount} className="text-5xl md:text-7xl font-extrabold animate-pop drop-shadow-lg">{pintaCount}</span>
                 </div>
             </button>
             {pintaCount > 0 && (
                 <button onClick={(e) => {e.stopPropagation(); handlePintaChange(-1);}} className="absolute top-0 right-0 p-4 md:p-6 bg-blue-900/80 hover:bg-red-500 text-white transition-colors rounded-bl-3xl shadow-lg z-20 backdrop-blur">
                     <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"/></svg>
                 </button>
             )}
         </div>

         {/* Litro Button */}
         <div className={`btn-3d flex-1 relative rounded-3xl overflow-hidden transition-all duration-150 ${activeButton === 'litro' ? 'transform scale-[0.98]' : ''} ${!hasStyles ? 'opacity-50 grayscale' : 'hover:-translate-y-1'}`}>
             <button 
                  onClick={() => handleLitroChange(1)} 
                  disabled={!hasStyles}
                  className={`w-full h-full bg-gradient-to-br from-purple-500 to-purple-700 active:from-purple-700 active:to-purple-800 flex flex-col items-center justify-center text-white shadow-3d-purple active:shadow-3d-purple-active rounded-3xl border-t border-white/20 ${!hasStyles ? 'cursor-not-allowed shadow-none' : ''}`}
             >
                 <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mt-16 blur-xl"></div>

                 <svg className="w-14 h-14 md:w-24 md:h-24 mb-2 opacity-90 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 5h-1v13.5c0 1.9-1.6 3.5-3.5 3.5h-7C5.6 22 4 20.4 4 18.5V5H3v13.5C3 21.5 5.5 24 8.5 24h7c3 0 5.5-2.5 5.5-5.5V5zM6 3h12v2H6z"/>
                    <path d="M21 8h-2v7h2c1.1 0 2-.9 2-2v-3c0-1.1-.9-2-2-2z"/>
                 </svg>

                 <span className="text-2xl md:text-5xl font-display mb-0 drop-shadow-md">LITRO</span>
                 <span className="text-base font-bold opacity-90 bg-black/20 px-3 py-1 rounded-full mt-1">${Math.round(activeFeriaConfig.valorLitro)}</span>
                 
                 <div className="mt-3 bg-purple-900/40 backdrop-blur-sm rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center border border-white/10 shadow-inner">
                     <span key={litroCount} className="text-5xl md:text-7xl font-extrabold animate-pop drop-shadow-lg">{litroCount}</span>
                 </div>
             </button>
             {litroCount > 0 && (
                 <button onClick={(e) => {e.stopPropagation(); handleLitroChange(-1);}} className="absolute top-0 right-0 p-4 md:p-6 bg-purple-900/80 hover:bg-red-500 text-white transition-colors rounded-bl-3xl shadow-lg z-20 backdrop-blur">
                     <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"/></svg>
                 </button>
             )}
         </div>
      </div>

      {/* Total Display */}
      <div className="bg-white/80 dark:bg-black/40 backdrop-blur-sm p-3 text-center border-t border-gray-200 dark:border-gray-800 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] relative z-10">
          <span className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-[0.2em] font-bold block mb-1">
              {hasStyles 
                ? `Total (${selectedStyles.length} estilos x $${singleSetTotal})` 
                : 'Seleccione Estilos'}
          </span>
          <span key={total} className={`text-6xl font-black transition-all animate-pop inline-block drop-shadow-sm ${hasItems ? 'text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400 filter drop-shadow-sm' : 'text-gray-400 dark:text-gray-600'}`}>${total}</span>
      </div>

      {/* Payment Actions */}
      <div className="grid grid-cols-2 gap-3 p-3 pb-6 bg-lightbg dark:bg-darkbg h-32 md:h-40 z-10">
          <button 
              onClick={() => handleRegisterSale(TipoPago.Digital)} 
              disabled={!hasItems || !hasStyles}
              className={`btn-3d rounded-2xl flex flex-col items-center justify-center text-white transition-all transform ${hasItems && hasStyles ? 'bg-gradient-to-r from-primary to-emerald-600 shadow-3d-primary active:shadow-3d-primary-active' : 'bg-gray-300 dark:bg-gray-800 cursor-not-allowed opacity-50 shadow-none'} ${activeButton === 'digital' ? 'ring-2 ring-white scale-95' : ''}`}
          >
              <div className="flex flex-col items-center gap-1">
                  <svg className="w-10 h-10 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  <span className="text-xl md:text-2xl font-bold uppercase tracking-wide drop-shadow-md">$ DIGITAL</span>
              </div>
          </button>
          <button 
              onClick={() => handleRegisterSale(TipoPago.Billete)} 
              disabled={!hasItems || !hasStyles}
              className={`btn-3d rounded-2xl flex flex-col items-center justify-center text-white transition-all transform ${hasItems && hasStyles ? 'bg-gradient-to-r from-secondary to-orange-600 shadow-3d-secondary active:shadow-3d-secondary-active' : 'bg-gray-300 dark:bg-gray-800 cursor-not-allowed opacity-50 shadow-none'} ${activeButton === 'billete' ? 'ring-2 ring-white scale-95' : ''}`}
          >
               <div className="flex flex-col items-center gap-1">
                  <svg className="w-10 h-10 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <span className="text-xl md:text-2xl font-bold uppercase tracking-wide drop-shadow-md">$ BILLETE</span>
              </div>
          </button>
      </div>
    </div>
  );
};

export default SalesTPV;