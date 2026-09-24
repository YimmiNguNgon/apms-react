/**
 * Shared validation rules for Company Profile editing across:
 * 1. Manager direct profile editing (CompanyDetail.tsx)
 * 2. Staff monitoring review field editing (CompanyProfileTabs.tsx / StaffMonitoringReviewPage.tsx)
 */

export const EMAIL_ERROR_MESSAGE = 'Enter a valid email address.';
export const PHONE_ERROR_MESSAGE = 'Enter a valid phone number.';
export const WEBSITE_ERROR_MESSAGE = 'Enter a valid website URL, e.g. https://example.com';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS_REGEX = /^\+?[0-9\s\-()]+$/;

/**
 * Validates Email.
 * - Optional if empty or null or all whitespace.
 * - If provided, must match ^[^\s@]+@[^\s@]+\.[^\s@]+$
 * - Can accept a single string or an array of strings. If an array is provided,
 *   all non-empty items are validated.
 */
export const validateEmail = (value?: string | string[] | null): string | null => {
  if (value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const err = validateEmail(item);
      if (err) return err;
    }
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!EMAIL_REGEX.test(trimmed)) {
    return EMAIL_ERROR_MESSAGE;
  }
  return null;
};

/**
 * Validates Phone.
 * - Optional if empty or null or all whitespace.
 * - Allows common phone formatting (+, spaces, hyphens, parentheses).
 * - Disallows letters or other characters.
 * - After removing formatting characters, digit count must be 8-15.
 * - Can accept a single string or an array of strings. If an array is provided,
 *   all non-empty items are validated.
 */
export const validatePhone = (value?: string | string[] | null): string | null => {
  if (value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const err = validatePhone(item);
      if (err) return err;
    }
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!PHONE_CHARS_REGEX.test(trimmed)) {
    return PHONE_ERROR_MESSAGE;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return PHONE_ERROR_MESSAGE;
  }

  return null;
};

/**
 * Validates Website URL.
 * - Optional if empty or null or all whitespace.
 * - Must be a valid HTTP or HTTPS URL with valid hostname.
 */
export const validateWebsite = (value?: string | null): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return WEBSITE_ERROR_MESSAGE;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.') || parsed.hostname.startsWith('.') || parsed.hostname.endsWith('.')) {
      return WEBSITE_ERROR_MESSAGE;
    }
    return null;
  } catch {
    return WEBSITE_ERROR_MESSAGE;
  }
};

/**
 * Validates a company profile field by name/path.
 */
export const validateCompanyProfileField = (
  fieldPath: string,
  value: any
): string | null => {
  switch (fieldPath) {
    case 'website':
    case 'contact.website':
      return validateWebsite(value);
    case 'email':
    case 'emails':
    case 'contact.email':
    case 'contact.emails':
      return validateEmail(value);
    case 'phone':
    case 'phones':
    case 'contact.phone':
    case 'contact.phones':
      return validatePhone(value);
    default:
      return null;
  }
};
