import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, 
  getDoc, getDocs, query, where, limit, writeBatch, deleteField
} from 'firebase/firestore';
import { FeriaConfig, FeriaHistory, ReportSummary, Sale, TipoUnidad, TipoPago, StockStatus } from '../types';
import { BEER_STYLES } from '../constants';

const firebaseConfig = {
  apiKey: "AIzaSyDx1qGAu862CxjtbYuj6JAiLX9flvukDw4",
  authDomain: "lolaventasonline.firebaseapp.com",
  projectId: "lolaventasonline",
  storageBucket: "lolaventasonline.firebasestorage.app",
  messagingSenderId: "323355322280",
  appId: "1:323355322280:web:b9a78336de7da6af519f9d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const calculateReportSummary = (feriaConfig: FeriaConfig, sales: Sale[]): ReportSummary => {
    let totalPintas = 0;
    let totalLitros = 0;
    let montoTotalGeneral = 0;
    let montoTotalDigital = 0;
    let montoTotalBillete = 0;

    // Initialize stock tracking
    const consumptionByStyle: Record<string, number> = {};
    BEER_STYLES.forEach(s => consumptionByStyle[s] = 0);

    // Constants for calculation
    const PINTA_VOLUME_L = 0.473; 
    const WASTE_L = (feriaConfig.desperdicioPorPinta || 0) / 1000;
    const DEDUCTION_PER_PINTA = PINTA_VOLUME_L + WASTE_L;

    sales.forEach((sale) => {
      montoTotalGeneral += sale.montoTotal;
      if (sale.tipoPago === TipoPago.Digital) {
        montoTotalDigital += sale.montoTotal;
      } else {
        montoTotalBillete += sale.montoTotal;
      }

      // Handle new Item-based sales
      if (sale.items && sale.items.length > 0) {
          sale.items.forEach(item => {
              if (item.tipoUnidad === TipoUnidad.Pinta) {
                  totalPintas += item.cantidad;
                  if (consumptionByStyle[item.estilo] !== undefined) {
                      consumptionByStyle[item.estilo] += (item.cantidad * DEDUCTION_PER_PINTA);
                  }
              } else if (item.tipoUnidad === TipoUnidad.Litro) {
                  totalLitros += item.cantidad;
                   if (consumptionByStyle[item.estilo] !== undefined) {
                      consumptionByStyle[item.estilo] += item.cantidad; // Assuming 1L = 1L deducted (no extra waste specified for Litro)
                  }
              }
          });
      } 
      // Handle legacy flat sales (backward compatibility)
      else if (sale.cantidadUnidades) {
          if (sale.tipoUnidad === TipoUnidad.Pinta) {
            totalPintas += sale.cantidadUnidades;
            // Legacy sales didn't have style, can't deduct specific stock accurately.
            // We ignore stock deduction for legacy or distribute evenly? 
            // For now, ignore to prevent crashes.
          } else if (sale.tipoUnidad === TipoUnidad.Litro) {
            totalLitros += sale.cantidadUnidades;
          } else if (sale.tipoUnidad === TipoUnidad.Mixed) {
              totalPintas += sale.cantidadUnidades / 2;
              totalLitros += sale.cantidadUnidades / 2;
          }
      }
    });

    const stockStatus: StockStatus[] = BEER_STYLES.map(style => {
        const initial = feriaConfig.stockInicial?.[style] || 0;
        const consumed = consumptionByStyle[style] || 0;
        const remaining = Math.max(0, initial - consumed);
        const percent = initial > 0 ? (remaining / initial) * 100 : 0;
        
        return {
            style,
            initial,
            soldLiters: consumed,
            remaining,
            percent
        };
    });

    return {
      totalPintas: Math.round(totalPintas),
      totalLitros: Math.round(totalLitros),
      montoTotalGeneral: Math.round(montoTotalGeneral),
      montoTotalDigital: Math.round(montoTotalDigital),
      montoTotalBillete: Math.round(montoTotalBillete),
      stockStatus
    };
};

