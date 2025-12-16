import React from 'react';
import { AuthScreen } from './components/AuthScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { SalesTPV } from './components/SalesTPV';
import { auth, db } from './firebase'; // Import auth and db instances
import { ADMIN_ROLE } from './constants';
import { FeriaConfig, Sale } from './types';
import { apiService, calculateReportSummary } from './services/apiService';
import { onAuthStateChanged } from 'firebase/auth'; // v9 modular import for auth state
import { collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore'; // v9 modular imports for firestore

function App(): React.ReactElement {
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [activeFeriaConfig, setActiveFeriaConfig] = React.useState<FeriaConfig | null>(null);
  const [activeSales, setActiveSales] = React.useState<Sale[]>([]);
  const [feriaHistory, setFeriaHistory] = React.useState<any[]>([]); // Using any for FeriaHistory from Firebase
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: any | null) => {
      if (user) {
        const idTokenResult = await user.getIdTokenResult();
        setUserRole(idTokenResult.claims.role || null);
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

  React.useEffect(() => {
    if (!userRole) {
      return;
    }
    // Fetch activeFeriaConfig
    const u1 = onSnapshot(doc(db, 'settings', 'activeFeria'), (docSnapshot) => {
      const config = docSnapshot.exists() && docSnapshot.data()?.nombreFeria ? (docSnapshot.data() as FeriaConfig) : null;
      setActiveFeriaConfig(config);
    });

    // Fetch activeSales
    const u2 = onSnapshot(collection(db, 'activeSales'), (snapshot) => {
      const sales = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Sale[];
      setActiveSales(sales);
    });

    let u3 = () => {};
    if (userRole === ADMIN_ROLE) {
      // Fetch feriaHistory for admin
      const q = query(collection(db, 'feriaHistory'), orderBy('archivedAt', 'desc'));
      u3 = onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFeriaHistory(history);
      });
    }
    return () => {
      u1();
      u2();
      u3();
    };
  }, [userRole]);

  if (loading)
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-darkbg">
        <div className="spinner border-t-4 border-primary w-12 h-12"></div>
      </div>
    );

  return (
    <React.Fragment>
      {!userRole ? (
        <AuthScreen onLogin={setUserRole} />
      ) : userRole === ADMIN_ROLE ? (
        <AdminDashboard
          activeFeriaConfig={activeFeriaConfig}
          activeSales={activeSales}
          feriaHistory={feriaHistory}
          onUpdateFeriaConfig={apiService.saveActiveFeriaConfig}
          onFinalizeFeria={() =>
            apiService.archiveCurrentFeria({
              config: activeFeriaConfig!,
              sales: activeSales,
              reportSummary: calculateReportSummary(activeFeriaConfig!, activeSales),
              archivedAt: new Date().toISOString(),
            })
          }
          onActivateHistoricalFeria={apiService.activateHistoricalFeria}
          onDeleteHistoricalFeria={apiService.deleteHistoricalFeria}
          onLogout={apiService.logout}
        />
      ) : (
        <SalesTPV activeFeriaConfig={activeFeriaConfig} onAddSale={apiService.addSale} onLogout={apiService.logout} />
      )}
    </React.Fragment>
  );
}

export default App;