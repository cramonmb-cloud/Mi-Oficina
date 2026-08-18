import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  User, 
  Download, 
  Copy, 
  Check, 
  Edit3, 
  RotateCcw, 
  Sparkles, 
  Calendar, 
  Building2, 
  DollarSign, 
  Clock, 
  Save, 
  Printer, 
  ChevronRight, 
  Search, 
  AlertCircle,
  Eye
} from 'lucide-react';
import { Employee, Plaza } from '../types';
import jsPDF from 'jspdf';

interface ContractsControlProps {
  employees: Employee[];
  plazas: Plaza[];
  companyName?: string;
  companyLogoUrl?: string;
  currentUser?: Employee | null;
}

const DEFAULT_CONTRACT_TEMPLATE = `CONTRATO INDIVIDUAL DE TRABAJO POR TIEMPO DETERMINADO (6 MESES)

En la ciudad de {PLAZA}, con fecha {FECHA_ACTUAL_TEXTO}, comparecen por una parte {EMPRESA}, a quien en lo sucesivo se le denominará "EL PATRÓN", y por la otra parte el (la) C. {NOMBRE_COMPLETO}, con CURP {CURP}, a quien en lo sucesivo se le denominará "EL TRABAJADOR", mismos que convienen en celebrar el presente Contrato Individual de Trabajo bajo las siguientes:

DECLARACIONES

I. DECLARA "EL PATRÓN":
a) Ser una entidad legalmente constituida conforme a las leyes mexicanas, con facultades para celebrar el presente contrato laboral.
b) Que tiene su domicilio operativo en la plaza de {PLAZA} y requiere de los servicios profesionales y laborales de "EL TRABAJADOR".

II. DECLARA "EL TRABAJADOR":
a) Llamarse como ha quedado asentado, de nacionalidad mexicana, mayor de edad, con clave única de registro de población {CURP} y número de contacto celular {CELULAR}.
b) Que cuenta con la capacidad legal, experiencia y conocimientos necesarios para desempeñar las actividades inherentes al puesto de {PUESTO}.
c) Que su fecha de nacimiento es {FECHA_NACIMIENTO} y su fecha de ingreso original a la empresa fue el {FECHA_INGRESO}.

CLÁUSULAS

PRIMERA. OBJETO Y PUESTO.
"EL PATRÓN" contrata los servicios de "EL TRABAJADOR" para desempeñar el puesto y funciones de {PUESTO} en la categoría de {CATEGORIA}, adscrito a la plaza de {PLAZA}.

SEGUNDA. VIGENCIA Y RENOVACIÓN DEL CONTRATO.
El presente contrato se celebra por TIEMPO DETERMINADO con una duración improrrogable de {DURACION_CONTRATO} (periodo semestral), iniciando sus efectos el día {FECHA_INICIO_CONTRATO} y concluyendo el día {FECHA_FIN_CONTRATO}. Ambas partes acuerdan que las renovaciones subsecuentes estarán sujetas a la evaluación de desempeño y necesidades operativas de la empresa.

TERCERA. JORNADA DE TRABAJO.
"EL TRABAJADOR" conviene en laborar dentro del siguiente horario: {HORARIO}, contando con los descansos y periodos legales aplicables conforme a la Ley Federal del Trabajo.

CUARTA. SALARIO Y FORMA DE PAGO.
"EL PATRÓN" cubrirá a "EL TRABAJADOR" como remuneración por sus servicios la cantidad de {SALARIO}, pagaderos en las fechas y periodicidad acostumbradas por la empresa, previa deducción de los impuestos y retenciones de ley.

QUINTA. VACACIONES Y PRESTACIONES.
En virtud del esquema de contratación semestral de 6 meses, "EL TRABAJADOR" gozará de las prestaciones correspondientes al periodo laborado, incluyendo el derecho a sus días de vacaciones proporcionales por cada periodo de 6 meses trabajados, así como aguinaldo y prima vacacional en los términos legales.

SEXTA. CONFIDENCIALIDAD.
"EL TRABAJADOR" se obliga a guardar estricta confidencialidad respecto a la información, cartera de clientes, procesos operativos y documentación de "EL PATRÓN" a la que tenga acceso con motivo de sus funciones.

Leído que fue el presente contrato por las partes y enteradas de su contenido, alcance y fuerza legal, lo firman por duplicado en la fecha y lugar señalados en el encabezado.



_________________________________               _________________________________
           EL PATRÓN                                      EL TRABAJADOR
       {EMPRESA}                                {NOMBRE_COMPLETO}
                                                       CURP: {CURP}
`;

