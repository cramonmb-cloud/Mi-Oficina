// Utility for calculating Mexican CURP (Clave Única de Registro de Población) according to RENAPO standards

// Mexican states 2-letter codes according to RENAPO
export const MEXICAN_STATES: { code: string; name: string }[] = [
  { code: 'AS', name: 'Aguascalientes' },
  { code: 'BC', name: 'Baja California' },
  { code: 'BS', name: 'Baja California Sur' },
  { code: 'CC', name: 'Campeche' },
  { code: 'CL', name: 'Coahuila' },
  { code: 'CM', name: 'Colima' },
  { code: 'CS', name: 'Chiapas' },
  { code: 'CH', name: 'Chihuahua' },
  { code: 'DF', name: 'Ciudad de México / CDMX' },
  { code: 'DG', name: 'Durango' },
  { code: 'GT', name: 'Guanajuato' },
  { code: 'GR', name: 'Guerrero' },
  { code: 'HG', name: 'Hidalgo' },
  { code: 'JC', name: 'Jalisco' },
  { code: 'MC', name: 'México' },
  { code: 'MN', name: 'Michoacán' },
  { code: 'MS', name: 'Morelos' },
  { code: 'NT', name: 'Nayarit' },
  { code: 'NL', name: 'Nuevo León' },
  { code: 'OC', name: 'Oaxaca' },
  { code: 'PL', name: 'Puebla' },
  { code: 'QT', name: 'Querétaro' },
  { code: 'QR', name: 'Quintana Roo' },
  { code: 'SP', name: 'San Luis Potosí' },
  { code: 'SL', name: 'Sinaloa' },
  { code: 'SR', name: 'Sonora' },
  { code: 'TC', name: 'Tabasco' },
  { code: 'TS', name: 'Tamaulipas' },
  { code: 'TL', name: 'Tlaxcala' },
  { code: 'VZ', name: 'Veracruz' },
  { code: 'YN', name: 'Yucatán' },
  { code: 'ZS', name: 'Zacatecas' },
  { code: 'NE', name: 'Nacido en el Extranjero' }
];

// Offensive 4-letter words list to be replaced by 'X' as per RENAPO
const INAPPROPRIATE_WORDS: Record<string, string> = {
  'BACA': 'BXCA', 'BAKA': 'BXKA', 'BUEI': 'BXEI', 'BUEY': 'BXEY',
  'CACA': 'CXCA', 'CACO': 'CXCO', 'CAGA': 'CXGA', 'CAGO': 'CXGO',
  'CAKA': 'CXKA', 'CAKO': 'CXKO', 'COGE': 'CXGE', 'COGI': 'CXGI',
  'COJA': 'CXJA', 'COJE': 'CXJE', 'COJI': 'CXJI', 'COJO': 'CXJO',
  'COLA': 'CXLA', 'CULO': 'CXLO', 'FALO': 'FXLO', 'FETO': 'FXTO',
  'GETA': 'GXTA', 'GUEI': 'GXEI', 'GUEY': 'GXEY', 'JETA': 'JXTA',
  'JOTO': 'JXTO', 'KACA': 'KXCA', 'KACO': 'KXCO', 'KAGA': 'KXGA',
  'KAGO': 'KXGO', 'KAKA': 'KXKA', 'KAKO': 'KXKO', 'KOGE': 'KXGE',
  'KOGI': 'KXGI', 'KOJA': 'KXJA', 'KOJE': 'KXJE', 'KOJI': 'KXJI',
  'KOJO': 'KXJO', 'KOLA': 'KXLA', 'KULO': 'KXLO', 'LILO': 'LXLO',
  'LOCA': 'LXCA', 'LOCO': 'LXCO', 'LOKA': 'LXKA', 'LOKO': 'LXKO',
  'MAME': 'MXME', 'MAMO': 'MXMO', 'MEAR': 'MXAR', 'MEAS': 'MXAS',
  'MEON': 'MXON', 'MIAR': 'MXAR', 'MION': 'MXON', 'MOCO': 'MXCO',
  'MOKO': 'MXKO', 'MULA': 'MXLA', 'MULO': 'MXLO', 'NACA': 'NXCA',
  'NACO': 'NXCO', 'PEDA': 'PXDA', 'PEDO': 'PXDO', 'PENE': 'PXNE',
  'PIPI': 'PXPI', 'PITO': 'PXTO', 'POPO': 'PXPO', 'PUTA': 'PXTA',
  'PUTO': 'PXTO', 'QULO': 'QXLO', 'RATA': 'RXTA', 'ROBA': 'RXBA',
  'ROBE': 'RXBE', 'ROBO': 'RXBO', 'RUCO': 'RXCO', 'SENO': 'SXNO',
  'TETA': 'TXTA', 'VACA': 'VXCA', 'VAGA': 'VXGA', 'VAGO': 'VXGO',
  'VAKA': 'VXKA', 'VUEI': 'VXEI', 'VUEY': 'VXEY', 'WUEI': 'WXEI',
  'WUEY': 'WXEY'
};

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const CONSONANTS = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'Ñ', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'];

// Remove accents and special symbols
function cleanString(str: string): string {
  if (!str) return '';
  return str
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^A-ZÑ\s]/g, '');
}

