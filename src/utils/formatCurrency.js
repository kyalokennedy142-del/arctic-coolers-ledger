// src/utils/formatCurrency.js

/**
 * Format phone number for WhatsApp (convert to +254 format)
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number (e.g., "+254712345678")
 */
export const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Convert Kenyan formats to +254
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '254' + cleaned.slice(1);
  }
  
  // If 9 digits, add 254 prefix
  if (cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }
  
  // Add + prefix for WhatsApp
  return '+' + cleaned;
};

/**
 * Format phone for display (e.g., "+254 712 345 678")
 * @param {string} phone - Phone number
 * @returns {string} Formatted for display
 */
export const formatPhoneForDisplay = (phone) => {
  if (!phone) return '';
  
  const formatted = formatPhoneForWhatsApp(phone);
  
  // Format as +254 712 345 678
  if (formatted.length === 13) { // +254712345678
    return `${formatted.substring(0, 4)} ${formatted.substring(4, 7)} ${formatted.substring(7, 10)} ${formatted.substring(10)}`;
  }
  
  return formatted;
};