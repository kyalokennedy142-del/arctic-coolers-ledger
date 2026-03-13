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
  // 🔽 LOAD FROM LOCALSTORAGE ON MOUNT (Primary)
  // ============================================
  useEffect(() => {
    const loadFromLocalStorage = () => {
      try {
        console.log('📦 Loading from localStorage...');
        const savedCustomers = localStorage.getItem('arctic-customers');
        const savedBrokers = localStorage.getItem('arctic-brokers');
        const savedPurchases = localStorage.getItem('arctic-purchases');
        
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
    };

    loadFromLocalStorage();
  }, []);

  // ============================================
  // 🔼 SAVE TO LOCALSTORAGE WHENEVER DATA CHANGES (Primary)
  // ============================================
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('arctic-customers', JSON.stringify(customers));
      console.log('💾 Saved customers to localStorage:', customers.length);
      // Also backup to Supabase (async, non-blocking)
      backupCustomersToSupabase();
    }
  }, [customers, loading]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('arctic-brokers', JSON.stringify(brokers));
      console.log('💾 Saved brokers to localStorage:', brokers.length);
      backupBrokersToSupabase();
    }
  }, [brokers, loading]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('arctic-purchases', JSON.stringify(purchases));
      console.log('💾 Saved purchases to localStorage:', purchases.length);
      backupPurchasesToSupabase();
    }
  }, [purchases, loading]);

  // ============================================
  // 🔄 BACKUP FUNCTIONS TO SUPABASE (Async, Non-Blocking)
  // ============================================
  
  const backupCustomersToSupabase = async () => {
    if (!supabase) return;
    
    try {
      // Backup each customer (upsert to avoid duplicates)
      for (const customer of customers) {
        await supabase
          .from('customers')
          .upsert({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            location: customer.location,
            created_at: customer.createdAt,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
      }
      console.log('☁️ Backed up', customers.length, 'customers to Supabase');
    } catch (error) {
      console.warn('⚠️ Supabase backup failed (localStorage still works):', error.message);
    }
  };

  const backupBrokersToSupabase = async () => {
    if (!supabase) return;
    
    try {
      for (const broker of brokers) {
        await supabase
          .from('brokers')
          .upsert({
            id: broker.id,
            name: broker.name,
            phone: broker.phone,
            area: broker.area,
            opening_balance: broker.openingBalance,
            created_at: broker.createdAt,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
      }
      console.log('☁️ Backed up', brokers.length, 'brokers to Supabase');
    } catch (error) {
      console.warn('⚠️ Supabase backup failed:', error.message);
    }
  };

  const backupPurchasesToSupabase = async () => {
    if (!supabase) return;
    
    try {
      for (const purchase of purchases) {
        // Backup purchase header
        await supabase
          .from('purchases')
          .upsert({
            id: purchase.id,
            date: purchase.date,
            company: purchase.company,
            agent: purchase.agent,
            transport_cost: purchase.transportCost,
            total_expenditure: purchase.totalExpenditure,
            created_at: purchase.createdAt,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        
        // Backup purchase items
        if (purchase.items?.length > 0) {
          // First, delete existing items for this purchase (to avoid duplicates)
          await supabase.from('purchase_items').delete().eq('purchase_id', purchase.id);
          
          // Then insert new items
          const itemsToInsert = purchase.items.map(item => ({
            id: item.id,
            purchase_id: purchase.id,
            product_type: item.productType,
            quantity: item.quantity,
            amount: item.amount,
            created_at: new Date().toISOString()
          }));
          
          await supabase.from('purchase_items').insert(itemsToInsert);
        }
      }
      console.log('☁️ Backed up', purchases.length, 'purchases to Supabase');
    } catch (error) {
      console.warn('⚠️ Supabase backup failed:', error.message);
    }
  };

  // ============================================
  // CUSTOMER ACTIONS (localStorage primary + Supabase backup)
  // ============================================
  const addCustomer = (customer) => {
    const newCustomer = {
      ...customer,
      id: Date.now(),
      transactions: [],
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => [newCustomer, ...prev]);
    console.log('✅ Added customer (localStorage):', newCustomer.name);
    
    // Also add to Supabase (async)
    if (supabase) {
      supabase.from('customers').insert([{
        id: newCustomer.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        location: newCustomer.location,
        created_at: newCustomer.createdAt
      }]).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase insert failed:', error.message);
        else console.log('☁️ Customer backed up to Supabase');
      });
    }
    
    return newCustomer;
  };

  const updateCustomer = (updated) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    console.log('✅ Updated customer (localStorage):', updated.id);
    
    // Also update in Supabase (async)
    if (supabase) {
      supabase.from('customers').update({
        name: updated.name,
        phone: updated.phone,
        location: updated.location,
        updated_at: new Date().toISOString()
      }).eq('id', updated.id).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase update failed:', error.message);
      });
    }
  };

  const deleteCustomer = (id) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    console.log('✅ Deleted customer (localStorage):', id);
    
    // Also delete from Supabase (async)
    if (supabase) {
      supabase.from('customers').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase delete failed:', error.message);
      });
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
    console.log('✅ Added transaction (localStorage):', customerId);
    
    // Also add to Supabase (async)
    if (supabase) {
      supabase.from('transactions').insert([{
        id: newTransaction.id,
        customer_id: customerId,
        type: newTransaction.type,
        amount: newTransaction.type === 'Credit' ? newTransaction.amount : null,
        paid: newTransaction.type === 'Payment' ? newTransaction.paid : null,
        notes: newTransaction.notes,
        date: newTransaction.date,
        created_at: newTransaction.createdAt
      }]).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase transaction insert failed:', error.message);
      });
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
    console.log('✅ Updated transaction (localStorage):', transactionId);
    
    // Also update in Supabase (async)
    if (supabase) {
      supabase.from('transactions').update({
        type: updates.type,
        amount: updates.type === 'Credit' ? updates.amount : null,
        paid: updates.type === 'Payment' ? updates.paid : null,
        notes: updates.notes,
        date: updates.date,
        updated_at: new Date().toISOString()
      }).eq('id', transactionId).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase transaction update failed:', error.message);
      });
    }
  };

  const deleteTransaction = (customerId, transactionId) => {
    setCustomers(prev => prev.map(c => 
      c.id === customerId 
        ? { ...c, transactions: c.transactions.filter(t => t.id !== transactionId) }
        : c
    ));
    console.log('✅ Deleted transaction (localStorage):', transactionId);
    
    // Also delete from Supabase (async)
    if (supabase) {
      supabase.from('transactions').delete().eq('id', transactionId).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase transaction delete failed:', error.message);
      });
    }
  };

  // ============================================
  // BROKER ACTIONS (localStorage primary + Supabase backup)
  // ============================================
  const addBroker = (broker) => {
    const newBroker = {
      ...broker,
      id: Date.now(),
      entries: [],
      createdAt: new Date().toISOString()
    };
    setBrokers(prev => [newBroker, ...prev]);
    console.log('✅ Added broker (localStorage):', newBroker.name);
    
    // Also add to Supabase (async)
    if (supabase) {
      supabase.from('brokers').insert([{
        id: newBroker.id,
        name: newBroker.name,
        phone: newBroker.phone,
        area: newBroker.area,
        opening_balance: newBroker.openingBalance,
        created_at: newBroker.createdAt
      }]).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase broker insert failed:', error.message);
      });
    }
    
    return newBroker;
  };

  const updateBroker = (updated) => {
    setBrokers(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
    console.log('✅ Updated broker (localStorage):', updated.id);
    
    // Also update in Supabase (async)
    if (supabase) {
      supabase.from('brokers').update({
        name: updated.name,
        phone: updated.phone,
        area: updated.area,
        opening_balance: updated.openingBalance,
        updated_at: new Date().toISOString()
      }).eq('id', updated.id).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase broker update failed:', error.message);
      });
    }
  };

  const deleteBroker = (id) => {
    setBrokers(prev => prev.filter(b => b.id !== id));
    console.log('✅ Deleted broker (localStorage):', id);
    
    // Also delete from Supabase (async)
    if (supabase) {
      supabase.from('brokers').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase broker delete failed:', error.message);
      });
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
    console.log('✅ Added entry (localStorage):', brokerId);
    
    // Also add to Supabase (async)
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
        created_at: newEntry.createdAt
      }]).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase entry insert failed:', error.message);
      });
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
    console.log('✅ Updated entry (localStorage):', entryId);
    
    // Also update in Supabase (async)
    if (supabase) {
      supabase.from('broker_entries').update({
        date: updates.date,
        day: updates.day,
        bottles: updates.bottles,
        amount: updates.amount,
        paid: updates.paid,
        balance: updates.balance,
        updated_at: new Date().toISOString()
      }).eq('id', entryId).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase entry update failed:', error.message);
      });
    }
  };

  const deleteEntry = (brokerId, entryId) => {
    setBrokers(prev => prev.map(b => 
      b.id === brokerId 
        ? { ...b, entries: b.entries.filter(e => e.id !== entryId) }
        : b
    ));
    console.log('✅ Deleted entry (localStorage):', entryId);
    
    // Also delete from Supabase (async)
    if (supabase) {
      supabase.from('broker_entries').delete().eq('id', entryId).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase entry delete failed:', error.message);
      });
    }
  };

  // ============================================
  // PURCHASE ACTIONS (localStorage primary + Supabase backup)
  // ============================================
  const addPurchase = (purchase) => {
    const newPurchase = {
      ...purchase,
      id: Date.now(),
      items: purchase.items || [],
      createdAt: new Date().toISOString()
    };
    setPurchases(prev => [newPurchase, ...prev]);
    console.log('✅ Added purchase (localStorage):', newPurchase.company);
    
    // Also add to Supabase (async)
    if (supabase) {
      // Insert purchase header
      supabase.from('purchases').insert([{
        id: newPurchase.id,
        date: newPurchase.date,
        company: newPurchase.company,
        agent: newPurchase.agent,
        transport_cost: newPurchase.transportCost,
        total_expenditure: newPurchase.totalExpenditure,
        created_at: newPurchase.createdAt
      }]).then(({ error, data }) => {
        if (error) {
          console.warn('⚠️ Supabase purchase insert failed:', error.message);
        } else {
          console.log('☁️ Purchase header backed up to Supabase');
          
          // Insert items if any
          if (newPurchase.items?.length > 0 && data?.[0]?.id) {
            const itemsToInsert = newPurchase.items.map(item => ({
              purchase_id: data[0].id,
              product_type: item.productType,
              quantity: item.quantity,
              amount: item.amount,
              created_at: new Date().toISOString()
            }));
            
            supabase.from('purchase_items').insert(itemsToInsert).then(({ error }) => {
              if (error) console.warn('⚠️ Supabase items insert failed:', error.message);
              else console.log('☁️ Purchase items backed up to Supabase');
            });
          }
        }
      });
    }
    
    return newPurchase;
  };

  const updatePurchase = (updated) => {
    setPurchases(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    console.log('✅ Updated purchase (localStorage):', updated.id);
    
    // Also update in Supabase (async)
    if (supabase) {
      supabase.from('purchases').update({
        date: updated.date,
        company: updated.company,
        agent: updated.agent,
        transport_cost: updated.transportCost,
        total_expenditure: updated.totalExpenditure,
        updated_at: new Date().toISOString()
      }).eq('id', updated.id).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase purchase update failed:', error.message);
      });
    }
  };

  const deletePurchase = (id) => {
    setPurchases(prev => prev.filter(p => p.id !== id));
    console.log('✅ Deleted purchase (localStorage):', id);
    
    // Also delete from Supabase (async)
    if (supabase) {
      supabase.from('purchases').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('⚠️ Supabase purchase delete failed:', error.message);
      });
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