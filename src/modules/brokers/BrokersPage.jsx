import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Link } from 'react-router-dom';

const BrokersPage = () => {
  const { 
    brokers, 
    addBroker, 
    updateBroker, 
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

  const handleAddBroker = () => {
    if (!newBroker.name) return alert('Name is required');
    addBroker({
      name: newBroker.name,
      phone: newBroker.phone,
      area: newBroker.area,
      openingBalance: Number(newBroker.openingBalance),
    });
    setIsAddBrokerOpen(false);
    setNewBroker({ name: '', phone: '', area: '', openingBalance: 0 });
  };

  const handleAddEntry = () => {
    const broker = getExpandedBroker();
    if (!broker) return;

    const prevBalance = calculateBrokerBalance(broker);
    const amount = Number(newEntry.amount);
    const paid = Number(newEntry.paid);
    const newBalance = prevBalance + amount - paid;

    const entryData = {
      date: newEntry.date,
      day: getDayName(newEntry.date),
      bottles: Number(newEntry.bottles),
      amount: amount,
      paid: paid,
      balance: newBalance,
    };

    if (editingEntry) {
      updateEntry(broker.id, editingEntry.id, entryData);
    } else {
      addEntry(broker.id, entryData);
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

  const handleDeleteEntry = (brokerId, entryId) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      deleteEntry(brokerId, entryId);
    }
  };

  const handleDeleteBroker = (brokerId) => {
    if (window.confirm('Are you sure you want to delete this broker? All their entries will also be deleted.')) {
      deleteBroker(brokerId);
      if (expandedBrokerId === brokerId) {
        setExpandedBrokerId(null);
      }
    }
  };

  const handleGenerateStatement = () => {
    const broker = getExpandedBroker();
    if (!broker) return;

    let text = `BROKER STATEMENT - ${broker.name.toUpperCase()}\n`;
    text += `Date | Day | Bottles | Amount | Paid | Balance\n`;
    text += `---------------------------------------------\n`;
    
    broker.entries.forEach((entry) => {
      text += `${entry.date} | ${entry.day.substring(0, 3)} | ${entry.bottles} | ${entry.amount} | ${entry.paid} | ${entry.balance}\n`;
    });

    const currentBalance = calculateBrokerBalance(broker);
    text += `---------------------------------------------\n`;
    text += `TOTAL BALANCE: KSh ${currentBalance.toFixed(2)}`;

    setStatementText(text);
    setIsStatementOpen(true);
  };

  const sendWhatsApp = () => {
    const broker = getExpandedBroker();
    if (!broker) return;
    const encodedText = encodeURIComponent(statementText);
    const cleanPhone = broker.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  const handleCloseEntryModal = () => {
    setIsAddEntryOpen(false);
    setEditingEntry(null);
    setNewEntry({ date: new Date().toISOString().split('T')[0], bottles: 0, amount: 0, paid: 0 });
  };

  const expandedBroker = getExpandedBroker();
  const currentBalance = expandedBroker ? calculateBrokerBalance(expandedBroker) : 0;
  
  // ✅ FIXED: Simple, readable balance calculation
  let prevBalanceForEntry = 0;
  if (expandedBroker) {
    if (editingEntry) {
      const entries = expandedBroker.entries;
      const idx = entries.findIndex((e) => e.id === editingEntry.id);
      if (idx > 0 && idx < entries.length) {
        prevBalanceForEntry = entries[idx - 1].balance;
      } else {
        prevBalanceForEntry = expandedBroker.openingBalance || 0;
      }
    } else {
      prevBalanceForEntry = calculateBrokerBalance(expandedBroker);
    }
  }

  const liveNewBalance = prevBalanceForEntry + Number(newEntry.amount) - Number(newEntry.paid);

  const totalBrokers = brokers.length;
  const totalOutstanding = brokers.reduce((sum, b) => sum + calculateBrokerBalance(b), 0);
  const brokersWithBalance = brokers.filter((b) => calculateBrokerBalance(b) > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* Header with Back Button */}
      <header className="bg-orange-600 px-6 py-6 text-white shadow-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
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
            <p className="mt-1 text-2xl font-bold text-red-600">KSh {totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">With Balance</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{brokersWithBalance}</p>
          </div>
        </div>

        {/* Broker List */}
        {brokers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm ring-1 ring-gray-100">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="mt-4 text-gray-500">No brokers yet</p>
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
                      <p className={`text-xl font-bold ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        KSh {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          {broker.entries.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                                No entries yet
                              </td>
                            </tr>
                          ) : (
                            broker.entries.map((entry) => (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">{entry.date}</td>
                                <td className="px-4 py-3">{entry.day}</td>
                                <td className="px-4 py-3 text-right font-medium">{entry.bottles}</td>
                                <td className="px-4 py-3 text-right text-blue-600">
                                  KSh {entry.amount.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right text-green-600">
                                  KSh {entry.paid.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-gray-800">
                                  KSh {entry.balance.toFixed(2)}
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

      {/* Modals remain the same - omitted for brevity, but ensure all number inputs have step attributes */}
      {/* Add Broker Modal, Add Entry Modal, Statement Modal... */}
      
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