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
  Search, 
  AlertCircle,
  Eye,
  Sliders,
  Briefcase,
  MapPin,
  Settings,
  HelpCircle
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

interface StandardContractVariables {
  nombresComercialesPatron: string;
  nombreRepresentanteLegal: string;
  domicilioCompletoPatron: string;
  jurisdiccionMunicipioEstado: string;
  horarioEntrada: string;
  horarioSalida: string;
  horaInicioComida: string;
  horaFinComida: string;
  salarioNumero: string;
  salarioLetra: string;
  nacionalidadDefault: string;
  estadoCivilDefault: string;
}

const DEFAULT_STANDARD_VARIABLES: StandardContractVariables = {
  nombresComercialesPatron: 'CRÉDITOS LA FORTUNA y CREDIPLANET',
  nombreRepresentanteLegal: 'Luis Cárdenas',
  domicilioCompletoPatron: 'Av. Universidad de Guadalajara 290, Colonia Colonos Alameda, C.P. 48900, en el municipio de Autlán de Navarro, Jalisco.',
  jurisdiccionMunicipioEstado: 'Autlán de Navarro, Jalisco',
  horarioEntrada: '10:00 a.m.',
  horarioSalida: '8:00 p.m.',
  horaInicioComida: '2:00 p.m.',
  horaFinComida: '4:00 p.m.',
  salarioNumero: '3,000.00',
  salarioLetra: 'Tres mil pesos 00/100 M.N.',
  nacionalidadDefault: 'Mexicana',
  estadoCivilDefault: 'Soltero(a)'
};

const DEFAULT_CONTRACT_TEMPLATE = `CONTRATO INDIVIDUAL DE TRABAJO POR TIEMPO DETERMINADO (6 MESES)

En la ciudad de [JURISDICCION_MUNICIPIO_ESTADO], comparecen por una parte la empresa que opera bajo los nombres comerciales de [NOMBRES_COMERCIALES_PATRON], representada legalmente en este acto por el C. [NOMBRE_REPRESENTANTE_LEGAL], con domicilio ubicado en [DOMICILIO_COMPLETO_PATRON], a quien en lo sucesivo se le denominará "EL PATRÓN", y por la otra parte el (la) C. [NOMBRE_TRABAJADOR], de nacionalidad [NACIONALIDAD_TRABAJADOR], de [EDAD_TRABAJADOR] años de edad, estado civil [ESTADO_CIVIL_TRABAJADOR], sexo [SEXO_TRABAJADOR], con Clave Única de Registro de Población [CURP_TRABAJADOR], con domicilio particular en [DOMICILIO_COMPLETO_TRABAJADOR], a quien en lo sucesivo se le denominará "EL TRABAJADOR", mismos que convienen en celebrar el presente Contrato Individual de Trabajo bajo las siguientes:

DECLARACIONES

I. DECLARA "EL PATRÓN":
a) Ser una entidad comercial y patronal debidamente establecida, con facultades suficientes para contratar y obligarse en los términos del presente instrumento.
b) Que tiene su domicilio legal y operativo en [DOMICILIO_COMPLETO_PATRON] y requiere de los servicios personales y subordinados de "EL TRABAJADOR" para el desarrollo de sus actividades operativas.

II. DECLARA "EL TRABAJADOR":
a) Llamarse como ha quedado asentado, ser de nacionalidad [NACIONALIDAD_TRABAJADOR], de [EDAD_TRABAJADOR] años de edad, de sexo [SEXO_TRABAJADOR], estado civil [ESTADO_CIVIL_TRABAJADOR], con CURP [CURP_TRABAJADOR] y tener su domicilio particular en [DOMICILIO_COMPLETO_TRABAJADOR].
b) Que cuenta con la aptitud, conocimientos y capacidad legal indispensables para desempeñar a satisfacción el puesto de [PUESTO_TRABAJADOR].

CLÁUSULAS

PRIMERA. OBJETO Y PUESTO.
"EL PATRÓN" contrata los servicios personales y subordinados de "EL TRABAJADOR" para desempeñar las funciones correspondientes al puesto de [PUESTO_TRABAJADOR], obligándose este último a desempeñar sus labores con la mayor eficiencia, lealtad y esmero.

SEGUNDA. VIGENCIA Y TIEMPO DETERMINADO.
El presente contrato se celebra por TIEMPO DETERMINADO por un periodo improrrogable de 6 (seis) meses, iniciando sus efectos el día [FECHA_INICIO_CONTRATO] y concluyendo precisamente el día [FECHA_TERMINO_CONTRATO]. Al término de dicho plazo, la relación laboral concluirá de pleno derecho sin necesidad de aviso previo, salvo que las partes acuerden por escrito una renovación contractual semestral.

TERCERA. JORNADA DE TRABAJO Y HORARIOS.
"EL TRABAJADOR" conviene en prestar sus servicios en una jornada laboral con el siguiente horario:
- Horario de Entrada: [HORARIO_ENTRADA]
- Horario de Salida: [HORARIO_SALIDA]
- Horario de Comida / Descanso: De [HORA_INICIO_COMIDA] a [HORA_FIN_COMIDA]

CUARTA. SALARIO Y FORMA DE PAGO.
Como remuneración por los servicios prestados, "EL PATRÓN" pagará a "EL TRABAJADOR" la cantidad de $[SALARIO_NUMERO] ([SALARIO_LETRA]), pagaderos en los días y formas establecidos por la administración, reteniendo los importes correspondientes a impuestos y deducciones de ley.

QUINTA. VACACIONES Y PRESTACIONES SEMESTRALES.
En apego al esquema de contratación semestral renovable, "EL TRABAJADOR" tendrá derecho a disfrutar de sus días de vacaciones proporcionales por cada periodo de 6 meses cumplidos de servicios efectivamente laborados, así como al pago de aguinaldo y prima vacacional en los términos de la legislación laboral vigente.

SEXTA. CONFIDENCIALIDAD.
"EL TRABAJADOR" se obliga a guardar estricta reserva y confidencialidad respecto de toda la información, cartera de clientes, estrategias comerciales y datos confidenciales de [NOMBRES_COMERCIALES_PATRON] a los que tenga acceso durante y después de la relación de trabajo.

SÉPTIMA. JURISDICCIÓN.
Para la interpretación y cumplimiento del presente contrato, ambas partes se someten expresamente a la jurisdicción de las autoridades laborales competentes con sede en [JURISDICCION_MUNICIPIO_ESTADO].

Leído que fue el presente contrato por ambas partes y conformes con su contenido y alcance legal, lo firman por duplicado para constancia.




___________________________________________          ___________________________________________
                EL PATRÓN                                            EL TRABAJADOR
   [NOMBRES_COMERCIALES_PATRON]                                   [NOMBRE_TRABAJADOR]
   Rep. Legal: [NOMBRE_REPRESENTANTE_LEGAL]                       CURP: [CURP_TRABAJADOR]
`;

