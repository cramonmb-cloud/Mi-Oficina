import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { verifyAccessCode } from '../services/dbService';
import { Employee } from '../types';

interface LoginProps {
  onLogin: (user: Employee) => void;
  appVersion: string;
  appStatusColor: string;
  isOnline: boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, appVersion, isOnline }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 3) return;

    setLoading(true);
    setError('');

    try {
      const user = await verifyAccessCode(code);
      if (user) {
        onLogin(user);
      } else {
        setError('Código incorrecto o no registrado.');
        setCode('');
      }
    } catch (err) {
      setError('Error de conexión con el servidor. Verifique su red.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    setCode(val);
    if (error) setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative select-none">
      
      {/* Top Status Indicator */}
      <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-xs">
         <span 
           className={`w-2 h-2 rounded-full ${!isOnline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} 
         />
         <span className="font-mono text-[11px]">v{appVersion}</span>
         {!isOnline && <span className="text-amber-600 text-[10px] uppercase font-bold">(Offline)</span>}
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8 transition-all">
        
        {/* Header Icon & Title */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-xs font-bold text-lg">
            O
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mi Oficina</h1>
          <p className="text-xs text-slate-500 mt-1">Sistema de Gestión y Control Administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Código de Acceso
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={code}
                onChange={handleInputChange}
                className="w-full text-center font-mono font-bold text-xl tracking-[0.25em] text-slate-900 border border-slate-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300 bg-slate-50/50 focus:bg-white"
                placeholder="••••••"
                maxLength={10}
              />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-rose-600 text-xs mt-2.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={code.length < 3 || loading}
            className={`w-full py-3 rounded-xl flex items-center justify-center font-semibold text-sm transition-all shadow-xs ${
              code.length >= 3 
                ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-[0.99]' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span className="flex items-center gap-2">
                Ingresar al Sistema <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Acceso seguro con cifrado y sincronización</span>
        </div>
      </div>
      
      <p className="mt-6 text-xs text-slate-400 font-medium">
        © {new Date().getFullYear()} Mi Oficina Enterprise
      </p>
    </div>
  );
};
