// src/context/DataContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const DataContext = createContext(null);
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

export function DataProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [custRes, brokerRes, purchRes, transRes] = await Promise.allSettled([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('brokers').select('*').order('created_at', { ascending: false }),
        supabase.from('purchases').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('created_at', { ascending: false })
      ]);

      if (custRes.status === 'fulfilled') setCustomers(custRes.value.data || []);
      if (brokerRes.status === 'fulfilled') setBrokers(brokerRes.value.data || []);
      if (purchRes.status === 'fulfilled') setPurchases(purchRes.value.data || []);
      if (transRes.status === 'fulfilled') setTransactions(transRes.value.data || []);

      [custRes, brokerRes, purchRes, transRes].forEach((res, i) => {
        if (res.status === 'rejected') console.warn(`Data load failed [${i}]:`, res.reason);
      });
    } catch (e) {
      console.error('DataContext error:', e);
      setError('Failed to load data from Supabase');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const value = { 
    customers, 
    brokers, 
    purchases, 
    transactions, 
    loading, 
    error, 
    refresh: loadData 
  };
  
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
export default DataContext;