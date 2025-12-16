import { auth, db } from '../firebase';
import { TipoPago, TipoUnidad, FeriaConfig, Sale, ReportSummary, FeriaHistory, StockConfig } from '../types';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'; // v9 modular import
import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDocs,
  getDoc,
  writeBatch,
  FieldValue,
  deleteField,
} from 'firebase/firestore'; // v9 modular imports

export const calculateReportSummary = (feriaConfig: FeriaConfig, sales: Sale[]): ReportSummary => {
  let totalPintas = 0;
  let totalLitros = 0;
  let montoTotalGeneral = 0;
  let montoTotalDigital = 0;
  let montoTotalBillete = 0;

  // Consumption tracking (Liters)
  const consumptionByStyle: StockConfig = {};
  if (feriaConfig.stock) {
    Object.keys(feriaConfig.stock).forEach((style) => {
      consumptionByStyle[style] = 0;
    });
  }

  sales.forEach((sale) => {
    montoTotalGeneral += sale.montoTotal;
    if (sale.tipoPago === TipoPago.Digital) {
      montoTotalDigital += sale.montoTotal;
    } else {
      montoTotalBillete += sale.montoTotal;
    }

    // Backward compatibility for old sales without 'items'
    if (!sale.items || sale.items.length === 0) {
      if (sale.tipoUnidad === TipoUnidad.Pinta) totalPintas += sale.cantidadUnidades;
      else if (sale.tipoUnidad === TipoUnidad.Litro) totalLitros += sale.cantidadUnidades;
      else if (sale.tipoUnidad === TipoUnidad.Mixed) {
        totalPintas += sale.cantidadUnidades / 2;
        totalLitros += sale.cantidadUnidades / 2;
      }
    } else {
      // New logic with style tracking
      sale.items.forEach((item) => {
        if (item.unit === TipoUnidad.Pinta) {
          totalPintas += item.quantity;
          // Calculate consumption: (473ml + Waste) converted to Liters
          // Waste is in ML
          const wasteL = (feriaConfig.wastePerPint || 0) / 1000;
          const volumeL = 0.473 + wasteL;
          if (consumptionByStyle[item.style] !== undefined) {
            consumptionByStyle[item.style] += item.quantity * volumeL;
          }
        } else if (item.unit === TipoUnidad.Litro) {
          totalLitros += item.quantity;
          if (consumptionByStyle[item.style] !== undefined) {
            consumptionByStyle[item.style] += item.quantity; // 1 Liter
          }
        }
      });
    }
  });

  return {
    totalPintas: Math.round(totalPintas),
    totalLitros: Math.round(totalLitros),
    montoTotalGeneral: Math.round(montoTotalGeneral),
    montoTotalDigital: Math.round(montoTotalDigital),
    montoTotalBillete: Math.round(montoTotalBillete),
    consumptionByStyle,
  };
};

