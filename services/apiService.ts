import { auth, db } from './firebase';
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  limit, 
  writeBatch, 
  deleteDoc,
  updateDoc,
  deleteField
} from "firebase/firestore";
import { LoginResult, FeriaConfig, Sale, ReportSummary, TipoPago, TipoUnidad, StyleStockSummary } from '../types';
import { BEER_STYLES, PINTA_VOLUME_LITERS } from '../constants';

export const apiService = {
  login: async (email: string, pass: string): Promise<LoginResult> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const idTokenResult = await userCredential.user.getIdTokenResult(true);
      const role = (idTokenResult.claims.role as string) || null;
      return { success: true, role: role, username: email };
    } catch (error: any) {
      let message = 'Error de autenticación.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        message = 'Credenciales inválidas.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Email inválido.';
      }
      throw new Error(message);
    }
  },

  logout: async (): Promise<boolean> => {
    await signOut(auth);
    return true;
  },

  saveActiveFeriaConfig: async (config: FeriaConfig): Promise<boolean> => {
    await setDoc(doc(db, 'settings', 'activeFeria'), config);
    return true;
  },

  addSale: async (sale: Sale): Promise<boolean> => {
    await addDoc(collection(db, 'activeSales'), sale);
    return true;
  },

  archiveCurrentFeria: async (feriaData: { config: FeriaConfig, sales: Sale[], reportSummary: ReportSummary, archivedAt: string }): Promise<boolean> => {
    const batch = writeBatch(db);
    
    const q = query(collection(db, 'feriaHistory'), where('config.nombreFeria', '==', feriaData.config.nombreFeria), limit(1));
    const existingFeriaQuery = await getDocs(q);
    
    let historyRef;
    if (existingFeriaQuery.empty) {
        historyRef = doc(collection(db, 'feriaHistory'));
    } else {
        historyRef = existingFeriaQuery.docs[0].ref;
    }

    const cleanData = JSON.parse(JSON.stringify(feriaData));
    batch.set(historyRef, cleanData);

    const activeFeriaRef = doc(db, 'settings', 'activeFeria');
    batch.update(activeFeriaRef, {
      nombreFeria: deleteField(),
      fechaInicio: deleteField(),
      fechaFin: deleteField(),
      valorPinta: deleteField(),
      valorLitro: deleteField(),
      stock: deleteField(),
      desperdicio: deleteField()
    });

    const activeSalesSnapshot = await getDocs(collection(db, 'activeSales'));
    const BATCH_SIZE = 400;
    
    await batch.commit();

    // Now delete sales in chunks
    const deleteDocs = activeSalesSnapshot.docs;
    for (let i = 0; i < deleteDocs.length; i += BATCH_SIZE) {
        const chunkBatch = writeBatch(db);
        deleteDocs.slice(i, i + BATCH_SIZE).forEach(d => chunkBatch.delete(d.ref));
        await chunkBatch.commit();
    }
    return true;
  },

  activateHistoricalFeria: async (feriaToActivate: { config: FeriaConfig, sales: Sale[] }) => {
    try {
      const activeConfigDoc = await getDoc(doc(db, 'settings', 'activeFeria'));
      
      // Archive current if exists
      if (activeConfigDoc.exists() && activeConfigDoc.data()?.nombreFeria) {
        const currentConfig = activeConfigDoc.data() as FeriaConfig;
        const currentSalesSnap = await getDocs(collection(db, 'activeSales'));
        const currentSales = currentSalesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
        const report = calculateReportSummary(currentConfig, currentSales);
        
        const feriaDataToArchive = JSON.parse(JSON.stringify({ config: currentConfig, sales: currentSales, reportSummary: report, archivedAt: new Date().toISOString() }));
        
        const q = query(collection(db, 'feriaHistory'), where('config.nombreFeria', '==', currentConfig.nombreFeria), limit(1));
        const existingFeriaQuery = await getDocs(q);
        const historyRef = existingFeriaQuery.empty ? doc(collection(db, 'feriaHistory')) : existingFeriaQuery.docs[0].ref;
        
        await setDoc(historyRef, feriaDataToArchive);

        // Delete current sales in chunks
        const deleteDocs = currentSalesSnap.docs;
        const BATCH_SIZE = 400;
        for (let i = 0; i < deleteDocs.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            deleteDocs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
      } else {
         const orphanSales = await getDocs(collection(db, 'activeSales'));
         const deleteDocs = orphanSales.docs;
         const BATCH_SIZE = 400;
         for (let i = 0; i < deleteDocs.length; i += BATCH_SIZE) {
             const batch = writeBatch(db);
             deleteDocs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
             await batch.commit();
         }
      }

      const cleanConfig = JSON.parse(JSON.stringify(feriaToActivate.config));
      await setDoc(doc(db, 'settings', 'activeFeria'), cleanConfig);

      const salesToRestore = feriaToActivate.sales || [];
      const BATCH_SIZE = 400;
      for (let i = 0; i < salesToRestore.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        salesToRestore.slice(i, i + BATCH_SIZE).forEach(sale => {
            const newSaleRef = doc(collection(db, 'activeSales'));
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...saleData } = sale;
            batch.set(newSaleRef, saleData);
        });
        await batch.commit();
      }
      return true;
    } catch (error: any) {
      console.error("Error activating feria:", error);
      alert("Error al reactivar la feria: " + error.message);
      throw error;
    }
  },

  deleteHistoricalFeria: async (feriaId: string) => {
    await deleteDoc(doc(db, 'feriaHistory', feriaId));
    return true;
  }
};

