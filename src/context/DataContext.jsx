 
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const DataContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export function DataProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper: Check if error is expected during sync
  const isExpectedSyncConflict = useCallback((error) => {
    return (
      error?.code === '23505' ||
      error?.message?.includes('duplicate') ||
      error?.message?.includes('409') ||
      error?.status === 409
    );
  }, []);

  // Save functions wrapped in useCallback
  const saveCustomersToSupabase = useCallback(async () => {
    if (!supabase) return;
    
    try {
      for (const customer of customers) {
        await supabase.from('customers').upsert({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          location: customer.location,
          created_at: customer.createdAt || customer.created_at,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        
        if (customer.transactions?.length > 0) {
          await supabase.from('transactions').delete().eq('customer_id', customer.id);
          
          const transactionsToInsert = customer.transactions.map(t => ({
            id: t.id,
            customer_id: customer.id,
            type: t.type,
            amount: t.type === 'Credit' ? t.amount : null,
            paid: t.type === 'Payment' ? t.paid : null,
            notes: t.notes,
            date: t.date,
            created_at: t.createdAt || t.created_at,
            updated_at: new Date().toISOString()
          }));
          
          await supabase.from('transactions').insert(transactionsToInsert);
        }
      }
      console.log('☁️ Saved', customers.length, 'customers to Supabase');
    } catch (error) {
      if (!isExpectedSyncConflict(error)) {
        console.warn('⚠️ Failed to save customers to Supabase:', error.message);
      }
    }
  }, [customers, isExpectedSyncConflict]);

  const saveBrokersToSupabase = useCallback(async () => {
    if (!supabase) return;
    
    try {
      for (const broker of brokers) {
        await supabase.from('brokers').upsert({
          id: broker.id,
          name: broker.name,
          phone: broker.phone,
          area: broker.area,
          opening_balance: broker.openingBalance,
          created_at: broker.createdAt || broker.created_at,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        
        if (broker.entries?.length > 0) {
          await supabase.from('broker_entries').delete().eq('broker_id', broker.id);
          
          const entriesToInsert = broker.entries.map(e => ({
            id: e.id,
            broker_id: broker.id,
            date: e.date,
            day: e.day,
            bottles: e.bottles,
            amount: e.amount,
            paid: e.paid,
            balance: e.balance,
            created_at: e.createdAt || e.created_at,
            updated_at: new Date().toISOString()
          }));
          
          await supabase.from('broker_entries').insert(entriesToInsert);
        }
      }
      console.log('☁️ Saved', brokers.length, 'brokers to Supabase');
    } catch (error) {
      if (!isExpectedSyncConflict(error)) {
        console.warn('⚠️ Failed to save brokers to Supabase:', error.message);
      }
    }
  }, [brokers, isExpectedSyncConflict]);

  const savePurchasesToSupabase = useCallback(async () => {
    if (!supabase) return;
    
    try {
      for (const purchase of purchases) {
        await supabase.from('purchases').upsert({
          id: purchase.id,
          date: purchase.date,
          company: purchase.company,
          agent: purchase.agent,
          transport_cost: purchase.transportCost,
          total_expenditure: purchase.totalExpenditure,
          created_at: purchase.createdAt || purchase.created_at,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        
        if (purchase.items?.length > 0) {
          await supabase.from('purchase_items').delete().eq('purchase_id', purchase.id);
          
          const itemsToInsert = purchase.items.map(item => ({
            id: item.id,
            purchase_id: purchase.id,
            product_type: item.productType,
            quantity: item.quantity,
            amount: item.amount,
            created_at: item.createdAt || item.created_at,
            updated_at: new Date().toISOString()
          }));
          
          await supabase.from('purchase_items').insert(itemsToInsert);
        }
      }
      console.log('☁️ Saved', purchases.length, 'purchases to Supabase');
    } catch (error) {
      if (!isExpectedSyncConflict(error)) {
        console.warn('⚠️ Failed to save purchases to Supabase:', error.message);
      }
    }
  }, [purchases, isExpectedSyncConflict]);

  // Load from Supabase
  useEffect(() => {
    const loadFromSupabase = async () => {
      if (!supabase) {
        console.warn('⚠️ Supabase not available, falling back to localStorage');
        const savedCustomers = localStorage.getItem('arctic-customers');
        const savedBrokers = localStorage.getItem('arctic-brokers');
        const savedPurchases = localStorage.getItem('arctic-purchases');
        
        if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
        if (savedBrokers) setBrokers(JSON.parse(savedBrokers));
        if (savedPurchases) setPurchases(JSON.parse(savedPurchases));
        setLoading(false);
        return;
      }

      try {
        console.log('☁️ Loading from Supabase...');
        
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (customersError) throw customersError;
        const safeCustomers = customersData || [];
        
        const { data: brokersData, error: brokersError } = await supabase
          .from('brokers')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (brokersError) throw brokersError;
        const safeBrokers = brokersData || [];
        
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('purchases')
          .select(`
            *,
            purchase_items (
              id,
              product_type,
              quantity,
              amount,
              created_at
            )
          `)
          .order('created_at', { ascending: false });
        
        if (purchasesError) throw purchasesError;
        const safePurchases = purchasesData || [];
        
        const transformedPurchases = safePurchases.map(p => ({
          ...p,
          items: p.purchase_items || [],
          transportCost: p.transport_cost,
          totalExpenditure: p.total_expenditure
        }));
        
        const transformedCustomers = await Promise.all(
          safeCustomers.map(async (c) => {
            const { data: transactions } = await supabase
              .from('transactions')
              .select('*')
              .eq('customer_id', c.id)
              .order('created_at', { ascending: false });
            
            return {
              ...c,
              transactions: transactions || [],
              createdAt: c.created_at,
              updatedAt: c.updated_at
            };
          })
        );
        
        const transformedBrokers = await Promise.all(
          safeBrokers.map(async (b) => {
            const { data: entries } = await supabase
              .from('broker_entries')
              .select('*')
              .eq('broker_id', b.id)
              .order('created_at', { ascending: false });
            
            return {
              ...b,
              entries: entries || [],
              openingBalance: b.opening_balance,
              createdAt: b.created_at,
              updatedAt: b.updated_at
            };
          })
        );
        
        setCustomers(transformedCustomers);
        setBrokers(transformedBrokers);
        setPurchases(transformedPurchases);
        
        console.log('✅ Loaded from Supabase:', {
          customers: transformedCustomers.length,
          brokers: transformedBrokers.length,
          purchases: transformedPurchases.length
        });
        
      } catch (error) {
        console.error('❌ Error loading from Supabase:', error.message);
        // Fallback to localStorage
        const savedCustomers = localStorage.getItem('arctic-customers');
        const savedBrokers = localStorage.getItem('arctic-brokers');
        const savedPurchases = localStorage.getItem('arctic-purchases');
        
        if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
        if (savedBrokers) setBrokers(JSON.parse(savedBrokers));
        if (savedPurchases) setPurchases(JSON.parse(savedPurchases));
      } finally {
        setLoading(false);
      }
    };

    loadFromSupabase();
  }, []);

  // Save to Supabase when data changes
  useEffect(() => {
    if (!loading && supabase) {
      saveCustomersToSupabase();
    }
  }, [customers, loading, saveCustomersToSupabase]);

  useEffect(() => {
    if (!loading && supabase) {
      saveBrokersToSupabase();
    }
  }, [brokers, loading, saveBrokersToSupabase]);

  useEffect(() => {
    if (!loading && supabase) {
      savePurchasesToSupabase();
    }
  }, [purchases, loading, savePurchasesToSupabase]);

  // Save to localStorage as backup
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('arctic-customers', JSON.stringify(customers));
      localStorage.setItem('arctic-brokers', JSON.stringify(brokers));
      localStorage.setItem('arctic-purchases', JSON.stringify(purchases));
    }
  }, [customers, brokers, purchases, loading]);

  // CRUD Actions
  const addCustomer = useCallback((customer) => {
    const newCustomer = {
      ...customer,
      id: Date.now(),
      transactions: [],
      createdAt: new Date().toISOString()
    };
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
    const newTransaction = {
      ...transaction,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { ...c, transactions: [newTransaction, ...c.transactions] }
        : c
    ));
    return newTransaction;
  }, []);

  const updateTransaction = useCallback((customerId, transactionId, updates) => {
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { 
            ...c, 
            transactions: c.transactions.map(t => 
              t.id === transactionId ? { ...t, ...updates } : t
            )
          }
        : c
    ));
  }, []);

  const deleteTransaction = useCallback((customerId, transactionId) => {
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { ...c, transactions: c.transactions.filter(t => t.id !== transactionId) }
        : c
    ));
  }, []);

  const addBroker = useCallback((broker) => {
    const newBroker = {
      ...broker,
      id: Date.now(),
      entries: [],
      createdAt: new Date().toISOString()
    };
    setBrokers(prev => [newBroker, ...prev]);
    return newBroker;
  }, []);

  const updateBroker = useCallback((updated) => {
    setBrokers(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
  }, []);

  const deleteBroker = useCallback((id) => {
    setBrokers(prev => prev.filter(b => b.id !== id));
  }, []);

  const addEntry = useCallback((brokerId, entry) => {
    const newEntry = {
      ...entry,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    setBrokers(prev => prev.map(b => 
      b.id === brokerId 
        ? { ...b, entries: [...b.entries, newEntry] }
        : b
    ));
    return newEntry;
  }, []);

  const updateEntry = useCallback((brokerId, entryId, updates) => {
    setBrokers(prev => prev.map(b => 
      b.id === brokerId 
        ? { 
            ...b, 
            entries: b.entries.map(e => 
              e.id === entryId ? { ...e, ...updates } : e
            )
          }
        : b
    ));
  }, []);

  const deleteEntry = useCallback((brokerId, entryId) => {
    setBrokers(prev => prev.map(b => 
      b.id === brokerId 
        ? { ...b, entries: b.entries.filter(e => e.id !== entryId) }
        : b
    ));
  }, []);

  const addPurchase = useCallback((purchase) => {
    const newPurchase = {
      ...purchase,
      id: Date.now(),
      items: purchase.items || [],
      createdAt: new Date().toISOString()
    };
    setPurchases(prev => [newPurchase, ...prev]);
    return newPurchase;
  }, []);

  const updatePurchase = useCallback((updated) => {
    setPurchases(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
  }, []);

  const deletePurchase = useCallback((id) => {
    setPurchases(prev => prev.filter(p => p.id !== id));
  }, []);

  // Helper Functions
  const calculateCustomerBalance = useCallback((customer) => {
    if (!customer) return 0;
    const totalCredit = (customer.transactions || [])
      .filter(t => t.type === 'Credit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPaid = (customer.transactions || [])
      .filter(t => t.type === 'Payment')
      .reduce((sum, t) => sum + (t.paid || 0), 0);
    return totalCredit - totalPaid;
  }, []);

  const calculateBrokerBalance = useCallback((broker) => {
    if (!broker) return 0;
    const entries = broker.entries || [];
    if (entries.length === 0) return broker.openingBalance || 0;
    return entries[entries.length - 1]?.balance || 0;
  }, []);

  const getStats = useCallback(() => {
    const totalCredit = (customers || []).reduce((sum, c) => 
      sum + (c.transactions || []).filter(t => t.type === 'Credit').reduce((s, t) => s + (t.amount || 0), 0), 0);
    const totalPaid = (customers || []).reduce((sum, c) => 
      sum + (c.transactions || []).filter(t => t.type === 'Payment').reduce((s, t) => s + (t.paid || 0), 0), 0);
    const totalPurchases = (purchases || []).reduce((sum, p) => sum + (p.totalExpenditure || 0), 0);
    
    return {
      totalCustomers: (customers || []).length,
      totalBrokers: (brokers || []).length,
      totalPurchases: (purchases || []).length,
      totalCredit,
      totalPaid,
      outstandingBalance: totalCredit - totalPaid,
      totalSpent: totalPurchases,
    };
  }, [customers, brokers, purchases]);

  const value = {
    customers,
    brokers,
    purchases,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addBroker,
    updateBroker,
    deleteBroker,
    addEntry,
    updateEntry,
    deleteEntry,
    addPurchase,
    updatePurchase,
    deletePurchase,
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