export const apiService = {
  login: async (email: string, pass: string): Promise<{ success: boolean; role: string | null; username: string }> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass); // v9 syntax
      const idTokenResult = await userCredential.user?.getIdTokenResult(true);
      const role = idTokenResult?.claims.role || null;
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
  logout: async (): Promise<boolean> => {
    await signOut(auth); // v9 syntax
    return true;
  },
  saveActiveFeriaConfig: async (config: FeriaConfig): Promise<boolean> => {
    // Firebase cannot store undefined values, so clean the data
    const cleanConfig = JSON.parse(JSON.stringify(config));
    await setDoc(doc(db, 'settings', 'activeFeria'), cleanConfig); // v9 syntax
    return true;
  },
  addSale: async (sale: Sale): Promise<boolean> => {
    // Firebase cannot store undefined values, so clean the data
    const cleanSale = JSON.parse(JSON.stringify(sale));
    await addDoc(collection(db, 'activeSales'), cleanSale); // v9 syntax
    return true;
  },
  archiveCurrentFeria: async (feriaData: FeriaHistory): Promise<boolean> => {
    const batch = writeBatch(db); // v9 syntax
    const feriaHistoryCol = collection(db, 'feriaHistory');
    const q = query(feriaHistoryCol, where('config.nombreFeria', '==', feriaData.config.nombreFeria));
    const existingFeriaQuery = await getDocs(q); // v9 syntax

    let historyDocRef;
    if (existingFeriaQuery.empty) {
      historyDocRef = doc(feriaHistoryCol); // v9 syntax for new doc reference
    } else {
      historyDocRef = existingFeriaQuery.docs[0].ref;
    }

    // Firebase cannot store undefined values, so clean the data
    const cleanData = JSON.parse(JSON.stringify(feriaData));
    batch.set(historyDocRef, cleanData);

    const activeFeriaDocRef = doc(db, 'settings', 'activeFeria'); // v9 syntax
    batch.delete(activeFeriaDocRef); // Simplest reset

    // Delete active sales in batches
    const activeSalesCollection = collection(db, 'activeSales');
    const activeSalesSnapshot = await getDocs(activeSalesCollection); // v9 syntax
    const BATCH_SIZE = 400;
    for (let i = 0; i < activeSalesSnapshot.docs.length; i += BATCH_SIZE) {
      const chunkBatch = writeBatch(db); // new batch for chunk
      activeSalesSnapshot.docs.slice(i, i + BATCH_SIZE).forEach((d) => chunkBatch.delete(d.ref));
      await chunkBatch.commit();
    }
    await batch.commit();
    return true;
  },
  activateHistoricalFeria: async (feriaToActivate: FeriaHistory): Promise<boolean> => {
    const activeFeriaDocRef = doc(db, 'settings', 'activeFeria'); // v9 syntax
    const activeConfigDoc = await getDoc(activeFeriaDocRef); // v9 syntax

    const activeSalesCollection = collection(db, 'activeSales'); // v9 syntax

    if (activeConfigDoc.exists() && activeConfigDoc.data()?.nombreFeria) {
      const currentConfig = activeConfigDoc.data() as FeriaConfig;
      const currentSalesSnap = await getDocs(activeSalesCollection); // v9 syntax
      const currentSales = currentSalesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Sale[];
      const report = calculateReportSummary(currentConfig, currentSales);
      const feriaDataToArchive: FeriaHistory = JSON.parse(
        JSON.stringify({ config: currentConfig, sales: currentSales, reportSummary: report, archivedAt: new Date().toISOString() }),
      );

      const feriaHistoryCol = collection(db, 'feriaHistory'); // v9 syntax
      const q = query(feriaHistoryCol, where('config.nombreFeria', '==', currentConfig.nombreFeria));
      const existingFeriaQuery = await getDocs(q); // v9 syntax

      let historyDocRef;
      if (existingFeriaQuery.empty) {
        historyDocRef = doc(feriaHistoryCol);
      } else {
        historyDocRef = existingFeriaQuery.docs[0].ref;
      }
      await setDoc(historyDocRef, feriaDataToArchive); // v9 syntax

      const deleteDocs = currentSalesSnap.docs;
      const BATCH_SIZE = 400;
      for (let i = 0; i < deleteDocs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db); // new batch for chunk
        deleteDocs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } else {
      // Clean up orphans if no active feria
      const orphanSales = await getDocs(activeSalesCollection); // v9 syntax
      const deleteDocs = orphanSales.docs;
      const BATCH_SIZE = 400;
      for (let i = 0; i < deleteDocs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db); // new batch for chunk
        deleteDocs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    const cleanConfig = JSON.parse(JSON.stringify(feriaToActivate.config));
    await setDoc(doc(db, 'settings', 'activeFeria'), cleanConfig); // v9 syntax

    const salesToRestore = feriaToActivate.sales || [];
    const BATCH_SIZE = 400;
    for (let i = 0; i < salesToRestore.length; i += BATCH_SIZE) {
      const batch = writeBatch(db); // new batch for chunk
      salesToRestore.slice(i, i + BATCH_SIZE).forEach((sale) => {
        const newSaleRef = doc(activeSalesCollection); // v9 syntax for new doc reference
        const { id, ...saleData } = sale; // Destructure 'id' if it exists, don't save it
        batch.set(newSaleRef, saleData);
      });
      await batch.commit();
    }
    return true;
  },
  deleteHistoricalFeria: async (feriaId: string): Promise<boolean> => {
    await deleteDoc(doc(db, 'feriaHistory', feriaId)); // v9 syntax
    return true;
  },
};