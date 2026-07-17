import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Copy, 
  Check, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Key, 
  Sliders, 
  AlertCircle,
  HelpCircle,
  Code
} from 'lucide-react';

interface NewInstallationProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
}

export function NewInstallation({ onCancel, showCancelButton = false }: NewInstallationProps) {
  const [pastedCode, setPastedCode] = useState('');
  const [parsedConfig, setParsedConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [currentLocalConfig, setCurrentLocalConfig] = useState<any>(null);

  // Load existing config on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('firebase_config');
      if (saved) {
        setCurrentLocalConfig(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleParseConfig = () => {
    setError(null);
    setParsedConfig(null);

    if (!pastedCode.trim()) {
      setError('Por favor, pega el bloque de código de configuración.');
      return;
    }

    try {
      // Regular expressions to search for typical firebase config keys
      const configKeys = [
        'apiKey',
        'authDomain',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId',
        'measurementId'
      ];

      const extracted: Record<string, string> = {};

      configKeys.forEach(key => {
        // Match patterns like: apiKey: "value", apiKey: 'value', "apiKey": "value"
        const regex = new RegExp(`(?:['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"])`, 'i');
        const match = pastedCode.match(regex);
        if (match && match[1]) {
          extracted[key] = match[1];
        }
      });

      // Validation
      if (!extracted.apiKey || !extracted.projectId) {
        // Fallback: try to parse as JSON if the user only pasted the JSON object itself
        try {
          // Clean possible JS object to make it JSON-like
          let cleaned = pastedCode
            .trim()
            .replace(/(?:const|var|let)?\s*\w*\s*=\s*/, '') // Remove variable definition
            .replace(/;/g, '') // Remove semicolons
            .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":') // Quote keys
            .replace(/'/g, '"'); // Convert single quotes to double quotes
          
          // Try to locate object boundary
          const startIdx = cleaned.indexOf('{');
          const endIdx = cleaned.lastIndexOf('}');
          if (startIdx !== -1 && endIdx !== -1) {
            cleaned = cleaned.substring(startIdx, endIdx + 1);
          }

          const parsedJSON = JSON.parse(cleaned);
          configKeys.forEach(key => {
            if (parsedJSON[key]) {
              extracted[key] = parsedJSON[key];
            }
          });
        } catch (jsonErr) {
          // JSON parsing failed, use the extracted regex fields
        }
      }

      if (!extracted.apiKey || !extracted.projectId) {
        throw new Error('No se pudo encontrar una configuración válida de Firebase. Asegúrate de incluir al menos apiKey y projectId.');
      }

      setParsedConfig(extracted);
    } catch (err: any) {
      setError(err.message || 'Error al analizar el código. Por favor verifica el formato.');
    }
  };

  const handleSaveConfig = () => {
    if (!parsedConfig) return;

    try {
      localStorage.setItem('firebase_config', JSON.stringify(parsedConfig));
      setSuccess(true);
      
      // Toast notification and reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError('Error al guardar la configuración localmente.');
    }
  };

  const handleClearConfig = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar la configuración local actual? Esto restaurará la configuración por defecto.')) {
      localStorage.removeItem('firebase_config');
      window.location.reload();
    }
  };

  const handleCopyToClipboard = (text: string, varName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(varName);
    setTimeout(() => {
      setCopiedVar(null);
    }, 2000);
  };

  const getVercelEnvSnippet = () => {
    if (!parsedConfig && !currentLocalConfig) return '';
    const configToUse = parsedConfig || currentLocalConfig;
    return `VITE_FIREBASE_API_KEY="${configToUse.apiKey || ''}"
VITE_FIREBASE_AUTH_DOMAIN="${configToUse.authDomain || ''}"
VITE_FIREBASE_PROJECT_ID="${configToUse.projectId || ''}"
VITE_FIREBASE_STORAGE_BUCKET="${configToUse.storageBucket || ''}"
VITE_FIREBASE_MESSAGING_SENDER_ID="${configToUse.messagingSenderId || ''}"
VITE_FIREBASE_APP_ID="${configToUse.appId || ''}"
VITE_FIREBASE_MEASUREMENT_ID="${configToUse.measurementId || ''}"`;
  };

  const activeConfigData = parsedConfig || currentLocalConfig;

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
      
      <div className="w-full max-w-4xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 md:p-10 flex flex-col md:flex-row gap-8 relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Left Side: Setup Panel */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <Database className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white">
                Instalación de Base de Datos
              </h1>
            </div>

            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Configura o actualiza tu base de datos de Firebase pegando el bloque de código SDK de tu consola de Firebase. La configuración se guardará localmente en tu navegador de forma segura.
            </p>

            {/* Paste Area */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Código de Firebase Config
                </label>
                <textarea
                  className="w-full h-48 bg-slate-950/60 border border-white/10 rounded-xl p-4 text-xs font-mono text-indigo-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
                  placeholder={`// Pega tu código aquí, ej:
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "...",
  projectId: "...",
  // ...
};`}
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 animate-pulse">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>¡Configuración guardada! Reiniciando aplicación...</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleParseConfig}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                  <Code className="w-4 h-4" /> Analizar Código
                </button>

                {showCancelButton && onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-slate-300 rounded-xl text-sm font-semibold transition-colors border border-white/5"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Preview extracted config */}
            {parsedConfig && (
              <div className="mt-6 border border-indigo-500/30 bg-indigo-500/5 rounded-xl p-4 animate-fade-in">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Configuración Detectada
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">ID del Proyecto:</span>
                    <p className="font-semibold text-slate-200 truncate">{parsedConfig.projectId}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">API Key:</span>
                    <p className="font-semibold text-slate-200 truncate">{parsedConfig.apiKey.substring(0, 8)}...</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Guardar y Aplicar Cambios
                </button>
              </div>
            )}
          </div>

          {currentLocalConfig && !parsedConfig && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Base de datos local activa:</span>
                  <span className="text-sm font-bold text-indigo-300">{currentLocalConfig.projectId}</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearConfig}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Eliminar Configuración Local"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Vercel / Production Deploy Guidelines */}
        <div className="flex-1 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8">
          <div>
            <h2 className="text-lg font-bold text-slate-200 mb-2 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" /> Producción en Vercel
            </h2>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              Para publicar en GitHub sin exponer datos sensibles, mantén el repositorio limpio de credenciales. Define estas variables en el panel de control de Vercel (Environment Variables):
            </p>

            {activeConfigData ? (
              <div className="space-y-3">
                <div className="relative">
                  <div className="flex justify-between items-center bg-slate-950/40 px-3 py-2 rounded-t-lg border-t border-x border-white/10">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Variables (.env)</span>
                    <button
                      type="button"
                      onClick={() => handleCopyToClipboard(getVercelEnvSnippet(), 'all_vars')}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-white/5 px-2 py-1 rounded transition-colors"
                    >
                      {copiedVar === 'all_vars' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedVar === 'all_vars' ? 'Copiado' : 'Copiar todo'}
                    </button>
                  </div>
                  <pre className="w-full bg-slate-950/80 border border-white/10 rounded-b-lg p-3 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-56 whitespace-pre">
                    {getVercelEnvSnippet()}
                  </pre>
                </div>

                <div className="text-[11px] text-slate-400 bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 leading-relaxed">
                  <strong className="text-indigo-300">💡 Instrucciones para Vercel:</strong>
                  <ol className="list-decimal list-inside space-y-1 mt-1 text-slate-400">
                    <li>Ve a tu proyecto en <span className="text-slate-300 font-semibold">Vercel &gt; Settings &gt; Environment Variables</span>.</li>
                    <li>Copia las variables de arriba y pégalas como un bloque único en el primer campo de clave.</li>
                    <li>Guarda y realiza una nueva implementación (Deploy) para que tengan efecto.</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/40 border border-dashed border-white/10 rounded-xl p-6 text-center text-slate-500 text-xs">
                Analiza o guarda una configuración para generar las variables de entorno listas para copiar.
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 flex gap-4 text-xs text-slate-500 border-t border-white/5">
            <a 
              href="https://console.firebase.google.com" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              Consola de Firebase <ExternalLink className="w-3 h-3" />
            </a>
            <a 
              href="https://vercel.com" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              Vercel Dashboard <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
