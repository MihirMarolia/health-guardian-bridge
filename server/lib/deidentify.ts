/**
 * De-identification Pipeline for Responsible AI
 * Removes PHI (Protected Health Information) before passing to LLM/NLP
 * Compliant with HIPAA, PIPEDA, and PHIPA regulations
 */

interface DeidentificationResult {
  deidentifiedText: string;
  replacements: Map<string, string>; // Maps [REDACTED_X] back to original values
  redactionCount: number;
}

/**
 * Regex patterns for common PHI elements
 */
const PHI_PATTERNS = {
  // Health Card Numbers (Canadian format: XXXX-XXX-XXX or similar variations)
  healthCard: /\b\d{4}[-\s]?\d{3}[-\s]?\d{3}\b/g,
  
  // Phone numbers (various formats)
  phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Postal codes (Canadian: A1A 1A1)
  postalCode: /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/gi,
  
  // Social Insurance Numbers (SIN: XXX-XXX-XXX)
  sin: /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/g,
  
  // Dates of birth (various formats)
  dob: /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](19|20)?\d{2}\b/g,
  
  // Medical Record Numbers
  mrn: /\bMRN\s*:?\s*(\d{6,})\b/gi,
  
  // Hospital/Provider IDs
  providerId: /\b(Provider\s*ID|Facility\s*ID)\s*:?\s*([A-Z0-9]{4,})\b/gi,
  
  // Names (common patterns - conservative approach)
  // This is intentionally broad to catch most name patterns
  personName: /\b(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)?\s*[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
};

/**
 * Main de-identification function
 * Replaces all PHI with [REDACTED_X] tokens
 */
export function deidentifyText(text: string): DeidentificationResult {
  let deidentifiedText = text;
  const replacements = new Map<string, string>();
  let redactionCount = 0;

  // Process each PHI pattern
  const patterns = Object.entries(PHI_PATTERNS);
  
  for (const [patternName, regex] of patterns) {
    let match;
    const regexCopy = new RegExp(regex.source, regex.flags);
    
    while ((match = regexCopy.exec(text)) !== null) {
      const original = match[0];
      const token = `[REDACTED_${redactionCount}]`;
      
      // Store mapping for audit trail
      replacements.set(token, `${patternName}:${original}`);
      
      // Replace in text
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

/**
 * Restore redacted values (for authorized users only)
 * This should only be called in secure contexts with proper authorization
 */
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

/**
 * Validate that text has been properly de-identified
 * Returns true if no obvious PHI remains
 */
export function validateDeidentification(text: string): boolean {
  // Check for common PHI patterns that should have been redacted
  const strictPatterns = [
    /\d{3}[-\s]?\d{3}[-\s]?\d{3}/, // Numbers that look like health cards/SINs
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/, // Phone
  ];
  
  for (const pattern of strictPatterns) {
    if (pattern.test(text)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Extract and hash PHI for audit logging
 * Allows tracking what was redacted without storing the actual PHI
 */
export function hashPHI(phi: string): string {
  // Simple hash function - in production, use crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < phi.length; i++) {
    const char = phi.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `PHI_${Math.abs(hash).toString(16)}`;
}