export const apiService = {
  login: async (email: string, pass: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const idTokenResult = await userCredential.user.getIdTokenResult(true);
      const role = idTokenResult.claims.role || null;
      return { success: true, role: role, username: email };
    } catch (error: any) {
      let message = 'Error de autenticación.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
          message = 'Credenciales inválidas.';
      } else if (error.code === 'auth/invalid-email') {
          message = 'Email inválido.';
      }
      throw new Error(message);
    }
  },

  logout: async () => {
    await signOut(auth);
    return true;
  },

  saveActiveFeriaConfig: async (config: FeriaConfig) => {
    await setDoc(doc(db, 'settings', 'activeFeria'), config);
    return true;
  },

  addSale: async (sale: Sale) => {
    // Remove temporary ID if present
    const { id, ...saleData } = sale;
    await addDoc(collection(db, 'activeSales'), saleData);
    return true;
  },

  archiveCurrentFeria: async (feriaData: FeriaHistory) => {
    const batch = writeBatch(db);
    
    // Check existing history
    const historyRefQuery = query(
      collection(db, 'feriaHistory'), 
      where('config.nombreFeria', '==', feriaData.config.nombreFeria), 
      limit(1)
    );
    const existingSnap = await getDocs(historyRefQuery);
    const historyRef = existingSnap.empty ? doc(collection(db, 'feriaHistory')) : existingSnap.docs[0].ref;
    
    const cleanData = JSON.parse(JSON.stringify(feriaData));
    batch.set(historyRef, cleanData);

    const activeFeriaRef = doc(db, 'settings', 'activeFeria');
    batch.update(activeFeriaRef, {
      nombreFeria: deleteField(),
      fechaInicio: deleteField(),
      fechaFin: deleteField(),
      valorPinta: deleteField(),
      valorLitro: deleteField(),
      stockInicial: deleteField(),
      desperdicioPorPinta: deleteField(),
    });
    
    // Batch delete sales
    const activeSalesSnapshot = await getDocs(collection(db, 'activeSales'));
    const BATCH_SIZE = 400;
    
    // Commit the history and settings update first
    await batch.commit();

    // Now delete sales in chunks
    const docs = activeSalesSnapshot.docs;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const chunkBatch = writeBatch(db);
        docs.slice(i, i + BATCH_SIZE).forEach(d => chunkBatch.delete(d.ref));
        await chunkBatch.commit();
    }
    return true;
  },

  activateHistoricalFeria: async (feriaToActivate: FeriaHistory) => {
    try {
        const activeConfigRef = doc(db, 'settings', 'activeFeria');
        const activeConfigDoc = await getDoc(activeConfigRef);
        
        // Archive current if exists
        if (activeConfigDoc.exists() && activeConfigDoc.data()?.nombreFeria) {
            const currentConfig = activeConfigDoc.data() as FeriaConfig;
            const currentSalesSnap = await getDocs(collection(db, 'activeSales'));
            const currentSales = currentSalesSnap.docs.map(d => ({id: d.id, ...d.data()} as Sale));
            const report = calculateReportSummary(currentConfig, currentSales);
            
            const feriaDataToArchive = JSON.parse(JSON.stringify({ 
                config: currentConfig, 
                sales: currentSales, 
                reportSummary: report, 
                archivedAt: new Date().toISOString() 
            }));
            
            const historyRefQuery = query(collection(db, 'feriaHistory'), where('config.nombreFeria', '==', currentConfig.nombreFeria), limit(1));
            const existingSnap = await getDocs(historyRefQuery);
            const historyRef = existingSnap.empty ? doc(collection(db, 'feriaHistory')) : existingSnap.docs[0].ref;
            
            await setDoc(historyRef, feriaDataToArchive);

            // Delete current sales
            const deleteDocs = currentSalesSnap.docs;
            const BATCH_SIZE = 400;
            for (let i = 0; i < deleteDocs.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                deleteDocs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        } else {
             // Clean orphans
             const orphanSales = await getDocs(collection(db, 'activeSales'));
             const deleteDocs = orphanSales.docs;
             const BATCH_SIZE = 400;
             for (let i = 0; i < deleteDocs.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                deleteDocs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        }

        // Set new active config
        const cleanConfig = JSON.parse(JSON.stringify(feriaToActivate.config));
        await setDoc(activeConfigRef, cleanConfig);

        // Restore sales
        const salesToRestore = feriaToActivate.sales || [];
        const BATCH_SIZE = 400;
        for (let i = 0; i < salesToRestore.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            salesToRestore.slice(i, i + BATCH_SIZE).forEach(sale => {
                const newSaleRef = doc(collection(db, 'activeSales'));
                const { id, ...saleData } = sale;
                batch.set(newSaleRef, saleData);
            });
            await batch.commit();
        }
        
        return true;
    } catch (error: any) {
        console.error("Error activating feria:", error);
        throw error;
    }
  },

  deleteHistoricalFeria: async (feriaId: string) => {
    await deleteDoc(doc(db, 'feriaHistory', feriaId));
    return true;
  },
};