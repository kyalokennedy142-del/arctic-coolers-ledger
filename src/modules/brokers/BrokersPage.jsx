/* eslint-disable react-hooks/exhaustive-deps */
// src/modules/brokers/BrokersPage.jsx
import React, { useState, useMemo } from 'react';
import { useData } from '../../Context/DataContext'; // ✅ FIXED: lowercase 'context'
import { data, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatKSH, formatPhoneForWhatsApp, getDayName } from '../../lib/formatCurrency'; // ✅ Added utilities

const BrokersPage = () => {
  const { 
    brokers, 
    addBroker, 
    deleteBroker, 
    addLedgerEntry, 
    updateLedgerEntry, 
    deleteLedgerEntry,
    calculateBrokerBalance 
  } = useData();

  const [expandedBrokerId, setExpandedBrokerId] = useState(null);
  const [isAddBrokerOpen, setIsAddBrokerOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  
  const [newBroker, setNewBroker] = useState({ name: '', phone: '', area: '', opening_balance: 0 });
  const [newEntry, setNewEntry] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    bottles_taken: 0, 
    amount: 0, 
    amount_paid: 0 
  });
  const [statementText, setStatementText] = useState('');

  // ✅ Helper: Get expanded broker
  // eslint-disable-next-line no-undef
  const getExpandedBroker = useCallback(() => brokers?.find((b) => b.id === expandedBrokerId));

  /// ✅ FIXED: Normalize phone before saving
