 
// src/modules/purchases/PurchasesPage.jsx
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../Context/DataContext'; // ✅ FIXED: lowercase 'context'
import toast from 'react-hot-toast';
import { formatKSH } from '../../lib/formatCurrency'; // ✅ Use shared utility

// ✅ Full product list per requirements
const PRODUCT_TYPES = [
  '300ml',
  '500ml Clear',
  '500ml Blue',
  '500ml Labels',
  '1 Litre Blue',
  '1 Litre Labels',
  '5 Litre',
  '10 Litre',
  '20L Disposable',
  '20L Hard',
  'Security Seals',
  'Top Seals',
  'Caps',
  'Shrink Wraps',
  'Tumblers'
];

// ✅ Company options (combo input)
const COMPANY_OPTIONS = [
  'Safepak',
  'Five Star',
  'Newton Printing',
  'Reliable Packers',
  'Random',
  'Random seller',
  'Other'
];

// ✅ Agent options (combo input)
const AGENT_OPTIONS = [
  'Kennedy',
  'James',
  'Mary',
  'Peter',
  'Sarah',
  'Other'
];

const PurchasesPage = () => {
  const { purchases, addPurchase, updatePurchase, deletePurchase } = useData();
  
  const [showForm, setShowForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  
  // ✅ Form state with ALL required fields (snake_case for Supabase)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    purchasing_agent: '',  // ✅ Added Agent field
    company_name: '',
    transport_cost: 0      // ✅ Added Transport cost
  });

  // ✅ Row state with snake_case fields
  const [rows, setRows] = useState([
    { id: 1, product_type: '300ml', quantity: 0, amount: 0 },
  ]);

  // ✅ Calculate totals: Products + Transport = Total Expenditure
  const productsTotal = useMemo(() => 
    rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  , [rows]);
  
  const transportCost = Number(formData.transport_cost) || 0;
  const totalExpenditure = productsTotal + transportCost; // ✅ Live total calculation

  // ✅ Handle header field changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: name === 'transport_cost' ? parseFloat(value) || 0 : value 
    }));
  };

  // ✅ Handle row field changes
  const handleRowChange = (id, field, value) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === id 
          ? { ...row, [field]: field === 'quantity' || field === 'amount' ? parseFloat(value) || 0 : value } 
          : row
      )
    );
  };

  // ✅ Add new row
  const addRow = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
    setRows([...rows, { id: newId, product_type: '300ml', quantity: 0, amount: 0 }]);
  };

  // ✅ Remove row (keep at least 1)
  const removeRow = (id) => {
    if (rows.length <= 1) {
      toast.error('At least one item is required');
      return;
    }
    setRows(rows.filter((row) => row.id !== id));
  };

  // ✅ Save purchase with proper field mapping
  const handleSave = () => {
    if (!formData.company_name) {
      toast.error('Please select a company');
      return;
    }
    if (!formData.purchasing_agent) {
      toast.error('Please select a purchasing agent');
      return;
    }

    // ✅ Map to Supabase schema (snake_case + JSON string for items)
    const purchaseData = {
      date: formData.date,
      purchasing_agent: formData.purchasing_agent,  // ✅ Agent field
      company_name: formData.company_name,
      transport_cost: transportCost,                 // ✅ Transport field
      // ✅ items stored as JSON STRING for TEXT column
      items: JSON.stringify(rows.map((row) => ({
        id: row.id,
        product_type: row.product_type,
        quantity: Number(row.quantity) || 0,
        amount: Number(row.amount) || 0,
      }))),
      products_total: productsTotal,   // ✅ Separate products total
      total_expenditure: totalExpenditure, // ✅ Final total with transport
      created_at: new Date().toISOString()
    };

    try {
      if (editingPurchase) {
        updatePurchase({ ...purchaseData, id: editingPurchase.id });
        toast.success('Purchase updated successfully!');
      } else {
        addPurchase(purchaseData);
        toast.success('Purchase saved successfully!');
      }
      handleCloseForm();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save purchase');
    }
  };

  // ✅ Delete purchase
  const handleDelete = (purchaseId) => {
    if (window.confirm('Delete this purchase? This action cannot be undone.')) {
      try {
        deletePurchase(purchaseId);
        toast.success('Purchase deleted successfully');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete purchase');
      }
    }
  };

  // ✅ Edit purchase - parse JSON items back to array
  const handleEdit = (purchase) => {
    setEditingPurchase(purchase);
    
    // ✅ Parse items from JSON string to array
    const parsedItems = typeof purchase.items === 'string' 
      ? JSON.parse(purchase.items) 
      : (Array.isArray(purchase.items) ? purchase.items : []);
    
    setFormData({
      date: purchase.date?.split('T')[0] || new Date().toISOString().split('T')[0],
      purchasing_agent: purchase.purchasing_agent || '',  // ✅ Agent
      company_name: purchase.company_name || '',
      transport_cost: purchase.transport_cost || 0         // ✅ Transport
    });
    
    setRows(parsedItems.length > 0 
      ? parsedItems.map((item) => ({
          id: item.id,
          product_type: item.product_type,
          quantity: item.quantity || 0,
          amount: item.amount || 0,
        }))
      : [{ id: 1, product_type: '300ml', quantity: 0, amount: 0 }]
    );
    
    setShowForm(true);
  };

  // ✅ Close form and reset
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPurchase(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      purchasing_agent: '',
      company_name: '',
      transport_cost: 0
    });
    setRows([{ id: 1, product_type: '300ml', quantity: 0, amount: 0 }]);
  };

  // ✅ Safe stats calculations
  const totalPurchases = purchases?.length || 0;
  const totalSpent = useMemo(() => 
    purchases?.reduce((sum, p) => sum + (p.total_expenditure || 0), 0) || 0
  , [purchases]);

  // ✅ Loading state
  if (!purchases) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading purchases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Header - Orange/Amber Theme */}
      <header className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-8 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/30 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Purchases — Bottles</h1>
              <p className="text-orange-100 text-sm opacity-90">Track bottle procurement costs</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-50 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Purchase
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-8">
        
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">Total Purchases</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{totalPurchases}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">Total Spent</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{formatKSH(totalSpent)}</p>
          </div>
        </div>

        {/* Purchase List - Collapsible Cards */}
        <section className="space-y-4">
          {purchases?.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm ring-1 ring-gray-100">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-gray-500 font-medium">No purchases yet</p>
              <p className="text-gray-400 text-sm mt-1">Track your bottle procurement costs</p>
              <button 
                onClick={() => setShowForm(true)} 
                className="mt-4 text-orange-600 font-semibold hover:text-orange-700 transition-colors"
              >
                Add your first purchase →
              </button>
            </div>
          ) : (
            purchases
              .sort((a, b) => new Date(b.date) - new Date(a.date)) // ✅ Sort by date descending
              .map((purchase) => {
                // ✅ Parse items from JSON string for display
                const items = typeof purchase.items === 'string' 
                  ? JSON.parse(purchase.items) 
                  : (Array.isArray(purchase.items) ? purchase.items : []);
                
                return (
                  <div 
                    key={purchase.id} 
                    className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Card Header - Shows: Date | Company | Agent | Total */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-700 whitespace-nowrap">
                          {purchase.date ? new Date(purchase.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{purchase.company_name || 'Unknown Company'}</h3>
                          {/* ✅ Display Agent */}
                          <p className="text-sm text-gray-500">
                            Agent: {purchase.purchasing_agent || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                        <div className="text-right">
                          <p className="text-xs text-gray-400 uppercase font-medium">Total Expenditure</p>
                          <p className="text-lg font-bold text-orange-600">
                            {formatKSH(purchase.total_expenditure)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 border-l border-gray-100 pl-4">
                          <button 
                            onClick={() => handleEdit(purchase)} 
                            className="text-gray-400 hover:text-orange-500 transition-colors p-2 rounded-lg hover:bg-orange-50"
                            title="Edit purchase"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(purchase.id)} 
                            className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                            title="Delete purchase"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => setExpandedId(expandedId === purchase.id ? null : purchase.id)} 
                            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
                            title={expandedId === purchase.id ? 'Collapse' : 'Expand details'}
                          >
                            <svg className={`h-5 w-5 transition-transform duration-200 ${expandedId === purchase.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content - Items Table + Cost Breakdown */}
                    {expandedId === purchase.id && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-4 md:px-6 md:py-4 animate-fadeIn">
                        {/* Items Table Header */}
                        <div className="grid grid-cols-12 gap-4 mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          <div className="col-span-6 md:col-span-5">Product Type</div>
                          <div className="col-span-3 md:col-span-3 text-right">Qty</div>
                          <div className="col-span-3 md:col-span-4 text-right">Amount</div>
                        </div>
                        
                        {/* Items Rows */}
                        <div className="space-y-3 mb-6">
                          {items.length === 0 ? (
                            <p className="text-center text-gray-400 py-4 text-sm">No items in this purchase</p>
                          ) : (
                            items.map((item, idx) => (
                              <div key={item.id || idx} className="grid grid-cols-12 gap-4 text-sm text-gray-700 items-center">
                                <div className="col-span-6 md:col-span-5 font-medium truncate" title={item.product_type}>
                                  {item.product_type || '-'}
                                </div>
                                <div className="col-span-3 md:col-span-3 text-right">{item.quantity || 0}</div>
                                <div className="col-span-3 md:col-span-4 text-right font-medium text-orange-600">
                                  {formatKSH(item.amount)}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        
                        {/* Cost Breakdown */}
                        <div className="flex justify-end">
                          <div className="w-full md:w-72 bg-white rounded-lg p-4 space-y-3 shadow-sm border border-gray-100">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Products Subtotal</span>
                              <span className="font-medium">{formatKSH(purchase.products_total || productsTotal)}</span>
                            </div>
                            {(purchase.transport_cost || transportCost) > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Transport Cost</span>
                                <span className="font-medium">{formatKSH(purchase.transport_cost || transportCost)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-base font-bold text-orange-700 pt-3 border-t border-gray-200">
                              <span>TOTAL</span>
                              <span>{formatKSH(purchase.total_expenditure)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </section>
      </main>

      {/* Purchase Form Modal - Slide-up Sheet Style */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-3xl rounded-t-2xl md:rounded-2xl bg-white shadow-xl animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingPurchase ? '✏️ Edit Purchase' : '➕ New Purchase'}
              </h2>
              <button 
                onClick={handleCloseForm} 
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-8">
              
              {/* Header Fields: Date, Agent, Company, Transport */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Purchase Details</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Date <span className="text-red-500">*</span></label>
                    <input 
                      type="date" 
                      name="date" 
                      value={formData.date} 
                      onChange={handleFormChange} 
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200" 
                      required
                    />
                  </div>
                  
                  {/* Agent - Combo Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Purchasing Agent <span className="text-red-500">*</span></label>
                    <select 
                      name="purchasing_agent" 
                      value={formData.purchasing_agent} 
                      onChange={handleFormChange} 
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white" 
                      required
                    >
                      <option value="">Select agent...</option>
                      {AGENT_OPTIONS.map(agent => (
                        <option key={agent} value={agent}>{agent}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Company - Combo Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Company <span className="text-red-500">*</span></label>
                    <select 
                      name="company_name" 
                      value={formData.company_name} 
                      onChange={handleFormChange} 
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white" 
                      required
                    >
                      <option value="">Select company...</option>
                      {COMPANY_OPTIONS.map(company => (
                        <option key={company} value={company}>{company}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Transport Cost */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Transport Cost (KSh)</label>
                    <input 
                      type="number" 
                      name="transport_cost"
                      step="0.01"
                      min="0"
                      value={formData.transport_cost} 
                      onChange={handleFormChange} 
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200" 
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Items Entry - Multi-row Table */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Bottles & Items</p>
                
                {/* Table Header (Desktop) */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-2 mb-3 text-xs font-semibold text-gray-500 uppercase">
                  <div className="col-span-5">Product Type</div>
                  <div className="col-span-3 text-right">Quantity</div>
                  <div className="col-span-4 text-right">Amount (KSh)</div>
                </div>
                
                {/* Rows */}
                <div className="space-y-3">
                  {rows.map((row) => (
                    <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                      {/* Product Type Dropdown - FULL LIST */}
                      <div className="col-span-1 md:col-span-5">
                        <select 
                          value={row.product_type} 
                          onChange={(e) => handleRowChange(row.id, 'product_type', e.target.value)} 
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
                        >
                          {PRODUCT_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Quantity */}
                      <div className="col-span-1 md:col-span-3">
                        <input 
                          type="number" 
                          min="0" 
                          value={row.quantity} 
                          onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)} 
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-right focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200" 
                          placeholder="0" 
                        />
                      </div>
                      
                      {/* Amount */}
                      <div className="col-span-1 md:col-span-3">
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          value={row.amount} 
                          onChange={(e) => handleRowChange(row.id, 'amount', e.target.value)} 
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-right focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200" 
                          placeholder="0.00" 
                        />
                      </div>
                      
                      {/* Remove Button */}
                      <div className="col-span-1 md:col-span-1 flex justify-end">
                        <button 
                          onClick={() => removeRow(row.id)} 
                          className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove row"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Add Row Button */}
                <button 
                  onClick={addRow} 
                  className="mt-4 flex items-center rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item Row
                </button>
              </div>
            </div>

            {/* Modal Footer - Live Totals + Actions */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-2xl sticky bottom-0">
              {/* Live Totals Display */}
              <div className="bg-white rounded-xl p-4 w-full md:w-72 space-y-2 shadow-sm border border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Products</span>
                  <span className="font-medium">{formatKSH(productsTotal)}</span>
                </div>
                {transportCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Transport</span>
                    <span className="font-medium">{formatKSH(transportCost)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-orange-700 pt-2 border-t border-gray-200">
                  <span>TOTAL</span>
                  <span>{formatKSH(totalExpenditure)}</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={handleCloseForm} 
                  className="flex-1 md:flex-none rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  className="flex-1 md:flex-none rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors shadow-sm"
                >
                  {editingPurchase ? '💾 Update' : '✅ Save Purchase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default PurchasesPage;