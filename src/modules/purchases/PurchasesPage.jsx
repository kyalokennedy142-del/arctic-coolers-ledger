import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';  // ← ADDED

const PurchasesPage = () => {
  const { purchases, addPurchase, updatePurchase, deletePurchase } = useData();
  
  const [showForm, setShowForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    agent: '',
    company: '',
    transportCost: 0,
  });

  const [rows, setRows] = useState([
    { id: 1, productType: '300ml', quantity: 0, amount: 0 },
  ]);

  const productsTotal = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const totalExpenditure = productsTotal + Number(formData.transportCost);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRowChange = (id, field, value) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const addRow = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
    setRows([...rows, { id: newId, productType: '300ml', quantity: 0, amount: 0 }]);
  };

  const removeRow = (id) => {
    if (rows.length === 1) return;
    setRows(rows.filter((row) => row.id !== id));
  };

  // ✅ FIXED: handleSave with toasts
  const handleSave = () => {
    if (!formData.company) {
      toast.error('Please select a company');  // ← CHANGED from alert
      return;
    }

    const purchaseData = {
      date: formData.date,
      company: formData.company,
      agent: formData.agent || 'Unassigned',
      transportCost: Number(formData.transportCost),
      items: rows.map((row) => ({
        id: row.id,
        productType: row.productType,
        quantity: Number(row.quantity),
        amount: Number(row.amount),
      })),
      totalExpenditure,
    };

    if (editingPurchase) {
      updatePurchase({ ...purchaseData, id: editingPurchase.id });
      toast.success('Purchase updated successfully!');  // ← ADDED
    } else {
      addPurchase(purchaseData);
      toast.success('Purchase saved successfully!');  // ← ADDED
    }

    handleCloseForm();
  };

  // ✅ FIXED: handleDelete with toast
  const handleDelete = (purchaseId) => {
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      deletePurchase(purchaseId);
      toast.success('Purchase deleted');  // ← ADDED
    }
  };

  const handleEdit = (purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      date: purchase.date,
      agent: purchase.agent,
      company: purchase.company,
      transportCost: purchase.transportCost,
    });
    setRows(purchase.items.map((item) => ({
      id: item.id,
      productType: item.productType,
      quantity: item.quantity,
      amount: item.amount,
    })));
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPurchase(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      agent: '',
      company: '',
      transportCost: 0,
    });
    setRows([{ id: 1, productType: '300ml', quantity: 0, amount: 0 }]);
  };

  const toggleExpand = (purchaseId) => {
    setExpandedId(expandedId === purchaseId ? null : purchaseId);
  };

  const [expandedId, setExpandedId] = useState(null);

  const totalPurchases = purchases.length;
  const totalSpent = purchases.reduce((sum, p) => sum + (p.totalExpenditure || 0), 0);
  const totalTransport = purchases.reduce((sum, p) => sum + (p.transportCost || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Header with Back Button */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-8 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            {/* ← BACK BUTTON TO DASHBOARD */}
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/30 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
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
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">Total Purchases</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{totalPurchases}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">Total Spent</p>
            <p className="mt-1 text-2xl font-bold text-red-600">KSh {totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">Transport Costs</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">KSh {totalTransport.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
        </div>

        {/* Purchase History List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Purchase History</h2>
            <span className="text-sm text-gray-500">{purchases.length} records</span>
          </div>

          {purchases.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm ring-1 ring-gray-100">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-4 text-gray-500">No purchases recorded yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-orange-600 font-medium hover:text-orange-700"
              >
                Add your first purchase →
              </button>
            </div>
          ) : (
            purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden transition-all"
              >
                {/* Card Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-700 whitespace-nowrap">
                      {new Date(purchase.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{purchase.company}</h3>
                      <p className="text-xs text-gray-500">Agent: {purchase.agent}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase font-medium">Total Expenditure</p>
                      <p className="text-lg font-bold text-orange-600">KSh {purchase.totalExpenditure.toFixed(2)}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 border-l border-gray-100 pl-4">
                      <button
                        onClick={() => handleEdit(purchase)}
                        className="text-gray-400 hover:text-orange-500 transition-colors"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(purchase.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleExpand(purchase.id)}
                        className={`text-gray-400 hover:text-gray-600 transition-transform ${expandedId === purchase.id ? 'rotate-180' : ''}`}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === purchase.id && (
                  <div className="border-t border-gray-50 bg-gray-50/30 p-4 md:px-6 md:py-4">
                    <div className="grid grid-cols-12 gap-4 mb-4 text-xs font-semibold text-gray-500 uppercase">
                      <div className="col-span-6 md:col-span-5">Product Type</div>
                      <div className="col-span-3 md:col-span-3 text-right">Qty</div>
                      <div className="col-span-3 md:col-span-4 text-right">Amount (KSH)</div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      {purchase.items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 text-sm text-gray-700">
                          <div className="col-span-6 md:col-span-5 font-medium">{item.productType}</div>
                          <div className="col-span-3 md:col-span-3 text-right">{item.quantity}</div>
                          <div className="col-span-3 md:col-span-4 text-right">{item.amount.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <div className="w-full md:w-64 bg-white rounded-lg p-3 space-y-2 shadow-sm border border-gray-100">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Products Total</span>
                          <span>KSh {purchase.items.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Transport</span>
                          <span>KSh {purchase.transportCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-orange-700 pt-2 border-t border-gray-100">
                          <span>TOTAL EXPENDITURE</span>
                          <span>KSh {purchase.totalExpenditure.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

      </main>

      {/* Purchase Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCloseForm} />

          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl animate-slideUp">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  {editingPurchase ? 'Edit Purchase' : 'New Purchase'}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="max-h-[70vh] overflow-y-auto p-6 space-y-8">
                
                {/* Header Fields */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                    Purchase Header (Applies to all rows)
                  </p>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Date *</label>
                      <div className="relative">
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleFormChange}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        <svg className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Purchasing Agent</label>
                      <select
                        name="agent"
                        value={formData.agent}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                      >
                        <option value="">Select or type agent...</option>
                        <option value="Grace">Grace</option>
                        <option value="Lawrent">Lawrent</option>
                        <option value="John">John</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Company Name</label>
                      <select
                        name="company"
                        value={formData.company}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                      >
                        <option value="">Select or type company...</option>
                        <option value="Safepak">Safepak</option>
                        <option value="Five Star">Five Star</option>
                        <option value="Newton Printing">Newton Printing</option>
                        <option value="Reliable Packers">Reliable Packers</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Transport Cost (KSh)</label>
                      <input
                        type="number"
                        name="transportCost"
                        step="0.01"  // ← MONEY: allow decimals
                        min="0"
                        value={formData.transportCost}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Entry */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                    Bottles Entry
                  </p>
                  
                  <div className="space-y-3">
                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-2 text-xs font-semibold text-gray-500 uppercase">
                      <div className="col-span-5">Product Type</div>
                      <div className="col-span-3 text-right">Quantity</div>
                      <div className="col-span-4 text-right">Amount (KSH)</div>
                    </div>

                    {/* Rows */}
                    {rows.map((row) => (
                      <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-gray-50/50 p-2 rounded-lg md:bg-transparent md:p-0">
                        <div className="col-span-1 md:col-span-5">
                          <label className="md:hidden text-xs text-gray-500 mb-1 block">Product Type</label>
                          <select
                            value={row.productType}
                            onChange={(e) => handleRowChange(row.id, 'productType', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                          >
                            <option value="300ml">300ml</option>
                            <option value="500ml">500ml</option>
                            <option value="Labels">Labels</option>
                            <option value="Caps">Caps</option>
                            <option value="Boxes">Boxes</option>
                          </select>
                        </div>
                        <div className="col-span-1 md:col-span-3">
                          <label className="md:hidden text-xs text-gray-500 mb-1 block">Quantity</label>
                          <input
                            type="number"
                            step="1"  // ← WHOLE NUMBERS ONLY
                            min="0"
                            value={row.quantity}
                            onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-right focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            placeholder="0"
                          />
                        </div>
                        {/* Amount - MONEY (allow decimals) */}
<div className="col-span-1 md:col-span-3">
  <label className="md:hidden text-xs text-gray-500 mb-1 block">Amount (KSH)</label>
  <input
    type="number"
    step="0.01"        // ✅ 2 decimal places for money
    min="0"
    value={row.amount}
    onChange={(e) => handleRowChange(row.id, 'amount', e.target.value)}
    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-right focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
    placeholder="0.00"
  />
</div>
                        <div className="col-span-1 md:col-span-1 flex justify-end">
                          {rows.length > 1 && (
                            <button
                              onClick={() => removeRow(row.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-2"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={addRow}
                    className="mt-4 flex items-center rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Row
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-2xl">
                <div className="bg-white rounded-xl p-4 w-full md:w-64 space-y-2 shadow-sm border border-gray-100">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Products Total</span>
                    <span>KSh {productsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Transport</span>
                    <span>KSh {Number(formData.transportCost).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-orange-700 pt-2 border-t border-gray-200">
                    <span>TOTAL EXPENDITURE</span>
                    <span>KSh {totalExpenditure.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <button
                    onClick={handleCloseForm}
                    className="flex-1 md:flex-none rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 md:flex-none rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors"
                  >
                    {editingPurchase ? 'Update Purchase' : 'Save Purchase'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default PurchasesPage;