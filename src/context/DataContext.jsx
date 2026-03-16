import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const DataContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};

export function DataProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Define ALL functions BEFORE the value object (fixes temporal dead zone)
  
  // getStats MUST be defined before value object
  const getStats = useCallback(() => {
    const totalCredit = (customers || []).reduce((sum, c) => 
      sum + (c.transactions || []).filter(t => t.transaction_type?.toLowerCase() === 'credit')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0), 0);
    
    const totalPaid = (customers || []).reduce((sum, c) => 
      sum + (c.transactions || []).filter(t => ['payment', 'paid'].includes(t.transaction_type?.toLowerCase()))
        .reduce((s, t) => s + (Number(t.amount) || 0), 0), 0);
    
    const totalSpent = (purchases || []).reduce((sum, p) => sum + (Number(p.total_expenditure) || 0), 0);
    
    return {
      totalCustomers: (customers || []).length,
      totalBrokers: (brokers || []).length,
      totalPurchases: (purchases || []).length,
      totalCredit, totalPaid,
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

  // CRUD Actions
  const addCustomer = useCallback((customer) => {
    const newCustomer = { ...customer, id: crypto.randomUUID(), transactions: [] };
    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  }, []);
  const updateCustomer = useCallback((updated) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
  }, []);
  const deleteCustomer = useCallback((id) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);
  const addTransaction = useCallback((customerId, transaction) => {
    const newTx = { ...transaction, id: crypto.randomUUID() };
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, transactions: [newTx, ...c.transactions] } : c));
    return newTx;
  }, []);
  const addBroker = useCallback((broker) => {
    const newBroker = { ...broker, id: crypto.randomUUID(), broker_ledger: [] };
    setBrokers(prev => [newBroker, ...prev]);
    return newBroker;
  }, []);
  const updateBroker = useCallback((updated) => {
    setBrokers(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
  }, []);
  const deleteBroker = useCallback((id) => {
    setBrokers(prev => prev.filter(b => b.id !== id));
  }, []);
  const addLedgerEntry = useCallback((brokerId, entry) => {
    const newEntry = { ...entry, id: crypto.randomUUID() };
    setBrokers(prev => prev.map(b => b.id === brokerId ? { ...b, broker_ledger: [...b.broker_ledger, newEntry] } : b));
    return newEntry;
  }, []);
  const addPurchase = useCallback((purchase) => {
    const newPurchase = { ...purchase, id: crypto.randomUUID() };
    setPurchases(prev => [newPurchase, ...prev]);
    return newPurchase;
  }, []);

  // ✅ Load from Supabase - NO created_at ordering, correct table/field names
  useEffect(() => {
    const loadData = async () => {
      if (!supabase) {
        const saved = localStorage.getItem('arctic-data');
        if (saved) {
          const data = JSON.parse(saved);
          setCustomers(data.customers || []);
          setBrokers(data.brokers || []);
          setPurchases(data.purchases || []);
        }
        setLoading(false);
        return;
      }

      try {
        // ✅ NO .order('created_at') - column doesn't exist in your schema
        const {  customersData } = await supabase.from('customers').select('*');
        const {  brokersData } = await supabase.from('brokers').select('*');
        const {  purchasesData } = await supabase.from('purchases').select('*');

        // Load transactions with CORRECT field names
        const customersWithTx = await Promise.all(
          (customersData || []).map(async (c) => {
            const {  tx } = await supabase.from('transactions')
              .select('*')
              .eq('customer_id', c.id);
            return { ...c, transactions: tx || [] };
          })
        );

        // ✅ Use broker_ledger table (not broker_entries)
        const brokersWithLedger = await Promise.all(
          (brokersData || []).map(async (b) => {
            const {  ledger } = await supabase.from('broker_ledger')
              .select('*')
              .eq('broker_id', b.id);
            return { ...b, broker_ledger: ledger || [] };
          })
        );

        // Parse JSON items in purchases
        const purchasesWithItems = (purchasesData || []).map(p => ({
          ...p,
          items: typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []),
        }));

        setCustomers(customersWithTx || []);
        setBrokers(brokersWithLedger || []);
        setPurchases(purchasesWithItems || []);
        
      } catch (error) {
        console.error('❌ Load error:', error.message);
        // Fallback to localStorage
        const saved = localStorage.getItem('arctic-data');
        if (saved) {
          const data = JSON.parse(saved);
          setCustomers(data.customers || []);
          setBrokers(data.brokers || []);
          setPurchases(data.purchases || []);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Save to localStorage as backup
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('arctic-data', JSON.stringify({ customers, brokers, purchases }));
    }
  }, [customers, brokers, purchases, loading]);

  // ✅ Value object created AFTER all functions are defined
  const value = {
    customers, brokers, purchases, loading,
    addCustomer, updateCustomer, deleteCustomer, addTransaction,
    addBroker, updateBroker, deleteBroker, addLedgerEntry,
    addPurchase,
    calculateCustomerBalance, calculateBrokerBalance,
    getStats, // ✅ Now this works!
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export default DataContext;