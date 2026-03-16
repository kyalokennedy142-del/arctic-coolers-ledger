import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';

// ============================================
// SCHEMA MAPPINGS: Define which fields to keep for each table
// ============================================
const SCHEMA_MAP = {
  customers: ['id', 'name', 'phone', 'location', 'created_at', 'updated_at'],
  brokers: ['id', 'name', 'area', 'opening_balance', 'phone', 'created_at', 'updated_at'],
  transactions: ['id', 'customer_id', 'transaction_type', 'amount', 'notes', 'transaction_date', 'created_at', 'updated_at'],
  broker_ledger: ['id', 'broker_id', 'date', 'day', 'amount', 'amount_paid', 'bottles_taken', 'balance', 'created_at', 'updated_at'],
  purchases: ['id', 'date', 'company_name', 'total_expenditure', 'items', 'created_at', 'updated_at'],
  products: ['id', 'name', 'size_description', 'unit_price_carton', 'quantity_cartons', 'unit_price_bag', 'quantity_bags', 'created_at', 'updated_at'],
  bottles: ['id', 'date', 'description', 'quantity', 'total_expenditure', 'created_at', 'updated_at'],
};

// ============================================
// UTILITY: Decode Base64 to string
// ============================================
const decodeBase64 = (base64String) => {
  try {
    // Handle both browser and Node environments
    if (typeof window !== 'undefined') {
      return atob(base64String);
    }
    // eslint-disable-next-line no-undef
    return Buffer.from(base64String, 'base64').toString('utf-8');
  } catch (error) {
    console.error('Base64 decode error:', error);
    throw new Error('Failed to decode Base64 data');
  }
};

// ============================================
// UTILITY: Parse CSV to JSON array
// ============================================
const parseCSV = (csvString) => {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((header, index) => {
      // Handle numeric values
      const value = values[index];
      obj[header] = !isNaN(value) && value !== '' ? Number(value) : value;
    });
    return obj;
  });
};

// ============================================
// UTILITY: Filter data to match schema
// ============================================
const filterToSchema = (data, tableName) => {
  const allowedFields = SCHEMA_MAP[tableName];
  if (!allowedFields) {
    console.warn(`⚠️ No schema defined for table: ${tableName}`);
    return data;
  }
  
  return data.map(row => {
    const filtered = {};
    allowedFields.forEach(field => {
      if (row[field] !== undefined) {
        // Convert camelCase to snake_case for Supabase
        const supabaseField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        filtered[supabaseField] = row[field];
      }
    });
    return filtered;
  });
};

// ============================================
// MAIN: Import data to Supabase
// ============================================
export const importDataToSupabase = async ({ base64Data, tableName, onProgress }) => {
  try {
    // Step 1: Decode Base64
    toast.loading('Decoding data...');
    const decoded = decodeBase64(base64Data);
    
    // Step 2: Parse CSV or JSON
    let records;
    if (decoded.trim().startsWith('[')) {
      // JSON format
      records = JSON.parse(decoded);
    } else {
      // CSV format
      records = parseCSV(decoded);
    }
    
    if (!records || records.length === 0) {
      toast.error('No valid records found in data');
      return { success: false, imported: 0 };
    }
    
    // Step 3: Filter to schema
    const cleanRecords = filterToSchema(records, tableName);
    
    // Step 4: Upsert to Supabase in batches
    toast.loading(`Importing ${cleanRecords.length} records to ${tableName}...`);
    const batchSize = 50;
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < cleanRecords.length; i += batchSize) {
      const batch = cleanRecords.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
      
      if (error) {
        console.error(`Error importing batch ${i}-${i + batchSize}:`, error);
        errors += batch.length;
      } else {
        imported += batch.length;
      }
      
      // Report progress
      if (onProgress) {
        onProgress({
          total: cleanRecords.length,
          imported,
          errors,
          percent: Math.round(((i + batch.length) / cleanRecords.length) * 100)
        });
      }
    }
    
    // Step 5: Final summary
    toast.dismiss();
    if (errors > 0) {
      toast.error(`Imported ${imported} records, ${errors} failed`);
    } else {
      toast.success(`✅ Successfully imported ${imported} records to ${tableName}`);
    }
    
    return {
      success: true,
      imported,
      errors,
      total: cleanRecords.length
    };
    
  } catch (error) {
    console.error('Import error:', error);
    toast.error(`Import failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// ============================================
// UTILITY: Update frontend state via DataContext
// ============================================
export const updateFrontendState = (setDataFn, records, tableName) => {
  // This function should be called with the appropriate setter from DataContext
  // Example: updateFrontendState(setCustomers, customerRecords, 'customers')
  
  if (!setDataFn || !records) return;
  
  setDataFn(prev => {
    // Merge new records with existing, avoiding duplicates by id
    const existingIds = new Set(prev.map(r => r.id));
    const newRecords = records.filter(r => !existingIds.has(r.id));
    return [...prev, ...newRecords];
  });
  
  toast.success(`Frontend updated with ${records.length} ${tableName} records`);
};

// ============================================
// UTILITY: Export table data as Base64 (for backup/export)
// ============================================
export const exportTableAsBase64 = async (tableName) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) throw error;
    
    const jsonString = JSON.stringify(data, null, 2);
    const base64 = typeof window !== 'undefined' 
      ? btoa(jsonString)
      // eslint-disable-next-line no-undef
      : Buffer.from(jsonString).toString('base64');
    
    return { success: true, base64, count: data?.length || 0 };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
};