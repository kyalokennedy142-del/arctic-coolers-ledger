import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseReady } from '../lib/supabaseClient';

const DataContext = createContext(null);

// ✅ NAMED EXPORT - This is what DashboardPage.jsx imports
// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

// ✅ NAMED EXPORT - This is what main.jsx imports
export function DataProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      // LocalStorage first
      try {
        const saved = localStorage.getItem('arctic-data');
        if (saved && mounted) {
          const d = JSON.parse(saved);
          setCustomers(d.customers || []);
          setBrokers(d.brokers || []);
          setPurchases(d.purchases || []);
        }
      } catch (e) { console.warn('localStorage:', e); }

      // Skip if no Supabase
      if (!isSupabaseReady()) { if (mounted) setLoading(false); return; }

      // Fetch from Supabase
      try {
        const fetchTable = async (table) => {
          try {
            const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
          } catch { return []; }
        };
        const [c, b, p] = await Promise.all([fetchTable('customers'), fetchTable('brokers'), fetchTable('purchases')]);
        if (mounted) {
          setCustomers(c); setBrokers(b); setPurchases(p);
          localStorage.setItem('arctic-data', JSON.stringify({ customers: c, brokers: b, purchases: p }));
        }
      } catch (err) { console.warn('Supabase:', err); }
      finally { if (mounted) setLoading(false); }
    };
    loadData();
    return () => { mounted = false; };
  }, []);

  // Auto-save
  useEffect(() => {
    if (!loading) localStorage.setItem('arctic-data', JSON.stringify({ customers, brokers, purchases }));
  }, [customers, brokers, purchases, loading]);

  const value = { customers, brokers, purchases, loading, setCustomers, setBrokers, setPurchases, setLoading };
  return React.createElement(DataContext.Provider, { value }, children);
}

// Default export (optional)
export default DataContext;