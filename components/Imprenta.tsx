import React, { useState } from 'react';
import { Printer, Settings, ExternalLink, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

interface ImprentaProps {
  imprentaUrl: string;
  onOpenSettings: () => void;
}

export const Imprenta: React.FC<ImprentaProps> = ({ imprentaUrl, onOpenSettings }) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
    setLoading(true);
  };

  if (!imprentaUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in my-auto min-h-[400px]">
        <div className="bg-slate-100 p-5 rounded-2xl mb-4 border border-slate-200">
          <Printer className="w-10 h-10 text-slate-700" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">Configurar Imprenta</h2>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          Para ver el contenido de la Imprenta, ingresa un enlace válido (URL) en el panel de Ajustes del sistema.
        </p>
        <button 
          onClick={onOpenSettings}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-semibold text-xs flex items-center shadow-xs transition-colors"
        >
          <Settings className="w-4 h-4 mr-1.5" /> Abrir Ajustes de Oficina
        </button>
      </div>
    );
  }

  // Ensure url starts with http:// or https:// if valid
  let formattedUrl = imprentaUrl;
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'https://' + formattedUrl;
  }

  return (
    <div className="w-full h-full flex flex-col p-0 overflow-hidden">
      {/* Frame Container */}
      <div className="flex-1 bg-white relative overflow-hidden h-full w-full">
        {loading && (
          <div className="absolute inset-x-0 inset-y-0 bg-gray-50/80 flex flex-col items-center justify-center z-10">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-gray-600">Conectando con la Imprenta...</p>
          </div>
        )}
        <iframe 
          key={iframeKey}
          id="imprenta-frame"
          src={formattedUrl}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          title="Imprenta Embed"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};
