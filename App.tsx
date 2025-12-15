import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { apiService, calculateReportSummary } from './services/apiService';
import { ADMIN_ROLE, FeriaConfig, HistoricalFeria, Sale } from './types';
import AuthScreen from './components/AuthScreen';
import AdminDashboard from './components/AdminDashboard';
import SalesTPV from './components/SalesTPV';

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeFeriaConfig, setActiveFeriaConfig] = useState<FeriaConfig | null>(null);
  const [activeSales, setActiveSales] = useState<Sale[]>([]);
  const [feriaHistory, setFeriaHistory] = useState<HistoricalFeria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
              const idTokenResult = await user.getIdTokenResult();
              setUserRole((idTokenResult.claims.role as string) || null);
          } else {
              setUserRole(null); 
              setActiveFeriaConfig(null); 
              setActiveSales([]); 
              setFeriaHistory([]);
          }
          setLoading(false);
      });
      return () => unsubscribe();
  }, []);

  useEffect(() => {
      if (!userRole) return;
      
      const configUnsub = onSnapshot(doc(db, 'settings', 'activeFeria'), (docSnap) => {
          setActiveFeriaConfig((docSnap.exists() && docSnap.data().nombreFeria) ? docSnap.data() as FeriaConfig : null);
      });

      const salesUnsub = onSnapshot(collection(db, 'activeSales'), (snap) => {
          setActiveSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
      });

      let historyUnsub = () => {};
      if (userRole === ADMIN_ROLE) {
          const q = query(collection(db, 'feriaHistory'), orderBy('archivedAt', 'desc'));
          historyUnsub = onSnapshot(q, (snap) => {
              setFeriaHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as HistoricalFeria)));
          });
      }

      return () => { 
          configUnsub(); 
          salesUnsub(); 
          historyUnsub(); 
      };
  }, [userRole]);

  if (loading) {
      return (
          <div className="min-h-screen w-full flex items-center justify-center bg-darkbg">
              <div className="spinner border-t-4 border-primary w-12 h-12"></div>
          </div>
      );
  }

  if (!userRole) {
      return <AuthScreen onLogin={setUserRole} />;
  }

  if (userRole === ADMIN_ROLE) {
      return (
          <AdminDashboard 
              activeFeriaConfig={activeFeriaConfig} 
              activeSales={activeSales} 
              feriaHistory={feriaHistory} 
              onUpdateFeriaConfig={apiService.saveActiveFeriaConfig} 
              onFinalizeFeria={() => {
                  if (activeFeriaConfig) {
                      apiService.archiveCurrentFeria({
                          config: activeFeriaConfig, 
                          sales: activeSales, 
                          reportSummary: calculateReportSummary(activeFeriaConfig, activeSales), 
                          archivedAt: new Date().toISOString()
                      });
                  }
              }} 
              onActivateHistoricalFeria={apiService.activateHistoricalFeria} 
              onDeleteHistoricalFeria={apiService.deleteHistoricalFeria} 
              onLogout={apiService.logout} 
          />
      );
  }

  return (
      <SalesTPV 
          activeFeriaConfig={activeFeriaConfig} 
          onAddSale={() => { /* Handled internally in TPV for better optimistic updates */ }} 
          onLogout={apiService.logout} 
      />
  );
};

export default App;