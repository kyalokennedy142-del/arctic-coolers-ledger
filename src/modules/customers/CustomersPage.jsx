// src/modules/customers/CustomersPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabaseClient';
import { formatKSH, formatPhoneForWhatsApp, getInactivityBadge } from '../../utils/formatCurrency';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// Bottom Sheet Component (simple modal)
// ─────────────────────────────────────────────────────────────
const BottomSheet = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Customer Form Component
// ─────────────────────────────────────────────────────────────
const CustomerForm = ({ customer, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    payment_name: customer?.payment_name || '',
    contact: customer?.contact || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (customer) {
        const { error } = await supabase.from('customers').update(formData).eq('id', customer.id);
        if (error) throw error;
        toast.success('Customer updated!');
      } else {
        const { error } = await supabase.from('customers').insert([{
          name: formData.name,
          payment_name: formData.payment_name || formData.name,
          contact: formData.contact
        }]);
        if (error) throw error;
        toast.success('Customer added!');
      }
      onSuccess?.(formData);
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Customer name" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Name</label>
        <input type="text" value={formData.payment_name} onChange={(e) => setFormData({...formData, payment_name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name for payments" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
        <input type="text" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Phone or email" />
      </div>
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'Saving...' : customer ? 'Update' : 'Save'}</button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────
// Transaction Form Component
// ─────────────────────────────────────────────────────────────
const TransactionForm = ({ customerId, customerName, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    customer_id: customerId,
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
        customer_id: formData.customer_id,
        customer_name: customerName,
        transaction_date: formData.transaction_date,
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        notes: formData.notes
      }]);
      if (error) throw error;
      toast.success('Transaction added!');
      onSuccess?.();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {customerName && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <input type="text" value={customerName} disabled className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50" />
        </div>
      )}
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
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'Saving...' : 'Add Transaction'}</button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────
// Customer Card Component
// ─────────────────────────────────────────────────────────────
const CustomerCard = ({ customer, transactions, onEdit, onAddTransaction, onWhatsApp, onClick }) => {
  const customerTxs = transactions?.filter(t => t.customer_id === customer.id) || [];
  const lastTxDate = customerTxs.length > 0 
    ? Math.max(...customerTxs.map(t => new Date(t.created_at || t.transaction_date).getTime()))
    : null;
  const badge = getInactivityBadge(lastTxDate ? new Date(lastTxDate).toISOString() : null);
  
  const totalCredit = customerTxs.filter(t => t.transaction_type?.toLowerCase() === 'credit').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalPaid = customerTxs.filter(t => ['payment', 'paid'].includes(t.transaction_type?.toLowerCase())).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const balance = totalCredit - totalPaid;

  const badgeColors = { green: 'bg-green-100 text-green-800', yellow: 'bg-yellow-100 text-yellow-800', red: 'bg-red-100 text-red-800' };

  return (
    <div onClick={onClick} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{customer.name}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[badge.color]}`}>{badge.label}</span>
          </div>
          {customer.payment_name && customer.payment_name !== customer.name && <p className="text-xs text-gray-500 mt-0.5">Pay as: {customer.payment_name}</p>}
          <div className="mt-2 space-y-1 text-sm">
            {customer.contact && <p className="text-gray-600">📱 {customer.contact}</p>}
            <div className="flex gap-4">
              <p className="text-red-600 font-medium">Credit: {formatKSH(totalCredit)}</p>
              <p className="text-green-600 font-medium">Paid: {formatKSH(totalPaid)}</p>
            </div>
            {balance > 0 && <p className="text-red-700 font-semibold">Balance: {formatKSH(balance)}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={(e) => { e.stopPropagation(); onWhatsApp(); }} disabled={!customer.contact} className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">💬 WhatsApp</button>
          <button onClick={(e) => { e.stopPropagation(); onAddTransaction(customer); }} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">+ Transaction</button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(customer); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200">✏️ Edit</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Group Header Component
// ─────────────────────────────────────────────────────────────
const GroupHeader = ({ label, color, count, customers, onCopyList }) => {
  const handleCopy = () => {
    const list = customers.map(c => `${c.name} - ${c.contact || 'No phone'}`).join('\n');
    navigator.clipboard.writeText(list).then(() => toast.success(`Copied ${count} customer(s)`));
  };
  const colorClasses = { green: 'bg-green-50 border-green-200 text-green-800', yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800', red: 'bg-red-50 border-red-200 text-red-800' };
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full bg-${color}-500`}></span>
        <h3 className="font-semibold">{label}</h3>
        <span className="text-sm opacity-75">({count})</span>
      </div>
      <button onClick={handleCopy} disabled={count === 0} className="px-3 py-1.5 bg-white text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50">📋 Copy List</button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Customers Page Component
// ─────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const { customers, transactions, loading, error, refresh } = useData();  // ✅ Use DataContext
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [badgeFilter, setBadgeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomerForTx, setSelectedCustomerForTx] = useState(null);

  // Process customers with transaction data
  const customersWithDetails = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    return customers.map(customer => {
      const customerTxs = (transactions || []).filter(t => t.customer_id === customer.id);
      const lastTxDate = customerTxs.length > 0 
        ? Math.max(...customerTxs.map(t => new Date(t.created_at || t.transaction_date).getTime()))
        : null;
      const badge = getInactivityBadge(lastTxDate ? new Date(lastTxDate).toISOString() : null);
      const totalCredit = customerTxs.filter(t => t.transaction_type?.toLowerCase() === 'credit').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const totalPaid = customerTxs.filter(t => ['payment', 'paid'].includes(t.transaction_type?.toLowerCase())).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      return { ...customer, badge, totalCredit, totalPaid, balance: totalCredit - totalPaid, lastTransaction: lastTxDate ? new Date(lastTxDate).toISOString() : null };
    });
  }, [customers, transactions]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    let result = [...customersWithDetails];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => c.name?.toLowerCase().includes(term) || c.contact?.includes(term) || c.payment_name?.toLowerCase().includes(term));
    }
    if (badgeFilter !== 'all') {
      const badgeMap = { active: 'green', 'at-risk': 'yellow', inactive: 'red' };
      result = result.filter(c => c.badge.color === badgeMap[badgeFilter]);
    }
    result.sort((a, b) => a.name?.localeCompare(b.name));
    return result;
  }, [customersWithDetails, searchTerm, badgeFilter]);

  // Group by badge
  const groupedCustomers = useMemo(() => {
    const groups = { active: [], 'at-risk': [], inactive: [] };
    filteredCustomers.forEach(c => {
      if (c.badge.color === 'green') groups.active.push(c);
      else if (c.badge.color === 'yellow') groups['at-risk'].push(c);
      else groups.inactive.push(c);
    });
    return groups;
  }, [filteredCustomers]);

  // Handlers
  const handleAddCustomer = (newCustomer) => {
    setShowCustomerForm(false);
    setSelectedCustomerForTx(newCustomer);
    setShowTransactionForm(true);
    refresh();
  };

  const handleAddTransaction = async () => {
    setShowTransactionForm(false);
    setSelectedCustomerForTx(null);
    refresh();
  };

  const handleWhatsApp = (contact) => {
    if (!contact) { toast.error('No phone number'); return; }
    const message = `Hello,\n\nOutstanding Balance: ${formatKSH(0)}\n\nPaybill: 247247\nAccount: ${contact.replace(/\D/g, '')}\n\nThank you!`;
    const phone = formatPhoneForWhatsApp(contact);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Loading/Error states
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-red-600 mb-2">⚠️ {error}</p><button onClick={refresh} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button></div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
              <div><h1 className="text-xl font-bold text-gray-900">Customers</h1><p className="text-sm text-gray-500">Manage your customer list</p></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Add Customer Button */}
        <button onClick={() => setShowCustomerForm(true)} className="w-full mb-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg">+ Add Customer</button>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 space-y-4">
          <input type="text" placeholder="Search by name, phone, or payment name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <div className="flex flex-wrap gap-2">
            {['all', 'active', 'at-risk', 'inactive'].map(badge => {
              const labels = { all: 'All', active: '🟢 Active', 'at-risk': '🟡 At Risk', inactive: '🔴 Inactive' };
              return (<button key={badge} onClick={() => setBadgeFilter(badge)} className={`px-3 py-1.5 text-sm font-medium rounded-lg ${badgeFilter === badge ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{labels[badge]}</button>);
            })}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Filter by date:</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            {dateFilter && <button onClick={() => setDateFilter('')} className="text-sm text-blue-600 hover:underline">Clear</button>}
          </div>
        </div>

        {/* Customer Groups */}
        <div className="space-y-6">
          {['active', 'at-risk', 'inactive'].map(group => {
            const label = { active: 'Active', 'at-risk': 'At Risk', inactive: 'Inactive' }[group];
            const color = { active: 'green', 'at-risk': 'yellow', inactive: 'red' }[group];
            const groupCustomers = groupedCustomers[group];
            if (groupCustomers.length === 0) return null;
            return (
              <div key={group}>
                <GroupHeader label={label} color={color} count={groupCustomers.length} customers={groupCustomers} />
                <div className="mt-3 space-y-3">
                  {groupCustomers.map(customer => (
                    <CustomerCard key={customer.id} customer={customer} transactions={transactions} onEdit={(c) => { setEditingCustomer(c); setShowCustomerForm(true); }} onAddTransaction={(c) => { setSelectedCustomerForTx(c); setShowTransactionForm(true); }} onWhatsApp={() => handleWhatsApp(customer.contact)} onClick={() => navigate(`/credit-statements?customer=${encodeURIComponent(customer.name)}`)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-500">No customers found</p>
            {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-2 text-blue-600 hover:underline">Clear search</button>}
          </div>
        )}
      </main>

      {/* Modals */}
      <BottomSheet isOpen={showCustomerForm} onClose={() => { setShowCustomerForm(false); setEditingCustomer(null); }} title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}>
        <CustomerForm customer={editingCustomer} onSuccess={handleAddCustomer} onCancel={() => { setShowCustomerForm(false); setEditingCustomer(null); }} />
      </BottomSheet>
      <BottomSheet isOpen={showTransactionForm} onClose={() => { setShowTransactionForm(false); setSelectedCustomerForTx(null); }} title={`Add Transaction - ${selectedCustomerForTx?.name || ''}`}>
        <TransactionForm customerId={selectedCustomerForTx?.id} customerName={selectedCustomerForTx?.name} onSuccess={handleAddTransaction} onCancel={() => { setShowTransactionForm(false); setSelectedCustomerForTx(null); }} />
      </BottomSheet>
    </div>
  )};