export const calculateReportSummary = (feriaConfig: FeriaConfig, sales: Sale[]): ReportSummary => {
  let totalPintas = 0;
  let totalLitros = 0;
  let montoTotalGeneral = 0;
  let montoTotalDigital = 0;
  let montoTotalBillete = 0;
  
  // Initialize stock tracking
  const stockMap: Record<string, { soldLiters: number }> = {};
  BEER_STYLES.forEach(style => {
    stockMap[style] = { soldLiters: 0 };
  });

  sales.forEach((sale) => {
    montoTotalGeneral += sale.montoTotal;
    if (sale.tipoPago === TipoPago.Digital) {
      montoTotalDigital += sale.montoTotal;
    } else {
      montoTotalBillete += sale.montoTotal;
    }

    let pintasInSale = 0;
    let litrosInSale = 0;

    if (sale.tipoUnidad === TipoUnidad.Pinta) {
      pintasInSale = sale.cantidadUnidades;
    } else if (sale.tipoUnidad === TipoUnidad.Litro) {
      litrosInSale = sale.cantidadUnidades;
    } else if (sale.tipoUnidad === TipoUnidad.Mixed) {
        pintasInSale = sale.cantidadUnidades / 2;
        litrosInSale = sale.cantidadUnidades / 2;
    }

    totalPintas += pintasInSale;
    totalLitros += litrosInSale;

    // Stock Calculation per style
    if (sale.estilo && stockMap[sale.estilo]) {
        const litersConsumed = (pintasInSale * PINTA_VOLUME_LITERS) + litrosInSale;
        stockMap[sale.estilo].soldLiters += litersConsumed;
    }
  });

  const stockSummary: StyleStockSummary[] = BEER_STYLES.map(style => {
      const initial = feriaConfig.stock?.[style] || 0;
      const sold = stockMap[style].soldLiters;
      // desperdicio is now stored as ML per Pinta (0.473L)
      const wastageMlPerPinta = feriaConfig.desperdicio || 0; 
      
      // Calculate wastage proportional to liters sold
      // Wastage Ratio = (WastageML / 1000) / PintaVolumeLiters
      const wastageRatio = (wastageMlPerPinta / 1000) / PINTA_VOLUME_LITERS;
      
      const wastageLiters = sold * wastageRatio;
      const totalUsed = sold + wastageLiters;
      const remaining = Math.max(0, initial - totalUsed);
      
      const percentage = initial > 0 ? (remaining / initial) * 100 : 0;

      return {
          style,
          initial,
          sold,
          wastage: wastageLiters,
          remaining: Number(remaining.toFixed(2)),
          percentage: Math.round(percentage)
      };
  });

  return {
    totalPintas: Math.round(totalPintas),
    totalLitros: Math.round(totalLitros),
    montoTotalGeneral: Math.round(montoTotalGeneral),
    montoTotalDigital: Math.round(montoTotalDigital),
    montoTotalBillete: Math.round(montoTotalBillete),
    stockSummary
  };
};