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
      console.log('🔄 Fetching data from Supabase...');

      // Load Customers with Transactions
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*, transactions(*)')
        .order('created_at', { ascending: false });

      if (customersError) {
        console.error('❌ Error loading customers:', customersError);
      } else {
        console.log('✅ Customers loaded:', customersData?.length || 0);
        setCustomers(customersData || []);
      }

      // Load Brokers with Entries
      const { data: brokersData, error: brokersError } = await supabase
        .from('brokers')
        .select('*, broker_entries(*)')
        .order('created_at', { ascending: false });

      if (brokersError) {
        console.error('❌ Error loading brokers:', brokersError);
      } else {
        console.log('✅ Brokers loaded:', brokersData?.length || 0);
        setBrokers(brokersData || []);
      }

      // Load Purchases with Items
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*, purchase_items(*)')
        .order('created_at', { ascending: false });

      if (purchasesError) {
        console.error('❌ Error loading purchases:', purchasesError);
      } else {
        console.log('✅ Purchases loaded:', purchasesData?.length || 0);
        setPurchases(purchasesData || []);
      }
    } catch (error) {
      console.error('💥 Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // CUSTOMER ACTIONS
  // ============================================
  const addCustomer = async (customer) => {
    console.log('🔄 Adding customer:', customer);
    
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

      if (error) {
        console.error('❌ Error adding customer:', error);
        throw error;
      }
      
      console.log('✅ Customer added:', data);
      setCustomers([data, ...customers]);
      return data;
    } catch (error) {
      console.error('💥 addCustomer failed:', error);
      throw error;
    }
  };

  const updateCustomer = async (customer) => {
    console.log('🔄 Updating customer:', customer);
    
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: customer.name,
          phone: customer.phone,
          location: customer.location
        })
        .eq('id', customer.id);

      if (error) {
        console.error('❌ Error updating customer:', error);
        throw error;
      }
      
      console.log('✅ Customer updated');
      setCustomers(customers.map(c => c.id === customer.id ? { ...c, ...customer } : c));
    } catch (error) {
      console.error('💥 updateCustomer failed:', error);
      throw error;
    }
  };

  const deleteCustomer = async (customerId) => {
    console.log('🔄 Deleting customer:', customerId);
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        console.error('❌ Error deleting customer:', error);
        throw error;
      }
      
      console.log('✅ Customer deleted');
      setCustomers(customers.filter(c => c.id !== customerId));
    } catch (error) {
      console.error('💥 deleteCustomer failed:', error);
      throw error;
    }
  };

  const addTransaction = async (customerId, transaction) => {
    console.log('🔄 Adding transaction:', { customerId, transaction });
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          customer_id: customerId,
          type: transaction.type,
          amount: transaction.type === 'Credit' ? transaction.amount : null,
          paid: transaction.type === 'Payment' ? transaction.paid : null,
          notes: transaction.notes || '',
          date: transaction.date,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding transaction:', error);
        throw error;
      }
      
      console.log('✅ Transaction added:', data);
      setCustomers(customers.map(c => 
        c.id === customerId 
          ? { ...c, transactions: [data, ...(c.transactions || [])] }
          : c
      ));
      return data;
    } catch (error) {
      console.error('💥 addTransaction failed:', error);
      throw error;
    }
  };

  const updateTransaction = async (customerId, transactionId, transaction) => {
    console.log('🔄 Updating transaction:', { customerId, transactionId, transaction });
    
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          type: transaction.type,
          amount: transaction.type === 'Credit' ? transaction.amount : null,
          paid: transaction.type === 'Payment' ? transaction.paid : null,
          notes: transaction.notes || '',
          date: transaction.date
        })
        .eq('id', transactionId);

      if (error) {
        console.error('❌ Error updating transaction:', error);
        throw error;
      }
      
      console.log('✅ Transaction updated');
      setCustomers(customers.map(c => 
        c.id === customerId 
          ? { 
              ...c, 
              transactions: (c.transactions || []).map(t => 
                t.id === transactionId ? { ...t, ...transaction } : t
              )
            }
          : c
      ));
    } catch (error) {
      console.error('💥 updateTransaction failed:', error);
      throw error;
    }
  };

  const deleteTransaction = async (customerId, transactionId) => {
    console.log('🔄 Deleting transaction:', { customerId, transactionId });
    
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        console.error('❌ Error deleting transaction:', error);
        throw error;
      }
      
      console.log('✅ Transaction deleted');
      setCustomers(customers.map(c => 
        c.id === customerId 
          ? { 
              ...c, 
              transactions: (c.transactions || []).filter(t => t.id !== transactionId)
            }
          : c
      ));
    } catch (error) {
      console.error('💥 deleteTransaction failed:', error);
      throw error;
    }
  };

  // ============================================
  // BROKER ACTIONS
  // ============================================
  const addBroker = async (broker) => {
    console.log('🔄 Adding broker:', broker);
    
    try {
      const { data, error } = await supabase
        .from('brokers')
        .insert([{
          name: broker.name,
          phone: broker.phone,
          area: broker.area,
          opening_balance: broker.openingBalance || 0,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding broker:', error);
        throw error;
      }
      
      console.log('✅ Broker added:', data);
      setBrokers([...brokers, data]);
      return data;
    } catch (error) {
      console.error('💥 addBroker failed:', error);
      throw error;
    }
  };

  const updateBroker = async (broker) => {
    console.log('🔄 Updating broker:', broker);
    
    try {
      const { error } = await supabase
        .from('brokers')
        .update({
          name: broker.name,
          phone: broker.phone,
          area: broker.area,
          opening_balance: broker.openingBalance || 0
        })
        .eq('id', broker.id);

      if (error) {
        console.error('❌ Error updating broker:', error);
        throw error;
      }
      
      console.log('✅ Broker updated');
      setBrokers(brokers.map(b => b.id === broker.id ? { ...b, ...broker } : b));
    } catch (error) {
      console.error('💥 updateBroker failed:', error);
      throw error;
    }
  };

  const deleteBroker = async (brokerId) => {
    console.log('🔄 Deleting broker:', brokerId);
    
    try {
      const { error } = await supabase
        .from('brokers')
        .delete()
        .eq('id', brokerId);

      if (error) {
        console.error('❌ Error deleting broker:', error);
        throw error;
      }
      
      console.log('✅ Broker deleted');
      setBrokers(brokers.filter(b => b.id !== brokerId));
    } catch (error) {
      console.error('💥 deleteBroker failed:', error);
      throw error;
    }
  };

  const addEntry = async (brokerId, entry) => {
    console.log('🔄 Adding entry:', { brokerId, entry });
    
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

      if (error) {
        console.error('❌ Error adding entry:', error);
        throw error;
      }
      
      console.log('✅ Entry added:', data);
      setBrokers(brokers.map(b => 
        b.id === brokerId 
          ? { ...b, broker_entries: [...(b.broker_entries || []), data] }
          : b
      ));
      return data;
    } catch (error) {
      console.error('💥 addEntry failed:', error);
      throw error;
    }
  };

  const updateEntry = async (brokerId, entryId, entry) => {
    console.log('🔄 Updating entry:', { brokerId, entryId, entry });
    
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

      if (error) {
        console.error('❌ Error updating entry:', error);
        throw error;
      }
      
      console.log('✅ Entry updated');
      setBrokers(brokers.map(b => 
        b.id === brokerId 
          ? { 
              ...b, 
              broker_entries: (b.broker_entries || []).map(e => 
                e.id === entryId ? { ...e, ...entry } : e
              )
            }
          : b
      ));
    } catch (error) {
      console.error('💥 updateEntry failed:', error);
      throw error;
    }
  };

  const deleteEntry = async (brokerId, entryId) => {
    console.log('🔄 Deleting entry:', { brokerId, entryId });
    
    try {
      const { error } = await supabase
        .from('broker_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('❌ Error deleting entry:', error);
        throw error;
      }
      
      console.log('✅ Entry deleted');
      setBrokers(brokers.map(b => 
        b.id === brokerId 
          ? { 
              ...b, 
              broker_entries: (b.broker_entries || []).filter(e => e.id !== entryId)
            }
          : b
      ));
    } catch (error) {
      console.error('💥 deleteEntry failed:', error);
      throw error;
    }
  };

  // ============================================
  // PURCHASE ACTIONS
  // ============================================
  const addPurchase = async (purchase) => {
    console.log('🔄 Adding purchase:', purchase);
    
    try {
      // Insert purchase
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .insert([{
          date: purchase.date,
          company: purchase.company,
          agent: purchase.agent || '',
          transport_cost: purchase.transportCost || 0,
          total_expenditure: purchase.totalExpenditure || 0,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (purchaseError) {
        console.error('❌ Error adding purchase:', purchaseError);
        throw purchaseError;
      }

      console.log('✅ Purchase created:', purchaseData);

      // Insert items
      if (purchase.items && purchase.items.length > 0) {
        const itemsToInsert = purchase.items.map(item => ({
          purchase_id: purchaseData.id,
          product_type: item.productType,
          quantity: item.quantity,
          amount: item.amount,
          created_at: new Date().toISOString()
        }));

        const { data: itemsData, error: itemsError } = await supabase
          .from('purchase_items')
          .insert(itemsToInsert)
          .select();

        if (itemsError) {
          console.error('❌ Error adding purchase items:', itemsError);
          throw itemsError;
        }

        console.log('✅ Purchase items added:', itemsData);
      }

      setPurchases([purchaseData, ...purchases]);
      return purchaseData;
    } catch (error) {
      console.error('💥 addPurchase failed:', error);
      throw error;
    }
  };

  const updatePurchase = async (purchase) => {
    console.log('🔄 Updating purchase:', purchase);
    
    try {
      const { error } = await supabase
        .from('purchases')
        .update({
          date: purchase.date,
          company: purchase.company,
          agent: purchase.agent || '',
          transport_cost: purchase.transportCost || 0,
          total_expenditure: purchase.totalExpenditure || 0
        })
        .eq('id', purchase.id);

      if (error) {
        console.error('❌ Error updating purchase:', error);
        throw error;
      }
      
      console.log('✅ Purchase updated');
      setPurchases(purchases.map(p => p.id === purchase.id ? { ...p, ...purchase } : p));
    } catch (error) {
      console.error('💥 updatePurchase failed:', error);
      throw error;
    }
  };

  const deletePurchase = async (purchaseId) => {
    console.log('🔄 Deleting purchase:', purchaseId);
    
    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId);

      if (error) {
        console.error('❌ Error deleting purchase:', error);
        throw error;
      }
      
      console.log('✅ Purchase deleted');
      setPurchases(purchases.filter(p => p.id !== purchaseId));
    } catch (error) {
      console.error('💥 deletePurchase failed:', error);
      throw error;
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
    const transactions = customer.transactions || [];
    const totalCredit = transactions
      .filter((t) => t.type === 'Credit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPaid = transactions
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