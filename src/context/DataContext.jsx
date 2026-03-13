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
  // 🔄 SIMPLIFIED BACKUP FUNCTIONS (Insert + Update Fallback)
  // ============================================
  
  const backupSingleRecord = async (table, record, idField = 'id') => {
    if (!supabase) return;
    
    try {
      // Try to insert first
      const { error: insertError } = await supabase.from(table).insert([record]);
      
      // If duplicate key error, update instead
      if (insertError?.code === '23505' || insertError?.message?.includes('duplicate')) {
        const { [idField]: idValue, ...updateData } = record;
        await supabase.from(table).update(updateData).eq(idField, idValue);
      }
    } catch (e) {
      // Silent fail - localStorage still works
      console.warn(`⚠️ Supabase backup failed for ${table}:`, e.message);
    }
  };

  const backupCustomersToSupabase = async () => {
    if (!supabase) return;
    try {
      for (const customer of customers) {
        await backupSingleRecord('customers', {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          location: customer.location,
          created_at: customer.createdAt,
          updated_at: new Date().toISOString()
        });
      }
      console.log('☁️ Backed up', customers.length, 'customers to Supabase');
    } catch (error) {
      console.warn('⚠️ Supabase backup failed:', error.message);
    }
  };

  const backupBrokersToSupabase = async () => {
    if (!supabase) return;
    try {
      for (const broker of brokers) {
        await backupSingleRecord('brokers', {
          id: broker.id,
          name: broker.name,
          phone: broker.phone,
          area: broker.area,
          opening_balance: broker.openingBalance,
          created_at: broker.createdAt,
          updated_at: new Date().toISOString()
        });
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
        await backupSingleRecord('purchases', {
          id: purchase.id,
          date: purchase.date,
          company: purchase.company,
          agent: purchase.agent,
          transport_cost: purchase.transportCost,
          total_expenditure: purchase.totalExpenditure,
          created_at: purchase.createdAt,
          updated_at: new Date().toISOString()
        });
        
        // Backup items separately
        if (purchase.items?.length > 0) {
          // Delete existing items first to avoid duplicates
          await supabase.from('purchase_items').delete().eq('purchase_id', purchase.id);
          
          const itemsToInsert = purchase.items.map(item => ({
            id: item.id,
            purchase_id: purchase.id,
            product_type: item.productType,
            quantity: item.quantity,
            amount: item.amount,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
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
    console.log('✅ Added customer (localStorage):', newCustomer.name);
    
    // Backup to Supabase
    if (supabase) {
      backupSingleRecord('customers', {
        id: newCustomer.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        location: newCustomer.location,
        created_at: newCustomer.createdAt,
        updated_at: new Date().toISOString()
      });
    }
    return newCustomer;
  };

  const updateCustomer = (updated) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    console.log('✅ Updated customer (localStorage):', updated.id);
    
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
    console.log('✅ Deleted customer (localStorage):', id);
    
    if (supabase) {
      supabase.from('customers').delete().eq('id', id);
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
    console.log('✅ Updated transaction (localStorage):', transactionId);
    
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
    console.log('✅ Deleted transaction (localStorage):', transactionId);
    
    if (supabase) {
      supabase.from('transactions').delete().eq('id', transactionId);
    }
  };

  // ============================================
  // BROKER ACTIONS - FIXED FOREIGN KEY ISSUE
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
    
    if (supabase) {
      backupSingleRecord('brokers', {
        id: newBroker.id,
        name: newBroker.name,
        phone: newBroker.phone,
        area: newBroker.area,
        opening_balance: newBroker.openingBalance,
        created_at: newBroker.createdAt,
        updated_at: new Date().toISOString()
      });
    }
    return newBroker;
  };

  const updateBroker = (updated) => {
    setBrokers(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
    console.log('✅ Updated broker (localStorage):', updated.id);
    
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
    console.log('✅ Deleted broker (localStorage):', id);
    
    if (supabase) {
      supabase.from('brokers').delete().eq('id', id);
    }
  };

  // ✅ FIXED: addEntry - Uses functional update to avoid stale closure
  const addEntry = (brokerId, entry) => {
    const newEntry = {
      ...entry,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    // Update localStorage AND backup to Supabase in same functional update
    setBrokers(prev => {
      const updatedBrokers = prev.map(b => 
        b.id === brokerId 
          ? { ...b, entries: [...b.entries, newEntry] }
          : b
      );
      
      // Backup to Supabase using the UPDATED state (not stale closure)
      if (supabase) {
        const broker = updatedBrokers.find(b => b.id === brokerId);
        
        if (broker) {
          // First, ensure broker exists in Supabase
          backupSingleRecord('brokers', {
            id: broker.id,
            name: broker.name,
            phone: broker.phone,
            area: broker.area,
            opening_balance: broker.openingBalance,
            updated_at: new Date().toISOString()
          }).then(() => {
            // NOW add the entry (broker_id will exist)
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
            }]).then(({ error }) => {
              if (error) {
                console.warn('⚠️ Supabase entry insert failed:', error.message);
              } else {
                console.log('☁️ Entry backed up to Supabase');
              }
            });
          });
        }
      }
      
      return updatedBrokers;
    });
    
    console.log('✅ Added entry (localStorage):', brokerId);
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
    console.log('✅ Deleted entry (localStorage):', entryId);
    
    if (supabase) {
      supabase.from('broker_entries').delete().eq('id', entryId);
    }
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
    console.log('✅ Added purchase (localStorage):', newPurchase.company);
    
    if (supabase) {
      // Backup purchase header
      backupSingleRecord('purchases', {
        id: newPurchase.id,
        date: newPurchase.date,
        company: newPurchase.company,
        agent: newPurchase.agent,
        transport_cost: newPurchase.transportCost,
        total_expenditure: newPurchase.totalExpenditure,
        created_at: newPurchase.createdAt,
        updated_at: new Date().toISOString()
      }).then(() => {
        // Backup items if any
        if (newPurchase.items?.length > 0) {
          supabase.from('purchase_items').delete().eq('purchase_id', newPurchase.id).then(() => {
            const itemsToInsert = newPurchase.items.map(item => ({
              purchase_id: newPurchase.id,
              product_type: item.productType,
              quantity: item.quantity,
              amount: item.amount,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));
            supabase.from('purchase_items').insert(itemsToInsert);
          });
        }
      });
    }
    return newPurchase;
  };

  const updatePurchase = (updated) => {
    setPurchases(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    console.log('✅ Updated purchase (localStorage):', updated.id);
    
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
    console.log('✅ Deleted purchase (localStorage):', id);
    
    if (supabase) {
      supabase.from('purchases').delete().eq('id', id);
    }
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