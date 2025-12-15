import React, { useState, useEffect } from 'react';
import { audioService } from '../services/audioService';
import { apiService } from '../services/apiService';
import { 
  ADMIN_ROLE, 
  SALES_ROLE 
} from '../types';
import { 
  ENC_ADMIN_EMAIL, 
  ENC_ADMIN_PASS, 
  ENC_SALES_EMAIL, 
  ENC_SALES_PASS, 
  ENC_TRIGGER_ADMIN, 
  ENC_TRIGGER_SALES,
  LOLA_SVG_URL 
} from '../constants';

interface AuthScreenProps {
  onLogin: (role: string, username: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const normalizedInput = usernameInput.trim().toLowerCase();
  const isAdminInput = normalizedInput === atob(ENC_TRIGGER_ADMIN);
  const isSalesInput = normalizedInput === atob(ENC_TRIGGER_SALES);

  useEffect(() => {
      const initAudio = () => audioService.init();
      window.addEventListener('click', initAudio, { once: true });
      return () => window.removeEventListener('click', initAudio);
  }, []);

  const doLogin = async (email: string, password: string, expectedRole: string) => {
      audioService.playClick();
      setLoading(true);
      setError(null);
      try {
          const result = await apiService.login(email, password);
          if (result.success) {
               if (expectedRole && result.role !== expectedRole) throw new Error(`Sin permisos de ${expectedRole}.`);
               onLogin(result.role!, result.username);
          }
      } catch (err: any) {
          setError(err.message || 'Error de login.');
          audioService.playError();
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-lightbg dark:bg-darkbg p-4 transition-colors duration-300 relative overflow-hidden">
      <div className="w-full max-w-md animate-pop-in flex flex-col items-center relative z-10 glass p-8 rounded-3xl shadow-2xl border border-white/20">
          <div className="mb-10 text-center flex flex-col items-center">
              <div className="relative group">
                  <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <img src={LOLA_SVG_URL} alt="LOLA Logo" className="w-48 h-48 mb-4 animate-float filter drop-shadow-xl relative z-10" />
              </div>
              
              <h2 className="text-6xl md:text-7xl font-display text-gray-800 dark:text-gray-100 mt-2 tracking-widest drop-shadow-md">VENTAS</h2>
              <p className="text-primary mt-2 text-xl font-display tracking-wider">(on line)</p>
          </div>
          
          <div className="w-full mb-8 relative">
              <input
                  type="text"
                  placeholder="INGRESAR USUARIO"
                  value={usernameInput}
                  onFocus={() => audioService.playClick()}
                  onChange={(e) => { setUsernameInput(e.target.value); setError(null); }}
                  disabled={loading}
                  className="w-full p-5 bg-white/80 dark:bg-surfaceDark/80 backdrop-blur border-2 border-transparent focus:border-primary text-gray-800 dark:text-gray-100 rounded-2xl shadow-inner text-center text-2xl font-bold outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-primary/20"
              />
          </div>

          {loading && <div className="spinner mb-6 border-t-4 border-primary"></div>}
          {error && <p className="text-accent font-bold mb-6 text-center animate-pulse bg-red-100 dark:bg-red-900/30 py-2 px-4 rounded-lg">{error}</p>}

          <div className="w-full space-y-4">
             {isAdminInput && (
                 <button onClick={() => doLogin(atob(ENC_ADMIN_EMAIL), atob(ENC_ADMIN_PASS), ADMIN_ROLE)} disabled={loading} className="btn-3d w-full py-5 rounded-2xl font-bold text-xl text-white bg-gradient-to-r from-primary to-primaryDark shadow-3d-primary active:shadow-3d-primary-active transform hover:-translate-y-1 transition-transform">
                     ENTRAR COMO ADMINISTRADOR
                 </button>
             )}
             {isSalesInput && (
                 <button onClick={() => doLogin(atob(ENC_SALES_EMAIL), atob(ENC_SALES_PASS), SALES_ROLE)} disabled={loading} className="btn-3d w-full py-5 rounded-2xl font-bold text-xl text-white bg-gradient-to-r from-secondary to-secondaryDark shadow-3d-secondary active:shadow-3d-secondary-active transform hover:-translate-y-1 transition-transform">
                     ENTRAR COMO VENDEDOR
                 </button>
             )}
          </div>
      </div>
    </div>
  );
};

export default AuthScreen;