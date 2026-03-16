// src/lib/formatCurrency.js

/**
 * Format number as Kenya Shillings (KSh)
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatKSH = (amount) => {
  const num = parseFloat(amount) || 0;
  return `KSh ${num.toLocaleString('en-KE', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

// ✅ FIXED: Handle both 07XX and +254 formats
export const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return '';
  
  // Remove ALL non-digit characters (spaces, dashes, +, etc.)
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats:
  // Format 1: +254712345678 → 254712345678
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned; // Already correct
  }
  
  // Format 2: 0712345678 → 254712345678
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '254' + cleaned.slice(1);
  }
  
  // Format 3: 712345678 → 254712345678 (9 digits)
  if (cleaned.length === 9 && cleaned.startsWith('7')) {
    return '254' + cleaned;
  }
  
  // Format 4: 254712345678 (already correct, 12 digits)
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    return cleaned;
  }
  
  // Fallback: return as-is with warning
  console.warn(`⚠️ Phone format may be invalid: ${phone}`);
  return cleaned;
};

/**
 * Calculate inactivity status based on last transaction date
 * @param {string|null} lastTransactionDate - ISO date string
 * @returns {{ status: string, badge: string, color: string }}
 */
export const calculateInactivityStatus = (lastTransactionDate) => {
  if (!lastTransactionDate) {
    return { 
      status: 'Inactive', 
      badge: '🔴', 
      color: 'bg-red-100 text-red-700',
      days: null 
    };
  }
  
  const lastDate = new Date(lastTransactionDate);
  const today = new Date();
  const diffTime = Math.abs(today - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 14) {
    return { 
      status: 'Active', 
      badge: '🟢', 
      color: 'bg-green-100 text-green-700',
      days: diffDays 
    };
  } else if (diffDays <= 30) {
    return { 
      status: 'At Risk', 
      badge: '🟡', 
      color: 'bg-yellow-100 text-yellow-700',
      days: diffDays 
    };
  } else {
    return { 
      status: 'Inactive', 
      badge: '🔴', 
      color: 'bg-red-100 text-red-700',
      days: diffDays 
    };
  }
};

/**
 * Get day name from date string
 * @param {string} dateString - ISO date string
 * @returns {string} Day name (Mon, Tue, etc.)
 */
export const getDayName = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { weekday: 'short' });
};

/**
 * Format date for display (DD MMM YYYY)
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
};

export default {
  formatKSH,
  formatPhoneForWhatsApp,
  calculateInactivityStatus,
  getDayName,
  formatDate
};