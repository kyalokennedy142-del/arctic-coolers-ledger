// src/context/DataContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const DataContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};

// ✅ Pagination helper for Supabase
const fetchWithPagination = async (table, options = {}) => {
  if (!supabase) {
    console.warn(`⚠️ Supabase not available for ${table}`);
    return [];
  }
  
  let allData = [];
  let page = 0;
  const LIMIT = 200;
  
  while (true) {
    const query = supabase
      .from(table)
      .select('*', { count: 'exact' })
      .range(page * LIMIT, (page + 1) * LIMIT - 1);
    
    if (options.orderBy) {
      query.order(options.orderBy, { 
        ascending: options.ascending ?? false 
      });
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`❌ Error fetching ${table}:`, error.message);
      break;
    }
    
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < LIMIT) break;
    page++;
    if (page > 50) break; // Safety limit
  }
  
  return allData;
};

export function DataProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Calculate customer balance (case-insensitive transaction types)
  const calculateCustomerBalance = useCallback((customer) => {
    if (!customer) return 0;
    return (customer.transactions || []).reduce((sum, t) => {
      const type = (t.transaction_type || '').toLowerCase();
      const amount = Number(t.amount) || 0;
      if (type === 'credit') return sum + amount;
      if (['payment', 'paid'].includes(type)) return sum - amount;
      return sum;
    }, 0);
  }, []);

  // ✅ Calculate broker balance from ledger
  const calculateBrokerBalance = useCallback((broker) => {
    if (!broker) return 0;
    const ledger = broker.broker_ledger || [];
    if (ledger.length === 0) return Number(broker.opening_balance) || 0;
    return Number(ledger[ledger.length - 1]?.balance) || 0;
  }, []);

  // ✅ Get dashboard stats
  const getStats = useCallback(() => {
    const totalCredit = (customers || []).reduce((sum, c) => 
      sum + (c.transactions || [])
        .filter(t => (t.transaction_type || '').toLowerCase() === 'credit')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0), 0);
    
    const totalPaid = (customers || []).reduce((sum, c) => 
      sum + (c.transactions || [])
        .filter(t => ['payment', 'paid'].includes((t.transaction_type || '').toLowerCase()))
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

  // ==================== CUSTOMER CRUD ====================
  
  const addCustomer = useCallback((customer) => {
    const newCustomer = { 
      id: crypto.randomUUID(), 
      name: customer.name || customer.Name || '',
      phone: customer.phone || customer.Phone || '',
      payment_name: customer.payment_name || customer.Payment_name || customer.name || customer.Name || '',
      location: customer.location || customer.Location || '',
      email: customer.email || customer.Email || '',
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
      id: crypto.randomUUID(),
      customer_id: customerId,
      transaction_type: (transaction.transaction_type || 'credit').toLowerCase(),
      amount: Number(transaction.amount) || 0,
      description: transaction.description || transaction.notes || '',
      date: transaction.date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { ...c, transactions: [newTx, ...(c.transactions || [])] } 
        : c
    ));
    return newTx;
  }, []);

  const updateTransaction = useCallback((customerId, transactionId, updated) => {
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { 
            ...c, 
            transactions: (c.transactions || []).map(t => 
              t.id === transactionId 
                ? { 
                    ...t, 
                    ...updated, 
                    transaction_type: (updated.transaction_type || t.transaction_type || '').toLowerCase(),
                    updated_at: new Date().toISOString()
                  } 
                : t
            )
          }
        : c
    ));
  }, []);

  const deleteTransaction = useCallback((customerId, transactionId) => {
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { ...c, transactions: (c.transactions || []).filter(t => t.id !== transactionId) }
        : c
    ));
  }, []);

  // ==================== BROKER CRUD ====================
  
  const addBroker = useCallback((broker) => {
    const newBroker = { 
      id: crypto.randomUUID(), 
      name: broker.name || broker.Name || '',
      phone: broker.phone || broker.Phone || '',
      area: broker.area || broker.Area || '',
      opening_balance: Number(broker.opening_balance || broker.Opening_balance || 0),
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
      id: crypto.randomUUID(),
      broker_id: brokerId,
      date: entry.date || new Date().toISOString().split('T')[0],
      day: entry.day || '',
      bottles_taken: Number(entry.bottles_taken || entry.Bottles_taken || 0),
      amount: Number(entry.amount || entry.Amount || 0),
      amount_paid: Number(entry.amount_paid || entry.Amount_paid || 0),
      balance: Number(entry.balance || entry.Balance || 0),
      created_at: new Date().toISOString()
    };
    setBrokers(prev => prev.map(b => 
      b.id === brokerId 
        ? { ...b, broker_ledger: [...(b.broker_ledger || []), newEntry] } 
        : b
    ));
    return newEntry;
  }, []);

  const updateLedgerEntry = useCallback((brokerId, entryId, updated) => {
    setBrokers(prev => prev.map(b => 
      b.id === brokerId 
        ? { 
            ...b, 
            broker_ledger: (b.broker_ledger || []).map(e => 
              e.id === entryId ? { ...e, ...updated, updated_at: new Date().toISOString() } : e
            )
          }
        : b
    ));
  }, []);

  const deleteLedgerEntry = useCallback((brokerId, entryId) => {
    setBrokers(prev => prev.map(b => 
      b.id === brokerId 
        ? { ...b, broker_ledger: (b.broker_ledger || []).filter(e => e.id !== entryId) }
        : b
    ));
  }, []);

  // ==================== PURCHASE CRUD ====================
  
  const addPurchase = useCallback((purchase) => {
    const itemsArray = Array.isArray(purchase.items) ? purchase.items : [];
    
    const newPurchase = { 
      id: crypto.randomUUID(),
      date: purchase.date || new Date().toISOString().split('T')[0],
      purchasing_agent: purchase.purchasing_agent || purchase.Purchasing_agent || '',
      company_name: purchase.company_name || purchase.Company_name || '',
      transport_cost: Number(purchase.transport_cost || purchase.Transport_cost || 0),
      items: JSON.stringify(itemsArray),
      products_total: Number(purchase.products_total || purchase.Products_total || 0),
      total_expenditure: Number(purchase.total_expenditure || purchase.Total_expenditure || 0),
      created_at: new Date().toISOString()
    };
    setPurchases(prev => [newPurchase, ...prev]);
    return newPurchase;
  }, []);

  const updatePurchase = useCallback((updated) => {
    setPurchases(prev => prev.map(p => 
      p.id === updated.id 
        ? { 
            ...p, 
            ...updated, 
            items: typeof updated.items === 'string' ? updated.items : JSON.stringify(updated.items || []),
            updated_at: new Date().toISOString()
          } 
        : p
    ));
  }, []);

  const deletePurchase = useCallback((id) => {
    setPurchases(prev => prev.filter(p => p.id !== id));
  }, []);

  // ==================== DATA LOADING ====================
  
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      console.log('🔄 Starting data load...');
      
      // 1. Load from localStorage first (offline support)
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
        }
      } catch (e) {
        console.error('❌ localStorage parse error:', e);
      }
      
      // 2. Try Supabase (with pagination)
      if (!supabase) {
        console.warn('⚠️ Supabase not available');
        if (isMounted) setLoading(false);
        return;
      }

      try {
        console.log('☁️ Fetching from Supabase...');
        
        // Fetch all tables with pagination
        const [customersData, brokersData, purchasesData] = await Promise.all([
          fetchWithPagination('customers', { orderBy: 'created_at', ascending: false }),
          fetchWithPagination('brokers', { orderBy: 'created_at', ascending: false }),
          fetchWithPagination('purchases', { orderBy: 'created_at', ascending: false })
        ]);
        
        console.log('✅ Base data loaded:', {
          customers: customersData.length,
          brokers: brokersData.length,
          purchases: purchasesData.length
        });
        
        // Load related transactions and attach to customers
        const allTransactions = await fetchWithPagination('transactions', { 
          orderBy: 'created_at', 
          ascending: false 
        });
        
        const txByCustomer = {};
        allTransactions.forEach(tx => {
          const customerId = tx.customer_id;
          if (!txByCustomer[customerId]) txByCustomer[customerId] = [];
          txByCustomer[customerId].push(tx);
        });
        
        const customersWithTx = customersData.map(c => ({
          id: c.id,
          name: c.name || c.Name || 'Unknown',
          phone: c.phone || c.Phone || '',
          payment_name: c.payment_name || c.Payment_name || c.name || c.Name || '',
          location: c.location || c.Location || '',
          email: c.email || c.Email || '',
          transactions: txByCustomer[c.id] || [],
          created_at: c.created_at
        }));
        
        // Load related ledger and attach to brokers
        const allLedger = await fetchWithPagination('broker_ledger', { 
          orderBy: 'created_at', 
          ascending: false 
        });
        
        const ledgerByBroker = {};
        allLedger.forEach(entry => {
          const brokerId = entry.broker_id;
          if (!ledgerByBroker[brokerId]) ledgerByBroker[brokerId] = [];
          ledgerByBroker[brokerId].push(entry);
        });
        
        const brokersWithLedger = brokersData.map(b => ({
          id: b.id,
          name: b.name || b.Name || 'Unknown',
          phone: b.phone || b.Phone || '',
          area: b.area || b.Area || '',
          opening_balance: Number(b.opening_balance || b.Opening_balance || 0),
          broker_ledger: ledgerByBroker[b.id] || [],
          created_at: b.created_at
        }));
        
        // Parse purchase items (handle both string and array)
        const purchasesWithItems = purchasesData.map(p => {
          let items = p.items;
          if (typeof items === 'string') {
            try {
              items = JSON.parse(items);
            } catch (e) {
              console.warn('⚠️ Failed to parse items JSON:', e);
              items = [];
            }
          }
          return {
            id: p.id,
            date: p.date,
            purchasing_agent: p.purchasing_agent || p.Purchasing_agent || '',
            company_name: p.company_name || p.Company_name || '',
            transport_cost: Number(p.transport_cost || p.Transport_cost || 0),
            items: Array.isArray(items) ? items : [],
            products_total: Number(p.products_total || p.Products_total || 0),
            total_expenditure: Number(p.total_expenditure || p.Total_expenditure || 0),
            created_at: p.created_at
          };
        });
        
        if (isMounted) {
          console.log('✅ Setting state with loaded data...');
          setCustomers(customersWithTx);
          setBrokers(brokersWithLedger);
          setPurchases(purchasesWithItems);
          
          // Backup to localStorage
          localStorage.setItem('arctic-data', JSON.stringify({
            customers: customersWithTx,
            brokers: brokersWithLedger,
            purchases: purchasesWithItems
          }));
          console.log('✅ Data load complete!');
        }
        
      } catch (error) {
        console.error('💥 Critical load error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    return () => { isMounted = false; };
  }, []);

  // ✅ Auto-save to localStorage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('arctic-data', JSON.stringify({ customers, brokers, purchases }));
    }
  }, [customers, brokers, purchases, loading]);

  // ✅ Context value - all functions defined BEFORE this object
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
    updateTransaction, 
    deleteTransaction,
    calculateCustomerBalance,
    
    // Broker methods
    addBroker, 
    updateBroker, 
    deleteBroker,
    addLedgerEntry, 
    updateLedgerEntry, 
    deleteLedgerEntry,
    calculateBrokerBalance,
    
    // Purchase methods
    addPurchase, 
    updatePurchase, 
    deletePurchase,
    
    // Stats
    getStats,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export default DataContext;