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

  // Load from localStorage on mount
  useEffect(() => {
    const savedCustomers = localStorage.getItem('arctic-customers');
    const savedBrokers = localStorage.getItem('arctic-brokers');
    const savedPurchases = localStorage.getItem('arctic-purchases');
    
    if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
    if (savedBrokers) setBrokers(JSON.parse(savedBrokers));
    if (savedPurchases) setPurchases(JSON.parse(savedPurchases));
    
    setLoading(false);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('arctic-customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('arctic-brokers', JSON.stringify(brokers));
  }, [brokers]);

  useEffect(() => {
    localStorage.setItem('arctic-purchases', JSON.stringify(purchases));
  }, [purchases]);

  // ========== CUSTOMER ACTIONS ==========
  const addCustomer = (customer) => {
    const newCustomer = {
      ...customer,
      id: Date.now(),
      transactions: [],
      createdAt: new Date().toISOString()
    };
    setCustomers([newCustomer, ...customers]);
    return newCustomer;
  };

  const updateCustomer = (updated) => {
    setCustomers(customers.map(c => c.id === updated.id ? { ...c, ...updated } : c));
  };

  const deleteCustomer = (id) => {
    setCustomers(customers.filter(c => c.id !== id));
  };

  const addTransaction = (customerId, transaction) => {
    const newTransaction = {
      ...transaction,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    setCustomers(customers.map(c => 
      c.id === customerId 
        ? { ...c, transactions: [newTransaction, ...c.transactions] }
        : c
    ));
    return newTransaction;
  };

  const updateTransaction = (customerId, transactionId, updates) => {
    setCustomers(customers.map(c => 
      c.id === customerId 
        ? { 
            ...c, 
            transactions: c.transactions.map(t => 
              t.id === transactionId ? { ...t, ...updates } : t
            )
          }
        : c
    ));
  };

  const deleteTransaction = (customerId, transactionId) => {
    setCustomers(customers.map(c => 
      c.id === customerId 
        ? { ...c, transactions: c.transactions.filter(t => t.id !== transactionId) }
        : c
    ));
  };

  // ========== BROKER ACTIONS ==========
  const addBroker = (broker) => {
    const newBroker = {
      ...broker,
      id: Date.now(),
      entries: [],
      createdAt: new Date().toISOString()
    };
    setBrokers([newBroker, ...brokers]);
    return newBroker;
  };

  const updateBroker = (updated) => {
    setBrokers(brokers.map(b => b.id === updated.id ? { ...b, ...updated } : b));
  };

  const deleteBroker = (id) => {
    setBrokers(brokers.filter(b => b.id !== id));
  };

  const addEntry = (brokerId, entry) => {
    const newEntry = {
      ...entry,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    setBrokers(brokers.map(b => 
      b.id === brokerId 
        ? { ...b, entries: [...b.entries, newEntry] }
        : b
    ));
    return newEntry;
  };

  const updateEntry = (brokerId, entryId, updates) => {
    setBrokers(brokers.map(b => 
      b.id === brokerId 
        ? { 
            ...b, 
            entries: b.entries.map(e => 
              e.id === entryId ? { ...e, ...updates } : e
            )
          }
        : b
    ));
  };

  const deleteEntry = (brokerId, entryId) => {
    setBrokers(brokers.map(b => 
      b.id === brokerId 
        ? { ...b, entries: b.entries.filter(e => e.id !== entryId) }
        : b
    ));
  };

  // ========== PURCHASE ACTIONS ==========
  const addPurchase = (purchase) => {
    const newPurchase = {
      ...purchase,
      id: Date.now(),
      items: purchase.items || [],
      createdAt: new Date().toISOString()
    };
    setPurchases([newPurchase, ...purchases]);
    return newPurchase;
  };

  const updatePurchase = (updated) => {
    setPurchases(purchases.map(p => p.id === updated.id ? { ...p, ...updated } : p));
  };

  const deletePurchase = (id) => {
    setPurchases(purchases.filter(p => p.id !== id));
  };

  // ========== HELPERS ==========
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
    const totalCredit = customers.reduce((sum, c) => 
      sum + (c.transactions || []).filter(t => t.type === 'Credit').reduce((s, t) => s + (t.amount || 0), 0), 0);
    const totalPaid = customers.reduce((sum, c) => 
      sum + (c.transactions || []).filter(t => t.type === 'Payment').reduce((s, t) => s + (t.paid || 0), 0), 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + (p.totalExpenditure || 0), 0);
    
    return {
      totalCustomers: customers.length,
      totalBrokers: brokers.length,
      totalPurchases: purchases.length,
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