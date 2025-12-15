import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FeriaConfig, Sale, TipoPago, TipoUnidad } from '../types';
import { DIGITAL_PAYMENT_SOUND_BASE64, CASH_PAYMENT_SOUND_BASE64, PINTA_ADD_SOUND_BASE64, PINTA_SUB_SOUND_BASE64, LITRO_ADD_SOUND_BASE64, LITRO_SUB_SOUND_BASE64, UI_CLICK_SOUND_BASE64 } from '../constants';
import { localStorageService } from '../services/localStorageService';

interface SalesTPVProps {
    activeFeriaConfig: FeriaConfig | null;
    onAddSale: (sale: Sale) => void;
    onLogout: () => void;
    isActive?: boolean;
}

const LOLA_SVG_URL = 'https://raw.githubusercontent.com/LOLAPALUPULO/LolaVentas/034fef64afa32a2249a8be7284f6b59b63004079/lola.svg';

// --- PHYSICS COMPONENT ---
const FloatingGameLogo = ({ isActive }: { isActive: boolean }) => {
    const logoRef = useRef<HTMLImageElement>(null);
    const physicsState = useRef({
        x: window.innerWidth / 2 - 32,
        y: 100,
        vx: 4,
        vy: 4,
        tiltX: 0,
        tiltY: 0
    });
    const requestRef = useRef<number>();

    useEffect(() => {
        const handleOrientation = (event: DeviceOrientationEvent) => {
            physicsState.current.tiltX = (event.gamma || 0) * 0.5; 
            physicsState.current.tiltY = (event.beta || 0) * 0.5; 
        };
        
        if (isActive && window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation);
        }
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, [isActive]);

    const updatePhysics = useCallback(() => {
        if (!logoRef.current) return;
        
        const state = physicsState.current;
        const logoRect = logoRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        const friction = 0.95; 
        const acceleration = 0.5; 
        const bounceFactor = 0.8;
        const maxSpeed = 20;
        const minSpeed = 3;

        const hasTilt = Math.abs(state.tiltX) > 0.5 || Math.abs(state.tiltY) > 0.5;

        if (hasTilt) {
            state.vx += state.tiltX * acceleration;
            state.vy += state.tiltY * acceleration;
            state.vx *= friction;
            state.vy *= friction;
        } else {
            // Screensaver Mode
            const currentSpeed = Math.sqrt(state.vx*state.vx + state.vy*state.vy);
            if (currentSpeed < minSpeed) {
                state.vx = (state.vx > 0 ? 1 : -1) * minSpeed;
                state.vy = (state.vy > 0 ? 1 : -1) * minSpeed;
            }
        }

        state.vx = Math.max(-maxSpeed, Math.min(maxSpeed, state.vx));
        state.vy = Math.max(-maxSpeed, Math.min(maxSpeed, state.vy));

        let nextX = state.x + state.vx;
        let nextY = state.y + state.vy;

        // Screen Collision
        if (nextX <= 0) {
            nextX = 0;
            state.vx *= -1;
        } else if (nextX + logoRect.width >= viewportWidth) {
            nextX = viewportWidth - logoRect.width;
            state.vx *= -1;
        }

        if (nextY <= 0) {
            nextY = 0;
            state.vy *= -1;
        } else if (nextY + logoRect.height >= viewportHeight) {
            nextY = viewportHeight - logoRect.height;
            state.vy *= -1;
        }

        // Element Collision (Buttons)
        const obstacles = document.querySelectorAll('.collidable');
        obstacles.forEach(obs => {
            const obsRect = obs.getBoundingClientRect();
            
            if (
                nextX < obsRect.right &&
                nextX + logoRect.width > obsRect.left &&
                nextY < obsRect.bottom &&
                nextY + logoRect.height > obsRect.top
            ) {
                const logoCenterX = nextX + logoRect.width/2;
                const logoCenterY = nextY + logoRect.height/2;
                const obsCenterX = obsRect.left + obsRect.width/2;
                const obsCenterY = obsRect.top + obsRect.height/2;

                const dx = logoCenterX - obsCenterX;
                const dy = logoCenterY - obsCenterY;
                
                const combinedHalfWidth = (logoRect.width + obsRect.width) / 2;
                const combinedHalfHeight = (logoRect.height + obsRect.height) / 2;
                
                const overlapX = combinedHalfWidth - Math.abs(dx);
                const overlapY = combinedHalfHeight - Math.abs(dy);

                if (overlapX < overlapY) {
                    state.vx *= -bounceFactor;
                    nextX = dx > 0 ? obsRect.right : obsRect.left - logoRect.width;
                } else {
                    state.vy *= -bounceFactor;
                    nextY = dy > 0 ? obsRect.bottom : obsRect.top - logoRect.height;
                }
            }
        });

        state.x = nextX;
        state.y = nextY;
        logoRef.current.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;

        requestRef.current = requestAnimationFrame(updatePhysics);
    }, []);

    useEffect(() => {
        if(isActive) requestRef.current = requestAnimationFrame(updatePhysics);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isActive, updatePhysics]);

    if (!isActive) return null;

    return (
        <img 
            ref={logoRef}
            src={LOLA_SVG_URL} 
            alt="Lola Game Ball" 
            className="fixed z-50 w-16 h-16 pointer-events-none filter drop-shadow-[0_0_5px_#FFFF00]"
            style={{ top: 0, left: 0 }} 
        />
    );
};