export const ContractsControl: React.FC<ContractsControlProps> = ({
  employees,
  plazas,
  companyName = 'Mi Oficina',
  companyLogoUrl,
  currentUser
}) => {
  // Navigation Subtabs: 'generator' | 'standard_variables' | 'template_editor'
  const [activeTab, setActiveTab] = useState<'generator' | 'standard_variables' | 'template_editor'>('generator');

  // Employee Selection
  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    return employees.length > 0 ? employees[0].id : '';
  });
  const [empSearch, setEmpSearch] = useState('');

  // Standard Variables State (Stored in localStorage)
  const [standardVars, setStandardVars] = useState<StandardContractVariables>(() => {
    const saved = localStorage.getItem('contractStandardVariables');
    if (saved) {
      try {
        return { ...DEFAULT_STANDARD_VARIABLES, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Error parsing standard contract vars:", e);
      }
    }
    return DEFAULT_STANDARD_VARIABLES;
  });

  // Specific Variables for Currently Selected Contract
  const [contractStartDate, setContractStartDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [durationMonths, setDurationMonths] = useState<number>(6);
  
  // Specific Overrides per Contract Generation
  const [workerPosition, setWorkerPosition] = useState<string>('');
  const [workerAddress, setWorkerAddress] = useState<string>('');
  const [workerCivilStatus, setWorkerCivilStatus] = useState<string>('Soltero(a)');
  const [workerNationality, setWorkerNationality] = useState<string>('Mexicana');
  const [workerGender, setWorkerGender] = useState<string>('masculino');
  const [workerCurp, setWorkerCurp] = useState<string>('');
  const [workerAge, setWorkerAge] = useState<string>('30');

  // Operational Overrides per Contract
  const [contractEntryTime, setContractEntryTime] = useState<string>('');
  const [contractExitTime, setContractExitTime] = useState<string>('');
  const [contractLunchStart, setContractLunchStart] = useState<string>('');
  const [contractLunchEnd, setContractLunchEnd] = useState<string>('');
  const [contractSalaryNum, setContractSalaryNum] = useState<string>('');
  const [contractSalaryLetter, setContractSalaryLetter] = useState<string>('');

  // Machote Template State (stored in localStorage)
  const [contractTemplate, setContractTemplate] = useState<string>(() => {
    const saved = localStorage.getItem('contractMachoteTemplateV2');
    return saved || DEFAULT_CONTRACT_TEMPLATE;
  });

  const [copiedText, setCopiedText] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedVarsSuccess, setSavedVarsSuccess] = useState(false);
  const [isLiveEditorOpen, setIsLiveEditorOpen] = useState(false);

  // Selected Employee object
  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || null;
  }, [employees, selectedEmpId]);

  // Sync specific contract fields when employee changes or on mount
  useEffect(() => {
    if (selectedEmployee) {
      if (selectedEmployee.hireDate) {
        setContractStartDate(selectedEmployee.hireDate);
      }
      setWorkerPosition(selectedEmployee.position || 'Auxiliar Administrativo');
      setWorkerCurp(selectedEmployee.curp || '');
      
      // Calculate age from birthDate
      if (selectedEmployee.birthDate) {
        try {
          const birth = new Date(selectedEmployee.birthDate + 'T00:00:00');
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          setWorkerAge(String(Math.max(18, age)));
        } catch {
          setWorkerAge('30');
        }
      }

      // Gender from CURP
      if (selectedEmployee.curp && selectedEmployee.curp.length >= 11) {
        const gen = selectedEmployee.curp[10];
        setWorkerGender(gen === 'M' ? 'femenino' : 'masculino');
      } else {
        setWorkerGender('masculino');
      }

      // Default Address with Plaza
      setWorkerAddress(`Domicilio conocido en ${selectedEmployee.plaza || 'Jalisco'}, México.`);
      setWorkerNationality(standardVars.nacionalidadDefault || 'Mexicana');
      setWorkerCivilStatus(standardVars.estadoCivilDefault || 'Soltero(a)');

      // Set operational defaults from standardVars
      setContractEntryTime(standardVars.horarioEntrada);
      setContractExitTime(standardVars.horarioSalida);
      setContractLunchStart(standardVars.horaInicioComida);
      setContractLunchEnd(standardVars.horaFinComida);
      setContractSalaryNum(standardVars.salarioNumero);
      setContractSalaryLetter(standardVars.salarioLetra);
    }
  }, [selectedEmployee, standardVars]);

  // Helper date formatter in long Spanish format (e.g. "18 de agosto de 2026")
  const formatDateToSpanishLong = (dateString?: string) => {
    if (!dateString) return '';
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

  // Calculate End Date based on contractStartDate and durationMonths
  const calculatedEndDateString = useMemo(() => {
    if (!contractStartDate) return '';
    try {
      const start = new Date(contractStartDate + 'T00:00:00');
      const end = new Date(start);
      end.setMonth(start.getMonth() + durationMonths);
      end.setDate(end.getDate() - 1); // Ends day before next cycle
      return end.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }, [contractStartDate, durationMonths]);

  // Compilation: Replace all official variable tokens
  const generatedContractText = useMemo(() => {
    if (!selectedEmployee) {
      return 'Por favor selecciona un colaborador para generar la vista previa del contrato.';
    }

    const fullName = `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim();
    const startDateText = formatDateToSpanishLong(contractStartDate);
    const endDateText = formatDateToSpanishLong(calculatedEndDateString);

    let text = contractTemplate;

    // Mapping exact requested user variable tokens
    const replacements: Record<string, string> = {
      // 🏢 Variables del Patrón
      '[NOMBRES_COMERCIALES_PATRON]': standardVars.nombresComercialesPatron,
      '[NOMBRE_REPRESENTANTE_LEGAL]': standardVars.nombreRepresentanteLegal,
      '[DOMICILIO_COMPLETO_PATRON]': standardVars.domicilioCompletoPatron,
      '[JURISDICCION_MUNICIPIO_ESTADO]': standardVars.jurisdiccionMunicipioEstado,

      // 👤 Variables del Empleado
      '[NOMBRE_TRABAJADOR]': fullName.toUpperCase(),
      '[NACIONALIDAD_TRABAJADOR]': workerNationality,
      '[EDAD_TRABAJADOR]': workerAge,
      '[ESTADO_CIVIL_TRABAJADOR]': workerCivilStatus,
      '[SEXO_TRABAJADOR]': workerGender,
      '[CURP_TRABAJADOR]': workerCurp.toUpperCase(),
      '[DOMICILIO_COMPLETO_TRABAJADOR]': workerAddress,

      // ⚙️ Variables Operativas y Contractuales
      '[FECHA_INICIO_CONTRATO]': startDateText,
      '[FECHA_TERMINO_CONTRATO]': endDateText,
      '[PUESTO_TRABAJADOR]': workerPosition,
      '[HORARIO_ENTRADA]': contractEntryTime,
      '[HORARIO_SALIDA]': contractExitTime,
      '[HORA_INICIO_COMIDA]': contractLunchStart,
      '[HORA_FIN_COMIDA]': contractLunchEnd,
      '[SALARIO_NUMERO]': contractSalaryNum,
      '[SALARIO_LETRA]': contractSalaryLetter
    };

    Object.entries(replacements).forEach(([key, val]) => {
      text = text.replaceAll(key, val || '');
    });

    return text;
  }, [
    selectedEmployee,
    contractTemplate,
    standardVars,
    contractStartDate,
    calculatedEndDateString,
    workerNationality,
    workerAge,
    workerCivilStatus,
    workerGender,
    workerCurp,
    workerAddress,
    workerPosition,
    contractEntryTime,
    contractExitTime,
    contractLunchStart,
    contractLunchEnd,
    contractSalaryNum,
    contractSalaryLetter
  ]);

  // Insert Variable Token into Machote Editor
  const insertToken = (token: string) => {
    setContractTemplate(prev => prev + ` ${token} `);
  };

  // Save Custom Machote
  const handleSaveMachote = () => {
    localStorage.setItem('contractMachoteTemplateV2', contractTemplate);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Reset to Default Machote
  const handleResetMachote = () => {
    if (window.confirm('¿Deseas restablecer el machote al formato predeterminado oficial con las variables actualizadas?')) {
      setContractTemplate(DEFAULT_CONTRACT_TEMPLATE);
      localStorage.setItem('contractMachoteTemplateV2', DEFAULT_CONTRACT_TEMPLATE);
    }
  };

  // Save Standard Variables
  const handleSaveStandardVars = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('contractStandardVariables', JSON.stringify(standardVars));
    setSavedVarsSuccess(true);
    setTimeout(() => setSavedVarsSuccess(false), 2500);
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
      const lineHeight = 5.0;
      let cursorY = margin;

      // Header on Page 1
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(standardVars.nombresComercialesPatron.toUpperCase(), pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`EXPEDIENTE LABORAL | CONTRATO INDIVIDUAL DE TRABAJO`, pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 2.5;

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 6.5;

      // Split contract text into paragraphs and lines
      const paragraphs = generatedContractText.split('\n');

      paragraphs.forEach((p) => {
        const isHeader = p.startsWith('CONTRATO') || p.startsWith('DECLARACIONES') || p.startsWith('CLÁUSULAS');
        const isSignatureLine = p.includes('_____');

        if (isHeader) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          cursorY += 1.5;
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.2);
          doc.setTextColor(51, 65, 85);
        }

        if (p.trim() === '') {
          cursorY += 3.0;
          return;
        }

        const lines = doc.splitTextToSize(p, contentWidth);

        lines.forEach((line: string) => {
          // Check page break
          if (cursorY + lineHeight > pageHeight - margin - 8) {
            // Footer with page number
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(`Página ${doc.getNumberOfPages()} - ${standardVars.nombresComercialesPatron}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
            
            doc.addPage();
            cursorY = margin;

            // Page top small banner
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(`${standardVars.nombresComercialesPatron} - Contrato: ${selectedEmployee.firstName} ${selectedEmployee.lastName}`, margin, cursorY - 5);
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
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${doc.getNumberOfPages()} - ${standardVars.nombresComercialesPatron}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

      // Save PDF
      const cleanName = `${selectedEmployee.firstName}_${selectedEmployee.lastName}`.replace(/\s+/g, '_');
      doc.save(`Contrato_${cleanName}_${contractStartDate}.pdf`);
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
      
      {/* Top Navigation & Subtabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 text-white rounded-xl shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Gestión de Contratos Laborales</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generador oficial en PDF, variables estándar configurables y editor de machote.
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold self-stretch md:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'generator'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generar Contrato
          </button>

          <button
            onClick={() => setActiveTab('standard_variables')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'standard_variables'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Editar Variables Estándar
          </button>

          <button
            onClick={() => setActiveTab('template_editor')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
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

      {/* TAB 1: GENERADOR DE CONTRATOS */}
      {activeTab === 'generator' && (
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
                  placeholder="Buscar colaborador por nombre, plaza, puesto..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                />
              </div>

              {/* Employee Picker */}
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
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
            </div>

            {/* Step 2: Employee Specific Variables */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-500" />
                  2. Datos del Trabajador para este Contrato
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    CURP [CURP_TRABAJADOR]
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    value={workerCurp}
                    onChange={(e) => setWorkerCurp(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Edad [EDAD_TRABAJADOR]
                  </label>
                  <input
                    type="number"
                    min="16"
                    max="99"
                    value={workerAge}
                    onChange={(e) => setWorkerAge(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Sexo [SEXO_TRABAJADOR]
                  </label>
                  <select
                    value={workerGender}
                    onChange={(e) => setWorkerGender(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Estado Civil [ESTADO_CIVIL_TRABAJADOR]
                  </label>
                  <input
                    type="text"
                    value={workerCivilStatus}
                    onChange={(e) => setWorkerCivilStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Domicilio [DOMICILIO_COMPLETO_TRABAJADOR]
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Olmo 22, Los Ocotillos, Ciudad Guzmán, Jalisco."
                    value={workerAddress}
                    onChange={(e) => setWorkerAddress(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Contract Operational Parameters */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                3. Vigencia, Puesto y Salario
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Inicio [FECHA_INICIO_CONTRATO]
                  </label>
                  <input
                    type="date"
                    value={contractStartDate}
                    onChange={(e) => setContractStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Duración
                  </label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value={6}>6 Meses (Semestral)</option>
                    <option value={3}>3 Meses (Prueba)</option>
                    <option value={12}>1 Año (Anual)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Término Calculado [FECHA_TERMINO_CONTRATO]
                  </label>
                  <div className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-800 font-semibold">
                    {formatDateToSpanishLong(calculatedEndDateString)}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Puesto [PUESTO_TRABAJADOR]
                  </label>
                  <input
                    type="text"
                    value={workerPosition}
                    onChange={(e) => setWorkerPosition(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Salario ($) [SALARIO_NUMERO]
                  </label>
                  <input
                    type="text"
                    value={contractSalaryNum}
                    onChange={(e) => setContractSalaryNum(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold font-mono focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Salario (Letra) [SALARIO_LETRA]
                  </label>
                  <input
                    type="text"
                    value={contractSalaryLetter}
                    onChange={(e) => setContractSalaryLetter(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
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
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Copiar texto del contrato"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                  {copiedText ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Live Document Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-slate-500" />
                Vista Previa del Contrato Oficial
              </label>
              
              <button
                type="button"
                onClick={() => setIsLiveEditorOpen(!isLiveEditorOpen)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
              >
                <Edit3 className="w-3 h-3 text-slate-600" />
                {isLiveEditorOpen ? 'Ocultar Edición en Vivo' : 'Edición Rápida en Vivo'}
              </button>
            </div>

            {/* Quick in-preview editor panel */}
            {isLiveEditorOpen && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs animate-fade-in shadow-2xs">
                <p className="text-[11px] text-slate-500 font-semibold">
                  Ajusta cualquier variable sobre la marcha para este colaborador:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block">Horario Entrada</label>
                    <input 
                      type="text" 
                      value={contractEntryTime} 
                      onChange={e => setContractEntryTime(e.target.value)} 
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block">Horario Salida</label>
                    <input 
                      type="text" 
                      value={contractExitTime} 
                      onChange={e => setContractExitTime(e.target.value)} 
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block">Inicio Comida</label>
                    <input 
                      type="text" 
                      value={contractLunchStart} 
                      onChange={e => setContractLunchStart(e.target.value)} 
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block">Fin Comida</label>
                    <input 
                      type="text" 
                      value={contractLunchEnd} 
                      onChange={e => setContractLunchEnd(e.target.value)} 
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Document Sheet Simulation */}
            <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-6 sm:p-10 font-serif text-slate-800 text-xs sm:text-[13px] leading-relaxed max-h-[800px] overflow-y-auto whitespace-pre-wrap select-text">
              {generatedContractText}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: EDITAR VARIABLES ESTÁNDAR (DEL PATRÓN Y OPERATIVAS) */}
      {activeTab === 'standard_variables' && (
        <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-2xs space-y-6 max-w-4xl mx-auto">
          
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-600" />
              Configuración de Variables Estándar (Patrón y Operativas)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Estos valores se usarán por defecto al generar contratos para cualquier colaborador, ahorrándote tiempo al no tener que capturarlos repetidamente.
            </p>
          </div>

          <form onSubmit={handleSaveStandardVars} className="space-y-6 text-xs">
            
            {/* 🏢 Bloque 1: Variables del Patrón */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-600" />
                🏢 Variables del Patrón (Empresa)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nombres Comerciales del Patrón [NOMBRES_COMERCIALES_PATRON]
                  </label>
                  <input
                    type="text"
                    value={standardVars.nombresComercialesPatron}
                    onChange={(e) => setStandardVars(prev => ({ ...prev, nombresComercialesPatron: e.target.value }))}
                    placeholder="Ej. CRÉDITOS LA FORTUNA y CREDIPLANET"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre del Representante Legal [NOMBRE_REPRESENTANTE_LEGAL]
                  </label>
                  <input
                    type="text"
                    value={standardVars.nombreRepresentanteLegal}
                    onChange={(e) => setStandardVars(prev => ({ ...prev, nombreRepresentanteLegal: e.target.value }))}
                    placeholder="Ej. Luis Cárdenas"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jurisdicción Municipio / Estado [JURISDICCION_MUNICIPIO_ESTADO]
                  </label>
                  <input
                    type="text"
                    value={standardVars.jurisdiccionMunicipioEstado}
                    onChange={(e) => setStandardVars(prev => ({ ...prev, jurisdiccionMunicipioEstado: e.target.value }))}
                    placeholder="Ej. Autlán de Navarro, Jalisco"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Domicilio Completo del Patrón [DOMICILIO_COMPLETO_PATRON]
                  </label>
                  <input
                    type="text"
                    value={standardVars.domicilioCompletoPatron}
                    onChange={(e) => setStandardVars(prev => ({ ...prev, domicilioCompletoPatron: e.target.value }))}
                    placeholder="Ej. Av. Universidad de Guadalajara 290, Colonia Colonos Alameda, C.P. 48900, en el municipio de Autlán de Navarro, Jalisco."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* ⚙️ Bloque 2: Variables Operativas y Contractuales Estándar */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-600" />
                ⚙️ Variables Operativas y Salarios Predeterminados
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Horario Entrada [HORARIO_ENTRADA]
                  </label>
                  <input
                    type="text"
                    value={standardVars.horarioEntrada}
                    onChange={(e) => setStandardVars(prev => ({ ...prev, horarioEntrada: e.target.value }))}
                    placeholder="10:00 a.m."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Horario Salida [HORARIO_SALIDA]
                  </label>
                  <input
                    type="text"
                    value={standardVars.horarioSalida}
                    onChange={(e) => setStandardVars(prev => ({ ...prev, horarioSalida: e.target.value }))}
                    placeholder="8:00 p.m."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Inicio Comida [HORA_INICIO_COMIDA]
                  </label>
                  <input
                    type="text"
                    value={standardVars.horaInicioComida}
                    onChange={(e) => setStandardVars(prev => ({ ...prev, horaInicioComida: e.target.value }))}
                    placeholder="2:00 p.m."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fin Comida [HORA_FIN_COMIDA]
                  </label>
                  <input
                    type="text"
                    value={standardVars.horaFinComida}
                    onChange={(e) => setStandardVars(prev => ({ ...prev, horaFinComida: e.target.value }))}
                    placeholder="4:00 p.m."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Salario en Número [SALARIO_NUMERO]
                  </label>
                  <input
                    type="text"
                    value={standardVars.salarioNumero}
                    onChange={(e) => setStandardVars(prev => ({ ...prev, salarioNumero: e.target.value }))}
                    placeholder="3,000.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold font-mono focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Salario en Letra [SALARIO_LETRA]
                  </label>
                  <input
                    type="text"
                    value={standardVars.salarioLetra}
                    onChange={(e) => setStandardVars(prev => ({ ...prev, salarioLetra: e.target.value }))}
                    placeholder="Tres mil pesos 00/100 M.N."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {savedVarsSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                {savedVarsSuccess ? 'Variables Estándar Guardadas' : 'Guardar Variables Estándar'}
              </button>
            </div>

          </form>

        </div>
      )}

      {/* TAB 3: EDITOR DEL MACHOTE (PLANTILLA) */}
      {activeTab === 'template_editor' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Editor del Machote Oficial de Contrato</h3>
              <p className="text-xs text-slate-500">
                Modifica el texto maestro. Las variables entre corchetes como <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono font-bold text-[11px]">[NOMBRE_TRABAJADOR]</code> se sustituirán automáticamente al generar cada contrato.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResetMachote}
                className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Restablecer machote predeterminado oficial"
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

          {/* Tokens Helper Chips */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Haz clic en cualquier variable para insertarla en la posición del cursor:
            </span>

            {/* Group 1: Patron */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-1">🏢 VARIABLES DEL PATRÓN:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { token: '[NOMBRES_COMERCIALES_PATRON]', label: 'Nombres Comerciales' },
                  { token: '[NOMBRE_REPRESENTANTE_LEGAL]', label: 'Representante Legal' },
                  { token: '[DOMICILIO_COMPLETO_PATRON]', label: 'Domicilio Patrón' },
                  { token: '[JURISDICCION_MUNICIPIO_ESTADO]', label: 'Jurisdicción' }
                ].map(item => (
                  <button
                    key={item.token}
                    type="button"
                    onClick={() => insertToken(item.token)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-indigo-200"
                    title={`Insertar ${item.token}`}
                  >
                    <span className="text-indigo-600 font-bold">+</span> {item.token}
                  </button>
                ))}
              </div>
            </div>

            {/* Group 2: Trabajador */}
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">👤 VARIABLES DEL EMPLEADO:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { token: '[NOMBRE_TRABAJADOR]', label: 'Nombre' },
                  { token: '[NACIONALIDAD_TRABAJADOR]', label: 'Nacionalidad' },
                  { token: '[EDAD_TRABAJADOR]', label: 'Edad' },
                  { token: '[ESTADO_CIVIL_TRABAJADOR]', label: 'Estado Civil' },
                  { token: '[SEXO_TRABAJADOR]', label: 'Sexo' },
                  { token: '[CURP_TRABAJADOR]', label: 'CURP' },
                  { token: '[DOMICILIO_COMPLETO_TRABAJADOR]', label: 'Domicilio Trabajador' }
                ].map(item => (
                  <button
                    key={item.token}
                    type="button"
                    onClick={() => insertToken(item.token)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-emerald-200"
                    title={`Insertar ${item.token}`}
                  >
                    <span className="text-emerald-600 font-bold">+</span> {item.token}
                  </button>
                ))}
              </div>
            </div>

            {/* Group 3: Operativas */}
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">⚙️ VARIABLES OPERATIVAS Y CONTRACTUALES:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { token: '[FECHA_INICIO_CONTRATO]', label: 'Inicio' },
                  { token: '[FECHA_TERMINO_CONTRATO]', label: 'Término' },
                  { token: '[PUESTO_TRABAJADOR]', label: 'Puesto' },
                  { token: '[HORARIO_ENTRADA]', label: 'Entrada' },
                  { token: '[HORARIO_SALIDA]', label: 'Salida' },
                  { token: '[HORA_INICIO_COMIDA]', label: 'Inicio Comida' },
                  { token: '[HORA_FIN_COMIDA]', label: 'Fin Comida' },
                  { token: '[SALARIO_NUMERO]', label: 'Salario ($)' },
                  { token: '[SALARIO_LETRA]', label: 'Salario (Letra)' }
                ].map(item => (
                  <button
                    key={item.token}
                    type="button"
                    onClick={() => insertToken(item.token)}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-amber-200"
                    title={`Insertar ${item.token}`}
                  >
                    <span className="text-amber-600 font-bold">+</span> {item.token}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Machote Text Area */}
          <div>
            <textarea
              rows={22}
              value={contractTemplate}
              onChange={(e) => setContractTemplate(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none font-mono text-xs text-slate-800 leading-relaxed transition-all resize-y"
              placeholder="Escribe o pega aquí el machote de contrato con las variables..."
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
