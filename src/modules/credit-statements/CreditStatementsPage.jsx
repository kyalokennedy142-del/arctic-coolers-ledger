// src/modules/credit-statements/CreditStatementsPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';  // ✅ Fixed: ../../
import { supabase } from '../../lib/supabaseClient';  // ✅ Fixed: ../../
import { formatKSH, formatDate } from '../../utils/formatCurrency';  // ✅ Fixed: ../../
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// Transaction Modal Component
// ─────────────────────────────────────────────────────────────
const TransactionModal = ({ isOpen, onClose, customer, onSuccess }) => {
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: 'Credit',
    amount: '',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('transactions').insert([{
        customer_id: customer.id,
        customer_name: customer.name,
        transaction_date: formData.transaction_date,
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        notes: formData.notes
      }]);
      if (error) throw error;
      toast.success('Transaction added!');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Add Transaction - {customer?.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" required value={formData.transaction_date} onChange={(e) => setFormData({...formData, transaction_date: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select value={formData.transaction_type} onChange={(e) => setFormData({...formData, transaction_type: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="Credit">Credit</option>
                <option value="Payment">Payment</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KSh) *</label>
            <input type="number" required min="0.01" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={3} placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'Saving...' : 'Add Transaction'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Credit Statements Page Component
// ─────────────────────────────────────────────────────────────
export default function CreditStatementsPage() {
  const { customers, transactions, loading, error, refresh } = useData();  // ✅ Use DataContext
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerTransactions, setCustomerTransactions] = useState({});
  const [loadingTransactions, setLoadingTransactions] = useState({});

  // Handle URL param for auto-expand
  useEffect(() => {
    const customerParam = searchParams.get('customer');
    if (customerParam && customers) {
      const matched = customers.find(c => c.name?.toLowerCase().includes(customerParam.toLowerCase()));
      if (matched) {
        setExpandedCustomer(matched.id);
        setSearchTerm(customerParam);
        fetchCustomerTransactions(matched.id);
      }
    }
  }, [searchParams, customers]);

  // Fetch transactions for individual customer
  const fetchCustomerTransactions = async (customerId) => {
    if (customerTransactions[customerId]) return;
    
    setLoadingTransactions(prev => ({ ...prev, [customerId]: true }));
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      setCustomerTransactions(prev => ({ ...prev, [customerId]: data || [] }));
    } catch (err) {
      toast.error('Failed to load transactions: ' + err.message);
    } finally {
      setLoadingTransactions(prev => ({ ...prev, [customerId]: false }));
    }
  };

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    
    let result = [...customers];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => c.name?.toLowerCase().includes(term));
    }
    
    return result.sort((a, b) => a.name?.localeCompare(b.name));
  }, [customers, searchTerm]);

  // Calculate totals for a customer
  const calculateCustomerTotals = (customerId) => {
    const txs = customerTransactions[customerId] || [];
    const totalCredit = txs.filter(t => t.transaction_type?.toLowerCase() === 'credit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalPaid = txs.filter(t => ['payment', 'paid'].includes(t.transaction_type?.toLowerCase()))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    return { totalCredit, totalPaid, balance: totalCredit - totalPaid, count: txs.length };
  };

  // Handlers
  const handleExpand = async (customerId) => {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null);
    } else {
      setExpandedCustomer(customerId);
      await fetchCustomerTransactions(customerId);
    }
  };

  // ✅ FIXED: Opens modal directly instead of navigating
  const handleAddTransaction = (customer) => {
    setSelectedCustomer(customer);
    setShowTransactionModal(true);  // ✅ Open modal
  };

  const handleDeleteTransaction = async (txId, customerId) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', txId);
      if (error) throw error;
      toast.success('Transaction deleted');
      fetchCustomerTransactions(customerId);
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleTransactionSuccess = () => {
    setShowTransactionModal(false);
    setSelectedCustomer(null);
    refresh();
  };

  // Loading/Error states
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow">
        <p className="text-red-600 font-medium mb-2">⚠️ {error}</p>
        <button onClick={refresh} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Credit Statements</h1>
                <p className="text-sm text-gray-500">View all transactions by customer</p>
              </div>
            </div>
            <a href="https://wa.me/254712345678?text=Hello, I need assistance" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
              💬 AI Assistant
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 space-y-4">
          <input type="text" placeholder="Search by customer name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Filter by date:</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            {dateFilter && <button onClick={() => setDateFilter('')} className="text-sm text-blue-600 hover:underline">Clear</button>}
          </div>
        </div>

        {/* Customer Ledgers */}
        <div className="space-y-4">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map(customer => {
              const totals = calculateCustomerTotals(customer.id);
              const isExpanded = expandedCustomer === customer.id;
              const txs = customerTransactions[customer.id] || [];
              const isLoading = loadingTransactions[customer.id];

              return (
                <div key={customer.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div onClick={() => handleExpand(customer.id)} className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{customer.name}</h3>
                        <p className="text-sm text-gray-500">{totals.count} transactions</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-red-600">Credit: {formatKSH(totals.totalCredit)}</p>
                          <p className="text-sm text-green-600">Paid: {formatKSH(totals.totalPaid)}</p>
                          <p className={`font-semibold ${totals.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>Balance: {formatKSH(totals.balance)}</p>
                        </div>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                        </div>
                      ) : (
                        <>
                          {/* ✅ FIXED: Opens modal directly */}
                          <div className="flex justify-end mb-4">
                            <button 
                              onClick={() => handleAddTransaction(customer)} 
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              + Add Transaction
                            </button>
                          </div>
                          
                          {txs.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                                  <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Notes</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {txs.map(tx => {
                                    const isCredit = tx.transaction_type?.toLowerCase() === 'credit';
                                    return (
                                      <tr key={tx.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">{formatDate(tx.created_at || tx.transaction_date)}</td>
                                        <td className="px-4 py-3">
                                          <span className={`px-2 py-1 text-xs rounded-full ${isCredit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {tx.transaction_type}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{tx.notes || '-'}</td>
                                        <td className={`px-4 py-3 text-right font-semibold ${isCredit ? 'text-red-600' : 'text-green-600'}`}>
                                          {isCredit ? '+' : '-'}{formatKSH(tx.amount)}
                                        </td>
                                        <td className="px-4 py-3">
                                          <button onClick={() => handleDeleteTransaction(tx.id, customer.id)} className="text-red-600 hover:underline">Delete</button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-center text-gray-500 py-4">No transactions for this customer</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-500">No customers found</p>
              {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-2 text-blue-600 hover:underline">Clear search</button>}
            </div>
          )}
        </div>
      </main>

      {/* ✅ Transaction Modal */}
      <TransactionModal 
        isOpen={showTransactionModal} 
        onClose={() => { setShowTransactionModal(false); setSelectedCustomer(null); }} 
        customer={selectedCustomer}
        onSuccess={handleTransactionSuccess}
      />
    </div>
  );
}