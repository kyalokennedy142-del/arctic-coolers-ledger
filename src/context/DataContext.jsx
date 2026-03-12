import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// ============================================
// 1. CREATE CONTEXT
// ============================================
const DataContext = createContext(null);

// ============================================
// 2. CUSTOM HOOK
// ============================================
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// ============================================
// 3. PROVIDER COMPONENT
// ============================================
export function DataProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [purchases, setPurchases] = useState([]);

  // ============================================
  // LOAD DATA FROM SUPABASE ON MOUNT
  // ============================================
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Load Customers with Transactions
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*, transactions(*)')
        .order('created_at', { ascending: false });

      // Load Brokers with Entries
      const { data: brokersData, error: brokersError } = await supabase
        .from('brokers')
        .select('*, broker_entries(*)')
        .order('created_at', { ascending: false });

      // Load Purchases with Items
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*, purchase_items(*)')
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;
      if (brokersError) throw brokersError;
      if (purchasesError) throw purchasesError;

      // Transform data to match app structure
      setCustomers(customersData || []);
      setBrokers(brokersData || []);
      setPurchases(purchasesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // CUSTOMER ACTIONS
  // ============================================
  const addCustomer = async (customer) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: customer.name,
          phone: customer.phone,
          location: customer.location,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      setCustomers([data, ...customers]);
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  const updateCustomer = async (customer) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: customer.name,
          phone: customer.phone,
          location: customer.location
        })
        .eq('id', customer.id);

      if (error) throw error;
      setCustomers(customers.map(c => c.id === customer.id ? { ...c, ...customer } : c));
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const deleteCustomer = async (customerId) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;
      setCustomers(customers.filter(c => c.id !== customerId));
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const addTransaction = async (customerId, transaction) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          customer_id: customerId,
          type: transaction.type,
          amount: transaction.type === 'Credit' ? transaction.amount : null,
          paid: transaction.type === 'Payment' ? transaction.paid : null,
          notes: transaction.notes,
          date: transaction.date,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      setCustomers(customers.map(c => 
        c.id === customerId 
          ? { ...c, transactions: [data, ...c.transactions] }
          : c
      ));
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const updateTransaction = async (customerId, transactionId, transaction) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          type: transaction.type,
          amount: transaction.type === 'Credit' ? transaction.amount : null,
          paid: transaction.type === 'Payment' ? transaction.paid : null,
          notes: transaction.notes,
          date: transaction.date
        })
        .eq('id', transactionId);

      if (error) throw error;
      
      setCustomers(customers.map(c => 
        c.id === customerId 
          ? { 
              ...c, 
              transactions: c.transactions.map(t => 
                t.id === transactionId ? { ...t, ...transaction } : t
              )
            }
          : c
      ));
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const deleteTransaction = async (customerId, transactionId) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;
      
      setCustomers(customers.map(c => 
        c.id === customerId 
          ? { 
              ...c, 
              transactions: c.transactions.filter(t => t.id !== transactionId)
            }
          : c
      ));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  // ============================================
  // BROKER ACTIONS
  // ============================================
  const addBroker = async (broker) => {
    try {
      const { data, error } = await supabase
        .from('brokers')
        .insert([{
          name: broker.name,
          phone: broker.phone,
          area: broker.area,
          opening_balance: broker.openingBalance,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      setBrokers([...brokers, data]);
    } catch (error) {
      console.error('Error adding broker:', error);
    }
  };

  const updateBroker = async (broker) => {
    try {
      const { error } = await supabase
        .from('brokers')
        .update({
          name: broker.name,
          phone: broker.phone,
          area: broker.area,
          opening_balance: broker.openingBalance
        })
        .eq('id', broker.id);

      if (error) throw error;
      setBrokers(brokers.map(b => b.id === broker.id ? { ...b, ...broker } : b));
    } catch (error) {
      console.error('Error updating broker:', error);
    }
  };

  const deleteBroker = async (brokerId) => {
    try {
      const { error } = await supabase
        .from('brokers')
        .delete()
        .eq('id', brokerId);

      if (error) throw error;
      setBrokers(brokers.filter(b => b.id !== brokerId));
    } catch (error) {
      console.error('Error deleting broker:', error);
    }
  };

  const addEntry = async (brokerId, entry) => {
    try {
      const { data, error } = await supabase
        .from('broker_entries')
        .insert([{
          broker_id: brokerId,
          date: entry.date,
          day: entry.day,
          bottles: entry.bottles,
          amount: entry.amount,
          paid: entry.paid,
          balance: entry.balance,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      setBrokers(brokers.map(b => 
        b.id === brokerId 
          ? { ...b, broker_entries: [...b.broker_entries, data] }
          : b
      ));
    } catch (error) {
      console.error('Error adding entry:', error);
    }
  };

  const updateEntry = async (brokerId, entryId, entry) => {
    try {
      const { error } = await supabase
        .from('broker_entries')
        .update({
          date: entry.date,
          day: entry.day,
          bottles: entry.bottles,
          amount: entry.amount,
          paid: entry.paid,
          balance: entry.balance
        })
        .eq('id', entryId);

      if (error) throw error;
      
      setBrokers(brokers.map(b => 
        b.id === brokerId 
          ? { 
              ...b, 
              broker_entries: b.broker_entries.map(e => 
                e.id === entryId ? { ...e, ...entry } : e
              )
            }
          : b
      ));
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  };

  const deleteEntry = async (brokerId, entryId) => {
    try {
      const { error } = await supabase
        .from('broker_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      
      setBrokers(brokers.map(b => 
        b.id === brokerId 
          ? { 
              ...b, 
              broker_entries: b.broker_entries.filter(e => e.id !== entryId)
            }
          : b
      ));
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  // ============================================
  // PURCHASE ACTIONS
  // ============================================
  const addPurchase = async (purchase) => {
    try {
      // Insert purchase
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .insert([{
          date: purchase.date,
          company: purchase.company,
          agent: purchase.agent,
          transport_cost: purchase.transportCost,
          total_expenditure: purchase.totalExpenditure,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Insert items
      if (purchase.items && purchase.items.length > 0) {
        const itemsToInsert = purchase.items.map(item => ({
          purchase_id: purchaseData.id,
          product_type: item.productType,
          quantity: item.quantity,
          amount: item.amount,
          created_at: new Date().toISOString()
        }));

        const { error: itemsError } = await supabase
          .from('purchase_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      setPurchases([purchaseData, ...purchases]);
    } catch (error) {
      console.error('Error adding purchase:', error);
    }
  };

  const updatePurchase = async (purchase) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .update({
          date: purchase.date,
          company: purchase.company,
          agent: purchase.agent,
          transport_cost: purchase.transportCost,
          total_expenditure: purchase.totalExpenditure
        })
        .eq('id', purchase.id);

      if (error) throw error;
      setPurchases(purchases.map(p => p.id === purchase.id ? { ...p, ...purchase } : p));
    } catch (error) {
      console.error('Error updating purchase:', error);
    }
  };

  const deletePurchase = async (purchaseId) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId);

      if (error) throw error;
      setPurchases(purchases.filter(p => p.id !== purchaseId));
    } catch (error) {
      console.error('Error deleting purchase:', error);
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getCustomerById = (customerId) => {
    return customers.find((c) => c.id === customerId);
  };

  const getBrokerById = (brokerId) => {
    return brokers.find((b) => b.id === brokerId);
  };

  const calculateCustomerBalance = (customer) => {
    if (!customer) return 0;
    const totalCredit = customer.transactions
      .filter((t) => t.type === 'Credit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPaid = customer.transactions
      .filter((t) => t.type === 'Payment')
      .reduce((sum, t) => sum + (t.paid || 0), 0);
    return totalCredit - totalPaid;
  };

  const calculateBrokerBalance = (broker) => {
    if (!broker) return 0;
    const entries = broker.broker_entries || broker.entries || [];
    if (entries.length === 0) return broker.opening_balance || broker.openingBalance || 0;
    return entries[entries.length - 1].balance;
  };

  const getStats = () => {
    const totalCustomers = customers.length;
    
    const totalCredit = customers.reduce((sum, c) => {
      return sum + (c.transactions || []).filter((t) => t.type === 'Credit').reduce((s, t) => s + (t.amount || 0), 0);
    }, 0);
    
    const totalPaid = customers.reduce((sum, c) => {
      return sum + (c.transactions || []).filter((t) => t.type === 'Payment').reduce((s, t) => s + (t.paid || 0), 0);
    }, 0);
    
    const totalPurchases = purchases.reduce((sum, p) => sum + (p.total_expenditure || p.totalExpenditure || 0), 0);
    const outstandingBalance = totalCredit - totalPaid;

    return {
      totalCustomers,
      totalCredit,
      totalPaid,
      totalPurchases,
      outstandingBalance,
      totalBrokers: brokers.length,
    };
  };

  // ============================================
  // PROVIDE VALUE
  // ============================================
  const value = {
    // State
    customers,
    brokers,
    purchases,
    loading,
    
    // Customer Actions
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    
    // Broker Actions
    addBroker,
    updateBroker,
    deleteBroker,
    addEntry,
    updateEntry,
    deleteEntry,
    
    // Purchase Actions
    addPurchase,
    updatePurchase,
    deletePurchase,
    
    // Helper Functions
    getCustomerById,
    getBrokerById,
    calculateCustomerBalance,
    calculateBrokerBalance,
    getStats,
    refreshData: fetchData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export default DataContext;