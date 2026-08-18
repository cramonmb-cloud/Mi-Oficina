import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileText, 
  User, 
  Download, 
  Copy, 
  Check, 
  Edit3, 
  RotateCcw, 
  Calendar, 
  Building2, 
  Clock, 
  Save, 
  Search, 
  Eye, 
  Sliders, 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Bold, 
  ListPlus, 
  Table,
  History,
  CalendarCheck,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Filter,
  Plus,
  Settings,
  Layers,
  X,
  Sparkles,
  ChevronRight,
  Briefcase,
  Users
} from 'lucide-react';
import { Employee, Plaza, EmployeeContract, PersonnelCategory, ContractTypeConfig, ContractStandardVariables } from '../types';
import { subscribeToEmployeeContracts, addEmployeeContract, deleteEmployeeContract } from '../services/dbService';
import jsPDF from 'jspdf';

interface ContractsControlProps {
  employees: Employee[];
  plazas: Plaza[];
  companyName?: string;
  companyLogoUrl?: string;
  currentUser?: Employee | null;
}

export const ALL_PERSONNEL_CATEGORIES: { id: PersonnelCategory; label: string; icon: string }[] = [
  { id: 'Oficina', label: 'Oficina', icon: '🏢' },
  { id: 'Ejecutivos', label: 'Ejecutivos', icon: '👔' },
  { id: 'Supervisoras', label: 'Supervisoras', icon: '👥' },
  { id: 'Promotoras', label: 'Promotoras', icon: '🤝' },
];

export const getContractTargetCategories = (ct?: Partial<ContractTypeConfig> | null): PersonnelCategory[] => {
  if (!ct) return ['Oficina'];
  if (Array.isArray(ct.targetCategories) && ct.targetCategories.length > 0) {
    return ct.targetCategories;
  }
  if (ct.targetCategory) {
    return [ct.targetCategory];
  }
  return ['Oficina'];
};

// Convert numbers like "5,000" or "3500.50" to Mexican Spanish words format: "Cinco mil pesos 00/100 M.N."
export function numberToSpanishLetters(amountNum: number | string): string {
  if (amountNum === '' || amountNum === null || amountNum === undefined) return '';

  const cleanStr = String(amountNum).replace(/[^0-9.]/g, '');
  if (!cleanStr) return '';
  const num = parseFloat(cleanStr);
  if (isNaN(num)) return '';

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);
  const centsStr = String(decimalPart).padStart(2, '0') + '/100 M.N.';

  if (integerPart === 0) {
    return `Cero pesos ${centsStr}`;
  }

  const unidades = (n: number): string => {
    switch (n) {
      case 1: return 'un';
      case 2: return 'dos';
      case 3: return 'tres';
      case 4: return 'cuatro';
      case 5: return 'cinco';
      case 6: return 'seis';
      case 7: return 'siete';
      case 8: return 'ocho';
      case 9: return 'nueve';
      default: return '';
    }
  };

  const decenasY = (strSin: string, numUnidades: number): string => {
    if (numUnidades > 0) return `${strSin} y ${unidades(numUnidades)}`;
    return strSin;
  };

  const decenas = (n: number): string => {
    const dec = Math.floor(n / 10);
    const uni = n - (dec * 10);
    switch (dec) {
      case 1:
        switch (uni) {
          case 0: return 'diez';
          case 1: return 'once';
          case 2: return 'doce';
          case 3: return 'trece';
          case 4: return 'catorce';
          case 5: return 'quince';
          default: return `dieci${unidades(uni)}`;
        }
      case 2:
        if (uni === 0) return 'veinte';
        if (uni === 1) return 'veintiún';
        return `veinti${unidades(uni)}`;
      case 3: return decenasY('treinta', uni);
      case 4: return decenasY('cuarenta', uni);
      case 5: return decenasY('cincuenta', uni);
      case 6: return decenasY('sesenta', uni);
      case 7: return decenasY('setenta', uni);
      case 8: return decenasY('ochenta', uni);
      case 9: return decenasY('noventa', uni);
      case 0: return unidades(uni);
      default: return '';
    }
  };

  const centenas = (n: number): string => {
    const cen = Math.floor(n / 100);
    const dec = n - (cen * 100);
    switch (cen) {
      case 1:
        if (dec > 0) return `ciento ${decenas(dec)}`;
        return 'cien';
      case 2: return `doscientos ${decenas(dec)}`.trim();
      case 3: return `trescientos ${decenas(dec)}`.trim();
      case 4: return `cuatrocientos ${decenas(dec)}`.trim();
      case 5: return `quinientos ${decenas(dec)}`.trim();
      case 6: return `seiscientos ${decenas(dec)}`.trim();
      case 7: return `setecientos ${decenas(dec)}`.trim();
      case 8: return `ochocientos ${decenas(dec)}`.trim();
      case 9: return `novecientos ${decenas(dec)}`.trim();
      default: return decenas(dec);
    }
  };

  const seccion = (n: number, divisor: number, singular: string, plural: string): string => {
    const cientos = Math.floor(n / divisor);
    if (cientos > 0) {
      if (cientos > 1) {
        return `${centenas(cientos)} ${plural}`;
      }
      return `${singular}`;
    }
    return '';
  };

  const miles = (n: number): string => {
    const divisor = 1000;
    const cientos = Math.floor(n / divisor);
    const resto = n - (cientos * divisor);
    const strMiles = seccion(n, divisor, 'mil', 'mil');
    const strCentenas = centenas(resto);
    if (strMiles === '') return strCentenas;
    return `${strMiles} ${strCentenas}`.trim();
  };

  const millones = (n: number): string => {
    const divisor = 1000000;
    const cientos = Math.floor(n / divisor);
    const resto = n - (cientos * divisor);
    const strMillones = seccion(n, divisor, 'un millón', 'millones');
    const strMiles = miles(resto);
    if (strMillones === '') return strMiles;
    return `${strMillones} ${strMiles}`.trim();
  };

  const resultWords = millones(integerPart).replace(/\s+/g, ' ').trim();
  const capitalLetter = resultWords.charAt(0).toUpperCase() + resultWords.slice(1);
  const currencyWord = integerPart === 1 ? 'peso' : (integerPart >= 1000000 && integerPart % 1000000 === 0 ? 'de pesos' : 'pesos');

  return `${capitalLetter} ${currencyWord} ${centsStr}`;
}

const DEFAULT_STANDARD_VARIABLES: ContractStandardVariables = {
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
  estadoCivilDefault: 'Soltero(a)',
  contractLogoUrl: ''
};

