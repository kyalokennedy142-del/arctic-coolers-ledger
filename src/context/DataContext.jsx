import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

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
  // 🔽 LOAD FROM SUPABASE ON MOUNT (Primary)
  // ============================================
  useEffect(() => {
    const loadFromSupabase = async () => {
      if (!supabase) {
        console.warn('⚠️ Supabase not available, falling back to localStorage');
        loadFromLocalStorage();
        return;
      }

      try {
        console.log('☁️ Loading from Supabase...');
        
        // Load customers - handle null response
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (customersError) throw customersError;
        const safeCustomers = customersData || [];
        
        // Load brokers - handle null response
        const { data: brokersData, error: brokersError } = await supabase
          .from('brokers')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (brokersError) throw brokersError;
        const safeBrokers = brokersData || [];
        
        // Load purchases with items - handle null response
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
        
        // Transform purchases to match app structure
        const transformedPurchases = safePurchases.map(p => ({
          ...p,
          items: p.purchase_items || [],
          transportCost: p.transport_cost,
          totalExpenditure: p.total_expenditure
        }));
        
        // Transform customers to match app structure (add transactions from separate table)
        const transformedCustomers = await Promise.all(
          safeCustomers.map(async (c) => {
            const { data: transactions, error: txError } = await supabase
              .from('transactions')
              .select('*')
              .eq('customer_id', c.id)
              .order('created_at', { ascending: false });
            
            if (txError) console.warn('⚠️ Error loading transactions for customer', c.id, txError.message);
            
            return {
              ...c,
              transactions: transactions || [],
              createdAt: c.created_at,
              updatedAt: c.updated_at
            };
          })
        );
        
        // Transform brokers to match app structure (add entries from separate table)
        const transformedBrokers = await Promise.all(
          safeBrokers.map(async (b) => {
            const { data: entries, error: entriesError } = await supabase
              .from('broker_entries')
              .select('*')
              .eq('broker_id', b.id)
              .order('created_at', { ascending: false });
            
            if (entriesError) console.warn('⚠️ Error loading entries for broker', b.id, entriesError.message);
            
            return {
              ...b,
              entries: entries || [],
              openingBalance: b.opening_balance,
              createdAt: b.created_at,
              updatedAt: b.updated_at
            };
          })
        );
        
        // Update state with Supabase data
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
        console.log('🔄 Falling back to localStorage...');
        loadFromLocalStorage();
      } finally {
        setLoading(false);
      }
    };

    // Fallback: Load from localStorage if Supabase fails
    const loadFromLocalStorage = () => {
      try {
        console.log('📦 Loading from localStorage (fallback)...');
        const savedCustomers = localStorage.getItem('arctic-customers');
        const savedBrokers = localStorage.getItem('arctic-brokers');
        const savedPurchases = localStorage.getItem('arctic-purchases');
        
        if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
        if (savedBrokers) setBrokers(JSON.parse(savedBrokers));
        if (savedPurchases) setPurchases(JSON.parse(savedPurchases));
      } catch (error) {
        console.error('❌ Error loading from localStorage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFromSupabase();
  }, []);

  // ============================================
  // 🔼 SAVE TO SUPABASE WHENEVER DATA CHANGES (Primary)
  // ============================================
  
  // Save customers to Supabase
  useEffect(() => {
    if (!loading && supabase) {
      saveCustomersToSupabase();
    }
  }, [customers, loading]);

  // Save brokers to Supabase
  useEffect(() => {
    if (!loading && supabase) {
      saveBrokersToSupabase();
    }
  }, [brokers, loading]);

  // Save purchases to Supabase
  useEffect(() => {
    if (!loading && supabase) {
      savePurchasesToSupabase();
    }
  }, [purchases, loading]);

  // Also save to localStorage as backup
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('arctic-customers', JSON.stringify(customers));
      localStorage.setItem('arctic-brokers', JSON.stringify(brokers));
      localStorage.setItem('arctic-purchases', JSON.stringify(purchases));
    }
  }, [customers, brokers, purchases, loading]);

  // ============================================
  // 🔄 SUPABASE SAVE FUNCTIONS
  // ============================================
  
  const saveCustomersToSupabase = async () => {
    if (!supabase) return;
    
    try {
      for (const customer of customers) {
        // Upsert customer
        await supabase.from('customers').upsert({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          location: customer.location,
          created_at: customer.createdAt || customer.created_at,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        
        // Sync transactions
        if (customer.transactions?.length > 0) {
          // Delete existing transactions for this customer first
          await supabase.from('transactions').delete().eq('customer_id', customer.id);
          
          // Insert new transactions
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
      console.warn('⚠️ Failed to save customers to Supabase:', error.message);
    }
  };

  const saveBrokersToSupabase = async () => {
    if (!supabase) return;
    
    try {
      for (const broker of brokers) {
        // Upsert broker
        await supabase.from('brokers').upsert({
          id: broker.id,
          name: broker.name,
          phone: broker.phone,
          area: broker.area,
          opening_balance: broker.openingBalance,
          created_at: broker.createdAt || broker.created_at,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        
        // Sync entries
        if (broker.entries?.length > 0) {
          // Delete existing entries for this broker first
          await supabase.from('broker_entries').delete().eq('broker_id', broker.id);
          
          // Insert new entries
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
      console.warn('⚠️ Failed to save brokers to Supabase:', error.message);
    }
  };

  const savePurchasesToSupabase = async () => {
    if (!supabase) return;
    
    try {
      for (const purchase of purchases) {
        // Upsert purchase
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
        
        // Sync items
        if (purchase.items?.length > 0) {
          // Delete existing items for this purchase first
          await supabase.from('purchase_items').delete().eq('purchase_id', purchase.id);
          
          // Insert new items
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
      console.warn('⚠️ Failed to save purchases to Supabase:', error.message);
    }
  };

  // ============================================
  // CRUD ACTIONS (Write to Supabase + localStorage backup)
  // ============================================
  
  const addCustomer = (customer) => {
    const newCustomer = {
      ...customer,
      id: Date.now(),
      transactions: [],
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => [newCustomer, ...prev]);
    
    // Also save to Supabase
    if (supabase) {
      supabase.from('customers').insert([{
        id: newCustomer.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        location: newCustomer.location,
        created_at: newCustomer.createdAt,
        updated_at: new Date().toISOString()
      }]);
    }
    
    return newCustomer;
  };

  const updateCustomer = (updated) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    
    if (supabase) {
      supabase.from('customers').update({
        name: updated.name,
        phone: updated.phone,
        location: updated.location,
        updated_at: new Date().toISOString()
      }).eq('id', updated.id);
    }
  };

  const deleteCustomer = (id) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    
    if (supabase) {
      supabase.from('customers').delete().eq('id', id);
      supabase.from('transactions').delete().eq('customer_id', id);
    }
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
    
    if (supabase) {
      supabase.from('transactions').insert([{
        id: newTransaction.id,
        customer_id: customerId,
        type: newTransaction.type,
        amount: newTransaction.type === 'Credit' ? newTransaction.amount : null,
        paid: newTransaction.type === 'Payment' ? newTransaction.paid : null,
        notes: newTransaction.notes,
        date: newTransaction.date,
        created_at: newTransaction.createdAt,
        updated_at: new Date().toISOString()
      }]);
    }
    
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
    
    if (supabase) {
      supabase.from('transactions').update({
        type: updates.type,
        amount: updates.type === 'Credit' ? updates.amount : null,
        paid: updates.type === 'Payment' ? updates.paid : null,
        notes: updates.notes,
        date: updates.date,
        updated_at: new Date().toISOString()
      }).eq('id', transactionId);
    }
  };

  const deleteTransaction = (customerId, transactionId) => {
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { ...c, transactions: c.transactions.filter(t => t.id !== transactionId) }
        : c
    ));
    
    if (supabase) {
      supabase.from('transactions').delete().eq('id', transactionId);
    }
  };

  const addBroker = (broker) => {
    const newBroker = {
      ...broker,
      id: Date.now(),
      entries: [],
      createdAt: new Date().toISOString()
    };
    setBrokers(prev => [newBroker, ...prev]);
    
    if (supabase) {
      supabase.from('brokers').insert([{
        id: newBroker.id,
        name: newBroker.name,
        phone: newBroker.phone,
        area: newBroker.area,
        opening_balance: newBroker.openingBalance,
        created_at: newBroker.createdAt,
        updated_at: new Date().toISOString()
      }]);
    }
    
    return newBroker;
  };

  const updateBroker = (updated) => {
    setBrokers(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
    
    if (supabase) {
      supabase.from('brokers').update({
        name: updated.name,
        phone: updated.phone,
        area: updated.area,
        opening_balance: updated.openingBalance,
        updated_at: new Date().toISOString()
      }).eq('id', updated.id);
    }
  };

  const deleteBroker = (id) => {
    setBrokers(prev => prev.filter(b => b.id !== id));
    
    if (supabase) {
      supabase.from('brokers').delete().eq('id', id);
      supabase.from('broker_entries').delete().eq('broker_id', id);
    }
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
    
    if (supabase) {
      supabase.from('broker_entries').insert([{
        id: newEntry.id,
        broker_id: brokerId,
        date: newEntry.date,
        day: newEntry.day,
        bottles: newEntry.bottles,
        amount: newEntry.amount,
        paid: newEntry.paid,
        balance: newEntry.balance,
        created_at: newEntry.createdAt,
        updated_at: new Date().toISOString()
      }]);
    }
    
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
    
    if (supabase) {
      supabase.from('broker_entries').update({
        date: updates.date,
        day: updates.day,
        bottles: updates.bottles,
        amount: updates.amount,
        paid: updates.paid,
        balance: updates.balance,
        updated_at: new Date().toISOString()
      }).eq('id', entryId);
    }
  };

  const deleteEntry = (brokerId, entryId) => {
    setBrokers(prev => prev.map(b => 
      b.id === brokerId 
        ? { ...b, entries: b.entries.filter(e => e.id !== entryId) }
        : b
    ));
    
    if (supabase) {
      supabase.from('broker_entries').delete().eq('id', entryId);
    }
  };

  const addPurchase = (purchase) => {
    const newPurchase = {
      ...purchase,
      id: Date.now(),
      items: purchase.items || [],
      createdAt: new Date().toISOString()
    };
    setPurchases(prev => [newPurchase, ...prev]);
    
    if (supabase) {
      supabase.from('purchases').insert([{
        id: newPurchase.id,
        date: newPurchase.date,
        company: newPurchase.company,
        agent: newPurchase.agent,
        transport_cost: newPurchase.transportCost,
        total_expenditure: newPurchase.totalExpenditure,
        created_at: newPurchase.createdAt,
        updated_at: new Date().toISOString()
      }]).then(({ data }) => {
        if (data?.[0]?.id && newPurchase.items?.length > 0) {
          const itemsToInsert = newPurchase.items.map(item => ({
            purchase_id: data[0].id,
            product_type: item.productType,
            quantity: item.quantity,
            amount: item.amount,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          supabase.from('purchase_items').insert(itemsToInsert);
        }
      });
    }
    
    return newPurchase;
  };

  const updatePurchase = (updated) => {
    setPurchases(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    
    if (supabase) {
      supabase.from('purchases').update({
        date: updated.date,
        company: updated.company,
        agent: updated.agent,
        transport_cost: updated.transportCost,
        total_expenditure: updated.totalExpenditure,
        updated_at: new Date().toISOString()
      }).eq('id', updated.id);
    }
  };

  const deletePurchase = (id) => {
    setPurchases(prev => prev.filter(p => p.id !== id));
    
    if (supabase) {
      supabase.from('purchases').delete().eq('id', id);
      supabase.from('purchase_items').delete().eq('purchase_id', id);
    }
  };

  // ============================================
  // HELPER FUNCTIONS (unchanged)
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
    return entries[entries.length - 1]?.balance || 0;
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