export const SalesTPV: React.FC<SalesTPVProps> = ({ activeFeriaConfig, onAddSale, onLogout, isActive = true }) => {
    const [pintaCount, setPintaCount] = useState(0);
    const [litroCount, setLitroCount] = useState(0);
    const [activeButton, setActiveButton] = useState<string | null>(null); 
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingOrders, setPendingOrders] = useState<Sale[]>([]);

    const digitalSoundRef = useRef(new Audio(DIGITAL_PAYMENT_SOUND_BASE64));
    const billeteSoundRef = useRef(new Audio(CASH_PAYMENT_SOUND_BASE64));
    const pintaAddSoundRef = useRef(new Audio(PINTA_ADD_SOUND_BASE64));
    const pintaSubSoundRef = useRef(new Audio(PINTA_SUB_SOUND_BASE64));
    const litroAddSoundRef = useRef(new Audio(LITRO_ADD_SOUND_BASE64));
    const litroSubSoundRef = useRef(new Audio(LITRO_SUB_SOUND_BASE64));

    useEffect(() => {
      const storedPending = localStorageService.getPendingOrders();
      if (storedPending.length > 0) setPendingOrders(storedPending);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
    }, []);

    // Helper to play sound safely
    const playSound = (audio: HTMLAudioElement) => {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play error", e));
    };

    const total = Math.round((pintaCount * (activeFeriaConfig?.pintaPrice || 0)) + (litroCount * (activeFeriaConfig?.litroPrice || 0)));
    const hasItems = total > 0;

    const handleIncrement = (type: TipoUnidad) => {
        if (type === 'PINTA') {
            setPintaCount(p => p + 1);
            playSound(pintaAddSoundRef.current);
        } else {
            setLitroCount(l => l + 1);
            playSound(litroAddSoundRef.current);
        }
    };

    const handleDecrement = (type: TipoUnidad) => {
        if (type === 'PINTA' && pintaCount > 0) {
            setPintaCount(p => p - 1);
            playSound(pintaSubSoundRef.current);
        } else if (type === 'LITRO' && litroCount > 0) {
            setLitroCount(l => l - 1);
            playSound(litroSubSoundRef.current);
        }
    };

    const handlePayment = (method: TipoPago) => {
        if (total === 0) return;
        
        if (method === 'DIGITAL') playSound(digitalSoundRef.current);
        else playSound(billeteSoundRef.current);

        const newSale: Sale = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            items: { pinta: pintaCount, litro: litroCount },
            total: total,
            paymentMethod: method
        };

        setActiveButton(method);
        onAddSale(newSale); 

        setTimeout(() => {
            setPintaCount(0);
            setLitroCount(0);
            setActiveButton(null);
        }, 500);
    };

    if (!activeFeriaConfig) return <div className="flex items-center justify-center h-screen bg-black text-white font-display">NO GAME DETECTED</div>;

    return (
        <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-black p-2 border-4 border-blue-700 rounded-lg box-border relative font-mono text-white">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
                .font-arcade { font-family: 'Press Start 2P', cursive; }
                .text-shadow-neon { text-shadow: 0 0 5px #FFFF00; }
                .shadow-neon-blue { box-shadow: 0 0 10px #2121DE, inset 0 0 10px #2121DE; }
                .shadow-neon-red { box-shadow: 0 0 10px #FF0000; }
            `}</style>
            
            <FloatingGameLogo isActive={isActive} />

            {/* Header */}
            <div className="flex-none flex justify-between items-center mb-2 border-b-2 border-blue-700 pb-2 z-10 bg-black">
                <div className="font-arcade">
                    <h1 className="text-yellow-400 text-sm md:text-xl">LOLA<span className="text-white text-[10px]">VENTAS</span></h1>
                    <p className="text-pink-400 text-[8px] md:text-[10px] truncate max-w-[200px]">{activeFeriaConfig.name}</p>
                </div>
                <div className="text-right font-arcade">
                    <div className={`text-[8px] md:text-[10px] ${isOnline ? 'text-green-400' : 'text-red-500 animate-pulse'}`}>
                        {isOnline ? 'ONLINE' : `OFFLINE (${pendingOrders.length})`}
                    </div>
                    <button onClick={onLogout} className="collidable text-[8px] md:text-[10px] text-white underline hover:text-red-500 mt-1">EXIT</button>
                </div>
            </div>

            {/* Game Grid */}
            <div className="flex-1 flex gap-2 min-h-0 mb-2 overflow-y-auto z-10">
                {/* Pinta Column */}
                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex-grow border-2 border-cyan-400 p-1 flex flex-col items-center justify-center relative min-h-[80px] font-arcade">
                        <span className="text-cyan-400 text-[10px] absolute top-1">PINTA</span>
                        <span className="text-white text-[8px] absolute top-5">${activeFeriaConfig.pintaPrice}</span>
                        <span className="text-2xl md:text-4xl text-yellow-400 mt-4">{pintaCount}</span>
                    </div>
                    <button onClick={() => handleIncrement('PINTA')} className="collidable bg-blue-800 text-white py-3 md:py-4 text-xl md:text-2xl hover:bg-white hover:text-blue-800 border-2 border-white shadow-neon-blue flex-none font-arcade">+</button>
                    {pintaCount > 0 && <button onClick={() => handleDecrement('PINTA')} className="collidable border-2 border-red-500 text-red-500 py-1 md:py-2 hover:bg-red-900 flex-none font-arcade">-</button>}
                </div>

                {/* Litro Column */}
                <div className="flex-1 flex flex-col gap-2">
                        <div className="flex-grow border-2 border-pink-400 p-1 flex flex-col items-center justify-center relative min-h-[80px] font-arcade">
                        <span className="text-pink-400 text-[10px] absolute top-1">LITRO</span>
                        <span className="text-white text-[8px] absolute top-5">${activeFeriaConfig.litroPrice}</span>
                        <span className="text-2xl md:text-4xl text-yellow-400 mt-4">{litroCount}</span>
                    </div>
                    <button onClick={() => handleIncrement('LITRO')} className="collidable bg-pink-500 text-black py-3 md:py-4 text-xl md:text-2xl hover:bg-white hover:text-pink-800 border-2 border-white shadow-neon-red flex-none font-arcade">+</button>
                        {litroCount > 0 && <button onClick={() => handleDecrement('LITRO')} className="collidable border-2 border-red-500 text-red-500 py-1 md:py-2 hover:bg-red-900 flex-none font-arcade">-</button>}
                </div>
            </div>

            {/* Score / Total */}
            <div className="flex-none border-2 border-white p-2 mb-2 text-center bg-gray-900 z-10 font-arcade">
                <p className="text-[8px] md:text-[10px] text-gray-400">SCORE (TOTAL)</p>
                <p className="text-2xl md:text-4xl text-yellow-400 text-shadow-neon">${total.toLocaleString()}</p>
            </div>

            {/* Controls */}
            <div className="flex-none grid grid-cols-2 gap-2 h-24 md:h-32 pb-4 z-10 font-arcade">
                <button 
                    onClick={() => handlePayment('DIGITAL')} 
                    disabled={!hasItems}
                    className={`collidable border-2 border-cyan-400 text-cyan-400 flex flex-col items-center justify-center hover:bg-cyan-400 hover:text-black transition-colors ${!hasItems && 'opacity-30'} text-xs md:text-sm`}
                >
                    <span>$ DIGITAL</span>
                </button>
                <button 
                    onClick={() => handlePayment('EFECTIVO')} 
                    disabled={!hasItems}
                    className={`collidable border-2 border-orange-400 text-orange-400 flex flex-col items-center justify-center hover:bg-orange-400 hover:text-black transition-colors ${!hasItems && 'opacity-30'} text-xs md:text-sm`}
                >
                    <span>$ BILLETE</span>
                </button>
            </div>
        </div>
    );
};