export const ContractsControl: React.FC<ContractsControlProps> = ({
  employees,
  plazas,
  companyName = 'Mi Oficina',
  companyLogoUrl,
  currentUser
}) => {
  // Navigation tabs: 'generator' | 'template_editor'
  const [activeTab, setActiveTab] = useState<'generator' | 'template_editor'>('generator');

  // Employee Selection
  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    return employees.length > 0 ? employees[0].id : '';
  });
  const [empSearch, setEmpSearch] = useState('');

  // Contract Parameters Form
  const [startDate, setStartDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [durationMonths, setDurationMonths] = useState<number>(6);
  const [salaryText, setSalaryText] = useState<string>('Sueldo convenido según tabulador oficial');
  const [scheduleText, setScheduleText] = useState<string>('Lunes a Viernes de 9:00 a 18:00 hrs y Sábados de 9:00 a 14:00 hrs');
  const [customPlaza, setCustomPlaza] = useState<string>('');

  // Machote Template State (stored in localStorage)
  const [contractTemplate, setContractTemplate] = useState<string>(() => {
    const saved = localStorage.getItem('contractMachoteTemplate');
    return saved || DEFAULT_CONTRACT_TEMPLATE;
  });

  const [copiedText, setCopiedText] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Selected Employee object
  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || null;
  }, [employees, selectedEmpId]);

  // Update default values when selected employee changes
  useEffect(() => {
    if (selectedEmployee) {
      if (selectedEmployee.hireDate) {
        setStartDate(selectedEmployee.hireDate);
      }
      setCustomPlaza(selectedEmployee.plaza || '');
    }
  }, [selectedEmployee]);

  // Calculate End Date based on startDate and durationMonths
  const calculatedEndDate = useMemo(() => {
    if (!startDate) return '';
    try {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(start);
      end.setMonth(start.getMonth() + durationMonths);
      end.setDate(end.getDate() - 1); // Ends day before next cycle
      return end.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }, [startDate, durationMonths]);

  // Helper date formatter
  const formatDateToSpanishText = (dateString?: string) => {
    if (!dateString) return 'Fecha no especificada';
    try {
      const d = new Date(dateString + 'T00:00:00');
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Compile / Process Template with Real Dynamic Values
  const generatedContractText = useMemo(() => {
    if (!selectedEmployee) {
      return 'Por favor selecciona un colaborador para generar la vista previa del contrato.';
    }

    const todayText = formatDateToSpanishText(new Date().toISOString().split('T')[0]);
    const startDateFormatted = formatDateToSpanishText(startDate);
    const endDateFormatted = formatDateToSpanishText(calculatedEndDate);
    const hireDateFormatted = formatDateToSpanishText(selectedEmployee.hireDate);
    const birthDateFormatted = formatDateToSpanishText(selectedEmployee.birthDate);

    const fullName = `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim();
    const durationLabel = durationMonths === 6 
      ? '6 meses (contrato semestral)' 
      : durationMonths === 12 
      ? '1 año completo' 
      : `${durationMonths} meses`;

    let text = contractTemplate;

    const replacements: Record<string, string> = {
      '{NOMBRE_COMPLETO}': fullName.toUpperCase(),
      '{NOMBRE}': (selectedEmployee.firstName || '').toUpperCase(),
      '{APELLIDOS}': (selectedEmployee.lastName || '').toUpperCase(),
      '{PUESTO}': (selectedEmployee.position || 'Colaborador General').toUpperCase(),
      '{CATEGORIA}': (selectedEmployee.category || 'Oficina').toUpperCase(),
      '{PLAZA}': (customPlaza || selectedEmployee.plaza || 'Oficina Central').toUpperCase(),
      '{CURP}': (selectedEmployee.curp || 'No registrada').toUpperCase(),
      '{CELULAR}': selectedEmployee.email || selectedEmployee.phone || 'No registrado',
      '{FECHA_INGRESO}': hireDateFormatted,
      '{FECHA_NACIMIENTO}': birthDateFormatted,
      '{FECHA_INICIO_CONTRATO}': startDateFormatted,
      '{FECHA_FIN_CONTRATO}': endDateFormatted,
      '{DURACION_CONTRATO}': durationLabel,
      '{SALARIO}': salaryText,
      '{HORARIO}': scheduleText,
      '{EMPRESA}': companyName.toUpperCase(),
      '{FECHA_ACTUAL_TEXTO}': todayText,
      '{FECHA_ACTUAL}': new Date().toISOString().split('T')[0]
    };

    Object.entries(replacements).forEach(([key, val]) => {
      text = text.replaceAll(key, val);
    });

    return text;
  }, [selectedEmployee, contractTemplate, startDate, calculatedEndDate, durationMonths, salaryText, scheduleText, customPlaza, companyName]);

  // Insert Variable Token into Machote Editor
  const insertToken = (token: string) => {
    setContractTemplate(prev => prev + ` ${token} `);
  };

  // Save Custom Machote
  const handleSaveMachote = () => {
    localStorage.setItem('contractMachoteTemplate', contractTemplate);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Reset to Default Machote
  const handleResetMachote = () => {
    if (window.confirm('¿Deseas restablecer el machote al formato predeterminado oficial?')) {
      setContractTemplate(DEFAULT_CONTRACT_TEMPLATE);
      localStorage.setItem('contractMachoteTemplate', DEFAULT_CONTRACT_TEMPLATE);
    }
  };

  // Copy Contract Text
  const handleCopyContract = () => {
    navigator.clipboard.writeText(generatedContractText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Generate Formal PDF with jsPDF
  const handleDownloadPDF = () => {
    if (!selectedEmployee) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      const lineHeight = 5.2;
      let cursorY = margin;

      // Header on Page 1
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(companyName.toUpperCase(), pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`EXPEDIENTE LABORAL | CONTRATACIÓN Y ASIGNACIÓN DE PLAZA`, pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 3;

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 7;

      // Split contract text into paragraphs and lines
      const paragraphs = generatedContractText.split('\n');

      paragraphs.forEach((p) => {
        const isHeader = p.startsWith('CONTRATO') || p.startsWith('DECLARACIONES') || p.startsWith('CLÁUSULAS');
        const isSignatureLine = p.includes('_____');

        if (isHeader) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          cursorY += 2;
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
        }

        if (p.trim() === '') {
          cursorY += 3.5;
          return;
        }

        const lines = doc.splitTextToSize(p, contentWidth);

        lines.forEach((line: string) => {
          // Check page break
          if (cursorY + lineHeight > pageHeight - margin - 10) {
            // Footer with page number
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`Página ${doc.getNumberOfPages()} - ${companyName}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            
            doc.addPage();
            cursorY = margin;

            // Optional page top small banner
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`${companyName} - Contrato Laboral: ${selectedEmployee.firstName} ${selectedEmployee.lastName}`, margin, cursorY - 5);
            doc.line(margin, cursorY - 3, pageWidth - margin, cursorY - 3);
          }

          if (isHeader) {
            doc.text(line, pageWidth / 2, cursorY, { align: 'center' });
          } else if (isSignatureLine) {
            doc.text(line, pageWidth / 2, cursorY, { align: 'center' });
          } else {
            doc.text(line, margin, cursorY);
          }

          cursorY += lineHeight;
        });
      });

      // Final page footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${doc.getNumberOfPages()} - ${companyName}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save PDF
      const cleanName = `${selectedEmployee.firstName}_${selectedEmployee.lastName}`.replace(/\s+/g, '_');
      doc.save(`Contrato_${cleanName}_${startDate}.pdf`);
    } catch (e) {
      console.error("Error generating contract PDF:", e);
      alert("Hubo un error al generar el archivo PDF.");
    }
  };

  // Filtered employee list for search
  const filteredEmployeesList = useMemo(() => {
    if (!empSearch.trim()) return employees;
    const q = empSearch.toLowerCase();
    return employees.filter(e => 
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      (e.plaza && e.plaza.toLowerCase().includes(q)) ||
      (e.position && e.position.toLowerCase().includes(q)) ||
      (e.curp && e.curp.toLowerCase().includes(q))
    );
  }, [employees, empSearch]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header & Subtabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Gestión de Contratos Laborales</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Generador de contratos individuales en PDF a partir de datos del personal y machotes dinámicos.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'generator'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generar Contrato
          </button>
          <button
            onClick={() => setActiveTab('template_editor')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'template_editor'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar Machote (Plantilla)
          </button>
        </div>
      </div>

      {activeTab === 'generator' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Form & Selector (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Step 1: Employee Selector */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-500" />
                  1. Seleccionar Colaborador
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {filteredEmployeesList.length} disponibles
                </span>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar colaborador..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                />
              </div>

              {/* Employee Dropdown / Picker */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {filteredEmployeesList.map(emp => {
                  const isSelected = emp.id === selectedEmpId;
                  return (
                    <div
                      key={emp.id}
                      onClick={() => setSelectedEmpId(emp.id)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs ${
                        isSelected 
                          ? 'bg-slate-900 text-white shadow-xs font-semibold' 
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate">{emp.firstName} {emp.lastName}</p>
                          <p className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                            {emp.plaza || 'Sin Plaza'} • {emp.position || 'Colaborador'}
                          </p>
                        </div>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                    </div>
                  );
                })}
              </div>

              {selectedEmployee && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">CURP:</span>
                    <strong className="font-mono text-slate-800">{selectedEmployee.curp || 'No registrada'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ingreso Original:</span>
                    <strong className="font-mono text-slate-800">{selectedEmployee.hireDate || 'No registrada'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plaza Oficial:</span>
                    <strong className="text-slate-800">{selectedEmployee.plaza || 'Sin Plaza'}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Contract Specific Parameters */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                2. Parámetros y Vigencia del Contrato
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Start Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Duración
                  </label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value={6}>6 Meses (Semestral)</option>
                    <option value={3}>3 Meses (Periodo de Prueba)</option>
                    <option value={12}>1 Año (Anual)</option>
                    <option value={24}>2 Años</option>
                  </select>
                </div>

                {/* Calculated End Date (Read Only) */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Fecha de Vencimiento Calculada
                  </label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 font-semibold">
                    {calculatedEndDate || 'N/A'} ({formatDateToSpanishText(calculatedEndDate)})
                  </div>
                </div>

                {/* Plaza de Prestación */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Plaza / Ciudad de Prestación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Guadalajara, Jalisco"
                    value={customPlaza}
                    onChange={(e) => setCustomPlaza(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                {/* Salario */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Salario y Remuneración
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. $10,000.00 MXN mensuales"
                    value={salaryText}
                    onChange={(e) => setSalaryText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                {/* Horario */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Jornada y Horario de Trabajo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Lunes a Viernes de 9:00 a 18:00 hrs"
                    value={scheduleText}
                    onChange={(e) => setScheduleText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={!selectedEmployee}
                  className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Descargar Contrato en PDF
                </button>
                <button
                  type="button"
                  onClick={handleCopyContract}
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  title="Copiar texto del contrato"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                  {copiedText ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Live Contract Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-slate-500" />
                Vista Previa del Documento Oficial
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : 'Sin Selección'}
              </span>
            </div>

            {/* Document Sheet Simulation */}
            <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-6 sm:p-10 font-serif text-slate-800 text-xs sm:text-[13px] leading-relaxed max-h-[800px] overflow-y-auto whitespace-pre-wrap select-text">
              {generatedContractText}
            </div>
          </div>

        </div>
      ) : (
        /* Machote / Template Editor Tab */
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Editor del Machote Oficial de Contrato</h3>
              <p className="text-xs text-slate-500">
                Modifica el texto maestro. Las variables entre llaves como <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono font-bold text-[11px]">&#123;NOMBRE_COMPLETO&#125;</code> serán reemplazadas automáticamente al generar cada contrato.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResetMachote}
                className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                title="Restablecer machote predeterminado"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Predeterminado
              </button>
              <button
                type="button"
                onClick={handleSaveMachote}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                {savedSuccess ? 'Guardado Exitoso' : 'Guardar Machote'}
              </button>
            </div>
          </div>

          {/* Dynamic Variables Chips Helper */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Haz clic en cualquier variable para insertarla en el machote:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { token: '{NOMBRE_COMPLETO}', label: 'Nombre Completo' },
                { token: '{NOMBRE}', label: 'Nombre' },
                { token: '{APELLIDOS}', label: 'Apellidos' },
                { token: '{CURP}', label: 'CURP' },
                { token: '{PUESTO}', label: 'Puesto' },
                { token: '{CATEGORIA}', label: 'Categoría' },
                { token: '{PLAZA}', label: 'Plaza' },
                { token: '{CELULAR}', label: 'Celular' },
                { token: '{FECHA_INGRESO}', label: 'Fecha Ingreso' },
                { token: '{FECHA_NACIMIENTO}', label: 'Fecha Nacimiento' },
                { token: '{FECHA_INICIO_CONTRATO}', label: 'Inicio Contrato' },
                { token: '{FECHA_FIN_CONTRATO}', label: 'Fin Contrato' },
                { token: '{DURACION_CONTRATO}', label: 'Duración (6 meses)' },
                { token: '{SALARIO}', label: 'Salario' },
                { token: '{HORARIO}', label: 'Horario' },
                { token: '{EMPRESA}', label: 'Empresa' },
                { token: '{FECHA_ACTUAL_TEXTO}', label: 'Fecha de Hoy (Texto)' }
              ].map(item => (
                <button
                  key={item.token}
                  type="button"
                  onClick={() => insertToken(item.token)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-slate-200"
                  title={`Insertar ${item.token}`}
                >
                  <span className="text-indigo-600 font-bold">+</span> {item.token}
                </button>
              ))}
            </div>
          </div>

          {/* Machote Text Area */}
          <div>
            <textarea
              rows={22}
              value={contractTemplate}
              onChange={(e) => setContractTemplate(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none font-mono text-xs text-slate-800 leading-relaxed transition-all resize-y"
              placeholder="Escribe o pega aquí el machote de contrato..."
            />
          </div>

          {/* Bottom Save Bar */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-slate-400">
              Caracteres: {contractTemplate.length}
            </span>
            <button
              type="button"
              onClick={handleSaveMachote}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
              {savedSuccess ? 'Machote Guardado' : 'Guardar Cambios del Machote'}
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
