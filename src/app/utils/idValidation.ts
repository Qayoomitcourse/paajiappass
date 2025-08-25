// /app/utils/idValidation.ts

export interface IdValidationResult {
  isValid: boolean;
  type: 'cnic' | 'passport' | 'unknown';
  formatted?: string;
  error?: string;
}

/**
 * Validates and identifies CNIC or Passport number formats
 * @param idNumber - The ID number to validate
 * @returns IdValidationResult with validation status and type
 */
export function validateIdNumber(idNumber: string): IdValidationResult {
  if (!idNumber || typeof idNumber !== 'string') {
    return {
      isValid: false,
      type: 'unknown',
      error: 'ID number is required'
    };
  }

  // Clean the input - remove spaces and convert to uppercase for passport
  const cleanId = idNumber.trim().toUpperCase();

  // CNIC Patterns
  const cnicPatternWithDashes = /^(\d{5})-(\d{7})-(\d{1})$/; // 12345-1234567-1
  const cnicPatternSimple = /^(\d{13})$/; // 1234512345671
  const cnicPatternSpaces = /^(\d{5})\s(\d{7})\s(\d{1})$/; // 12345 1234567 1

  // Passport Patterns
  const passportPattern = /^([A-Z]{2})(\d{7})$/; // AB1234567
  const passportPatternWithSpace = /^([A-Z]{2})\s(\d{7})$/; // AB 1234567

  // Check CNIC formats
  if (cnicPatternWithDashes.test(cleanId)) {
    return {
      isValid: true,
      type: 'cnic',
      formatted: cleanId // Already in correct format
    };
  }

  if (cnicPatternSimple.test(cleanId)) {
    // Format as 12345-1234567-1
    const formatted = `${cleanId.slice(0, 5)}-${cleanId.slice(5, 12)}-${cleanId.slice(12)}`;
    return {
      isValid: true,
      type: 'cnic',
      formatted: formatted
    };
  }

  if (cnicPatternSpaces.test(cleanId)) {
    // Convert spaces to dashes
    const formatted = cleanId.replace(/\s/g, '-');
    return {
      isValid: true,
      type: 'cnic',
      formatted: formatted
    };
  }

  // Check Passport formats
  if (passportPattern.test(cleanId)) {
    return {
      isValid: true,
      type: 'passport',
      formatted: cleanId // Already in correct format
    };
  }

  if (passportPatternWithSpace.test(cleanId)) {
    // Remove space
    const formatted = cleanId.replace(/\s/g, '');
    return {
      isValid: true,
      type: 'passport',
      formatted: formatted
    };
  }

  return {
    isValid: false,
    type: 'unknown',
    error: 'Invalid format. Use CNIC (12345-1234567-1) or Passport (AB1234567) format.'
  };
}

/**
 * Formats an ID number to its standard format
 * @param idNumber - The ID number to format
 * @returns Formatted ID number or original if invalid
 */
export function formatIdNumber(idNumber: string): string {
  const validation = validateIdNumber(idNumber);
  return validation.formatted || idNumber;
}

/**
 * Gets the type of ID number
 * @param idNumber - The ID number to check
 * @returns 'cnic', 'passport', or 'unknown'
 */
export function getIdType(idNumber: string): 'cnic' | 'passport' | 'unknown' {
  return validateIdNumber(idNumber).type;
}

/**
 * Validates if an ID number is a valid CNIC
 * @param idNumber - The ID number to validate
 * @returns boolean indicating if it's a valid CNIC
 */
export function isValidCNIC(idNumber: string): boolean {
  const validation = validateIdNumber(idNumber);
  return validation.isValid && validation.type === 'cnic';
}

/**
 * Validates if an ID number is a valid Passport
 * @param idNumber - The ID number to validate  
 * @returns boolean indicating if it's a valid Passport
 */
export function isValidPassport(idNumber: string): boolean {
  const validation = validateIdNumber(idNumber);
  return validation.isValid && validation.type === 'passport';
}

/**
 * Gets validation error message for display
 * @param idNumber - The ID number to validate
 * @returns Error message or null if valid
 */
export function getIdValidationError(idNumber: string): string | null {
  const validation = validateIdNumber(idNumber);
  return validation.error || null;
}

/**
 * Sanitizes ID number for database storage (removes special characters except dashes for CNIC)
 * @param idNumber - The ID number to sanitize
 * @returns Sanitized ID number
 */
export function sanitizeIdNumber(idNumber: string): string {
  const validation = validateIdNumber(idNumber);
  if (validation.isValid && validation.formatted) {
    return validation.formatted;
  }
  // If invalid, return cleaned version (remove special chars except letters and numbers)
  return idNumber.replace(/[^A-Z0-9-]/g, '');
}