const handleAddBroker = () => {
  if (!newBroker.name?.trim()) {
    toast.error('Broker name is required');
    return;
  }
  
  // ✅ Normalize phone to 07XX format for storage
  let normalizedPhone = newBroker.phone?.trim().replace(/\D/g, '') || '';
  if (normalizedPhone.startsWith('254') && normalizedPhone.length === 12) {
    normalizedPhone = '0' + normalizedPhone.slice(3);
  } else if (normalizedPhone.length === 9 && normalizedPhone.startsWith('7')) {
    normalizedPhone = '0' + normalizedPhone;
  }
  
  addBroker({
    name: newBroker.name.trim(),
    phone: normalizedPhone, // ✅ Save as 07XX
    area: newBroker.area?.trim() || '',
    opening_balance: Number(newBroker.opening_balance) || 0,
  });
  
  toast.success('Broker added successfully!');
  setIsAddBrokerOpen(false);
  setNewBroker({ name: '', phone: '', area: '', opening_balance: 0 });
};

  // ✅ Handle Add/Edit Ledger Entry
  const handleAddEntry = () => {
    const broker = getExpandedBroker();
    if (!broker) return;

    const prevBalance = calculateBrokerBalance(broker);
    const amount = Number(newEntry.amount) || 0;
    const paid = Number(newEntry.amount_paid) || 0;
    const newBalance = prevBalance + amount - paid;

    const entryData = {
      broker_id: broker.id,
      date: newEntry.date,
      day: getDayName(newEntry.date),
      bottles_taken: Number(newEntry.bottles_taken) || 0,
      amount: amount,
      amount_paid: paid,
      balance: newBalance,
      created_at: new Date().toISOString()
    };

    try {
      if (editingEntry) {
        updateLedgerEntry(broker.id, editingEntry.id, entryData);
        toast.success('Entry updated successfully!');
      } else {
        addLedgerEntry(broker.id, entryData);
        toast.success('Entry added successfully!');
      }

      setIsAddEntryOpen(false);
      setEditingEntry(null);
      setNewEntry({ 
        date: new Date().toISOString().split('T')[0], 
        bottles_taken: 0, 
        amount: 0, 
        amount_paid: 0 
      });
    } catch (error) {
      console.error('Entry error:', error);
      toast.error('Failed to save entry');
    }
  };

  // ✅ Handle Edit Entry
  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setNewEntry({
      date: entry.date?.split('T')[0] || new Date().toISOString().split('T')[0],
      bottles_taken: entry.bottles_taken || 0,
      amount: entry.amount || 0,
      amount_paid: entry.amount_paid || 0,
    });
    setIsAddEntryOpen(true);
  };

  // ✅ Handle Delete Entry
  const handleDeleteEntry = (brokerId, entryId) => {
    if (window.confirm('Are you sure you want to delete this ledger entry?')) {
      try {
        deleteLedgerEntry(brokerId, entryId);
        toast.success('Entry deleted successfully');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete entry');
      }
    }
  };

  // ✅ Handle Delete Broker
  const handleDeleteBroker = (brokerId) => {
    if (window.confirm('Delete this broker? All ledger entries will be permanently deleted.')) {
      try {
        deleteBroker(brokerId);
        toast.success('Broker deleted successfully');
        if (expandedBrokerId === brokerId) {
          setExpandedBrokerId(null);
        }
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete broker');
      }
    }
  };

  // ✅ Generate Statement (Last 7 Days)
  const handleGenerateStatement = () => {
    const broker = getExpandedBroker();
    if (!broker) return;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Filter entries from last 7 days
    const recentEntries = (broker.broker_ledger || []).filter(entry => {
      const entryDate = new Date(entry.date || entry.created_at);
      return entryDate >= sevenDaysAgo;
    }).sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

    // Build statement text
    let text = `═══════════════════════════════════════\n`;
    text += `     🧊 ARCTIC COOLERS LTD\n`;
    text += `     Broker Statement\n`;
    text += `═══════════════════════════════════════\n\n`;
    text += `Broker: ${broker.name}\n`;
    text += `Phone:  ${broker.phone || 'N/A'}\n`;
    text += `Area:   ${broker.area || 'N/A'}\n`;
    text += `Period: ${sevenDaysAgo.toLocaleDateString('en-GB')} to ${now.toLocaleDateString('en-GB')}\n`;
    text += `Generated: ${new Date().toLocaleString('en-GB')}\n\n`;
    
    text += `───────────────────────────────────────\n`;
    text += `DATE       | DAY | BTL |  AMOUNT  |  PAID  | BALANCE\n`;
    text += `───────────────────────────────────────\n`;
    
    recentEntries.forEach((entry) => {
      const dateShort = entry.date ? new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '--/--';
      const dayShort = (entry.day || '').substring(0, 3).toUpperCase() || '---';
      const bottles = String(entry.bottles_taken || 0).padStart(3, ' ');
      const amount = formatKSH(entry.amount || 0).replace('KSh ', '').padStart(8, ' ');
      const paid = formatKSH(entry.amount_paid || 0).replace('KSh ', '').padStart(8, ' ');
      const balance = formatKSH(entry.balance || 0).replace('KSh ', '').padStart(8, ' ');
      
      text += `${dateShort} | ${dayShort} | ${bottles} | ${amount} | ${paid} | ${balance}\n`;
    });

    const currentBalance = calculateBrokerBalance(broker);
    text += `───────────────────────────────────────\n`;
    text += `\n`;
    text += `CURRENT BALANCE:        ${formatKSH(currentBalance)}\n`;
    text += `\n`;
    text += `💳 PAYMENT DETAILS:\n`;
    text += `• Paybill: 247247\n`;
    text += `• Account: ${broker.phone?.replace(/\D/g, '') || broker.name?.replace(/\s+/g, '')}\n`;
    text += `• Reference: ${broker.name?.replace(/\s+/g, '').substring(0, 10)}\n`;
    text += `\n`;
    text += `Thank you for your partnership!\n`;
    text += `🧊 Arctic Coolers Ltd\n`;
    text += `═══════════════════════════════════════`;

    setStatementText(text);
    setIsStatementOpen(true);
  };

  // ✅ FIXED: WhatsApp send with proper phone formatting
