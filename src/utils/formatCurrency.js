// src/utils/formatCurrency.js

export const formatKSH = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num).replace('KES', 'KSH');
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Format phone for display (07XX or +254 format)
 * @param {string} phone - Phone number
 * @param {string} format - 'local' (07XX) or 'international' (+254)
 * @returns {string} Formatted phone number
 */
export const formatPhoneForDisplay = (phone, format = 'local') => {
  if (!phone) return '';
  
  // Convert to string and remove all non-digits
  let cleaned = phone.toString().replace(/\D/g, '');
  
  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');
  
  // Handle Kenyan numbers
  if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    if (format === 'local') {
      return `0${cleaned}`; // 07XXXXXXXX
    } else {
      return `+254${cleaned}`; // +2547XXXXXXXX
    }
  }
  
  // If already has 254 prefix
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    if (format === 'local') {
      return `0${cleaned.substring(3)}`;
    } else {
      return `+${cleaned}`;
    }
  }
  
  // Return as-is if doesn't match Kenyan format
  return phone;
};

export const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/\D/g, '');
  cleaned = cleaned.replace(/^0+/, '');
  
  if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    return `+254${cleaned}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    return `+${cleaned}`;
  }
  
  if (cleaned.length === 13 && cleaned.startsWith('+254')) {
    return cleaned;
  }
  
  return cleaned;
};

export const getInactivityBadge = (lastTransactionDate) => {
  if (!lastTransactionDate) {
    return { label: 'Inactive', color: 'red', days: Infinity };
  }
  const lastDate = new Date(lastTransactionDate);
  const now = new Date();
  const diffTime = Math.abs(now - lastDate);
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (days < 14) return { label: 'Active', color: 'green', days };
  if (days <= 30) return { label: 'At Risk', color: 'yellow', days };
  return { label: 'Inactive', color: 'red', days };
};