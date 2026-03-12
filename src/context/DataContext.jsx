import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext(null);

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

  // ============================================
  // 🔽 LOAD FROM LOCALSTORAGE ON MOUNT
  // ============================================
  useEffect(() => {
    try {
      const savedCustomers = localStorage.getItem('arctic-customers');
      const savedBrokers = localStorage.getItem('arctic-brokers');
      const savedPurchases = localStorage.getItem('arctic-purchases');
      
      console.log('📦 Loading from localStorage...');
      console.log('  Customers:', savedCustomers ? '✅ Found' : '❌ Empty');
      console.log('  Brokers:', savedBrokers ? '✅ Found' : '❌ Empty');
      console.log('  Purchases:', savedPurchases ? '✅ Found' : '❌ Empty');

      if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
      if (savedBrokers) setBrokers(JSON.parse(savedBrokers));
      if (savedPurchases) setPurchases(JSON.parse(savedPurchases));
    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // 🔼 SAVE TO LOCALSTORAGE WHENEVER DATA CHANGES
  // ============================================
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('arctic-customers', JSON.stringify(customers));
      console.log('💾 Saved customers to localStorage:', customers.length);
    }
  }, [customers, loading]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('arctic-brokers', JSON.stringify(brokers));
      console.log('💾 Saved brokers to localStorage:', brokers.length);
    }
  }, [brokers, loading]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('arctic-purchases', JSON.stringify(purchases));
      console.log('💾 Saved purchases to localStorage:', purchases.length);
    }
  }, [purchases, loading]);

  // ============================================
  // CUSTOMER ACTIONS
  // ============================================
  const addCustomer = (customer) => {
    const newCustomer = {
      ...customer,
      id: Date.now(),
      transactions: [],
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => [newCustomer, ...prev]);
    console.log('✅ Added customer:', newCustomer.name);
    return newCustomer;
  };

  const updateCustomer = (updated) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    console.log('✅ Updated customer:', updated.id);
  };

  const deleteCustomer = (id) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    console.log('✅ Deleted customer:', id);
  };

  const addTransaction = (customerId, transaction) => {
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
    console.log('✅ Added transaction to customer:', customerId);
    return newTransaction;
  };

  const updateTransaction = (customerId, transactionId, updates) => {
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
    console.log('✅ Updated transaction:', transactionId);
  };

  const deleteTransaction = (customerId, transactionId) => {
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { ...c, transactions: c.transactions.filter(t => t.id !== transactionId) }
        : c
    ));
    console.log('✅ Deleted transaction:', transactionId);
  };

  // ============================================
  // BROKER ACTIONS
  // ============================================
  const addBroker = (broker) => {
    const newBroker = {
      ...broker,
      id: Date.now(),
      entries: [],
      createdAt: new Date().toISOString()
    };
    setBrokers(prev => [newBroker, ...prev]);
    console.log('✅ Added broker:', newBroker.name);
    return newBroker;
  };

  const updateBroker = (updated) => {
    setBrokers(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
    console.log('✅ Updated broker:', updated.id);
  };

  const deleteBroker = (id) => {
    setBrokers(prev => prev.filter(b => b.id !== id));
    console.log('✅ Deleted broker:', id);
  };

  const addEntry = (brokerId, entry) => {
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
    console.log('✅ Added entry to broker:', brokerId);
    return newEntry;
  };

  const updateEntry = (brokerId, entryId, updates) => {
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
    console.log('✅ Updated entry:', entryId);
  };

  const deleteEntry = (brokerId, entryId) => {
    setBrokers(prev => prev.map(b => 
      b.id === brokerId 
        ? { ...b, entries: b.entries.filter(e => e.id !== entryId) }
        : b
    ));
    console.log('✅ Deleted entry:', entryId);
  };

  // ============================================
  // PURCHASE ACTIONS
  // ============================================
  const addPurchase = (purchase) => {
    const newPurchase = {
      ...purchase,
      id: Date.now(),
      items: purchase.items || [],
      createdAt: new Date().toISOString()
    };
    setPurchases(prev => [newPurchase, ...prev]);
    console.log('✅ Added purchase:', newPurchase.company);
    return newPurchase;
  };

  const updatePurchase = (updated) => {
    setPurchases(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    console.log('✅ Updated purchase:', updated.id);
  };

  const deletePurchase = (id) => {
    setPurchases(prev => prev.filter(p => p.id !== id));
    console.log('✅ Deleted purchase:', id);
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const calculateCustomerBalance = (customer) => {
    if (!customer) return 0;
    const totalCredit = (customer.transactions || [])
      .filter(t => t.type === 'Credit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPaid = (customer.transactions || [])
      .filter(t => t.type === 'Payment')
      .reduce((sum, t) => sum + (t.paid || 0), 0);
    return totalCredit - totalPaid;
  };

  const calculateBrokerBalance = (broker) => {
    if (!broker) return 0;
    const entries = broker.entries || [];
    if (entries.length === 0) return broker.openingBalance || 0;
    return entries[entries.length - 1].balance || 0;
  };

  const getStats = () => {
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
  };

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