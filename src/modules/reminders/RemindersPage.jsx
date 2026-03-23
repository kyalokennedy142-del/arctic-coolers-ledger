// src/modules/reminders/RemindersPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';  // ✅ Use DataContext
import { supabase } from '../../lib/supabaseClient';  // ✅ Fixed: ../../ not ../
import { formatKSH, formatPhoneForWhatsApp } from '../../utils/formatCurrency';  // ✅ Fixed: ../../ not ../
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// Search Autocomplete Component
// ─────────────────────────────────────────────────────────────
const SearchAutocomplete = ({ customers, onSelect, onClear }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (query.length < 2) return [];
    const term = query.toLowerCase();
    return customers
      .filter(c => c.name?.toLowerCase().includes(term) || c.contact?.includes(term))
      .slice(0, 10);
  }, [customers, query]);

  const handleSelect = (customer) => {
    onSelect(customer);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          placeholder="Search customers..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        {query && (
          <button onClick={() => { setQuery(''); onClear?.(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map(customer => (
            <button
              key={customer.id}
              onClick={() => handleSelect(customer)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{customer.name}</p>
                {customer.contact && <p className="text-sm text-gray-500">📱 {customer.contact}</p>}
              </div>
              <span className="text-sm font-semibold text-red-600">{formatKSH(customer.balance)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Customer Card Component
// ─────────────────────────────────────────────────────────────
const CustomerCard = ({ customer, isSelected, onToggleSelect, onGenerateStatement, onSendWhatsApp, onViewStatement, generatedStatements, onStatementChange }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const statement = generatedStatements[customer.id] || '';

  const handleGenerate = () => {
    setIsGenerating(true);
    onGenerateStatement(customer.id);
    setTimeout(() => setIsGenerating(false), 300);
  };

  const handleSend = () => {
    if (!statement) {
      toast.error('Generate statement first');
      return;
    }
    if (!customer.contact) {
      toast.error('No phone number for this customer');
      return;
    }
    onSendWhatsApp(customer, statement);
  };

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-all ${isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200 hover:border-purple-300'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(customer.id)}
            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <div>
            <h3 className="font-semibold text-gray-900">{customer.name}</h3>
            {customer.contact && <p className="text-sm text-gray-500">📱 {customer.contact}</p>}
            {customer.lastTransaction && (
              <p className="text-xs text-gray-400">Last: {new Date(customer.lastTransaction).toLocaleDateString()}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onToggleSelect(customer.id)}
          className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700"
        >
          Balance: {formatKSH(customer.balance)}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">{customer.transactionCount} transactions</span>
        <span className="px-2 py-1 bg-red-50 text-red-700 rounded">Credit: {formatKSH(customer.totalCredit)}</span>
        <span className="px-2 py-1 bg-green-50 text-green-700 rounded">Paid: {formatKSH(customer.totalPaid)}</span>
      </div>

      {/* Statement Generation */}
      {statement ? (
        <div className="space-y-3">
          <textarea
            value={statement}
            onChange={(e) => onStatementChange(customer.id, e.target.value)}
            className="w-full h-40 p-3 text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
            placeholder="Statement will appear here..."
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleGenerate}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Regenerate
            </button>
            <button
              onClick={handleSend}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              💬 Send WhatsApp
            </button>
            <Link
              to={`/credit-statements?customer=${encodeURIComponent(customer.name)}`}
              className="px-4 py-2 text-sm text-purple-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View Statement →
            </Link>
          </div>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGenerating ? 'Generating...' : '✨ Generate Statement'}
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Reminders Page Component
// ─────────────────────────────────────────────────────────────
export default function RemindersPage() {
  const navigate = useNavigate();
  const { customers, transactions, loading, error, refresh } = useData();  // ✅ Use DataContext
  
  const [searchSelected, setSearchSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [generatedStatements, setGeneratedStatements] = useState({});
  const [isSending, setIsSending] = useState(false);

  // Process customers with transaction data - ONLY show those with balance > 1
  const processedCustomers = useMemo(() => {
    if (!Array.isArray(customers) || !Array.isArray(transactions)) return [];
    
    return customers
      .map(customer => {
        const customerTxs = transactions.filter(t => t.customer_id === customer.id);
        const totalCredit = customerTxs.filter(t => t.transaction_type?.toLowerCase() === 'credit')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const totalPaid = customerTxs.filter(t => ['payment', 'paid'].includes(t.transaction_type?.toLowerCase()))
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const lastTx = customerTxs.sort((a, b) => new Date(b.created_at || b.transaction_date) - new Date(a.created_at || a.transaction_date))[0];
        
        return {
          ...customer,
          totalCredit,
          totalPaid,
          balance: totalCredit - totalPaid,  // ✅ Calculate balance
          transactionCount: customerTxs.length,
          lastTransaction: lastTx?.created_at || lastTx?.transaction_date,
        };
      })
      .filter(c => c.balance > 1);  // ✅ ONLY show customers with credit balance > 1
  }, [customers, transactions]);

  // Filter based on search selection
  const displayedCustomers = useMemo(() => {
    if (searchSelected) {
      return processedCustomers.filter(c => c.id === searchSelected.id);
    }
    return processedCustomers;
  }, [processedCustomers, searchSelected]);

  // Generate statement text
  const generateStatementText = (customer) => {
    const creditTxs = (transactions || [])
      .filter(t => t.customer_id === customer.id && t.transaction_type?.toLowerCase() === 'credit')
      .sort((a, b) => new Date(a.created_at || a.transaction_date) - new Date(b.created_at || b.transaction_date));
    
    let text = `Hello ${customer.name}, here we go\n\n`;
    text += `🧊 ARCTIC COOLERS - ACCOUNT STATEMENT\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (creditTxs.length > 0) {
      text += `📋 TRANSACTION HISTORY\n`;
      text += `Date        | Amount (KSh)\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      creditTxs.forEach(t => {
        const date = new Date(t.created_at || t.transaction_date).toLocaleDateString('en-GB');
        const amount = formatKSH(t.amount).replace('KSh ', '');
        text += `${date} | ${amount}\n`;
      });
      text += `\n`;
    }
    
    text += `💰 TOTAL BALANCE: ${formatKSH(customer.balance)}\n\n`;
    text += `📱 PAYMENT DETAILS:\n`;
    text += `• Paybill: 247247\n`;
    text += `• Account: ${customer.contact?.replace(/\D/g, '') || customer.name?.replace(/\s+/g, '')}\n`;
    text += `• Reference: ${customer.name?.replace(/\s+/g, '').substring(0, 12)}\n\n`;
    text += `Thank you for choosing Arctic Coolers! 🙏`;
    
    return text;
  };

  // Handlers
  const handleSearchSelect = (customer) => {
    setSearchSelected(customer);
    setSelectedIds([customer.id]);
    handleGenerateStatement(customer.id);
  };

  const handleSearchClear = () => {
    setSearchSelected(null);
    setSelectedIds([]);
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    setSelectedIds(displayedCustomers.map(c => c.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleGenerateStatement = (customerId) => {
    const customer = processedCustomers.find(c => c.id === customerId);
    if (!customer) return;
    const text = generateStatementText(customer);
    setGeneratedStatements(prev => ({ ...prev, [customerId]: text }));
    toast.success('Statement generated!');
  };

  const handleStatementChange = (customerId, text) => {
    setGeneratedStatements(prev => ({ ...prev, [customerId]: text }));
  };

  const handleSendWhatsApp = async (customer, message) => {
    if (!customer.contact) {
      toast.error('No phone number');
      return;
    }
    const phone = formatPhoneForWhatsApp(customer.contact);
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${phone}?text=${encoded}`;
    
    try {
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        toast.error('Popup blocked. Allow popups for WhatsApp.');
        return;
      }
      toast.success(`Opening WhatsApp for ${customer.name}`);
    } catch (err) {
      toast.error('Failed to open WhatsApp');
    }
  };

  const handleBulkSend = async () => {
    const toSend = displayedCustomers.filter(c => 
      selectedIds.includes(c.id) && 
      generatedStatements[c.id] && 
      c.contact
    );
    
    if (toSend.length === 0) {
      toast.error('Select customers with generated statements and phone numbers');
      return;
    }

    setIsSending(true);
    toast.info(`Starting to send ${toSend.length} messages...`);

    for (let i = 0; i < toSend.length; i++) {
      const customer = toSend[i];
      await handleSendWhatsApp(customer, generatedStatements[customer.id]);
      // 1.5 second delay between sends
      if (i < toSend.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    setIsSending(false);
    toast.success(`Done! Sent ${toSend.length} messages`);
  };

  // Loading/Error states
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow">
        <p className="text-red-600 font-medium mb-2">⚠️ {error}</p>
        <button onClick={refresh} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Arctic Coolers Statements</h1>
              <p className="text-sm text-gray-500">Customers with outstanding balance</p>
            </div>
          </div>
          <span className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            ✨ AI Powered
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {/* Search */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <SearchAutocomplete
            customers={processedCustomers}  // ✅ Already filtered to balance > 1
            onSelect={handleSearchSelect}
            onClear={handleSearchClear}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex gap-2">
            <button onClick={handleSelectAll} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Select All</button>
            <button onClick={handleDeselectAll} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Deselect All</button>
          </div>
          <button
            onClick={handleBulkSend}
            disabled={isSending || selectedIds.length === 0}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Sending...
              </>
            ) : (
              <>💬 Send via WhatsApp ({selectedIds.length})</>
            )}
          </button>
        </div>

        {/* Customer List */}
        <div className="space-y-4">
          {displayedCustomers.length > 0 ? (
            displayedCustomers.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                isSelected={selectedIds.includes(customer.id)}
                onToggleSelect={handleToggleSelect}
                onGenerateStatement={handleGenerateStatement}
                onSendWhatsApp={handleSendWhatsApp}
                onViewStatement={() => navigate(`/credit-statements?customer=${encodeURIComponent(customer.name)}`)}
                generatedStatements={generatedStatements}
                onStatementChange={handleStatementChange}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-500 text-lg">No customers with outstanding balance</p>
              <p className="text-gray-400 text-sm mt-2">All customers are up to date! 🎉</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}