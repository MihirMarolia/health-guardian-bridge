/**
 * De-identification Pipeline for Responsible AI
 * Removes PHI (Protected Health Information) before passing to LLM/NLP
 * Compliant with HIPAA, PIPEDA, and PHIPA regulations
 */

interface DeidentificationResult {
  deidentifiedText: string;
  replacements: Map<string, string>;
  redactionCount: number;
}

/**
 * Regex patterns for common PHI elements
 */
const PHI_PATTERNS = {
  healthCard: /\b\d{4}[-\s]?\d{3}[-\s]?\d{3}\b/g,
  phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  postalCode: /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/gi,
  sin: /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/g,
  dob: /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](19|20)?\d{2}\b/g,
  mrn: /\bMRN\s*:?\s*(\d{6,})\b/gi,
  providerId: /\b(Provider\s*ID|Facility\s*ID)\s*:?\s*([A-Z0-9]{4,})\b/gi,
  personName: /\b(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)?\s*[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
};

export function deidentifyText(text: string): DeidentificationResult {
  let deidentifiedText = text;
  const replacements = new Map<string, string>();
  let redactionCount = 0;

  const patterns = Object.entries(PHI_PATTERNS);
  
  for (const [patternName, regex] of patterns) {
    let match;
    const regexCopy = new RegExp(regex.source, regex.flags);
    
    while ((match = regexCopy.exec(text)) !== null) {
      const original = match[0];
      const token = `[REDACTED_${redactionCount}]`;
      
      replacements.set(token, `${patternName}:${original}`);
      deidentifiedText = deidentifiedText.replace(original, token);
      redactionCount++;
    }
  }

  return {
    deidentifiedText,
    replacements,
    redactionCount,
  };
}

export function reidentifyText(
  deidentifiedText: string,
  replacements: Map<string, string>
): string {
  let reidentifiedText = deidentifiedText;
  
  replacements.forEach((original, token) => {
    reidentifiedText = reidentifiedText.replace(token, original.split(':')[1] || '');
  });
  
  return reidentifiedText;
}

export function validateDeidentification(text: string): boolean {
  const strictPatterns = [
    /\d{3}[-\s]?\d{3}[-\s]?\d{3}/,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/,
  ];
  
  for (const pattern of strictPatterns) {
    if (pattern.test(text)) {
      return false;
    }
  }
  
  return true;
}

export function hashPHI(phi: string): string {
  let hash = 0;
  for (let i = 0; i < phi.length; i++) {
    const char = phi.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `PHI_${Math.abs(hash).toString(16)}`;
}
