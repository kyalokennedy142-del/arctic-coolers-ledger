// src/context/DataContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseReady } from '../lib/supabaseClient';

const DataContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export function DataProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      // 1. Try localStorage first (fast)
      try {
        const saved = localStorage.getItem('arctic-data');
        if (saved && mounted) {
          const data = JSON.parse(saved);
          setCustomers(data.customers || []);
          setBrokers(data.brokers || []);
          setPurchases(data.purchases || []);
        }
      } catch (e) {
        console.warn('localStorage parse error:', e);
      }

      // 2. Skip Supabase if not ready
      if (!isSupabaseReady()) {
        if (mounted) setLoading(false);
        return;
      }

      // 3. Fetch from Supabase (best effort)
      try {
        const fetchTable = async (table) => {
          try {
            const { data, error } = await supabase
              .from(table)
              .select('*')
              .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
          } catch {
            return [];
          }
        };

        const [c, b, p] = await Promise.all([
          fetchTable('customers'),
          fetchTable('brokers'),
          fetchTable('purchases')
        ]);

        if (mounted) {
          setCustomers(c);
          setBrokers(b);
          setPurchases(p);
          // Backup to localStorage
          localStorage.setItem('arctic-data', JSON.stringify({ customers: c, brokers: b, purchases: p }));
        }
      } catch (err) {
        console.warn('Supabase fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('arctic-data', JSON.stringify({ customers, brokers, purchases }));
    }
  }, [customers, brokers, purchases, loading]);

  // Context value
  const value = {
    customers,
    brokers,
    purchases,
    loading,
    setCustomers,
    setBrokers,
    setPurchases,
    setLoading
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export default DataContext;