const sendWhatsApp = () => {
  try {
    const broker = getExpandedBroker();
    if (!broker) {
      toast.error('No broker selected');
      return;
    }
    
    if (!statementText) {
      toast.error('Please generate a statement first');
      return;
    }
    
    const encodedText = encodeURIComponent(statementText);
    
    // ✅ Use utility for phone formatting
    let cleanPhone = formatPhoneForWhatsApp(broker.phone);
    
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Invalid phone number. Please update broker contact.');
      return;
    }
    
    // ✅ FIXED: No extra spaces in URL
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    
    console.log('📱 Opening WhatsApp:', whatsappUrl); // Debug log
    
    const newWindow = window.open(whatsappUrl, '_blank');
    
    if (!newWindow) {
      toast.error('Could not open WhatsApp. Please allow pop-ups for this site.');
      return;
    }
    
    toast.success('Opening WhatsApp...');
  } catch (error) {
    console.error('WhatsApp send error:', error);
    toast.error('Failed to send statement. Please try again.');
  }
};
      const encodedText = encodeURIComponent(statementText);
      
      // ✅ FIXED: Clean phone using utility
      let cleanPhone = formatPhoneForWhatsApp(broker.phone);
      
      if (!cleanPhone || cleanPhone.length < 10) {
        toast.error('Invalid phone number. Please update broker contact.');
        return;
      }
      
      // ✅ FIXED: Removed extra spaces in URL
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
      
      // Open WhatsApp
      const newWindow = window.open(whatsappUrl, '_blank');
      
      if (!newWindow) {
        toast.error('Could not open WhatsApp. Please allow pop-ups for this site.');
        return;
      }
      
      toast.success('Opening WhatsApp...');
    }   (error) {
      console.error('WhatsApp send error:', error);
      toast.error('Failed to send statement. Please try again.');
    }
  

  // ✅ Close Entry Modal
  const handleCloseEntryModal = () => {
    setIsAddEntryOpen(false);
    setEditingEntry(null);
    setNewEntry({ 
      date: new Date().toISOString().split('T')[0], 
      bottles_taken: 0, 
      amount: 0, 
      amount_paid: 0 
    });
  };

  // ✅ Calculate live balance preview for entry form
   
  const getLiveBalancePreview = useMemo(() => {
    const broker = getExpandedBroker();
    if (!broker) return 0;
    
    const prevBalance = editingEntry 
      ? ((broker.broker_ledger || []).find(e => e.id === editingEntry.id)?.balance || calculateBrokerBalance(broker))
      : calculateBrokerBalance(broker);
    
    const amount = Number(newEntry.amount) || 0;
    const paid = Number(newEntry.amount_paid) || 0;
    
    return prevBalance + amount - paid;
  }, [getExpandedBroker, editingEntry, calculateBrokerBalance, newEntry.amount, newEntry.amount_paid]);

  // ✅ Safe stats calculations
  const totalBrokers = brokers?.length || 0;
  const totalOutstanding = useMemo(() => 
    brokers?.reduce((sum, b) => sum + (calculateBrokerBalance(b) || 0), 0) || 0
  , [brokers, calculateBrokerBalance]);
  
  const brokersWithBalance = useMemo(() => 
    brokers?.filter((b) => (calculateBrokerBalance(b) || 0) > 0).length || 0
  , [brokers, calculateBrokerBalance]);

  const expandedBroker = getExpandedBroker();

  // ✅ Loading state
  if (!brokers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading brokers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* Header - Amber Theme */}
      <header className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-6 text-white shadow-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
            
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <svg className="h-6 w-6 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Broker Ledger
              </h1>
              <p className="text-amber-100 text-xs opacity-90">Manage broker accounts & balances</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsAddBrokerOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-amber-600 shadow-sm hover:bg-amber-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Broker
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 space-y-6">
        
        {/* Stats Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">Total Brokers</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{totalBrokers}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{formatKSH(totalOutstanding)}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">With Balance</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{brokersWithBalance}</p>
          </div>
        </div>

        {/* Broker List */}
        {brokers?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm ring-1 ring-gray-100">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500 font-medium">No brokers yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your first broker to get started</p>
            <button
              onClick={() => setIsAddBrokerOpen(true)}
              className="mt-4 text-amber-600 font-semibold hover:text-amber-700 transition-colors"
            >
              Add Broker →
            </button>
          </div>
        ) : (
          brokers.map((broker) => {
            const isExpanded = expandedBrokerId === broker.id;
            const balance = calculateBrokerBalance(broker) || 0;

            return (
              <div
                key={broker.id}
                className={`bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'ring-2 ring-amber-300 shadow-md' : ''
                }`}
              >
                {/* Broker Card Header */}
                <div
                  className="p-4 cursor-pointer flex justify-between items-center hover:bg-amber-50/50 transition-colors"
                  onClick={() => setExpandedBrokerId(isExpanded ? null : broker.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">{broker.name}</h3>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <p className="truncate">📞 {broker.phone || 'No phone'}</p>
                      <p className="truncate">📍 {broker.area || 'No area'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase font-medium">Balance</p>
                      <p className={`text-xl font-bold ${balance > 0 ? 'text-amber-600' : balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatKSH(balance)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBroker(broker.id);
                      }}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete Broker"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg 
                      className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Ledger Section */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 animate-fadeIn">
                    {/* Action Buttons */}
                    <div className="p-3 flex flex-col sm:flex-row gap-2 border-b border-gray-100 bg-white">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEntry(null);
                          setNewEntry({ 
                            date: new Date().toISOString().split('T')[0], 
                            bottles_taken: 0, 
                            amount: 0, 
                            amount_paid: 0 
                          });
                          setIsAddEntryOpen(true);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Entry
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateStatement();
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generate Statement
                      </button>
                    </div>

                    {/* Ledger Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-amber-50 text-xs uppercase text-amber-700 font-semibold">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Day</th>
                            <th className="px-4 py-3 text-right">Bottles</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-right">Paid</th>
                            <th className="px-4 py-3 text-right">Balance</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {(broker.broker_ledger || []).length === 0 ? (
                            <tr>
                              <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                                No ledger entries yet
                              </td>
                            </tr>
                          ) : (
                            (broker.broker_ledger || [])
                              .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
                              .map((entry) => (
                                <tr key={entry.id} className="hover:bg-amber-50/30 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                                    {entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-gray-500">{entry.day || '-'}</td>
                                  <td className="px-4 py-3 text-right font-medium text-gray-700">{entry.bottles_taken || 0}</td>
                                  <td className="px-4 py-3 text-right text-blue-600 font-medium">
                                    {formatKSH(entry.amount)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-green-600 font-medium">
                                    {formatKSH(entry.amount_paid)}
                                  </td>
                                  <td className={`px-4 py-3 text-right font-bold ${
                                    (entry.balance || 0) >= 0 ? 'text-amber-600' : 'text-red-600'
                                  }`}>
                                    {formatKSH(entry.balance)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => handleEditEntry(entry)}
                                        className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                        title="Edit Entry"
                                      >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEntry(broker.id, entry.id)}
                                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        title="Delete Entry"
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
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Add Broker Modal */}
      {isAddBrokerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Add New Broker</h2>
              <button
                onClick={() => setIsAddBrokerOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Broker Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBroker.name}
                  onChange={(e) => setNewBroker({ ...newBroker, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                  placeholder="Enter broker name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newBroker.phone}
                  onChange={(e) => setNewBroker({ ...newBroker, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                  placeholder="07XX XXX XXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area / Region</label>
                <input
                  type="text"
                  value={newBroker.area}
                  onChange={(e) => setNewBroker({ ...newBroker, area: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                  placeholder="e.g., Nairobi CBD, Industrial Area"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opening Balance (KSh)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newBroker.opening_balance}
                  onChange={(e) => setNewBroker({ ...newBroker, opening_balance: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setIsAddBrokerOpen(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBroker}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-700 transition-colors"
              >
                Add Broker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Entry Modal */}
      {isAddEntryOpen && expandedBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#FFFBF0] p-6 shadow-xl border border-amber-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {editingEntry ? '✏️ Edit Entry' : '➕ Add Ledger Entry'}
              </h2>
              <button
                onClick={handleCloseEntryModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Previous Balance Display */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Previous Balance
                </label>
                <div className="w-full rounded-lg bg-blue-50 px-3 py-2.5 text-gray-700 border border-blue-200 font-medium">
                  {formatKSH(calculateBrokerBalance(expandedBroker) || 0)}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                  required
                />
              </div>

              {/* Auto Day Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Day</label>
                <div className="w-full rounded-lg bg-amber-50 px-3 py-2.5 text-gray-700 border border-amber-200 font-medium">
                  {getDayName(newEntry.date) || 'Select a date'}
                </div>
              </div>

              {/* Bottles Taken */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bottles Taken (Reference)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newEntry.bottles_taken}
                  onChange={(e) => setNewEntry({ ...newEntry, bottles_taken: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                  placeholder="0"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (KSh) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newEntry.amount}
                  onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Amount Paid */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Paid (KSh)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newEntry.amount_paid}
                  onChange={(e) => setNewEntry({ ...newEntry, amount_paid: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                  placeholder="0.00"
                />
              </div>

              {/* Live Balance Preview */}
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <p className="text-xs text-gray-500 font-medium">New Balance (Live Preview)</p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {formatKSH(getLiveBalancePreview)}
                </p>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  {formatKSH(calculateBrokerBalance(expandedBroker) || 0).replace('KSh ', '')} 
                  + {newEntry.amount || 0} 
                  - {newEntry.amount_paid || 0} 
                  = {getLiveBalancePreview.toFixed(2)}
                </p>
              </div>
            </div>

            <button
              onClick={handleAddEntry}
              disabled={!newEntry.date || !newEntry.amount}
              className="mt-6 w-full rounded-lg bg-amber-600 px-4 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {editingEntry ? '💾 Update Entry' : '✅ Submit Entry'}
            </button>
          </div>
        </div>
      )}

      {/* Statement Modal */}
      {isStatementOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">📄 Statement Preview</h2>
              <button
                onClick={() => setIsStatementOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <textarea
              readOnly
              value={statementText}
              className="w-full h-72 rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700 focus:outline-none resize-none"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setIsStatementOpen(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={sendWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700 transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Send via WhatsApp
              </button>
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
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BrokersPage;