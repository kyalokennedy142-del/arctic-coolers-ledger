/* eslint-disable no-unused-vars */
// src/modules/credit-statements/CreditStatementsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import toast from 'react-hot-toast';
import { formatKSH } from '../../lib/formatCurrency'; // ✅ Use shared utility

const CreditStatementsPage = () => {
  const { customers, addTransaction, deleteTransaction, updateTransaction } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false); // ✅ Edit modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null); // ✅ Edit transaction state
  
  const [transactionForm, setTransactionForm] = useState({
    type: 'credit',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // ✅ URL Param: Auto-expand customer if ?customer=Name in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const customerName = params.get('customer');
    
    if (customerName && customers?.length > 0) {
      const matched = customers.find(c => 
        c.name?.toLowerCase().includes(customerName.toLowerCase())
      );
      if (matched) {
        setExpandedCustomer(matched.id);
        // Clean URL without refreshing
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [customers, location.search]);

  // Process all customers with their transactions
  const processedCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    
    return customers.map(customer => {
      const transactions = (customer.transactions || [])
        .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
      
      const totalCredit = transactions
        .filter(t => t.transaction_type?.toLowerCase() === 'credit')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      const totalPaid = transactions
        .filter(t => ['payment', 'paid'].includes(t.transaction_type?.toLowerCase()))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      return {
        ...customer,
        transactions,
        totalCredit,
        totalPaid,
        balance: totalCredit - totalPaid
      };
    });
  }, [customers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    let filtered = processedCustomers;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term)
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(c => 
        c.transactions.some(t => {
          const tDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
          return tDate === dateFilter;
        })
      );
    }

    return filtered;
  }, [processedCustomers, searchTerm, dateFilter]);

  // Toggle expand customer
  const toggleExpand = (customerId) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  // Open add transaction modal
  const openAddModal = (customer) => {
    setSelectedCustomer(customer);
    setEditingTransaction(null);
    setTransactionForm({
      type: 'credit',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowAddModal(true);
  };

  // ✅ Open edit transaction modal
  const openEditModal = (customer, transaction) => {
    setSelectedCustomer(customer);
    setEditingTransaction(transaction);
    setTransactionForm({
      type: transaction.transaction_type || 'credit',
      amount: transaction.amount?.toString() || '',
      date: transaction.date?.split('T')[0] || transaction.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      notes: transaction.description || transaction.notes || ''
    });
    setShowEditModal(true);
  };

  // Handle add transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer || !transactionForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newTransaction = {
      customer_id: selectedCustomer.id,
      transaction_type: transactionForm.type,
      amount: parseFloat(transactionForm.amount),
      description: transactionForm.notes?.trim() || `${transactionForm.type} transaction`,
      date: transactionForm.date,
      created_at: new Date().toISOString()
    };

    try {
      addTransaction(selectedCustomer.id, newTransaction);
      toast.success('Transaction added successfully!');
      setShowAddModal(false);
      
      if (transactionForm.type === 'credit') {
        toast.success('Customer flagged for AI reminders!');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    }
  };

  // ✅ Handle update transaction
  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer || !editingTransaction || !transactionForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedTransaction = {
      ...editingTransaction,
      transaction_type: transactionForm.type,
      amount: parseFloat(transactionForm.amount),
      description: transactionForm.notes?.trim() || `${transactionForm.type} transaction`,
      date: transactionForm.date,
      updated_at: new Date().toISOString()
    };

    try {
      updateTransaction(selectedCustomer.id, editingTransaction.id, updatedTransaction);
      toast.success('Transaction updated successfully!');
      setShowEditModal(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  // Handle delete transaction
  const handleDeleteTransaction = (customerId, transactionId) => {
    if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      try {
        deleteTransaction(customerId, transactionId);
        toast.success('Transaction deleted successfully');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete transaction');
      }
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Navigate to AI reminders
  const openAIReminders = () => {
    navigate('/reminders');
  };

  // Close modals
  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedCustomer(null);
    setTransactionForm({ type: 'credit', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTransaction(null);
    setSelectedCustomer(null);
    setTransactionForm({ type: 'credit', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  // Loading state
  if (!customers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Back to dashboard"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Credit Statements</h1>
              <p className="text-sm text-gray-500">View all transactions by customer</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Assistant Button */}
        <div className="mb-6">
          <button
            onClick={openAIReminders}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Ask AI Assistant
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by customer name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Customer Cards */}
        <div className="space-y-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{customer.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {customer.transactions?.length || 0} transaction(s)
                      {customer.phone && <span className="ml-2">• 📞 {customer.phone}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleExpand(customer.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    aria-label={expandedCustomer === customer.id ? 'Collapse' : 'Expand'}
                  >
                    <svg 
                      className={`w-5 h-5 text-gray-500 transform transition-transform duration-200 ${expandedCustomer === customer.id ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Total Credit and Paid Summary */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Total Credit</p>
                    <p className="text-xl font-bold text-red-700 mt-1">{formatKSH(customer.totalCredit)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Total Paid</p>
                    <p className="text-xl font-bold text-green-700 mt-1">{formatKSH(customer.totalPaid)}</p>
                  </div>
                </div>

                {/* Balance Badge */}
                {customer.balance !== 0 && (
                  <div className={`mb-4 px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${
                    customer.balance > 0 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    <span>{customer.balance > 0 ? '⚠️ Outstanding' : '✅ Settled'}</span>
                    <span className="font-bold">{formatKSH(Math.abs(customer.balance))}</span>
                  </div>
                )}

                {/* Add Transaction Button */}
                <button
                  onClick={() => openAddModal(customer)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Transaction
                </button>
              </div>

              {/* Expanded Transaction List */}
              {expandedCustomer === customer.id && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-4">
                    {customer.transactions?.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No transactions yet</p>
                    ) : (
                      <div className="space-y-2">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          <div className="col-span-3">Date</div>
                          <div className="col-span-2">Credit</div>
                          <div className="col-span-2">Payment</div>
                          <div className="col-span-3">Notes</div>
                          <div className="col-span-2 text-right">Actions</div>
                        </div>

                        {/* Transactions */}
                        {customer.transactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="grid grid-cols-12 gap-4 px-4 py-3 bg-white rounded-lg border border-gray-200 items-start"
                          >
                            {/* Date */}
                            <div className="col-span-3 flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                transaction.transaction_type?.toLowerCase() === 'credit' 
                                  ? 'bg-red-100 text-red-600' 
                                  : 'bg-green-100 text-green-600'
                              }`}>
                                {transaction.transaction_type?.toLowerCase() === 'credit' ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-sm text-gray-700">{formatDate(transaction.created_at || transaction.date)}</span>
                            </div>
                            
                            {/* Credit Amount */}
                            <div className="col-span-2 text-sm">
                              {transaction.transaction_type?.toLowerCase() === 'credit' ? (
                                <span className="font-semibold text-red-600">{formatKSH(transaction.amount)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                            
                            {/* Payment Amount */}
                            <div className="col-span-2 text-sm">
                              {['payment', 'paid'].includes(transaction.transaction_type?.toLowerCase()) ? (
                                <span className="font-semibold text-green-600">{formatKSH(transaction.amount)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                            
                            {/* Notes - ✅ NOW DISPLAYED */}
                            <div className="col-span-3 text-sm text-gray-600 truncate" title={transaction.description || transaction.notes || ''}>
                              {transaction.description || transaction.notes || '-'}
                            </div>
                            
                            {/* Actions */}
                            <div className="col-span-2 flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(customer, transaction)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit transaction"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(customer.id, transaction.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete transaction"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg font-medium">No customers found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
            {(searchTerm || dateFilter) && (
              <button
                onClick={() => { setSearchTerm(''); setDateFilter(''); }}
                className="mt-4 text-blue-600 font-medium hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ✅ Add Transaction Modal */}
      {showAddModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <h2 className="text-xl font-bold text-gray-900">Add Transaction</h2>
              </div>
              <button
                onClick={closeAddModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="p-6 space-y-5">
              {/* Customer (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <input
                  type="text"
                  value={selectedCustomer.name}
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                />
              </div>

              {/* Date and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="credit">➕ Credit</option>
                    <option value="payment">💰 Payment</option>
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (KSh) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  placeholder="Add description or reference..."
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Edit Transaction Modal */}
      {showEditModal && selectedCustomer && editingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <h2 className="text-xl font-bold text-gray-900">Edit Transaction</h2>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateTransaction} className="p-6 space-y-5">
              {/* Customer (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <input
                  type="text"
                  value={selectedCustomer.name}
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                />
              </div>

              {/* Date and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="credit">➕ Credit</option>
                    <option value="payment">💰 Payment</option>
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (KSh) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                  autoFocus
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  placeholder="Add description or reference..."
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Update Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditStatementsPage;