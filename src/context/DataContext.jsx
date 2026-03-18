/* eslint-disable react-refresh/only-export-components */
// src/Context/DataContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// ==================== CONTEXT SETUP ====================

const DataContext = createContext(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};

// ==================== PROVIDER COMPONENT ====================

export function DataProvider({ children }) {
  // State
  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==================== SAFE SUPABASE FETCH ====================
  
  const fetchSafe = useCallback(async (table, options = {}) => {
    if (!supabase) {
      console.warn(`⚠️ Supabase unavailable for '${table}'`);
      return [];
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .order(options.orderBy || 'created_at', { 
          ascending: options.ascending ?? false 
        });

      if (error) {
        // Handle auth errors
        if (error.status === 401 || error.message?.includes('Invalid API key')) {
          console.error(`🔐 Auth failed for '${table}': Invalid API key`);
          return [];
        }
        // Handle missing tables
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn(`⚠️ Table '${table}' not found`);
          return [];
        }
        // Other errors
        console.error(`❌ Error fetching '${table}':`, error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.warn(`⚠️ Fetch failed for '${table}':`, err.message);
      return [];
    }
  }, []);

  // ==================== STATS & CALCULATIONS ====================
  
  const getStats = useCallback(() => {
    const totalCredit = (customers || []).reduce((sum, c) => 
      sum + (c.transactions || [])
        .filter(t => t.transaction_type?.toLowerCase() === 'credit')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0), 0);
    
    const totalPaid = (customers || []).reduce((sum, c) => 
      sum + (c.transactions || [])
        .filter(t => ['payment', 'paid'].includes(t.transaction_type?.toLowerCase()))
        .reduce((s, t) => s + (Number(t.amount) || 0), 0), 0);
    
    const totalSpent = (purchases || [])
      .reduce((sum, p) => sum + (Number(p.total_expenditure) || 0), 0);
    
    return {
      totalCustomers: (customers || []).length,
      totalBrokers: (brokers || []).length,
      totalPurchases: (purchases || []).length,
      totalCredit,
      totalPaid,
      outstandingBalance: totalCredit - totalPaid,
      totalSpent
    };
  }, [customers, brokers, purchases]);

  const calculateCustomerBalance = useCallback((customer) => {
    if (!customer) return 0;
    return (customer.transactions || []).reduce((sum, t) => {
      const type = t.transaction_type?.toLowerCase();
      if (type === 'credit') return sum + (Number(t.amount) || 0);
      if (['payment', 'paid'].includes(type)) return sum - (Number(t.amount) || 0);
      return sum;
    }, 0);
  }, []);

  const calculateBrokerBalance = useCallback((broker) => {
    if (!broker) return 0;
    const ledger = broker.broker_ledger || [];
    if (ledger.length === 0) return Number(broker.opening_balance) || 0;
    return Number(ledger[ledger.length - 1]?.balance) || 0;
  }, []);

  // ==================== CUSTOMER CRUD ====================
  
  const addCustomer = useCallback((customer) => {
    const newCustomer = { 
      ...customer, 
      id: crypto.randomUUID(), 
      transactions: [],
      created_at: new Date().toISOString()
    };
    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  }, []);

  const updateCustomer = useCallback((updated) => {
    setCustomers(prev => prev.map(c => 
      c.id === updated.id ? { ...c, ...updated, updated_at: new Date().toISOString() } : c
    ));
  }, []);

  const deleteCustomer = useCallback((id) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  const addTransaction = useCallback((customerId, transaction) => {
    const newTx = { 
      ...transaction, 
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { ...c, transactions: [newTx, ...(c.transactions || [])] } 
        : c
    ));
    return newTx;
  }, []);

  // ==================== BROKER CRUD ====================
  
  const addBroker = useCallback((broker) => {
    const newBroker = { 
      ...broker, 
      id: crypto.randomUUID(), 
      broker_ledger: [],
      created_at: new Date().toISOString()
    };
    setBrokers(prev => [newBroker, ...prev]);
    return newBroker;
  }, []);

  const updateBroker = useCallback((updated) => {
    setBrokers(prev => prev.map(b => 
      b.id === updated.id ? { ...b, ...updated, updated_at: new Date().toISOString() } : b
    ));
  }, []);

  const deleteBroker = useCallback((id) => {
    setBrokers(prev => prev.filter(b => b.id !== id));
  }, []);

  const addLedgerEntry = useCallback((brokerId, entry) => {
    const newEntry = { 
      ...entry, 
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    setBrokers(prev => prev.map(b => 
      b.id === brokerId 
        ? { ...b, broker_ledger: [...(b.broker_ledger || []), newEntry] } 
        : b
    ));
    return newEntry;
  }, []);

  // ==================== PURCHASES CRUD ====================
  
  const addPurchase = useCallback((purchase) => {
    const newPurchase = { 
      ...purchase, 
      id: crypto.randomUUID(),
      items: typeof purchase.items === 'string' 
        ? purchase.items 
        : JSON.stringify(purchase.items || []),
      created_at: new Date().toISOString()
    };
    setPurchases(prev => [newPurchase, ...prev]);
    return newPurchase;
  }, []);

  // ==================== DATA LOADING ====================
  
  // 🔁 REPLACE the entire useEffect loadData block with this:

  useEffect(() => {
    let isMounted = true;
    // eslint-disable-next-line no-unused-vars
    let supabaseAvailable = false;

    const loadData = async () => {
      console.log('🔄 Starting data load...');
      
      // ✅ Load from localStorage FIRST (instant UI)
      try {
        const saved = localStorage.getItem('arctic-data');
        if (saved && isMounted) {
          const data = JSON.parse(saved);
          console.log('📦 Loaded from localStorage:', {
            customers: data.customers?.length || 0,
            brokers: data.brokers?.length || 0,
            purchases: data.purchases?.length || 0
          });
          setCustomers(data.customers || []);
          setBrokers(data.brokers || []);
          setPurchases(data.purchases || []);
          // Show data immediately, then try to refresh from cloud
          if (isMounted) setLoading(false);
        }
      } catch (e) {
        console.error('❌ localStorage parse error:', e);
      }
      
      // ✅ Check Supabase availability
      // eslint-disable-next-line no-undef
      if (!isSupabaseReady()) {
        console.warn('⚠️ Supabase not available - using local data only');
        return; // Exit early, don't hang
      }
      supabaseAvailable = true;
      
      // ✅ Try cloud fetch with error isolation
      try {
        console.log('☁️ Fetching from Supabase...');
        
        // Quick health check (non-blocking)
        const { error: healthCheck } = await supabase
          .from('brokers')
          .select('id', { head: true, count: 'exact' })
          .limit(1);
          
        if (healthCheck?.status === 401 || healthCheck?.message?.includes('Invalid API key')) {
          console.error('🔐 Supabase auth failed: Invalid API key');
          console.error('🔧 Quick fix:');
          console.error('   1. Check .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
          console.error('   2. Verify keys match: Dashboard → Settings → API');
          console.error('   3. Restart dev server: npm run dev');
          // Don't set loading=false here - we already did from localStorage
          return;
        }
        
        // Fetch tables in parallel with individual error handling
        const [customersRes, brokersRes, purchasesRes] = await Promise.allSettled([
          fetchSafe('customers'),
          fetchSafe('brokers'), 
          fetchSafe('purchases')
        ]);
        
        const extractData = (res) => res.status === 'fulfilled' ? res.value : [];
        
        const customersData = extractData(customersRes);
        const brokersData = extractData(brokersRes);
        const purchasesData = extractData(purchasesRes);
        
        console.log('✅ Supabase base data loaded:', {
          customers: customersData.length,
          brokers: brokersData.length,
          purchases: purchasesData.length
        });
        
        // Load related data (non-blocking, best-effort)
        const [customersWithTx, brokersWithLedger] = await Promise.allSettled([
          Promise.all(customersData.map(async (c) => {
            const tx = await fetchSafe('transactions');
            return { ...c, transactions: (tx || []).filter(t => t.customer_id === c.id) };
          })),
          Promise.all(brokersData.map(async (b) => {
            const ledger = await fetchSafe('broker_ledger');
            return { ...b, broker_ledger: (ledger || []).filter(l => l.broker_id === b.id) };
          }))
        ]);
        
        // Parse purchase items
        const purchasesWithItems = purchasesData.map(p => ({
          ...p,
          items: typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || [])
        }));
        
        // Update state if still mounted
        if (isMounted) {
          setCustomers(customersWithTx.status === 'fulfilled' ? customersWithTx.value : customersData);
          setBrokers(brokersWithLedger.status === 'fulfilled' ? brokersWithLedger.value : brokersData);
          setPurchases(purchasesWithItems);
          
          // Refresh localStorage backup
          localStorage.setItem('arctic-data', JSON.stringify({
            customers: customersWithTx.status === 'fulfilled' ? customersWithTx.value : customersData,
            brokers: brokersWithLedger.status === 'fulfilled' ? brokersWithLedger.value : brokersData,
            purchases: purchasesWithItems
          }));
        }
        
      } catch (error) {
        console.error('💥 Data load error (non-fatal):', error);
        // Continue with local data - don't block UI
      }
      // Loading already set to false from localStorage load
    };
    
    loadData();
    return () => { isMounted = false; };
  }, [fetchSafe]);
  // ==================== AUTO-SAVE TO LOCALSTORAGE ====================
  
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('arctic-data', JSON.stringify({ customers, brokers, purchases }));
    }
  }, [customers, brokers, purchases, loading]);

  // ==================== CONTEXT VALUE ====================
  
  const value = {
    // State
    customers,
    brokers, 
    purchases,
    loading,
    
    // Customer methods
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addTransaction,
    
    // Broker methods
    addBroker,
    updateBroker,
    deleteBroker,
    addLedgerEntry,
    
    // Purchase methods
    addPurchase,
    
    // Utility methods
    calculateCustomerBalance,
    calculateBrokerBalance,
    getStats,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export default DataContext;