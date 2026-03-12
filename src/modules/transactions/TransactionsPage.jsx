import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';  // ← ADDED

const TransactionsPage = () => {
  const { 
    customers, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction,
    calculateCustomerBalance 
  } = useData();

  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  const [newTransaction, setNewTransaction] = useState({
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Credit',
    amount: 0,
    paid: 0,
    notes: '',
  });

  const customersWithTotals = customers.map((customer) => {
    const totalCredit = customer.transactions
      .filter((t) => t.type === 'Credit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPaid = customer.transactions
      .filter((t) => t.type === 'Payment')
      .reduce((sum, t) => sum + (t.paid || 0), 0);
    const balance = totalCredit - totalPaid;

    return {
      ...customer,
      totalCredit,
      totalPaid,
      balance,
    };
  });

  const filteredCustomers = customersWithTotals.filter((customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);
    
    if (dateFilter) {
      const hasTransactionOnDate = customer.transactions.some(
        (t) => t.date === dateFilter
      );
      return matchesSearch && hasTransactionOnDate;
    }
    
    return matchesSearch;
  });

  const openAddTransaction = (customerId) => {
    setSelectedCustomerId(customerId);
    setNewTransaction({
      customerId: customerId.toString(),
      date: new Date().toISOString().split('T')[0],
      type: 'Credit',
      amount: 0,
      paid: 0,
      notes: '',
    });
    setEditingTransaction(null);
    setIsAddTransactionOpen(true);
  };

  const openEditTransaction = (customerId, transaction) => {
    setSelectedCustomerId(customerId);
    setNewTransaction({
      customerId: customerId.toString(),
      date: transaction.date,
      type: transaction.type,
      amount: transaction.amount || 0,
      paid: transaction.paid || 0,
      notes: transaction.notes || '',
    });
    setEditingTransaction(transaction);
    setIsAddTransactionOpen(true);
  };

  const closeModal = () => {
    setIsAddTransactionOpen(false);
    setSelectedCustomerId(null);
    setEditingTransaction(null);
    setNewTransaction({
      customerId: '',
      date: new Date().toISOString().split('T')[0],
      type: 'Credit',
      amount: 0,
      paid: 0,
      notes: '',
    });
  };

  // ✅ FIXED: handleSubmit with toasts
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTransaction.customerId) {
      toast.error('Please select a customer');  // ← CHANGED from alert
      return;
    }

    const transactionData = {
      date: newTransaction.date,
      type: newTransaction.type,
      amount: newTransaction.type === 'Credit' ? Number(newTransaction.amount) : 0,
      paid: newTransaction.type === 'Payment' ? Number(newTransaction.paid) : 0,
      notes: newTransaction.notes,
    };

    if (editingTransaction) {
      updateTransaction(
        Number(newTransaction.customerId),
        editingTransaction.id,
        transactionData
      );
      toast.success('Transaction updated successfully!');  // ← ADDED
    } else {
      addTransaction(Number(newTransaction.customerId), transactionData);
      toast.success('Transaction added successfully!');  // ← ADDED
    }

    closeModal();
  };

  // ✅ FIXED: handleDeleteTransaction with toast
  const handleDeleteTransaction = (customerId, transactionId) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(customerId, transactionId);
      toast.success('Transaction deleted');  // ← ADDED
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleViewStatement = (customer) => {
    sessionStorage.setItem('selectedCustomerId', customer.id.toString());
    window.location.href = '/reminders';
  };

  const grandTotals = customers.reduce(
    (acc, customer) => {
      customer.transactions.forEach((t) => {
        if (t.type === 'Credit') {
          acc.totalCredit += t.amount || 0;
        } else {
          acc.totalPaid += t.paid || 0;
        }
      });
      return acc;
    },
    { totalCredit: 0, totalPaid: 0 }
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Header with Back Button */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* ← BACK BUTTON TO DASHBOARD */}
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
            
            <div>
              <h1 className="text-xl font-bold text-gray-900">Credit Statements</h1>
              <p className="text-sm text-gray-500">View all transactions by customer</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
        
        {/* AI Assistant Button */}
        <Link
          to="/reminders"
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Ask AI Assistant
        </Link>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Grand Totals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-50 rounded-xl p-5 border border-red-100">
            <p className="text-xs font-medium text-red-600 uppercase">Total Credit</p>
            <p className="mt-1 text-2xl font-bold text-red-600">KSh {grandTotals.totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-5 border border-green-100">
            <p className="text-xs font-medium text-green-600 uppercase">Total Paid</p>
            <p className="mt-1 text-2xl font-bold text-green-600">KSh {grandTotals.totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
        </div>

        {/* Customer Cards */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 text-gray-500">No customers found</p>
              <Link to="/customers" className="mt-3 text-blue-600 font-medium hover:text-blue-700 inline-block">
                Add customers first →
              </Link>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Card Header */}
                <div 
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedCustomerId(expandedCustomerId === customer.id ? null : customer.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{customer.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{customer.transactions.length} transactions</p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 transition-transform">
                      <svg 
                        className={`h-5 w-5 transition-transform ${expandedCustomerId === customer.id ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Totals */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                      <p className="text-xs font-medium text-red-600 uppercase">Total Credit</p>
                      <p className="mt-1 text-xl font-bold text-red-600">KSh {customer.totalCredit.toFixed(2)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <p className="text-xs font-medium text-green-600 uppercase">Total Paid</p>
                      <p className="mt-1 text-xl font-bold text-green-600">KSh {customer.totalPaid.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Add Transaction Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddTransaction(customer.id);
                    }}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Transaction
                  </button>
                </div>

                {/* Expanded Transaction History */}
                {expandedCustomerId === customer.id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-5 animate-fadeIn">
                    <h4 className="font-semibold text-gray-700 mb-4">Transaction History</h4>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-xs uppercase text-gray-500 font-semibold">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3">Notes</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {customer.transactions.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
                                No transactions yet
                              </td>
                            </tr>
                          ) : (
                            customer.transactions.map((transaction) => (
                              <tr key={transaction.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">{formatDate(transaction.date)}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    transaction.type === 'Credit'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {transaction.type}
                                  </span>
                                </td>
                                <td className={`px-4 py-3 text-right font-medium ${
                                  transaction.type === 'Credit' ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  KSh {(transaction.type === 'Credit' ? transaction.amount : transaction.paid).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-gray-600">{transaction.notes || '-'}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => openEditTransaction(customer.id, transaction)}
                                      className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                      title="Edit"
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTransaction(customer.id, transaction.id)}
                                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                      title="Delete"
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* View Statement Button */}
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleViewStatement(customer)}
                        className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Statement
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </main>

      {/* Add/Edit Transaction Modal */}
      {isAddTransactionOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={closeModal} />

          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
                  </h2>
                </div>
                <button
                  onClick={closeModal}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                
                {/* Customer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newTransaction.customerId}
                    onChange={(e) => setNewTransaction({...newTransaction, customerId: e.target.value})}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    disabled={!!selectedCustomerId}
                    required
                  >
                    <option value="">Select customer...</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date and Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transaction Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={newTransaction.date}
                        onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                        className="w-full rounded-lg border border-gray-200 pl-3 pr-10 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                      <svg className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newTransaction.type}
                      onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="Credit">Credit</option>
                      <option value="Payment">Payment</option>
                    </select>
                  </div>
                </div>

                {/* Amount / Paid - MONEY (allow decimals) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newTransaction.type === 'Credit' ? 'Amount (KSh)' : 'Amount Paid (KSh)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"  // ← MONEY: allow decimals
                    min="0"
                    value={newTransaction.type === 'Credit' ? newTransaction.amount : newTransaction.paid}
                    onChange={(e) => {
                      if (newTransaction.type === 'Credit') {
                        setNewTransaction({...newTransaction, amount: e.target.value});
                      } else {
                        setNewTransaction({...newTransaction, paid: e.target.value});
                      }
                    }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTransaction.notes}
                    onChange={(e) => setNewTransaction({...newTransaction, notes: e.target.value})}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Add any notes..."
                  />
                </div>

              </form>

              {/* Modal Footer */}
              <div className="flex gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  {editingTransaction ? 'Update Transaction' : 'Save Transaction'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TransactionsPage;