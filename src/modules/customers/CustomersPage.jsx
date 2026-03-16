/* eslint-disable no-unused-vars */
// src/modules/customers/CustomersPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '../../Context/DataContext';
import toast from 'react-hot-toast';
import { formatKSH, calculateInactivityStatus, formatDate } from '../../lib/formatCurrency';

const CustomersPage = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, addTransaction } = useData();
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [newCustomerForTx, setNewCustomerForTx] = useState(null); // ✅ Prompt for first transaction
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    payment_name: '', // ✅ Added payment_name field
    location: '',
    email: ''
  });
  
  const [transactionForm, setTransactionForm] = useState({
    type: 'credit',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // ✅ Date filter for totals

  // ✅ Auto-open transaction modal after adding new customer
  useEffect(() => {
    if (newCustomerForTx) {
      setIsTransactionModalOpen(true);
    }
  }, [newCustomerForTx]);

  // ✅ Calculate inactivity status for a customer
  const getInactivityStatus = (customer) => {
    const transactions = customer.transactions || [];
    if (transactions.length === 0) {
      return { status: 'Inactive', badge: '🔴', color: 'bg-red-100 text-red-700' };
    }
    
    const lastTx = transactions
      .filter(t => t.created_at || t.date)
      .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))[0];
    
    if (!lastTx) {
      return { status: 'Inactive', badge: '🔴', color: 'bg-red-100 text-red-700' };
    }
    
    return calculateInactivityStatus(lastTx.created_at || lastTx.date);
  };

  // ✅ Calculate totals WITH date filter support
  const calculateCustomerTotals = (customer, filterDate = null) => {
    const transactions = customer.transactions || [];
    const filtered = filterDate 
      ? transactions.filter(t => {
          const tDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
          return tDate === filterDate;
        })
      : transactions;
    
    const totalCredit = filtered
      .filter(t => t.transaction_type?.toLowerCase() === 'credit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    const totalPaid = filtered
      .filter(t => ['payment', 'paid'].includes(t.transaction_type?.toLowerCase()))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    return { totalCredit, totalPaid, balance: totalCredit - totalPaid };
  };

  // Open modal for adding new customer
  const openAddModal = () => {
    setEditingCustomer(null);
    setNewCustomerForTx(null);
    setFormData({ name: '', phone: '', payment_name: '', location: '', email: '' });
    setIsModalOpen(true);
  };

  // Open modal for editing existing customer
  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      payment_name: customer.payment_name || '',
      location: customer.location || '',
      email: customer.email || ''
    });
    setIsModalOpen(true);
  };

  // Close customer modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', payment_name: '', location: '', email: '' });
  };

  // ✅ Open transaction modal for a customer
  const openTransactionModal = (customer) => {
    setNewCustomerForTx(null);
    setTransactionForm({
      type: 'credit',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setSelectedCustomerForTx(customer);
    setIsTransactionModalOpen(true);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

// ✅ FIXED: Normalize phone before saving
const handleSubmit = (e) => {
  e.preventDefault();
  if (!formData.name?.trim() || !formData.phone?.trim()) {
    toast.error('Name and Phone are required');
    return;
  }

  // ✅ Normalize phone to 07XX format for storage
  let normalizedPhone = formData.phone.trim().replace(/\D/g, '');
  if (normalizedPhone.startsWith('254') && normalizedPhone.length === 12) {
    normalizedPhone = '0' + normalizedPhone.slice(3); // Convert to 07XX
  } else if (normalizedPhone.length === 9 && normalizedPhone.startsWith('7')) {
    normalizedPhone = '0' + normalizedPhone; // Add leading 0
  }

  const customerData = {
    name: formData.name.trim(),
    phone: normalizedPhone, // ✅ Save as 07XX
    payment_name: formData.payment_name?.trim() || formData.name.trim(),
    location: formData.location?.trim() || '',
    email: formData.email?.trim() || ''
  };

  try {
    if (editingCustomer) {
      updateCustomer({ ...editingCustomer, ...customerData });
      toast.success('Customer updated successfully!');
    } else {
      const newCustomer = addCustomer(customerData);
      toast.success('Customer added successfully!');
      setNewCustomerForTx(newCustomer);
    }
    closeModal();
  } catch (error) {
    console.error('Customer error:', error);
    toast.error('Failed to save customer');
  }
};  // ✅ Handle add transaction (for new customer prompt or regular)
  const [selectedCustomerForTx, setSelectedCustomerForTx] = useState(null);
  
  const handleAddTransaction = (e) => {
    e.preventDefault();
    const customer = selectedCustomerForTx || newCustomerForTx;
    
    if (!customer || !transactionForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newTx = {
      customer_id: customer.id,
      transaction_type: transactionForm.type,
      amount: parseFloat(transactionForm.amount),
      description: transactionForm.notes?.trim() || `${transactionForm.type} transaction`,
      date: transactionForm.date,
      created_at: new Date().toISOString()
    };

    try {
      addTransaction(customer.id, newTx);
      toast.success('Transaction added successfully!');
      setIsTransactionModalOpen(false);
      setNewCustomerForTx(null);
      setSelectedCustomerForTx(null);
      setTransactionForm({ type: 'credit', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error('Failed to add transaction');
    }
  };

  // ✅ Handle delete with toast
  const handleDelete = (customerId) => {
    if (window.confirm('Delete this customer? All transactions will be permanently deleted.')) {
      try {
        deleteCustomer(customerId);
        toast.success('Customer deleted successfully');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete customer');
      }
    }
  };

  // ✅ Filter customers with search
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    
    let filtered = [...customers];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.location?.toLowerCase().includes(term) ||
        c.payment_name?.toLowerCase().includes(term)
      );
    }
    
    // Sort A-Z by name
    return filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [customers, searchTerm]);

  // ✅ Safe stats calculations with date filter
  const stats = useMemo(() => {
    if (!Array.isArray(customers)) return { total: 0, owing: 0, paid: 0 };
    
    let totalCredit = 0;
    let totalPaid = 0;
    let owingCount = 0;
    
    customers.forEach(c => {
      const { totalCredit: cCredit, totalPaid: cPaid, balance } = calculateCustomerTotals(c, dateFilter || null);
      totalCredit += cCredit;
      totalPaid += cPaid;
      if (balance > 0) owingCount++;
    });
    
    return {
      total: customers.length,
      owing: owingCount,
      paid: customers.length - owingCount,
      grandCredit: totalCredit,
      grandPaid: totalPaid,
      grandBalance: totalCredit - totalPaid
    };
  }, [customers, dateFilter]);

  // Close transaction modal
  const closeTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setNewCustomerForTx(null);
    setSelectedCustomerForTx(null);
    setTransactionForm({ type: 'credit', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  };


  // Loading state
  if (!customers) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
  <label className="block text-sm font-medium text-slate-700 mb-1">
    Phone Number <span className="text-red-500">*</span>
  </label>
  <input
    type="tel"
    name="phone"
    value={formData.phone}
    onChange={handleChange}
    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
    placeholder="0712345678"
    required
  />
  {/* ✅ Helper text */}
  <p className="text-xs text-slate-400 mt-1">
    Format: 07XX XXX XXX or +254 7XX XXX XXX
  </p>
</div>
        
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-900">Customers</h1>
              <p className="text-slate-500 text-sm">Manage your water delivery customer list</p>
            </div>
          </div>
          
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </button>
        </header>

        {/* Search & Date Filter */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">Total Customers</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">With Balance</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{stats.owing}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">Credit {dateFilter ? `( ${formatDate(dateFilter)} )` : '(All-time)'}</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{formatKSH(stats.grandCredit)}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">Paid {dateFilter ? `( ${formatDate(dateFilter)} )` : '(All-time)'}</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{formatKSH(stats.grandPaid)}</p>
          </div>
        </div>

        {/* Customer Cards */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm ring-1 ring-slate-200">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="mt-4 text-slate-500">No customers found</p>
              {(searchTerm || dateFilter) && (
                <button
                  onClick={() => { setSearchTerm(''); setDateFilter(''); }}
                  className="mt-2 text-blue-600 font-medium hover:text-blue-700"
                >
                  Clear filters
                </button>
              )}
              <button
                onClick={openAddModal}
                className="mt-4 text-blue-600 font-semibold hover:text-blue-700"
              >
                Add your first customer →
              </button>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const { totalCredit, totalPaid, balance } = calculateCustomerTotals(customer, dateFilter || null);
              const inactivity = getInactivityStatus(customer);
              
              return (
                <div
                  key={customer.id}
                  className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-lg">
                          {(customer.name?.charAt(0) || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{customer.name}</h3>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            {/* ✅ Inactivity Badge */}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${inactivity.color}`}>
                              {inactivity.badge} {inactivity.status}
                              {inactivity.days !== null && <span className="text-slate-400">({inactivity.days}d)</span>}
                            </span>
                            {/* Payment Name */}
                            {customer.payment_name && customer.payment_name !== customer.name && (
                              <span className="text-xs text-slate-500">Pay as: {customer.payment_name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Contact Details */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="truncate">{customer.phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{customer.location || 'No location'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Totals & Actions */}
                    <div className="flex flex-col items-end gap-3">
                      {/* Credit/Paid Summary */}
                      <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                        <div className="bg-red-50 rounded-lg p-3 text-center min-w-24">
                          <p className="text-xs font-medium text-red-600">Credit</p>
                          <p className="text-lg font-bold text-red-700">{formatKSH(totalCredit)}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center min-w-24">
                          <p className="text-xs font-medium text-green-600">Paid</p>
                          <p className="text-lg font-bold text-green-700">{formatKSH(totalPaid)}</p>
                        </div>
                      </div>
                      
                      {/* Balance Badge */}
                      {balance !== 0 && (
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          balance > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {balance > 0 ? '⚠️ Owes' : '✅ Overpaid'} {formatKSH(Math.abs(balance))}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openTransactionModal(customer)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Transaction
                        </button>
                        <button
                          onClick={() => openEditModal(customer)}
                          className="p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                          title="Edit customer"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                          title="Delete customer"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ✅ Add/Edit Customer Modal (Slide-up Sheet Style) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl bg-white p-6 shadow-xl animate-slide-up">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                {editingCustomer ? '✏️ Edit Customer' : '➕ Add Customer'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g., John Kamau"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Name (Optional)
                </label>
                <input
                  type="text"
                  name="payment_name"
                  value={formData.payment_name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Name for M-Pesa payments"
                />
                <p className="text-xs text-slate-400 mt-1">If different from customer name</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="0712345678"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g., Westlands"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="customer@email.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  {editingCustomer ? '💾 Update' : '✅ Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Add Transaction Modal (For new customer prompt or manual) */}
      {isTransactionModalOpen && (selectedCustomerForTx || newCustomerForTx) && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl bg-white p-6 shadow-xl animate-slide-up">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                {newCustomerForTx ? '🎉 Add First Transaction' : '➕ Add Transaction'}
              </h2>
              <button
                onClick={closeTransactionModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Customer Display */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800 font-medium">
                For: {(selectedCustomerForTx || newCustomerForTx)?.name}
              </p>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                  >
                    <option value="credit">➕ Credit (They owe)</option>
                    <option value="payment">💰 Payment (They paid)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount (KSh) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  placeholder="e.g., 10 x 20L bottles delivered"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                {newCustomerForTx && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustomerForTx(null);
                      setIsTransactionModalOpen(false);
                      toast.info('You can add transactions later from the customer card');
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800"
                  >
                    Skip for now
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeTransactionModal}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  💾 Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CustomersPage;