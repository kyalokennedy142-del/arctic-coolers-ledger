import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const BrokersPage = () => {
  const { 
    brokers, 
    addBroker, 
    deleteBroker, 
    addEntry, 
    updateEntry, 
    deleteEntry,
    calculateBrokerBalance 
  } = useData();

  const [expandedBrokerId, setExpandedBrokerId] = useState(null);
  const [isAddBrokerOpen, setIsAddBrokerOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  
  const [newBroker, setNewBroker] = useState({ name: '', phone: '', area: '', openingBalance: 0 });
  const [newEntry, setNewEntry] = useState({ date: '', bottles: 0, amount: 0, paid: 0 });
  const [statementText, setStatementText] = useState('');

  const getDayName = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getExpandedBroker = () => brokers.find((b) => b.id === expandedBrokerId);

  // ✅ FIXED: handleAddBroker with toast
  const handleAddBroker = () => {
    if (!newBroker.name) {
      toast.error('Name is required');
      return;
    }
    addBroker({
      name: newBroker.name,
      phone: newBroker.phone,
      area: newBroker.area,
      openingBalance: Number(newBroker.openingBalance) || 0,
    });
    toast.success('Broker added!');
    setIsAddBrokerOpen(false);
    setNewBroker({ name: '', phone: '', area: '', openingBalance: 0 });
  };

  // ✅ FIXED: handleAddEntry with toast
  const handleAddEntry = () => {
    const broker = getExpandedBroker();
    if (!broker) return;

    const prevBalance = calculateBrokerBalance(broker);
    const amount = Number(newEntry.amount) || 0;
    const paid = Number(newEntry.paid) || 0;
    const newBalance = prevBalance + amount - paid;

    const entryData = {
      date: newEntry.date,
      day: getDayName(newEntry.date),
      bottles: Number(newEntry.bottles) || 0,
      amount: amount,
      paid: paid,
      balance: newBalance,
    };

    if (editingEntry) {
      updateEntry(broker.id, editingEntry.id, entryData);
      toast.success('Entry updated!');
    } else {
      addEntry(broker.id, entryData);
      toast.success('Entry added!');
    }

    setIsAddEntryOpen(false);
    setEditingEntry(null);
    setNewEntry({ date: new Date().toISOString().split('T')[0], bottles: 0, amount: 0, paid: 0 });
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setNewEntry({
      date: entry.date,
      bottles: entry.bottles,
      amount: entry.amount,
      paid: entry.paid,
    });
    setIsAddEntryOpen(true);
  };

  // ✅ FIXED: handleDeleteEntry with toast
  const handleDeleteEntry = (brokerId, entryId) => {
    if (window.confirm('Delete this entry?')) {
      deleteEntry(brokerId, entryId);
      toast.success('Entry deleted');
    }
  };

  // ✅ FIXED: handleDeleteBroker with toast
  const handleDeleteBroker = (brokerId) => {
    if (window.confirm('Delete this broker? All entries will be deleted.')) {
      deleteBroker(brokerId);
      toast.success('Broker deleted');
      if (expandedBrokerId === brokerId) {
        setExpandedBrokerId(null);
      }
    }
  };

  // ✅ IMPROVED: Better statement template
  const handleGenerateStatement = () => {
    const broker = getExpandedBroker();
    if (!broker) return;

    // Professional header
    let text = `═══════════════════════════════════════\n`;
    text += `     ARCTIC COOLERS \n`;
    text += `═══════════════════════════════════════\n\n`;
    text += `Broker: ${broker.name}\n`;
    text += `Phone:  ${broker.phone}\n`;
    text += `Area:   ${broker.area}\n`;
    text += `Date:   ${new Date().toLocaleDateString('en-GB')}\n\n`;
    
    text += `───────────────────────────────────────\n`;
    text += `DATE       | DAY   | BTL | AMOUNT | PAID | BALANCE\n`;
    text += `───────────────────────────────────────\n`;
    
    
    
    // Entries
    (broker.entries || []).forEach((entry) => {
      const dateShort = entry.date ? new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '';
      const dayShort = entry.day?.substring(0, 3).toUpperCase() || '';
      const bottles = (entry.bottles || 0).toString().padStart(3, ' ');
      const amount = (entry.amount || 0).toFixed(2).padStart(7, ' ');
      const paid = (entry.paid || 0).toFixed(2).padStart(7, ' ');
      const balance = (entry.balance || 0).toFixed(2).padStart(7, ' ');
      
      text += `${dateShort} | ${dayShort} | ${bottles} | ${amount} | ${paid} | ${balance}\n`;
    });

    // Total
    const currentBalance = calculateBrokerBalance(broker);
    text += `───────────────────────────────────────\n`;
    text += `                                    \n`;
    text += `TOTAL BALANCE:              KSh ${currentBalance.toFixed(2)}\n`;
    text += `                                    \n`;
    text += `PAYMENT DETAILS:\n`;
    text += `• Paybill: 247247\n`;
    text += `• Account: ${broker.phone}\n`;
    text += `• Reference: ${broker.name.replace(/\s+/g, '')}\n\n`;
    text += `Thank you for your partnership!\n`;
    text += `Arctic Coolers Ltd\n`;
    text += `═══════════════════════════════════════`;

    setStatementText(text);
    setIsStatementOpen(true);
  };

  // ✅ FIXED: sendWhatsApp - Reliable phone formatting + error handling
  const sendWhatsApp = () => {
    try {
      const broker = getExpandedBroker();
      if (!broker) return;
      
      const encodedText = encodeURIComponent(statementText);
      
      // Clean phone: remove all non-digits, ensure Kenyan format (254 prefix)
      let cleanPhone = (broker.phone || '').replace(/\D/g, '');
      
      // Convert local format (07XX) to international (2547XX)
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '254' + cleanPhone.slice(1);
      }
      
      // Validate phone has minimum length
      if (cleanPhone.length < 10) {
        toast.error('Invalid phone number format');
        return;
      }
      
      // ✅ FIXED: Removed extra space in URL
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
      
      // Open WhatsApp in new tab
      const newWindow = window.open(whatsappUrl, '_blank');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        toast.error('Could not open WhatsApp. Please allow pop-ups.');
        return;
      }
      
      toast.success('Opening WhatsApp...');
    } catch (error) {
      console.error('WhatsApp send error:', error);
      toast.error('Failed to send statement');
    }
  };

  const handleCloseEntryModal = () => {
    setIsAddEntryOpen(false);
    setEditingEntry(null);
    setNewEntry({ date: new Date().toISOString().split('T')[0], bottles: 0, amount: 0, paid: 0 });
  };

  const expandedBroker = getExpandedBroker();
  // eslint-disable-next-line no-unused-vars
  const currentBalance = expandedBroker ? calculateBrokerBalance(expandedBroker) : 0;
  
  let prevBalanceForEntry = 0;
  if (expandedBroker) {
    if (editingEntry) {
      const entries = expandedBroker.entries || [];
      const idx = entries.findIndex((e) => e.id === editingEntry.id);
      if (idx > 0 && idx < entries.length) {
        prevBalanceForEntry = entries[idx - 1]?.balance || 0;
      } else {
        prevBalanceForEntry = expandedBroker.openingBalance || 0;
      }
    } else {
      prevBalanceForEntry = calculateBrokerBalance(expandedBroker);
    }
  }

  const liveNewBalance = prevBalanceForEntry + Number(newEntry.amount || 0) - Number(newEntry.paid || 0);

  // ✅ SAFE: Stats calculations
  const totalBrokers = brokers?.length || 0;
  const totalOutstanding = brokers?.reduce((sum, b) => sum + calculateBrokerBalance(b), 0) || 0;
  const brokersWithBalance = brokers?.filter((b) => calculateBrokerBalance(b) > 0).length || 0;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* Header with Back Button */}
      <header className="bg-orange-600 px-6 py-6 text-white shadow-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            {/* ← BACK BUTTON TO DASHBOARD */}
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
            
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <svg className="h-6 w-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Broker Ledger
              </h1>
              <p className="text-orange-100 text-xs opacity-90">Manage broker records & balances</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsAddBrokerOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Broker
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 space-y-6">
        
        {/* Stats Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">Total Brokers</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{totalBrokers}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              KSh {(totalOutstanding || 0).toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">With Balance</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{brokersWithBalance}</p>
          </div>
        </div>

        {/* Broker List */}
        {brokers?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm ring-1 ring-gray-100">
            <p className="text-gray-500">No brokers yet</p>
            <button
              onClick={() => setIsAddBrokerOpen(true)}
              className="mt-4 text-orange-600 font-medium hover:text-orange-700"
            >
              Add your first broker →
            </button>
          </div>
        ) : (
          brokers.map((broker) => {
            const isExpanded = expandedBrokerId === broker.id;
            const balance = calculateBrokerBalance(broker);

            return (
              <div
                key={broker.id}
                className={`bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'ring-2 ring-orange-200' : ''
                }`}
              >
                <div
                  className="p-4 cursor-pointer flex justify-between items-center"
                  onClick={() => setExpandedBrokerId(isExpanded ? null : broker.id)}
                >
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{broker.name}</h3>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <p>{broker.phone}</p>
                      <p>{broker.area}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase font-medium">Balance</p>
                      {/* ✅ SAFE: Handle undefined balance */}
                      <p className={`text-xl font-bold ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        KSh {(balance || 0).toFixed(2)}
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
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 animate-fadeIn">
                    <div className="p-3 flex flex-col sm:flex-row gap-2 border-b border-gray-100 bg-white">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEntry(null);
                          setNewEntry({ date: new Date().toISOString().split('T')[0], bottles: 0, amount: 0, paid: 0 });
                          setIsAddEntryOpen(true);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-700 transition-colors"
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

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-100 text-xs uppercase text-gray-500 font-semibold">
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
                          {(broker.entries || []).length === 0 ? (
                            <tr>
                              <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                                No entries yet
                              </td>
                            </tr>
                          ) : (
                            (broker.entries || []).map((entry) => (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">{entry.date}</td>
                                <td className="px-4 py-3">{entry.day}</td>
                                <td className="px-4 py-3 text-right font-medium">{entry.bottles || 0}</td>
                                <td className="px-4 py-3 text-right text-blue-600">
                                  {/* ✅ SAFE: Handle undefined amount */}
                                  KSh {(entry.amount || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right text-green-600">
                                  {/* ✅ SAFE: Handle undefined paid */}
                                  KSh {(entry.paid || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-gray-800">
                                  {/* ✅ SAFE: Handle undefined balance */}
                                  KSh {(entry.balance || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleEditEntry(entry)}
                                      className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                      title="Edit"
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEntry(broker.id, entry.id)}
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
              <h2 className="text-xl font-bold text-gray-800">Add Broker</h2>
              <button
                onClick={() => setIsAddBrokerOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBroker.name}
                  onChange={(e) => setNewBroker({ ...newBroker, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Broker name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newBroker.phone}
                  onChange={(e) => setNewBroker({ ...newBroker, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                <input
                  type="text"
                  value={newBroker.area}
                  onChange={(e) => setNewBroker({ ...newBroker, area: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Area or region"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opening Balance (KSh)
                </label>
                {/* ✅ MONEY: Allow any number (arrows removed via CSS) */}
                <input
                  type="number"
                  min="0"
                  value={newBroker.openingBalance}
                  onChange={(e) => setNewBroker({ ...newBroker, openingBalance: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setIsAddBrokerOpen(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBroker}
                className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700"
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
          <div className="w-full max-w-md rounded-2xl bg-[#FFFBF0] p-6 shadow-xl border border-orange-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {editingEntry ? 'Edit Entry' : 'Add Entry'}
              </h2>
              <button
                onClick={handleCloseEntryModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Previous Balance
                </label>
                <div className="w-full rounded-lg bg-blue-50 px-3 py-2 text-gray-700 border border-blue-100">
                  KSh {(prevBalanceForEntry || 0).toFixed(2)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Day</label>
                <div className="w-full rounded-lg bg-blue-50 px-3 py-2 text-gray-700 border border-blue-100">
                  {getDayName(newEntry.date) || 'Select Date'}
                </div>
              </div>

              {/* Bottles - Any number now (arrows removed via CSS) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bottles Taken (ref)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newEntry.bottles}
                  onChange={(e) => setNewEntry({ ...newEntry, bottles: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="0"
                />
              </div>

              {/* Amount - MONEY (any number now) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (KSh) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={newEntry.amount}
                  onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>

              {/* Paid - MONEY (any number now) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Paid (KSh)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newEntry.paid}
                  onChange={(e) => setNewEntry({ ...newEntry, paid: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>

              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <p className="text-xs text-gray-500">New Balance (Live Preview)</p>
                <p className="text-2xl font-bold text-green-700">
                  KSh {(liveNewBalance || 0).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {(prevBalanceForEntry || 0).toFixed(2)} + {(newEntry.amount || 0)} - {(newEntry.paid || 0)}
                </p>
              </div>
            </div>

            <button
              onClick={handleAddEntry}
              disabled={!newEntry.date || !newEntry.amount}
              className="mt-6 w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editingEntry ? 'Update Entry' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Statement Modal */}
      {isStatementOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Statement Preview</h2>
              <button
                onClick={() => setIsStatementOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <textarea
              readOnly
              value={statementText}
              className="w-full h-64 rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700 focus:outline-none resize-none"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setIsStatementOpen(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={sendWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Send WhatsApp
              </button>
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

export default BrokersPage;