const DEFAULT_CONTRACT_TEMPLATE = `**CONTRATO INDIVIDUAL DE TRABAJO POR TIEMPO DETERMINADO**

Que celebran, por una parte, la persona física con actividad empresarial que opera bajo los nombres comerciales de **[NOMBRES_COMERCIALES_PATRON]**, a quien en lo sucesivo se le denominará **"EL PATRÓN"**, representada en este acto por el C. **[NOMBRE_REPRESENTANTE_LEGAL]** en su carácter de Gerente General; y por la otra, el C. **[NOMBRE_TRABAJADOR]**, a quien en lo sucesivo se le denominará **"EL TRABAJADOR"**, al tenor de las siguientes Declaraciones y Cláusulas:

**DECLARACIONES**

**I. Declara "EL PATRÓN" a través de su representante legal: [NOMBRE_REPRESENTANTE_LEGAL]** a) Ser una persona física con actividad empresarial, legalmente constituida y operando conforme a las leyes de los Estados Unidos Mexicanos. Reconociendo expresamente que se encuentra en trámites notariales y administrativos para la legal constitución de una sociedad mercantil. b) Tener su domicilio principal ubicado en [DOMICILIO_COMPLETO_PATRON]. c) Que requiere los servicios de una persona por tiempo determinado para atender una carga extraordinaria en las tareas administrativas y de procesamiento de créditos e información variable en oficina.

**II. Declara "EL TRABAJADOR":** a) Llamarse **[NOMBRE_TRABAJADOR]**, de nacionalidad [NACIONALIDAD_TRABAJADOR], de [EDAD_TRABAJADOR] años de edad, estado civil [ESTADO_CIVIL_TRABAJADOR], sexo [SEXO_TRABAJADOR] b) Estar inscrito con la CURP: **[CURP_TRABAJADOR]** c) Tener su domicilio ubicado en [DOMICILIO_COMPLETO_TRABAJADOR]. d) Contar con las capacidades, aptitudes y conocimientos necesarios para desempeñar las funciones administrativas que requiere "EL PATRÓN".

**CLÁUSULAS**

**PRIMERA. NATURALEZA Y DURACIÓN.-** El presente contrato se celebra por TIEMPO DETERMINADO, teniendo una vigencia improrrogable de 6 (seis) meses, iniciando sus efectos el día **[FECHA_INICIO_CONTRATO]** y concluyendo de manera irrevocable el día **[FECHA_TERMINO_CONTRATO]**.

La justificación legal de la temporalidad del presente contrato, de conformidad con el artículo 37 fracción I de la Ley Federal del Trabajo, obedece estrictamente a un incremento extraordinario y atípico en el volumen de operaciones administrativas de **"EL PATRÓN"**, consistente en la revisión de expedientes, gestión de incrementos de crédito y procesamiento interno de préstamos durante este periodo específico.

Ambas partes acuerdan expresamente que, al cumplirse la fecha de vencimiento señalada, la materia del trabajo y el presente contrato se extinguirán por completo, dándose por terminada la relación laboral de manera automática, sin necesidad de previo aviso, resolución o notificación alguna por parte de **"EL PATRÓN"**, de conformidad con la fracción III del artículo 53 de la Ley Federal del Trabajo.

**SEGUNDA. FUNCIONES.-** **"EL TRABAJADOR"** se obliga a prestar sus servicios personales y subordinados desempeñando el puesto de **[PUESTO_TRABAJADOR]**. Sus funciones consistirán en la creación de préstamos en los sistemas, trámite de incrementos de créditos, organización de expedientes, labores de oficina afines y demás encomiendas estrictamente convenidas con **"EL PATRÓN"**.

Asimismo, para el correcto desempeño de sus funciones y el mantenimiento del orden institucional, **"EL TRABAJADOR"** se obliga a observar, acatar y cumplir al pie de la letra con todas las disposiciones establecidas en el Reglamento Interior de Trabajo de la empresa. **"EL TRABAJADOR"** reconoce expresamente que **"EL PATRÓN"** le hará entrega de un ejemplar físico impreso de dicho reglamento en su lugar de trabajo al inicio de sus labores, aceptando someterse a las medidas disciplinarias y sanciones que en él se estipulan en caso de cualquier incumplimiento.

**TERCERA. JORNADA DE TRABAJO.-** **"EL TRABAJADOR"** laborará bajo una jornada diurna ordinaria de lunes a sábado, estableciéndose un horario de las **[HORARIO_ENTRADA]** a las **[HORARIO_SALIDA]**. Dentro de dicho horario, **"EL TRABAJADOR"** disfrutará diariamente de 2 (dos) horas de descanso para tomar sus alimentos y reposar, mismas que tomará de las **[HORA_INICIO_COMIDA]** a las **[HORA_FIN_COMIDA]**.

De conformidad con el artículo 64 de la Ley Federal del Trabajo, **"EL TRABAJADOR"** queda en absoluta libertad de salir de las instalaciones de **"EL PATRÓN"** y disponer de dicho tiempo de descanso a su libre albedrío, por lo que estas 2 (dos) horas no se computarán como tiempo efectivo de la jornada laboral, dando como resultado un tiempo efectivo de 8 (ocho) horas diarias de servicio que conforman el límite máximo legal de 48 (cuarenta y ocho) horas semanales. **"EL TRABAJADOR"** gozará de un día de descanso semanal con goce de salario íntegro los días domingo.

**CUARTA. SALARIO Y FORMA DE PAGO.-** **"EL PATRÓN"** pagará a **"EL TRABAJADOR"** por la prestación de sus servicios dentro de la jornada ordinaria pactada, un salario neto de **$[SALARIO_NUMERO] ([SALARIO_LETRA])** de manera SEMANAL, cantidad que incluye el pago correspondiente a los 6 (seis) días laborables y el día de descanso obligatorio (domingo).

El pago total se realizará en **EFECTIVO** y en moneda de curso legal, en el domicilio de la empresa y durante las horas de trabajo. **"EL TRABAJADOR"** se obliga a firmar los recibos de nómina y/o comprobantes correspondientes que amparen dichas cantidades, en cumplimiento del artículo 804 de la LFT.

**QUINTA. PRESTACIONES DE LEY.-** Al término de su contrato, **"EL TRABAJADOR"** percibirá la parte proporcional correspondiente a: a) **Aguinaldo:** Calculado con base en los 15 días anuales mínimos de ley, proporcionales. b) **Vacaciones:** Calculadas de manera proporcional en razón de 6 días por los seis meses laborados. c) **Prima Vacacional:** Equivalente al 25% sobre el monto de sus vacaciones proporcionales.

No obstante lo anterior, ambas partes acuerdan que, en caso de que al vencimiento del presente instrumento se determine la celebración de un nuevo contrato, el pago de las prestaciones proporcionales aquí descritas no será liquidado al cierre de estos primeros seis meses. En dicho supuesto, el tiempo laborado se reconocerá como antigüedad acumulada, y el pago íntegro de su Aguinaldo, Vacaciones y Prima Vacacional será cubierto en su totalidad al cumplir el año completo de servicios, sujeto a los plazos y fechas límite de pago que establece expresamente la Ley Federal del Trabajo y el reglamento interno de la empresa.

De conformidad con el artículo 81 de la Ley Federal del Trabajo y las necesidades operativas de **"EL PATRÓN"**, ambas partes acuerdan expresamente que **"EL TRABAJADOR"** disfrutará físicamente de sus 6 (seis) días de vacaciones proporcionales de manera obligatoria durante los últimos 45 (cuarenta y cinco) días de vigencia del presente contrato, en las fechas exactas que la administración de la empresa le asigne.

**"EL TRABAJADOR"** solicita y acepta voluntariamente que el disfrute de sus 6 (seis) días de descanso vacacional sea distribuido de manera fraccionada y no continua, intercalando los días de descanso conforme al rol que determine la empresa.

En caso de que **"EL TRABAJADOR"** se niegue a disfrutar de sus días de descanso programados mediante el formato interno correspondiente, dicha negativa no generará derecho a pago acumulado o compensación adicional alguna al término del contrato, dándose por cumplida la obligación patronal de otorgar el descanso.

**SEXTA. CONFIDENCIALIDAD, SECRETO INDUSTRIAL Y PROTECCIÓN DE DATOS PERSONALES.-** **"EL TRABAJADOR"** reconoce que tendrá acceso a bases de datos, cuadrículas de cobranza semanal, integración de grupos de crédito, manuales y datos financieros de clientes. Por lo tanto, se obliga a observar las siguientes disposiciones:

• **Responsabilidad Civil (Pena Convencional):** En caso de que **"EL TRABAJADOR"** revele, sustraiga, utilice para sí mismo o transfiera a cualquier tercero la Información Confidencial y bases de datos de clientes, se obliga a pagar a favor de **"EL PATRÓN"**, por concepto de pena convencional y reparación de daños, la cantidad líquida de **50,000 (Cincuenta mil) Unidades de Medida y Actualización (UMAs)** vigentes. Este pago será exigible por la vía civil de manera inmediata.

• **Responsabilidad Penal:** **"EL TRABAJADOR"** reconoce estar enterado de que la sustracción o revelación de bases de datos, esquemas y manuales de **[NOMBRES_COMERCIALES_PATRON]** constituye el delito de Revelación y Robo de Secretos Industriales, sancionado por la Ley Federal de Protección a la Propiedad Industrial y los Códigos Penales aplicables con penas de prisión. **"EL PATRÓN"** se reserva el derecho de presentar las denuncias y querellas penales ante las autoridades competentes.

• **Rescisión Laboral Inmediata:** La sospecha fundamentada o el intento de sustracción de información será considerado como falta grave de probidad y honradez, configurando la causal de rescisión sin responsabilidad patronal (Art. 47 fracciones II y IX de la LFT).

**SÉPTIMA. CAPACITACIÓN Y ADIESTRAMIENTO.-** **"EL TRABAJADOR"** se obliga a participar en los cursos de capacitación y adiestramiento que **"EL PATRÓN"** le indique, de conformidad con lo establecido en el Capítulo III Bis de la Ley Federal del Trabajo.

**OCTAVA. AVISO DE TERMINACIÓN VOLUNTARIA Y ENTREGA DE PUESTO.-** Ambas partes acuerdan que, en caso de que **"EL TRABAJADOR"** decida dar por terminada voluntariamente la relación de trabajo antes de la fecha de vencimiento estipulada en la Cláusula Primera, se compromete a notificar su decisión por escrito a **"EL PATRÓN"** con un mínimo de 15 (quince) días naturales de anticipación.

**"EL TRABAJADOR"** reconoce que dicho periodo de transición es estrictamente necesario para la operatividad de la empresa, obligándose a utilizar dicho plazo para llevar a cabo la correcta formalización del Acta Administrativa de Entrega-Recepción, realizando la devolución inventariada de las herramientas de trabajo, equipos, bases de datos, contraseñas y expedientes financieros que se encuentren bajo su resguardo, garantizando así una salida ordenada y el cumplimiento íntegro de sus obligaciones de confidencialidad descritas en la Cláusula Sexta.

**NOVENA. JURISDICCIÓN Y LEYES APLICABLES.-** Para la interpretación y cumplimiento de este contrato, las partes se someten a la Ley Federal del Trabajo y a la competencia del Centro de Conciliación Laboral y/o Tribunal Laboral competentes con sede o jurisdicción en **[JURISDICCION_MUNICIPIO_ESTADO]**, renunciando expresamente a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.

[FIRMAS_TABLA]
`;

