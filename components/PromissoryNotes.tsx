
import React, { useState } from 'react';
import { FileSignature, Plus, Trash2, Printer, FileText, User, Hash, Pencil } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PromissoryNotesProps {
  companyName: string;
}

interface ClientEntry {
  id: string;
  name: string;
  folio: string;
}

export const PromissoryNotes: React.FC<PromissoryNotesProps> = ({ companyName }) => {
  const [clients, setClients] = useState<ClientEntry[]>([]);
  const [currentName, setCurrentName] = useState('');
  // Default value set to 'PAGARÉ ORIGINAL'
  const [currentFolio, setCurrentFolio] = useState('PAGARÉ ORIGINAL');
  
  // Editable Legal Text State
  const [legalText, setLegalText] = useState("Por medio de la presente, los abajo firmantes manifiestan de plena conformidad que han recibido el pagaré original correspondiente a su crédito, deslindando a la empresa de cualquier responsabilidad posterior a esta firma.");

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentName.trim()) return;

    const newClient: ClientEntry = {
      id: Date.now().toString(),
      name: currentName.trim(),
      folio: currentFolio.trim() || 'PAGARÉ ORIGINAL'
    };

    setClients([...clients, newClient]);
    setCurrentName('');
    // Reset to default value instead of empty
    setCurrentFolio('PAGARÉ ORIGINAL');
  };

  const handleRemoveClient = (id: string) => {
    setClients(clients.filter(c => c.id !== id));
  };

  const generatePDF = () => {
    if (clients.length === 0) {
        alert("Agrega al menos un cliente a la lista.");
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    // Company Name Centered
    const title = companyName ? companyName.toUpperCase() : "NOMBRE DE LA FINANCIERA";
    doc.text(title, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("ACTA DE ENTREGA DE PAGARÉS", pageWidth / 2, 30, { align: 'center' });

    // --- Date ---
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de emisión: ${dateStr}`, pageWidth - 14, 40, { align: 'right' });

    // --- Legal Text (Dynamic) ---
    doc.setFontSize(11);
    doc.setTextColor(0);
    
    const splitText = doc.splitTextToSize(legalText, pageWidth - 28);
    doc.text(splitText, 14, 55);

    // --- Table ---
    const tableBody = clients.map(client => [
      client.name.toUpperCase(),
      client.folio,
      '' // Empty column for signature
    ]);

    // Calculate Y position based on text length to avoid overlap
    const textHeight = doc.getTextDimensions(splitText).h;
    const startY = 55 + textHeight + 10;

    autoTable(doc, {
      startY: startY,
      head: [['Nombre del Cliente', 'Referencia', 'Firma de Conformidad']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // Dark Slate
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 80, valign: 'middle' },
        1: { cellWidth: 40, valign: 'middle', halign: 'center' },
        2: { cellWidth: 'auto', minCellHeight: 15, valign: 'middle' } // Wider column for signature
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        lineColor: [200, 200, 200]
      },
      didParseCell: function(data) {
        // Increase row height for signature space
        if (data.section === 'body') {
            data.row.height = 20; 
        }
      }
    });

    // --- Responsible Signature (Bottom Left) ---
    const finalY = (doc as any).lastAutoTable.finalY;
    
    // Posición fija desde abajo (ej. 35 unidades desde el borde inferior)
    // El footer está a 10 unidades del borde, la firma estará encima.
    const signatureBottomMargin = 35;
    const signatureY = pageHeight - signatureBottomMargin;
    
    // Verificar si la tabla choca con el área de la firma
    // Si la tabla termina muy abajo (más allá de signatureY - margen de seguridad), agregamos página
    if (finalY > (signatureY - 20)) {
        doc.addPage();
    }

    // Dibujar línea y texto alineado a la izquierda
    const signatureXStart = 14;         // Margen izquierdo estándar
    const signatureWidth = 70;          // Longitud de la línea
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    // Línea de firma
    doc.line(signatureXStart, signatureY, signatureXStart + signatureWidth, signatureY);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0);
    // Texto centrado respecto a la línea
    doc.text("FIRMA DEL RESPONSABLE", signatureXStart + (signatureWidth / 2), signatureY + 5, { align: 'center' });

    // --- Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Documento generado por Mi Oficina - ${title}`, 14, pageHeight - 10);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }

    // Open/Save
    window.open(doc.output('bloburl'), '_blank');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-slate-800" />
            Entrega de Pagarés
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Generación de actas y recibos de entrega con firma de conformidad</p>
        </div>
        
        {clients.length > 0 && (
          <button 
            onClick={generatePDF}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg shadow-xs flex items-center text-xs font-semibold transition-all active:scale-[0.99]"
          >
            <Printer className="w-4 h-4 mr-1.5" /> Generar Documento PDF ({clients.length})
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
        
        {/* INPUT FORM */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" /> Agregar Cliente
            </h3>
            
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 bg-slate-50/50 focus:bg-white placeholder:text-slate-400"
                    placeholder="Ej: Juan Pérez López"
                    value={currentName}
                    onChange={(e) => setCurrentName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase">Referencia / Folio</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 outline-none text-slate-800 bg-slate-50/50 focus:bg-white placeholder:text-slate-400"
                    placeholder="Ej: PAGARÉ ORIGINAL"
                    value={currentFolio}
                    onChange={(e) => setCurrentFolio(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={!currentName.trim()}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center shadow-xs"
              >
                Agregar a la Lista
              </button>
            </form>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col">
            <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-600" /> Texto Legal del Acta</span>
              <Pencil className="w-3 h-3 text-slate-400" />
            </h4>
            <textarea 
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none resize-none h-28 leading-relaxed placeholder:text-slate-400"
              value={legalText}
              onChange={(e) => setLegalText(e.target.value)}
            />
          </div>
        </div>

        {/* LIST PREVIEW */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Clientes en esta Acta ({clients.length})</h3>
            {clients.length > 0 && (
              <button 
                onClick={() => { if(confirm('¿Borrar toda la lista?')) setClients([]); }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold transition-colors"
              >
                Limpiar Todo
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {clients.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <FileSignature className="w-10 h-10 mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-medium">La lista está vacía</p>
                <p className="text-[11px] text-slate-400">Agrega clientes para preparar el acta de entrega</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.map((client, index) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-lg hover:border-slate-300 transition-all group">
                    <div className="flex items-center min-w-0">
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-mono font-bold text-xs mr-3 shrink-0">
                        {index + 1}
                      </span>
                      <div className="truncate">
                        <h4 className="font-semibold text-xs text-slate-900 truncate">{client.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono">Ref: {client.folio}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveClient(client.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                      title="Quitar de la lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