// Remove common particles (DE, DEL, LA, LOS, SAN, etc.)
function removeParticles(name: string): string {
  const particles = ['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'MC', 'MAC', 'VON', 'VAN', 'SAN', 'SANTA', 'AL'];
  const words = cleanString(name).split(/\s+/);
  const filtered = words.filter(w => !particles.includes(w));
  return filtered.length > 0 ? filtered.join(' ') : words.join(' ');
}

// First internal vowel starting at index 1
function getFirstInternalVowel(str: string): string {
  const cleaned = cleanString(str);
  for (let i = 1; i < cleaned.length; i++) {
    if (VOWELS.includes(cleaned[i])) {
      return cleaned[i];
    }
  }
  return 'X';
}

// First internal consonant starting at index 1
function getFirstInternalConsonant(str: string): string {
  const cleaned = cleanString(str);
  for (let i = 1; i < cleaned.length; i++) {
    if (CONSONANTS.includes(cleaned[i]) && !VOWELS.includes(cleaned[i])) {
      return cleaned[i] === 'Ñ' ? 'X' : cleaned[i];
    }
  }
  return 'X';
}

// Resolve primary given name for compound names
function getPrimaryGivenName(fullName: string): string {
  const cleaned = removeParticles(fullName);
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  
  const commonPrefixes = ['JOSE', 'MARIA', 'MA', 'J'];
  if (words.length > 1 && commonPrefixes.includes(words[0])) {
    return words[1];
  }
  return words[0];
}

// Split combined lastName into paternal and maternal
export function splitLastNames(lastNameStr: string): { paternal: string; maternal: string } {
  const cleaned = removeParticles(lastNameStr);
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { paternal: '', maternal: '' };
  if (words.length === 1) return { paternal: words[0], maternal: '' };
  return {
    paternal: words[0],
    maternal: words.slice(1).join(' ')
  };
}

export interface CurpParams {
  firstName: string;
  lastName: string; // May contain paternal and maternal (e.g. "Moran Buenrostro")
  paternalLastName?: string;
  maternalLastName?: string;
  birthDate: string; // Format "YYYY-MM-DD"
  gender?: 'H' | 'M' | 'X';
  stateCode?: string; // e.g. "JC", "CM", "DF", etc.
}

/**
 * Calculates official 18-character CURP based on user information.
 */
export function calculateCurp(params: CurpParams): string {
  const { firstName, lastName, birthDate } = params;
  if (!firstName || (!lastName && !params.paternalLastName) || !birthDate) {
    return '';
  }

  // Surnames resolution
  let paternal = params.paternalLastName || '';
  let maternal = params.maternalLastName || '';
  if (!paternal) {
    const split = splitLastNames(lastName);
    paternal = split.paternal;
    maternal = split.maternal;
  }

  paternal = removeParticles(paternal);
  maternal = removeParticles(maternal);
  const givenName = getPrimaryGivenName(firstName);

  if (!paternal && !givenName) return '';

  // 1. Initial 4 letters:
  // Pos 1: Primera letra del primer apellido
  const p1 = paternal ? (paternal[0] === 'Ñ' ? 'X' : paternal[0]) : (givenName ? givenName[0] : 'X');
  // Pos 2: Primera vocal interna del primer apellido
  const p2 = paternal ? getFirstInternalVowel(paternal) : 'X';
  // Pos 3: Primera letra del segundo apellido
  const p3 = maternal ? (maternal[0] === 'Ñ' ? 'X' : maternal[0]) : 'X';
  // Pos 4: Primera letra del primer nombre
  const p4 = givenName ? (givenName[0] === 'Ñ' ? 'X' : givenName[0]) : 'X';

  let initial4 = `${p1}${p2}${p3}${p4}`.toUpperCase();

  // Check for inappropriate words
  if (INAPPROPRIATE_WORDS[initial4]) {
    initial4 = INAPPROPRIATE_WORDS[initial4];
  }

  // 2. Date of Birth (YYMMDD)
  // birthDate format: YYYY-MM-DD
  const dateParts = birthDate.split('-');
  if (dateParts.length !== 3) return initial4;
  const yearStr = dateParts[0];
  const monthStr = dateParts[1].padStart(2, '0');
  const dayStr = dateParts[2].padStart(2, '0');
  const yearShort = yearStr.length >= 4 ? yearStr.substring(2) : yearStr.padStart(2, '0');
  const dateSegment = `${yearShort}${monthStr}${dayStr}`;

  // 3. Gender (H = Hombre, M = Mujer)
  const gender = params.gender || 'H';

  // 4. State Code (2 letters, default Jalisco 'JC')
  const stateCode = (params.stateCode || 'JC').toUpperCase().padStart(2, 'X');

  // 5. Internal Consonants
  const c1 = paternal ? getFirstInternalConsonant(paternal) : 'X';
  const c2 = maternal ? getFirstInternalConsonant(maternal) : 'X';
  const c3 = givenName ? getFirstInternalConsonant(givenName) : 'X';
  const internalConsonants = `${c1}${c2}${c3}`;

  // 6. Year century discriminator (0-9 for 1900s, A-Z for 2000s)
  const birthYearNum = parseInt(yearStr, 10);
  const centuryChar = isNaN(birthYearNum) ? '0' : (birthYearNum >= 2000 ? 'A' : '0');

  // 7. Verify digit (simple check or standard discriminator)
  const partialCurp = `${initial4}${dateSegment}${gender}${stateCode}${internalConsonants}${centuryChar}`;

  // Calculate official modulo 10 checksum digit
  const dictionary = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = partialCurp[i] || '0';
    const val = dictionary.indexOf(char);
    const weight = 18 - i;
    sum += (val >= 0 ? val : 0) * weight;
  }
  const digitNum = (10 - (sum % 10)) % 10;
  const checksumDigit = String(digitNum);

  return `${partialCurp}${checksumDigit}`.toUpperCase();
}