const DEFAULT_POSITIONS = [
  'Auxiliar Administrativo Integral',
  'Auxiliar Administrativo',
  'Promotora',
  'Supervisora',
  'Promotor de Crédito',
  'Supervisor de Crédito',
  'Ejecutivo de Crédito',
  'Gerente de Sucursal',
  'Coordinador General',
  'Gestor de Cobranza',
  'Cajera / Cajero',
  'Director General',
  'Oficina'
];

const INITIAL_CONTRACT_TYPES: ContractTypeConfig[] = [
  {
    id: 'oficina_auxiliar',
    name: 'Oficina - Auxiliar Administrativo Integral',
    targetCategories: ['Oficina'],
    description: 'Contrato individual de trabajo por tiempo determinado para personal administrativo y de oficina.',
    defaultPosition: 'Auxiliar Administrativo Integral',
    template: DEFAULT_CONTRACT_TEMPLATE,
    standardVars: DEFAULT_STANDARD_VARIABLES,
    createdAt: '2026-08-18'
  }
];

export const ContractsControl: React.FC<ContractsControlProps> = ({
  employees,
  plazas,
  companyName = 'Mi Oficina',
  companyLogoUrl,
  currentUser
}) => {
  // --- MULTI-CONTRACT TYPES STATE ---
  const [contractTypes, setContractTypes] = useState<ContractTypeConfig[]>(() => {
    const saved = localStorage.getItem('custom_contract_types_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(item => ({
            ...item,
            targetCategories: getContractTargetCategories(item)
          }));
        }
      } catch (e) {
        console.error("Error loading custom contract types:", e);
      }
    }

    // Migration / fallback from older version
    const oldTemplate = localStorage.getItem('contractMachoteTemplateV3') || localStorage.getItem('contractMachoteTemplateV2');
    const oldVars = localStorage.getItem('contractStandardVariables');
    if (oldTemplate || oldVars) {
      const updated = { ...INITIAL_CONTRACT_TYPES[0] };
      if (oldTemplate) updated.template = oldTemplate;
      if (oldVars) {
        try {
          updated.standardVars = { ...DEFAULT_STANDARD_VARIABLES, ...JSON.parse(oldVars) };
        } catch {}
      }
      return [updated];
    }

    return INITIAL_CONTRACT_TYPES;
  });

  // Save Contract Types automatically to localStorage
  useEffect(() => {
    localStorage.setItem('custom_contract_types_v3', JSON.stringify(contractTypes));
  }, [contractTypes]);

  // Selected Active Contract Type ID
  const [activeTypeId, setActiveTypeId] = useState<string>(() => {
    return contractTypes.length > 0 ? contractTypes[0].id : 'oficina_auxiliar';
  });

  // Current Active Contract Type Object
  const activeContractType = useMemo(() => {
    return contractTypes.find(ct => ct.id === activeTypeId) || contractTypes[0] || INITIAL_CONTRACT_TYPES[0];
  }, [contractTypes, activeTypeId]);

  // Target categories for active contract type
  const activeCategories = useMemo(() => {
    return getContractTargetCategories(activeContractType);
  }, [activeContractType]);

  // Navigation Subtabs: 'generator' | 'template_editor' | 'history' | 'standard_variables'
  const [activeTab, setActiveTab] = useState<'generator' | 'template_editor' | 'history' | 'standard_variables'>('generator');

  // Modal State for Creating / Editing Contract Types
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [typeModalMode, setTypeModalMode] = useState<'create' | 'edit'>('create');
  const [typeFormData, setTypeFormData] = useState<{
    id?: string;
    name: string;
    targetCategories: PersonnelCategory[];
    defaultPosition: string;
    description: string;
  }>({
    name: '',
    targetCategories: ['Oficina'],
    defaultPosition: 'Auxiliar Administrativo Integral',
    description: ''
  });

  // Employee Selection (defaults to none selected)
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [empSearch, setEmpSearch] = useState('');

  // Contracts History State (from Firestore)
  const [contractsHistory, setContractsHistory] = useState<EmployeeContract[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  const [historyScope, setHistoryScope] = useState<'current_type' | 'all'>('current_type');

  // Subscribe to real-time contracts history
  useEffect(() => {
    const unsubscribe = subscribeToEmployeeContracts(
      (contracts) => setContractsHistory(contracts),
      (err) => console.error("Error subscribing to contracts history:", err)
    );
    return () => unsubscribe();
  }, []);

  // Specific Variables for Currently Selected Contract
  const [contractStartDate, setContractStartDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [durationMonths, setDurationMonths] = useState<number>(6);
  
  // Specific Overrides per Contract Generation
  const [workerPosition, setWorkerPosition] = useState<string>(activeContractType.defaultPosition || 'Auxiliar Administrativo Integral');
  const [isCustomPosition, setIsCustomPosition] = useState<boolean>(false);
  const [workerAddress, setWorkerAddress] = useState<string>('');
  const [workerCivilStatus, setWorkerCivilStatus] = useState<string>('Soltero(a)');
  const [workerNationality, setWorkerNationality] = useState<string>('Mexicana');
  const [workerGender, setWorkerGender] = useState<string>('masculino');
  const [workerCurp, setWorkerCurp] = useState<string>('');
  const [workerAge, setWorkerAge] = useState<string>('30');

  // List of available job positions for selection
  const availablePositions = useMemo(() => {
    const set = new Set<string>();
    if (activeContractType.defaultPosition) {
      set.add(activeContractType.defaultPosition);
    }
    set.add('Auxiliar Administrativo Integral');
    DEFAULT_POSITIONS.forEach(p => set.add(p));
    employees.forEach(emp => {
      if (emp.position && emp.position.trim()) {
        set.add(emp.position.trim());
      }
    });
    return Array.from(set);
  }, [employees, activeContractType]);

  // Operational Overrides per Contract (initialized from activeContractType.standardVars)
  const [contractEntryTime, setContractEntryTime] = useState<string>('');
  const [contractExitTime, setContractExitTime] = useState<string>('');
  const [contractLunchStart, setContractLunchStart] = useState<string>('');
  const [contractLunchEnd, setContractLunchEnd] = useState<string>('');
  const [contractSalaryNum, setContractSalaryNum] = useState<string>(activeContractType.standardVars?.salarioNumero || '3,000.00');
  const [contractSalaryLetter, setContractSalaryLetter] = useState<string>(activeContractType.standardVars?.salarioLetra || 'Tres mil pesos 00/100 M.N.');

  const [copiedText, setCopiedText] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedVarsSuccess, setSavedVarsSuccess] = useState(false);
  const [isLiveEditorOpen, setIsLiveEditorOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to update active contract type attributes
  const updateActiveContractType = (updates: Partial<ContractTypeConfig>) => {
    setContractTypes(prev => prev.map(ct => {
      if (ct.id === activeContractType.id) {
        return { ...ct, ...updates };
      }
      return ct;
    }));
  };

  // Helper to update active contract standard variables
  const updateActiveStandardVars = (vars: Partial<ContractStandardVariables>) => {
    setContractTypes(prev => prev.map(ct => {
      if (ct.id === activeContractType.id) {
        return {
          ...ct,
          standardVars: { ...ct.standardVars, ...vars }
        };
      }
      return ct;
    }));
  };

  // Helper to update active contract template
  const updateActiveTemplate = (newTemplate: string | ((prev: string) => string)) => {
    setContractTypes(prev => prev.map(ct => {
      if (ct.id === activeContractType.id) {
        const updated = typeof newTemplate === 'function' ? newTemplate(ct.template) : newTemplate;
        return { ...ct, template: updated };
      }
      return ct;
    }));
  };

  // Selected Employee object
  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || null;
  }, [employees, selectedEmpId]);

  // Ensure employee matches targetCategories when contract type changes
  useEffect(() => {
    if (selectedEmployee && !activeCategories.includes(selectedEmployee.category)) {
      setSelectedEmpId('');
    }
  }, [activeTypeId, selectedEmployee, activeCategories]);

  // Sync specific contract fields when employee changes or on mount
  useEffect(() => {
    if (selectedEmployee) {
      if (selectedEmployee.hireDate) {
        setContractStartDate(selectedEmployee.hireDate);
      }
      setWorkerPosition(selectedEmployee.position?.trim() ? selectedEmployee.position.trim() : (activeContractType.defaultPosition || 'Auxiliar Administrativo Integral'));
      setIsCustomPosition(false);
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

      // Gender (from record or CURP)
      if (selectedEmployee.gender && selectedEmployee.gender.trim()) {
        setWorkerGender(selectedEmployee.gender);
      } else if (selectedEmployee.curp && selectedEmployee.curp.length >= 11) {
        const gen = selectedEmployee.curp[10];
        setWorkerGender(gen === 'M' ? 'femenino' : 'masculino');
      } else {
        setWorkerGender('masculino');
      }

      // Address (from employee record or fallback to plaza)
      if (selectedEmployee.address && selectedEmployee.address.trim()) {
        setWorkerAddress(selectedEmployee.address.trim());
      } else {
        setWorkerAddress(`Domicilio conocido en ${selectedEmployee.plaza || 'Jalisco'}, México.`);
      }

      // Nationality
      if (selectedEmployee.nationality && selectedEmployee.nationality.trim()) {
        setWorkerNationality(selectedEmployee.nationality.trim());
      } else {
        setWorkerNationality(activeContractType.standardVars.nacionalidadDefault || 'Mexicana');
      }

      // Civil Status
      if (selectedEmployee.civilStatus && selectedEmployee.civilStatus.trim()) {
        setWorkerCivilStatus(selectedEmployee.civilStatus.trim());
      } else {
        setWorkerCivilStatus(activeContractType.standardVars.estadoCivilDefault || 'Soltero(a)');
      }

      // Set operational defaults from activeContractType.standardVars
      setContractEntryTime(activeContractType.standardVars.horarioEntrada || '10:00 a.m.');
      setContractExitTime(activeContractType.standardVars.horarioSalida || '8:00 p.m.');
      setContractLunchStart(activeContractType.standardVars.horaInicioComida || '2:00 p.m.');
      setContractLunchEnd(activeContractType.standardVars.horaFinComida || '4:00 p.m.');

      // Salary
      if (selectedEmployee.salary !== undefined && selectedEmployee.salary !== null && String(selectedEmployee.salary).trim()) {
        const salStr = String(selectedEmployee.salary).trim();
        setContractSalaryNum(salStr);
        const inLetters = numberToSpanishLetters(salStr);
        if (inLetters) {
          setContractSalaryLetter(inLetters);
        } else {
          setContractSalaryLetter(activeContractType.standardVars.salarioLetra || 'Tres mil pesos 00/100 M.N.');
        }
      } else {
        setContractSalaryNum(activeContractType.standardVars.salarioNumero || '3,000.00');
        setContractSalaryLetter(activeContractType.standardVars.salarioLetra || 'Tres mil pesos 00/100 M.N.');
      }
    }
  }, [selectedEmployee, activeContractType]);

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

  // Auto update salary in letters on salary number change
  const handleSalaryNumChange = (val: string) => {
    setContractSalaryNum(val);
    const inLetters = numberToSpanishLetters(val);
    if (inLetters) {
      setContractSalaryLetter(inLetters);
    }
  };

  // Helper for standard vars salary input
  const handleStandardSalaryNumChange = (val: string) => {
    const inLetters = numberToSpanishLetters(val);
    updateActiveStandardVars({
      salarioNumero: val,
      ...(inLetters ? { salarioLetra: inLetters } : {})
    });
  };

  // Compilation: Replace all official variable tokens using activeContractType
  const generatedContractText = useMemo(() => {
    if (!selectedEmployee) {
      return 'Por favor selecciona un colaborador para generar la vista previa del contrato.';
    }

    const fullName = `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim();
    const startDateText = formatDateToSpanishLong(contractStartDate);
    const endDateText = formatDateToSpanishLong(calculatedEndDateString);

    let text = activeContractType.template || DEFAULT_CONTRACT_TEMPLATE;
    const std = activeContractType.standardVars || DEFAULT_STANDARD_VARIABLES;

    // Mapping exact requested user variable tokens
    const replacements: Record<string, string> = {
      // 🏢 Variables del Patrón
      '[NOMBRES_COMERCIALES_PATRON]': std.nombresComercialesPatron,
      '[NOMBRE_REPRESENTANTE_LEGAL]': std.nombreRepresentanteLegal,
      '[DOMICILIO_COMPLETO_PATRON]': std.domicilioCompletoPatron,
      '[JURISDICCION_MUNICIPIO_ESTADO]': std.jurisdiccionMunicipioEstado,

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
    activeContractType,
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

  // Insert Variable Token into Machote Editor at cursor position
  const insertToken = (token: string) => {
    const textarea = textareaRef.current;
    const insertion = token === '[FIRMAS_TABLA]' ? `\n\n${token}\n\n` : ` ${token} `;

    if (!textarea) {
      updateActiveTemplate(prev => prev + insertion);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = activeContractType.template;
    const updated = current.substring(0, start) + insertion + current.substring(end);
    updateActiveTemplate(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    }, 0);
  };

  // Bold selected text in Machote Editor
  const handleApplyBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = activeContractType.template;

    if (start !== end) {
      const selected = current.substring(start, end);
      let replacement = '';
      if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
        replacement = selected.slice(2, -2);
      } else {
        replacement = `**${selected}**`;
      }
      const updated = current.substring(0, start) + replacement + current.substring(end);
      updateActiveTemplate(updated);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + replacement.length);
      }, 0);
    } else {
      const placeholder = '**TEXTO EN NEGRITA**';
      const updated = current.substring(0, start) + placeholder + current.substring(end);
      updateActiveTemplate(updated);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + placeholder.length - 2);
      }, 0);
    }
  };

  // Insert Clause Template
  const handleInsertClause = () => {
    const snippet = `\n\n**DÉCIMA. NOMBRE_DE_LA_CLAUSULA.-** Redacción de la cláusula aquí convenida entre "EL PATRÓN" y "EL TRABAJADOR".\n`;
    insertToken(snippet);
  };

  // Handle Logo Upload for Contracts
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (!base64) return;

      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_W = 900;
        let w = img.width;
        let h = img.height;

        if (w > MAX_W) {
          h = (h * MAX_W) / w;
          w = MAX_W;
        }

        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/png', 0.9);
        updateActiveStandardVars({ contractLogoUrl: compressed });
      };
    };
    reader.readAsDataURL(file);
  };

  // Save Custom Machote
  const handleSaveMachote = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Reset to Default Machote
  const handleResetMachote = () => {
    if (window.confirm(`¿Deseas restablecer el machote de "${activeContractType.name}" a su formato oficial predeterminado?`)) {
      updateActiveTemplate(DEFAULT_CONTRACT_TEMPLATE);
    }
  };

  // Save Standard Variables
  const handleSaveStandardVars = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedVarsSuccess(true);
    setTimeout(() => setSavedVarsSuccess(false), 2500);
  };

  // Copy Generated Contract to Clipboard
  const handleCopyContract = async () => {
    try {
      const plainText = generatedContractText
        .replace(/\*\*/g, '')
        .replace(/\[FIRMAS_TABLA\]/g, '\n\n_______________________\n"EL PATRÓN"\n\n_______________________\n"EL TRABAJADOR"');
      
      await navigator.clipboard.writeText(plainText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      alert("Error al copiar texto");
    }
  };

  // PDF Generation for Mexican Legal Size (Oficio / Legal: 215.9 x 355.6 mm)
  const handleDownloadPDF = async () => {
    if (!selectedEmployee) return;
    setIsGeneratingPdf(true);

    try {
      // Dimensiones de Oficio Mexicano en mm
      const PAGE_WIDTH = 215.9;
      const PAGE_HEIGHT = 355.6;
      const MARGIN_LEFT = 22;
      const MARGIN_RIGHT = 22;
      const MARGIN_TOP = 25;
      const MARGIN_BOTTOM = 25;
      const PRINT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

      const doc = new jsPDF({
        unit: 'mm',
        format: [PAGE_WIDTH, PAGE_HEIGHT]
      });

      let currentY = MARGIN_TOP;

      // Add Logo if configured
      const logoToUse = activeContractType.standardVars.contractLogoUrl || companyLogoUrl;
      if (logoToUse) {
        try {
          const imgProps = doc.getImageProperties(logoToUse);
          const maxLogoW = 95;
          const maxLogoH = 32;
          let imgW = maxLogoW;
          let imgH = (imgProps.height * maxLogoW) / imgProps.width;

          if (imgH > maxLogoH) {
            imgH = maxLogoH;
            imgW = (imgProps.width * maxLogoH) / imgProps.height;
          }

          const logoX = (PAGE_WIDTH - imgW) / 2;
          doc.addImage(logoToUse, 'PNG', logoX, currentY, imgW, imgH);
          currentY += imgH + 8;
        } catch (e) {
          console.warn("Could not load logo in contract PDF:", e);
        }
      }

      // Check page break helper
      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
          doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          currentY = MARGIN_TOP;
          return true;
        }
        return false;
      };

      // Split text into paragraphs
      const paragraphs = generatedContractText.split('\n');

      for (let i = 0; i < paragraphs.length; i++) {
        let para = paragraphs[i].trim();
        if (!para) {
          currentY += 3.5;
          continue;
        }

        // Check if paragraph is table of signatures
        if (para.includes('[FIRMAS_TABLA]')) {
          checkPageBreak(50);
          currentY += 8;

          const patronName = activeContractType.standardVars.nombreRepresentanteLegal || 'REPRESENTANTE LEGAL';
          const patronCommercial = activeContractType.standardVars.nombresComercialesPatron || 'LA EMPRESA';
          const workerName = `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim().toUpperCase();

          const colWidth = PRINT_WIDTH / 2;
          const leftCenter = MARGIN_LEFT + colWidth / 2;
          const rightCenter = MARGIN_LEFT + colWidth + colWidth / 2;

          doc.setFont('times', 'bold');
          doc.setFontSize(10);
          doc.text('"EL PATRÓN"', leftCenter, currentY, { align: 'center' });
          doc.text('"EL TRABAJADOR"', rightCenter, currentY, { align: 'center' });

          currentY += 20; // Espacio para firma física

          doc.setDrawColor(80, 80, 80);
          doc.setLineWidth(0.5);
          doc.line(leftCenter - 32, currentY, leftCenter + 32, currentY);
          doc.line(rightCenter - 32, currentY, rightCenter + 32, currentY);

          currentY += 4.5;
          doc.setFont('times', 'bold');
          doc.setFontSize(9);
          doc.text(patronName.toUpperCase(), leftCenter, currentY, { align: 'center' });
          doc.text(workerName, rightCenter, currentY, { align: 'center' });

          currentY += 4;
          doc.setFont('times', 'normal');
          doc.setFontSize(8);
          doc.text(`En rep. de ${patronCommercial}`, leftCenter, currentY, { align: 'center' });
          doc.text('Acepto y firmo de conformidad', rightCenter, currentY, { align: 'center' });

          currentY += 10;
          continue;
        }

        // Title styling
        const isMainTitle = para.startsWith('**CONTRATO INDIVIDUAL DE TRABAJO');
        const isSectionHeader = para.startsWith('**DECLARACIONES') || para.startsWith('**CLÁUSULAS');

        if (isMainTitle) {
          checkPageBreak(16);
          doc.setFont('times', 'bold');
          doc.setFontSize(12);
          const cleanTitle = para.replace(/\*\*/g, '');
          doc.text(cleanTitle, PAGE_WIDTH / 2, currentY, { align: 'center' });
          currentY += 8;
          continue;
        }

        if (isSectionHeader) {
          checkPageBreak(14);
          currentY += 3;
          doc.setFont('times', 'bold');
          doc.setFontSize(11);
          const cleanHeader = para.replace(/\*\*/g, '');
          doc.text(cleanHeader, PAGE_WIDTH / 2, currentY, { align: 'center' });
          currentY += 6;
          continue;
        }

        // Normal Clause & Text formatting with Justification
        doc.setFontSize(9.5);
        doc.setFont('times', 'normal');

        // Tokenize **bold** parts
        const parts = para.split(/(\*\*.*?\*\*)/g);
        const tokens: { text: string; bold: boolean }[] = [];

        parts.forEach(part => {
          if (!part) return;
          if (part.startsWith('**') && part.endsWith('**')) {
            tokens.push({ text: part.slice(2, -2), bold: true });
          } else {
            tokens.push({ text: part, bold: false });
          }
        });

        // Assemble words with bold flag
        interface WordToken {
          word: string;
          bold: boolean;
        }
        const words: WordToken[] = [];
        tokens.forEach(t => {
          const splitWords = t.text.split(' ');
          splitWords.forEach((w, idx) => {
            if (w.length > 0) {
              words.push({ word: w, bold: t.bold });
            } else if (idx === 0 && splitWords.length > 1) {
              // leading space preservation
            }
          });
        });

        // Break words into wrapped lines
        const lines: WordToken[][] = [];
        let currentLine: WordToken[] = [];
        let currentLineWidth = 0;
        const spaceWidth = 1.6;

        words.forEach(wt => {
          doc.setFont('times', wt.bold ? 'bold' : 'normal');
          const wWidth = doc.getTextWidth(wt.word);
          const testWidth = currentLineWidth === 0 ? wWidth : currentLineWidth + spaceWidth + wWidth;

          if (testWidth <= PRINT_WIDTH) {
            currentLine.push(wt);
            currentLineWidth = testWidth;
          } else {
            if (currentLine.length > 0) {
              lines.push(currentLine);
            }
            currentLine = [wt];
            currentLineWidth = wWidth;
          }
        });

        if (currentLine.length > 0) {
          lines.push(currentLine);
        }

        // Render justified lines
        const lineHeight = 4.8;
        lines.forEach((lineWords, lineIndex) => {
          checkPageBreak(lineHeight);
          const isLastLine = lineIndex === lines.length - 1;

          if (isLastLine || lineWords.length <= 1) {
            // Left align last line
            let cursorX = MARGIN_LEFT;
            lineWords.forEach(wt => {
              doc.setFont('times', wt.bold ? 'bold' : 'normal');
              doc.text(wt.word, cursorX, currentY);
              cursorX += doc.getTextWidth(wt.word) + spaceWidth;
            });
          } else {
            // Full justify
            let totalWordsWidth = 0;
            lineWords.forEach(wt => {
              doc.setFont('times', wt.bold ? 'bold' : 'normal');
              totalWordsWidth += doc.getTextWidth(wt.word);
            });

            const extraSpace = PRINT_WIDTH - totalWordsWidth;
            const justifiedSpaceWidth = extraSpace / (lineWords.length - 1);

            let cursorX = MARGIN_LEFT;
            lineWords.forEach(wt => {
              doc.setFont('times', wt.bold ? 'bold' : 'normal');
              doc.text(wt.word, cursorX, currentY);
              cursorX += doc.getTextWidth(wt.word) + justifiedSpaceWidth;
            });
          }

          currentY += lineHeight;
        });

        currentY += 1.8;
      }

      // Add Page Numbers (Pie de Página)
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Contrato Laboral • ${activeContractType.name} • Hoja ${p} de ${pageCount}`,
          PAGE_WIDTH / 2,
          PAGE_HEIGHT - 12,
          { align: 'center' }
        );
      }

      // Save PDF cleanly & Get Base64
      const pdfBase64 = doc.output('datauristring');
      const cleanName = `${selectedEmployee.firstName}_${selectedEmployee.lastName}`.replace(/\s+/g, '_');
      const fileName = `Contrato_${cleanName}_${contractStartDate}.pdf`;
      doc.save(fileName);

      // Guardar automáticamente en el Historial de Contratos
      try {
        await addEmployeeContract({
          employeeId: selectedEmployee.id,
          employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim(),
          contractTypeId: activeContractType.id,
          contractTypeName: activeContractType.name,
          startDate: contractStartDate,
          endDate: calculatedEndDateString,
          durationMonths: durationMonths,
          position: workerPosition,
          salaryNum: contractSalaryNum,
          salaryLetter: contractSalaryLetter,
          generatedAt: new Date().toISOString(),
          generatedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administración',
          pdfBase64: pdfBase64,
          fileName: fileName,
          notes: `Tipo: ${activeContractType.name}`
        });
      } catch (errHistory) {
        console.error("Error saving contract to history:", errHistory);
      }

    } catch (e) {
      console.error("Error generating contract PDF:", e);
      alert("Hubo un error al generar el archivo PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Filtered employee list for search (constrained by active contract type targetCategories)
  const filteredEmployeesList = useMemo(() => {
    const categoryEmployees = employees.filter(e => activeCategories.includes(e.category));
    if (!empSearch.trim()) return categoryEmployees;
    const q = empSearch.toLowerCase();
    return categoryEmployees.filter(e => 
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      (e.plaza && e.plaza.toLowerCase().includes(q)) ||
      (e.position && e.position.toLowerCase().includes(q)) ||
      (e.curp && e.curp.toLowerCase().includes(q))
    );
  }, [employees, empSearch, activeCategories]);

  // Filtered contracts history
  const filteredContractsHistory = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return contractsHistory.filter(c => {
      // Scope Filter (Current Type vs All)
      if (historyScope === 'current_type') {
        const matchesType = c.contractTypeId === activeContractType.id || 
          (c.notes && c.notes.includes(activeContractType.name)) ||
          (!c.contractTypeId && activeContractType.id === 'oficina_auxiliar');
        if (!matchesType) return false;
      }

      // Search
      const q = historySearch.toLowerCase().trim();
      const matchSearch = !q || 
        c.employeeName.toLowerCase().includes(q) ||
        (c.position && c.position.toLowerCase().includes(q)) ||
        (c.fileName && c.fileName.toLowerCase().includes(q)) ||
        (c.contractTypeName && c.contractTypeName.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // Status
      if (historyFilterStatus === 'all') return true;
      
      try {
        const end = new Date(c.endDate + 'T00:00:00');
        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (historyFilterStatus === 'expired') return diffDays < 0;
        if (historyFilterStatus === 'expiring') return diffDays >= 0 && diffDays <= 30;
        if (historyFilterStatus === 'active') return diffDays > 30;
      } catch {
        return true;
      }
      return true;
    });
  }, [contractsHistory, historySearch, historyFilterStatus, historyScope, activeContractType]);

  // Download contract from history
  const handleDownloadFromHistory = (contract: EmployeeContract) => {
    if (contract.pdfBase64) {
      const link = document.createElement('a');
      link.href = contract.pdfBase64;
      link.download = contract.fileName || `Contrato_${contract.employeeName}.pdf`;
      link.click();
    } else {
      alert("Este contrato no tiene archivo PDF adjunto.");
    }
  };

  // Delete contract from history
  const handleDeleteContract = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el registro del contrato de "${name}" del historial?`)) {
      try {
        await deleteEmployeeContract(id);
      } catch (err) {
        console.error("Error deleting contract:", err);
        alert("Error al eliminar el contrato.");
      }
    }
  };

  // --- CONTRACT TYPE MODAL HANDLERS ---
  const handleOpenCreateTypeModal = () => {
    setTypeModalMode('create');
    setTypeFormData({
      name: '',
      targetCategories: ['Oficina'],
      defaultPosition: 'Auxiliar Administrativo Integral',
      description: ''
    });
    setIsTypeModalOpen(true);
  };

  const handleOpenEditTypeModal = () => {
    setTypeModalMode('edit');
    setTypeFormData({
      id: activeContractType.id,
      name: activeContractType.name,
      targetCategories: getContractTargetCategories(activeContractType),
      defaultPosition: activeContractType.defaultPosition,
      description: activeContractType.description
    });
    setIsTypeModalOpen(true);
  };

  const handleSaveTypeModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeFormData.name.trim()) {
      alert("Por favor ingresa un nombre para el tipo de contrato.");
      return;
    }

    const categoriesToSave = typeFormData.targetCategories && typeFormData.targetCategories.length > 0
      ? typeFormData.targetCategories
      : ['Oficina'];

    if (typeModalMode === 'create') {
      const newId = `contract_type_${Date.now()}`;
      const newType: ContractTypeConfig = {
        id: newId,
        name: typeFormData.name.trim(),
        targetCategories: categoriesToSave,
        defaultPosition: typeFormData.defaultPosition.trim() || 'Colaborador',
        description: typeFormData.description.trim() || `Contrato para personal de ${categoriesToSave.join(', ')}.`,
        template: DEFAULT_CONTRACT_TEMPLATE,
        standardVars: { ...DEFAULT_STANDARD_VARIABLES },
        createdAt: new Date().toISOString().split('T')[0]
      };

      setContractTypes(prev => [...prev, newType]);
      setActiveTypeId(newId);
      setSelectedEmpId('');
      setIsTypeModalOpen(false);
    } else {
      // Edit mode
      updateActiveContractType({
        name: typeFormData.name.trim(),
        targetCategories: categoriesToSave,
        defaultPosition: typeFormData.defaultPosition.trim() || activeContractType.defaultPosition,
        description: typeFormData.description.trim() || activeContractType.description
      });
      setIsTypeModalOpen(false);
    }
  };

  const handleDeleteActiveType = () => {
    if (contractTypes.length <= 1) {
      alert("No puedes eliminar el único tipo de contrato existente.");
      return;
    }

    if (window.confirm(`¿Estás seguro de eliminar el tipo de contrato "${activeContractType.name}"? Se perderán sus configuraciones y plantillas personalizadas.`)) {
      const remaining = contractTypes.filter(ct => ct.id !== activeContractType.id);
      setContractTypes(remaining);
      setActiveTypeId(remaining[0].id);
      setSelectedEmpId('');
      setIsTypeModalOpen(false);
    }
  };

  // Render Formatted Document Preview
  const renderFormattedPreview = (text: string) => {
    const lines = text.split('\n');

    return (
      <div className="space-y-3 font-serif text-slate-800 text-xs sm:text-[13px] leading-relaxed text-justify">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-2" />;
          }

          // Main Title
          if (trimmed.startsWith('**CONTRATO INDIVIDUAL DE TRABAJO')) {
            return (
              <h2 key={idx} className="text-center font-bold text-sm sm:text-base text-slate-900 tracking-wide pt-2 pb-1 border-b border-slate-200">
                {trimmed.replace(/\*\*/g, '')}
              </h2>
            );
          }

          // Section Header
          if (trimmed.startsWith('**DECLARACIONES') || trimmed.startsWith('**CLÁUSULAS')) {
            return (
              <h3 key={idx} className="text-center font-bold text-xs sm:text-sm text-slate-900 tracking-wider pt-3 pb-1">
                {trimmed.replace(/\*\*/g, '')}
              </h3>
            );
          }

          // Table of Signatures Preview
          if (trimmed.includes('[FIRMAS_TABLA]')) {
            const patronName = activeContractType.standardVars.nombreRepresentanteLegal || 'REPRESENTANTE LEGAL';
            const patronCommercial = activeContractType.standardVars.nombresComercialesPatron || 'LA EMPRESA';
            const workerName = selectedEmployee 
              ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim().toUpperCase() 
              : 'NOMBRE TRABAJADOR';

            return (
              <div key={idx} className="pt-8 pb-4 my-6 border-t border-dashed border-slate-300">
                <div className="grid grid-cols-2 gap-8 text-center">
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">"EL PATRÓN"</p>
                    <div className="h-16 flex items-end justify-center">
                      <div className="w-48 border-b-2 border-slate-700" />
                    </div>
                    <p className="font-bold text-xs text-slate-900">{patronName.toUpperCase()}</p>
                    <p className="text-[10px] text-slate-500">En rep. de {patronCommercial}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">"EL TRABAJADOR"</p>
                    <div className="h-16 flex items-end justify-center">
                      <div className="w-48 border-b-2 border-slate-700" />
                    </div>
                    <p className="font-bold text-xs text-slate-900">{workerName}</p>
                    <p className="text-[10px] text-slate-500">Acepto y firmo de conformidad</p>
                  </div>
                </div>
              </div>
            );
          }

          // Process Bold formatting for markdown `**bold**`
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={idx} className="leading-relaxed">
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={pIdx} className="font-bold text-slate-950">{part.slice(2, -2)}</strong>;
                }
                return <span key={pIdx}>{part}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      
      {/* ========================================================================= */}
      {/* 🚀 TOP BAR: CONTRACT TYPES NAVIGATION & MANAGEMENT                        */}
      {/* ========================================================================= */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Contract Types Pills Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Tipos de Contrato:
            </span>

            {contractTypes.map(ct => {
              const isSelected = ct.id === activeTypeId;
              const cats = getContractTargetCategories(ct);
              return (
                <button
                  key={ct.id}
                  onClick={() => {
                    setActiveTypeId(ct.id);
                    setSelectedEmpId('');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`} />
                  <span>{ct.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {cats.length === ALL_PERSONNEL_CATEGORIES.length ? 'Todas' : cats.join(', ')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleOpenEditTypeModal}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Configurar datos y categorías del tipo de contrato actual"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              Ajustes de Tipo
            </button>
            <button
              type="button"
              onClick={handleOpenCreateTypeModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nuevo Tipo de Contrato
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🧭 ACTIVE CONTRACT TYPE WORKSPACE & SUBTABS                               */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        
        {/* Active Contract Info Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-indigo-50/30 p-3.5 rounded-xl border border-slate-200/80">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                Trabajando en Contrato
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {activeCategories.map(cat => (
                  <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100/80 text-indigo-800 border border-indigo-200">
                    <span>{cat === 'Oficina' ? '🏢' : cat === 'Ejecutivos' ? '👔' : cat === 'Supervisoras' ? '👥' : '🤝'}</span>
                    {cat}
                  </span>
                ))}
              </div>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5 mt-1">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">{activeContractType.name}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeContractType.description || `Plantilla y variables configuradas para colaboradores de ${activeCategories.join(', ')}.`}
            </p>
          </div>
        </div>

        {/* Subtabs for Active Type */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 pb-2">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            1. Generar Contrato
          </button>

          <button
            onClick={() => setActiveTab('template_editor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'template_editor'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            2. Machote (Plantilla)
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            3. Historial ({filteredContractsHistory.length})
          </button>

          <button
            onClick={() => setActiveTab('standard_variables')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'standard_variables'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            4. Configuración y Variables
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📄 SUBTAB 1: GENERADOR DE CONTRATOS                                       */}
      {/* ========================================================================= */}
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
                  placeholder={activeCategories.length === ALL_PERSONNEL_CATEGORIES.length ? "Buscar por nombre, plaza, puesto..." : `Buscar en ${activeCategories.join(', ')}...`}
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                />
              </div>

              {/* Employee Picker */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {filteredEmployeesList.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No se encontraron colaboradores registrados en las categorías <strong>{activeCategories.join(', ')}</strong>.
                  </div>
                ) : (
                  filteredEmployeesList.map(emp => {
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
                              {emp.category ? `[${emp.category}] ` : ''}{emp.plaza || 'Sin Plaza'} • {emp.position || 'Colaborador'}
                            </p>
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 2 & 3: Only visible when an employee is selected */}
            {selectedEmployee ? (
              <>
                {/* Step 2: Employee Specific Variables */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5 animate-fade-in">
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
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5 animate-fade-in">
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          Puesto [PUESTO_TRABAJADOR]
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsCustomPosition(!isCustomPosition)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          {isCustomPosition ? '📋 Seleccionar de la lista' : '✏️ Escribir otro puesto'}
                        </button>
                      </div>
                      {isCustomPosition ? (
                        <input
                          type="text"
                          value={workerPosition}
                          onChange={(e) => setWorkerPosition(e.target.value)}
                          placeholder="Ej. Auxiliar Administrativo Integral"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-slate-900 outline-none bg-white text-slate-900"
                          autoFocus
                        />
                      ) : (
                        <select
                          value={workerPosition}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setIsCustomPosition(true);
                            } else {
                              setWorkerPosition(e.target.value);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-slate-900 outline-none bg-white text-slate-900 cursor-pointer"
                        >
                          {availablePositions.map((pos) => (
                            <option key={pos} value={pos}>
                              {pos}
                            </option>
                          ))}
                          {!availablePositions.includes(workerPosition) && workerPosition.trim() && (
                            <option value={workerPosition}>
                              {workerPosition} (Personalizado)
                            </option>
                          )}
                          <option value="__custom__">➕ Otro puesto (Escribir personalizado)...</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Salario ($) [SALARIO_NUMERO]
                      </label>
                      <input
                        type="text"
                        value={contractSalaryNum}
                        onChange={(e) => handleSalaryNumChange(e.target.value)}
                        placeholder="Ej. 5,000.00"
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
                        placeholder="Cinco mil pesos 00/100 M.N."
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      disabled={!selectedEmployee || isGeneratingPdf}
                      className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      {isGeneratingPdf ? 'Generando y Guardando PDF...' : 'Descargar Contrato en PDF (Oficio)'}
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
              </>
            ) : null}

          </div>

          {/* Right Column: Live Document Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {selectedEmployee ? (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-slate-500" />
                    Vista Previa ({activeContractType.name})
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setIsLiveEditorOpen(!isLiveEditorOpen)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                  >
                    <Edit3 className="w-3 h-3 text-slate-600" />
                    {isLiveEditorOpen ? 'Ocultar Edición de Horarios' : 'Edición de Horarios'}
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
                <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-6 sm:p-10 font-serif text-slate-800 text-xs sm:text-[13px] leading-relaxed max-h-[850px] overflow-y-auto select-text">
                  {/* Centered Logo Preview */}
                  {(activeContractType.standardVars.contractLogoUrl || companyLogoUrl) && (
                    <div className="flex justify-center mb-6">
                      <img 
                        src={activeContractType.standardVars.contractLogoUrl || companyLogoUrl} 
                        alt="Logo Contrato" 
                        className="max-h-32 max-w-md object-contain"
                      />
                    </div>
                  )}

                  {renderFormattedPreview(generatedContractText)}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[450px] shadow-2xs space-y-3 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Ningún colaborador seleccionado</h3>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  Por favor selecciona un colaborador en el panel izquierdo (<strong>Paso 1</strong>) para generar en tiempo real la vista previa oficial de su contrato laboral.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 📜 SUBTAB 2: EDITOR DE MACHOTE (PLANTILLA INDEPENDIENTE)                   */}
      {/* ========================================================================= */}
      {activeTab === 'template_editor' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  Machote de Contrato Exclusivo
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeCategories.map(cat => (
                    <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <span>{cat === 'Oficina' ? '🏢' : cat === 'Ejecutivos' ? '👔' : cat === 'Supervisoras' ? '👥' : '🤝'}</span>
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900">{activeContractType.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Edita la redacción legal de esta plantilla. Las variables entre corchetes se sustituirán automáticamente al generar el contrato.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResetMachote}
                className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Restablecer machote predeterminado oficial de 9 cláusulas"
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
                {savedSuccess ? 'Plantilla Guardada' : 'Guardar Plantilla'}
              </button>
            </div>
          </div>

          {/* Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              Herramientas de Formato:
            </span>

            <button
              type="button"
              onClick={handleApplyBold}
              className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Poner texto seleccionado en Negrita (**texto**)"
            >
              <Bold className="w-3.5 h-3.5 text-slate-800" />
              Negrita
            </button>

            <button
              type="button"
              onClick={handleInsertClause}
              className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Insertar nueva cláusula formal"
            >
              <ListPlus className="w-3.5 h-3.5 text-indigo-600" />
              + Cláusula
            </button>

            <button
              type="button"
              onClick={() => insertToken('[FIRMAS_TABLA]')}
              className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Insertar cuadro de firmas oficial"
            >
              <Table className="w-3.5 h-3.5 text-emerald-600" />
              Tabla de Firmas
            </button>
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
              ref={textareaRef}
              rows={24}
              value={activeContractType.template}
              onChange={(e) => updateActiveTemplate(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none font-mono text-xs text-slate-800 leading-relaxed transition-all resize-y"
              placeholder="Escribe o pega aquí el machote de contrato con las variables..."
            />
          </div>

          {/* Bottom Save Bar */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-slate-400">
              Caracteres: {activeContractType.template.length}
            </span>
            <button
              type="button"
              onClick={handleSaveMachote}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
              {savedSuccess ? 'Plantilla Guardada' : 'Guardar Cambios de Plantilla'}
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 📁 SUBTAB 3: HISTORIAL DE CONTRATOS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-2xs space-y-6 animate-fade-in">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <History className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Historial de Contratos Generados
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Consulta los contratos elaborados, descarga los archivos PDF guardados y monitorea los vencimientos.
              </p>
            </div>

            {/* Scope Filter & Status */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHistoryScope('current_type')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    historyScope === 'current_type' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Este Tipo ({activeContractType.name.split('-')[0].trim()})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryScope('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    historyScope === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({contractsHistory.length})
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'active', label: '🟢 Vigentes' },
                  { id: 'expiring', label: '⚠️ Próximos (30d)' },
                  { id: 'expired', label: '🔴 Vencidos' }
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setHistoryFilterStatus(st.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      historyFilterStatus === st.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* History Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar contrato por nombre de colaborador, tipo, puesto o archivo..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
            />
          </div>

          {/* History Table */}
          {filteredContractsHistory.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <History className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No hay contratos registrados</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {historyScope === 'current_type' 
                  ? `Aún no se han generado contratos para "${activeContractType.name}". Ve a la pestaña "Generar Contrato" para elaborar el primero.`
                  : 'Aún no se han generado contratos en el sistema.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Colaborador</th>
                    <th className="px-4 py-3.5">Tipo / Puesto</th>
                    <th className="px-4 py-3.5">Vigencia</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-4 py-3.5">Generado</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredContractsHistory.map(contract => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    let statusBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 Vigente</span>;

                    try {
                      const end = new Date(contract.endDate + 'T00:00:00');
                      const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) {
                        statusBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">🔴 Vencido ({Math.abs(diffDays)}d)</span>;
                      } else if (diffDays <= 30) {
                        statusBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">⚠️ Por Vencer ({diffDays}d)</span>;
                      }
                    } catch {}

                    return (
                      <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {contract.employeeName}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{contract.position || 'Colaborador'}</p>
                          <p className="text-[10px] text-indigo-600 font-medium">{contract.contractTypeName || contract.notes || 'Contrato Laboral'}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                          <span>{contract.startDate}</span> al <span className="font-bold text-slate-900">{contract.endDate}</span>
                          <span className="text-[10px] text-slate-400 block font-sans">({contract.durationMonths} meses)</span>
                        </td>
                        <td className="px-4 py-3">
                          {statusBadge}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500">
                          <span>{new Date(contract.generatedAt).toLocaleDateString('es-MX')}</span>
                          <span className="text-[10px] text-slate-400 block">por {contract.generatedBy || 'Admin'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {contract.pdfBase64 && (
                              <button
                                type="button"
                                onClick={() => handleDownloadFromHistory(contract)}
                                className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Descargar PDF original"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteContract(contract.id, contract.employeeName)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar del historial"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚙️ SUBTAB 4: CONFIGURACIÓN Y VARIABLES DEL TIPO DE CONTRATO                */}
      {/* ========================================================================= */}
      {activeTab === 'standard_variables' && (
        <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-2xs space-y-6 animate-fade-in">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Sliders className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Configuración y Variables: {activeContractType.name}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configura los datos del patrón, horarios por defecto, salario base y logotipo exclusivos para este tipo de contrato.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveStandardVars}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {savedVarsSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
              {savedVarsSuccess ? 'Configuración Guardada' : 'Guardar Configuración'}
            </button>
          </div>

          <form onSubmit={handleSaveStandardVars} className="space-y-6">
            
            {/* Section A: Datos Generales del Tipo de Contrato */}
            <div className="p-4 sm:p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                A. Perfil y Clasificación del Tipo de Contrato
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre del Tipo de Contrato
                  </label>
                  <input
                    type="text"
                    value={activeContractType.name}
                    onChange={(e) => updateActiveContractType({ name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Puesto Predeterminado
                  </label>
                  <input
                    type="text"
                    value={activeContractType.defaultPosition}
                    onChange={(e) => updateActiveContractType({ defaultPosition: e.target.value })}
                    placeholder="Ej. Auxiliar Administrativo Integral"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                {/* Multi-Category Selection in Config */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Categorías de Personal Objetivo *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateActiveContractType({ targetCategories: ['Oficina', 'Ejecutivos', 'Supervisoras', 'Promotoras'] })}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        Seleccionar Todas
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ALL_PERSONNEL_CATEGORIES.map(cat => {
                      const isChecked = activeCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            const current = activeCategories;
                            const next = isChecked
                              ? current.filter(c => c !== cat.id)
                              : [...current, cat.id];
                            updateActiveContractType({
                              targetCategories: next.length > 0 ? next : [cat.id]
                            });
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-2xs font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                            isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Descripción Breve
                  </label>
                  <input
                    type="text"
                    value={activeContractType.description}
                    onChange={(e) => updateActiveContractType({ description: e.target.value })}
                    placeholder="Descripción del objetivo de este contrato"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Logotipo Oficial */}
            <div className="p-4 sm:p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                B. Logotipo Oficial para este Contrato
              </h4>
              <p className="text-xs text-slate-500">
                Sube la imagen del logotipo que encabezará los contratos generados para este tipo.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <div className="w-48 h-20 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-2 overflow-hidden shadow-2xs">
                  {activeContractType.standardVars.contractLogoUrl || companyLogoUrl ? (
                    <img 
                      src={activeContractType.standardVars.contractLogoUrl || companyLogoUrl} 
                      alt="Logo Preview" 
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">Sin logotipo</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleLogoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Subir Logotipo
                  </button>
                  {activeContractType.standardVars.contractLogoUrl && (
                    <button
                      type="button"
                      onClick={() => updateActiveStandardVars({ contractLogoUrl: '' })}
                      className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Section C: Variables del Patrón */}
            <div className="p-4 sm:p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                C. Datos del Patrón y Jurisdicción
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nombres Comerciales del Patrón [NOMBRES_COMERCIALES_PATRON]
                  </label>
                  <input
                    type="text"
                    value={activeContractType.standardVars.nombresComercialesPatron}
                    onChange={(e) => updateActiveStandardVars({ nombresComercialesPatron: e.target.value })}
                    placeholder="Ej. CRÉDITOS LA FORTUNA y CREDIPLANET"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre del Representante Legal [NOMBRE_REPRESENTANTE_LEGAL]
                  </label>
                  <input
                    type="text"
                    value={activeContractType.standardVars.nombreRepresentanteLegal}
                    onChange={(e) => updateActiveStandardVars({ nombreRepresentanteLegal: e.target.value })}
                    placeholder="Ej. Luis Cárdenas"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Domicilio Completo del Patrón [DOMICILIO_COMPLETO_PATRON]
                  </label>
                  <input
                    type="text"
                    value={activeContractType.standardVars.domicilioCompletoPatron}
                    onChange={(e) => updateActiveStandardVars({ domicilioCompletoPatron: e.target.value })}
                    placeholder="Av. Universidad de Guadalajara 290, Colonia Colonos Alameda..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jurisdicción y Municipio / Estado [JURISDICCION_MUNICIPIO_ESTADO]
                  </label>
                  <input
                    type="text"
                    value={activeContractType.standardVars.jurisdiccionMunicipioEstado}
                    onChange={(e) => updateActiveStandardVars({ jurisdiccionMunicipioEstado: e.target.value })}
                    placeholder="Autlán de Navarro, Jalisco"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section D: Horarios y Salarios por Defecto */}
            <div className="p-4 sm:p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                D. Horarios y Salarios por Defecto para este Tipo
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Entrada [HORARIO_ENTRADA]
                  </label>
                  <input
                    type="text"
                    value={activeContractType.standardVars.horarioEntrada}
                    onChange={(e) => updateActiveStandardVars({ horarioEntrada: e.target.value })}
                    placeholder="10:00 a.m."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Salida [HORARIO_SALIDA]
                  </label>
                  <input
                    type="text"
                    value={activeContractType.standardVars.horarioSalida}
                    onChange={(e) => updateActiveStandardVars({ horarioSalida: e.target.value })}
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
                    value={activeContractType.standardVars.horaInicioComida}
                    onChange={(e) => updateActiveStandardVars({ horaInicioComida: e.target.value })}
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
                    value={activeContractType.standardVars.horaFinComida}
                    onChange={(e) => updateActiveStandardVars({ horaFinComida: e.target.value })}
                    placeholder="4:00 p.m."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Salario en Número [SALARIO_NUMERO]
                  </label>
                  <input
                    type="text"
                    value={activeContractType.standardVars.salarioNumero}
                    onChange={(e) => handleStandardSalaryNumChange(e.target.value)}
                    placeholder="3,000.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold font-mono focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Salario en Letra [SALARIO_LETRA]
                  </label>
                  <input
                    type="text"
                    value={activeContractType.standardVars.salarioLetra}
                    onChange={(e) => updateActiveStandardVars({ salarioLetra: e.target.value })}
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
                {savedVarsSuccess ? 'Variables y Logotipo Guardados' : 'Guardar Variables y Logotipo'}
              </button>
            </div>

          </form>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 🛠️ MODAL: CREAR / EDITAR / ELIMINAR TIPO DE CONTRATO                      */}
      {/* ========================================================================= */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  {typeModalMode === 'create' ? <Plus className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {typeModalMode === 'create' ? 'Nuevo Tipo de Contrato' : 'Ajustes del Tipo de Contrato'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {typeModalMode === 'create' 
                      ? 'Crea un perfil de contrato con su propio generador y machote.'
                      : 'Modifica el nombre o categorías de personal asignadas.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTypeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTypeModal} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre del Tipo de Contrato *
                </label>
                <input
                  type="text"
                  value={typeFormData.name}
                  onChange={(e) => setTypeFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Promotora - Crédito Grupal"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                  autoFocus
                />
              </div>

              {/* Multi-Category Selection in Modal */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Categorías de Personal Objetivo *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTypeFormData(prev => ({ ...prev, targetCategories: ['Oficina', 'Ejecutivos', 'Supervisoras', 'Promotoras'] }))}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      Todas
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setTypeFormData(prev => ({ ...prev, targetCategories: ['Oficina'] }))}
                      className="text-[10px] text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                    >
                      Solo Oficina
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {ALL_PERSONNEL_CATEGORIES.map(cat => {
                    const isChecked = typeFormData.targetCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setTypeFormData(prev => {
                            const current = prev.targetCategories || [];
                            const next = isChecked 
                              ? current.filter(c => c !== cat.id) 
                              : [...current, cat.id];
                            return { ...prev, targetCategories: next.length > 0 ? next : [cat.id] };
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-2xs font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{cat.icon}</span>
                          {cat.label}
                        </span>
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Selecciona una o más categorías a las que aplicará este contrato.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Puesto Predeterminado
                </label>
                <input
                  type="text"
                  value={typeFormData.defaultPosition}
                  onChange={(e) => setTypeFormData(prev => ({ ...prev, defaultPosition: e.target.value }))}
                  placeholder="Ej. Promotora de Crédito"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  value={typeFormData.description}
                  onChange={(e) => setTypeFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ej. Contrato laboral por tiempo determinado para promotoras en campo."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                {typeModalMode === 'edit' && contractTypes.length > 1 ? (
                  <button
                    type="button"
                    onClick={handleDeleteActiveType}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar Tipo
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTypeModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {typeModalMode === 'create' ? 'Crear Tipo de Contrato' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
