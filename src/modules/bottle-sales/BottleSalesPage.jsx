// src/modules/bottle-sales/BottleSalesPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabaseClient';
import { formatKSH } from '../../utils/formatCurrency';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// Bottom Sheet Component
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
// Add/Edit Sale Form
// ─────────────────────────────────────────────────────────────
const SaleForm = ({ sale, customers, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    customer_id: sale?.customer_id || '',
    customer_name: sale?.customer_name || '',
    date: sale?.date || new Date().toISOString().split('T')[0],
    category: sale?.category || 'Branded',
    bottle_brand: sale?.bottle_brand || '',
    size: sale?.size || '500ml',
    quantity: sale?.quantity || '',
    amount: sale?.amount || '',
    notes: sale?.notes || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const customer = customers?.find(c => c.id === formData.customer_id);
      const data = {
        ...formData,
        customer_name: customer?.name || formData.customer_name,
        quantity: parseInt(formData.quantity) || 0,
        amount: parseFloat(formData.amount) || 0
      };

      if (sale) {
        const { error } = await supabase.from('bottle_sales').update(data).eq('id', sale.id);
        if (error) throw error;
        toast.success('Sale updated!');
      } else {
        const { error } = await supabase.from('bottle_sales').insert([data]);
        if (error) throw error;
        toast.success('Sale added!');
      }
      onSuccess?.();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const bottleBrands = ['Black Antik', 'Asante', 'Kachra', 'Banana', 'Posh', 'Exo', 'Acacia'];
  const sizes = ['500ml', '1 Litre'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Customer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
        <select
          value={formData.customer_id}
          onChange={(e) => {
            const customer = customers?.find(c => c.id === e.target.value);
            setFormData({...formData, customer_id: e.target.value, customer_name: customer?.name || ''});
          }}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Select customer (optional)</option>
          {customers?.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
        <input
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({...formData, date: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value, bottle_brand: e.target.value === 'Branded' ? formData.bottle_brand : ''})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="Branded">Branded</option>
          <option value="Unbranded">Unbranded</option>
        </select>
      </div>

      {/* Bottle Brand (only for Branded) */}
      {formData.category === 'Branded' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bottle Brand</label>
          <select
            value={formData.bottle_brand}
            onChange={(e) => setFormData({...formData, bottle_brand: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select brand</option>
            {bottleBrands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      )}

      {/* Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Size *</label>
        <select
          value={formData.size}
          onChange={(e) => setFormData({...formData, size: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {sizes.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Quantity & Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
          <input
            type="number"
            required
            min="0"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KSh) *</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          rows={3}
          placeholder="Optional notes..."
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'Saving...' : sale ? 'Update Sale' : 'Save Sale'}</button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────
// Sale Card Component
// ─────────────────────────────────────────────────────────────
const SaleCard = ({ sale, onEdit, onDelete }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-semibold text-gray-900">{sale.size}</span>
            {sale.category === 'Branded' && sale.bottle_brand && (
              <>
                <span className="text-gray-400">—</span>
                <span className="font-medium text-gray-700">{sale.bottle_brand}</span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">Branded</span>
              </>
            )}
            {sale.category === 'Unbranded' && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Unbranded</span>
            )}
          </div>
          
          {sale.customer_name && (
            <p className="text-sm text-gray-600 mb-1">👤 {sale.customer_name}</p>
          )}
          
          <p className="text-sm text-gray-500 mb-1">{formatDate(sale.date)}</p>
          
          {sale.notes && (
            <p className="text-sm text-gray-400 italic">"{sale.notes}"</p>
          )}
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-500 mb-1">Qty: {sale.quantity}</p>
          <p className="text-lg font-bold text-emerald-600 mb-3">{formatKSH(sale.amount)}</p>
          <div className="flex gap-2">
            <button onClick={() => onEdit(sale)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">✏️</button>
            <button onClick={() => onDelete(sale.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Bottle Sales Page Component
// ─────────────────────────────────────────────────────────────
export default function BottleSalesPage() {
  const navigate = useNavigate();
  const { customers, loading: dataLoading, error: dataError, refresh } = useData();
  
  const [bottleSales, setBottleSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState(null);

  // Fetch bottle sales
  const fetchBottleSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bottle_sales')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setBottleSales(data || []);
    } catch (err) {
      toast.error('Failed to load sales: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBottleSales();
  }, []);

  // Filter sales
  const filteredSales = useMemo(() => {
    let result = [...bottleSales];
    
    if (dateFilter) {
      result = result.filter(s => s.date === dateFilter);
    }
    
    if (categoryFilter !== 'all') {
      result = result.filter(s => s.category === categoryFilter);
    }
    
    return result;
  }, [bottleSales, dateFilter, categoryFilter]);

  // Calculate summaries
  const summaries = useMemo(() => {
    const totalBottles = filteredSales.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
    const totalAmount = filteredSales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    return { totalBottles, totalAmount };
  }, [filteredSales]);

  // Handlers
  const handleAddSale = () => {
    setEditingSale(null);
    setShowForm(true);
  };

  const handleEditSale = (sale) => {
    setEditingSale(sale);
    setShowForm(true);
  };

  const handleDeleteSale = async (saleId) => {
    if (!confirm('Delete this sale?')) return;
    try {
      const { error } = await supabase.from('bottle_sales').delete().eq('id', saleId);
      if (error) throw error;
      toast.success('Sale deleted');
      fetchBottleSales();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSale(null);
    fetchBottleSales();
  };

  // Loading/Error states
  if (loading || dataLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>
  );

  if (dataError) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow">
        <p className="text-red-600 font-medium mb-2">⚠️ {dataError}</p>
        <button onClick={refresh} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 md:px-6 py-4 sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-white/20 rounded-lg">←</button>
            <div>
              <h1 className="text-xl font-bold">Bottle Sales</h1>
              <p className="text-sm opacity-90">Track bottles given to customers</p>
            </div>
          </div>
          <button onClick={handleAddSale} className="px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 font-medium">+ Add Sale</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {dateFilter && (
                <button onClick={() => setDateFilter('')} className="px-3 py-2 text-sm text-red-600 hover:underline">Clear Date</button>
              )}
            </div>
            <div className="flex gap-2">
              {['all', 'Branded', 'Unbranded'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    categoryFilter === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-600 font-medium">Total Bottles</p>
            <p className="text-3xl font-bold text-blue-700">{summaries.totalBottles}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-600 font-medium">Total Amount</p>
            <p className="text-3xl font-bold text-emerald-700">{formatKSH(summaries.totalAmount)}</p>
          </div>
        </div>

        {/* Sales List */}
        <div className="space-y-3">
          {filteredSales.length > 0 ? (
            filteredSales.map(sale => (
              <SaleCard
                key={sale.id}
                sale={sale}
                onEdit={handleEditSale}
                onDelete={handleDeleteSale}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-500">No sales recorded yet</p>
              <button onClick={handleAddSale} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add First Sale</button>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Form */}
      <BottomSheet
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingSale(null); }}
        title={editingSale ? 'Edit Sale' : 'Add Bottle Sale'}
      >
        <SaleForm
          sale={editingSale}
          customers={customers}
          onSuccess={handleFormSuccess}
          onCancel={() => { setShowForm(false); setEditingSale(null); }}
        />
      </BottomSheet>
    </div>
  );
}