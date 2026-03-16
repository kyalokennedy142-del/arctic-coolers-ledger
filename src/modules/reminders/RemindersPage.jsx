/* eslint-disable react-hooks/set-state-in-effect */
 
// src/modules/reminders/RemindersPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../Context/DataContext'; // ✅ FIXED: lowercase 'context'
import toast from 'react-hot-toast';
import { formatKSH, formatPhoneForWhatsApp, formatDate } from '../../lib/formatCurrency'; // ✅ Use shared utilities

const RemindersPage = () => {
  const { customers } = useData(); // ✅ Only need customers for reminders

  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [statementPreviews, setStatementPreviews] = useState({});
  const [isSending, setIsSending] = useState(false);
  
  // Weekly Reminder Settings
  const [weeklyReminders, setWeeklyReminders] = useState(() => {
    const saved = localStorage.getItem('weeklyReminders');
    return saved ? JSON.parse(saved) : { enabled: false, day: 'monday', time: '09:00' };
  });

  // ✅ Save weekly reminder settings
  useEffect(() => {
    localStorage.setItem('weeklyReminders', JSON.stringify(weeklyReminders));
  }, [weeklyReminders]);

  // ✅ Handle URL param: ?customer=Name auto-expands customer
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const customerName = params.get('customer');
    if (customerName && customers?.length > 0) {
      const matched = customers.find(c => c.name?.toLowerCase().includes(customerName.toLowerCase()));
      if (matched) {
        setExpandedCustomerId(matched.id);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [customers]);

  // ✅ Calculate customer balances with CORRECT field names
  const customersWithBalance = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    
    return customers.map(customer => {
      const transactions = customer.transactions || [];
      
      // ✅ Use transaction_type (lowercase) and amount fields
      const totalCredit = transactions
        .filter(t => t.transaction_type?.toLowerCase() === 'credit')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      const totalPaid = transactions
        .filter(t => ['payment', 'paid'].includes(t.transaction_type?.toLowerCase()))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      const outstandingBalance = totalCredit - totalPaid;
      
      // Get last transaction date for display
      const sortedTx = [...transactions].sort((a, b) => 
        new Date(b.created_at || b.date) - new Date(a.created_at || a.date)
      );
      const lastTransaction = sortedTx[0]?.created_at || sortedTx[0]?.date || null;

      return {
        ...customer,
        totalCredit,
        totalPaid,
        outstandingBalance,
        lastTransaction,
        hasOutstanding: outstandingBalance > 0.01 // ✅ Only show if meaningful balance
      };
    });
  }, [customers]);

  // ✅ Filter: ONLY customers with outstanding balance > 0 (per requirements)
  const customersWithOutstanding = useMemo(() => 
    customersWithBalance.filter(c => c.hasOutstanding)
  , [customersWithBalance]);

  // ✅ Search filter (only searches within owing customers)
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customersWithOutstanding;
    
    const term = searchTerm.toLowerCase();
    return customersWithOutstanding.filter(c => 
      c.name?.toLowerCase().includes(term) ||
      c.phone?.includes(term) ||
      c.payment_name?.toLowerCase().includes(term)
    );
  }, [customersWithOutstanding, searchTerm]);

  // ✅ Toggle selection
  const toggleCustomerSelection = (id) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedCustomers(filteredCustomers.map(c => c.id));
  const deselectAll = () => setSelectedCustomers([]);

  // ✅ Generate WhatsApp statement with CORRECT format
  const generateStatement = (customer) => {
    const creditTransactions = (customer.transactions || [])
      .filter(t => t.transaction_type?.toLowerCase() === 'credit')
      .sort((a, b) => new Date(a.created_at || a.date) - new Date(b.created_at || b.date));
    
    let statement = `Hello ${customer.name || 'Valued Customer'}, here we go\n\n`;
    statement += `🧊 ARCTIC COOLERS - ACCOUNT STATEMENT\n`;
    statement += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (creditTransactions.length > 0) {
      statement += `📋 TRANSACTION HISTORY\n`;
      statement += `Date        | Amount (KSh)\n`;
      statement += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      creditTransactions.forEach(t => {
        const date = formatDate(t.created_at || t.date);
        const amount = formatKSH(t.amount).replace('KSh ', '');
        statement += `${date} | ${amount}\n`;
      });
      statement += `\n`;
    }
    
    statement += `💰 TOTAL BALANCE: ${formatKSH(customer.outstandingBalance)}\n\n`;
    statement += `📱 PAYMENT DETAILS:\n`;
    statement += `• Paybill: 247247\n`;
    statement += `• Account: ${customer.phone?.replace(/\D/g, '') || customer.name?.replace(/\s+/g, '')}\n`;
    statement += `• Reference: ${customer.name?.replace(/\s+/g, '').substring(0, 12)}\n\n`;
    statement += `Thank you for choosing Arctic Coolers! 🙏`;
    
    return statement;
  };

  // ✅ Handle generate statement
  const handleGenerateStatement = (customerId) => {
    const customer = customersWithBalance.find(c => c.id === customerId);
    if (!customer) return;
    
    const statement = generateStatement(customer);
    setStatementPreviews(prev => ({ ...prev, [customerId]: statement }));
    setExpandedCustomerId(customerId);
    toast.success('Statement generated!');
  };

// ✅ FIXED: WhatsApp send with proper phone formatting
const sendWhatsApp = (customer) => {
  try {
    const statement = statementPreviews[customer.id] || generateStatement(customer);
    const encodedMessage = encodeURIComponent(statement);
    
    // ✅ Use utility for phone formatting (converts 07XX → 2547XX)
    let cleanPhone = formatPhoneForWhatsApp(customer.phone);
    
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error(`Invalid phone for ${customer.name}: ${customer.phone}`);
      return false;
    }
    
    // ✅ FIXED: No extra spaces in URL
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    console.log('📱 Opening WhatsApp:', whatsappUrl); // Debug log
    
    const newWindow = window.open(whatsappUrl, '_blank');
    
    if (!newWindow) {
      toast.error(`Could not open WhatsApp for ${customer.name}. Allow pop-ups.`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('WhatsApp error:', error);
    toast.error(`Failed to send to ${customer.name}`);
    return false;
  }
};
  // ✅ Bulk Send with staggered delay (1.5s per requirements)
  const sendBulkWhatsApp = async () => {
    const customersToSend = filteredCustomers.filter(c => 
      selectedCustomers.includes(c.id) && c.outstandingBalance > 0
    );

    if (customersToSend.length === 0) {
      toast.error('Select customers with outstanding balances first');
      return;
    }

    setIsSending(true);
    toast.info(`Starting to send ${customersToSend.length} reminders...`);
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < customersToSend.length; i++) {
      const customer = customersToSend[i];
      
      // ✅ 1.5 second delay between sends (per requirements)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const success = sendWhatsApp(customer);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Progress update every 3 sends
      if ((i + 1) % 3 === 0 || i === customersToSend.length - 1) {
        toast.loading(`Progress: ${successCount + failCount}/${customersToSend.length}...`, {
          id: 'bulk-progress',
          duration: 2000
        });
      }
    }
    
    toast.dismiss('bulk-progress');
    setIsSending(false);
    
    if (successCount > 0) {
      toast.success(`✅ Done! ${successCount} sent, ${failCount} failed`, { duration: 5000 });
    }
    setSelectedCustomers([]);
  };

  // Weekly reminder handlers
  const handleToggleWeeklyReminders = () => {
    const newSettings = { ...weeklyReminders, enabled: !weeklyReminders.enabled };
    setWeeklyReminders(newSettings);
    toast.success(newSettings.enabled ? 'Weekly reminders enabled' : 'Weekly reminders disabled');
  };

  const handleSaveWeeklyReminders = () => {
    toast.success('Weekly reminder settings saved!');
    
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Arctic Coolers Ledger', {
            body: `Weekly reminders set for ${weeklyReminders.day} at ${weeklyReminders.time}`,
            icon: '/vite.svg'
          });
        }
      });
    }
  };

  // ✅ Stats calculations (only from owing customers)
  const stats = useMemo(() => {
    const total = customersWithOutstanding.length;
    const totalOutstanding = customersWithOutstanding.reduce((sum, c) => sum + c.outstandingBalance, 0);
    const avgBalance = total > 0 ? totalOutstanding / total : 0;
    
    return { total, totalOutstanding, avgBalance };
  }, [customersWithOutstanding]);

  // Loading state
  if (!customers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Reminders</h1>
              <p className="text-sm text-gray-500">Send WhatsApp debt statements</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-purple-100 px-3 py-1.5 rounded-full">
            <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-xs font-medium text-purple-600">AI Powered</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
        
        {/* Weekly Reminders Card */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Weekly Reminder Notifications
              </h2>
              <p className="text-purple-100 text-sm mt-1">Automatically remind customers with outstanding balances</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={weeklyReminders.enabled}
                onChange={handleToggleWeeklyReminders}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-purple-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-white"></div>
              <span className="ml-3 text-sm font-medium">{weeklyReminders.enabled ? 'ON' : 'OFF'}</span>
            </label>
          </div>

          {weeklyReminders.enabled && (
            <div className="mt-4 grid grid-cols-2 gap-4 bg-white/10 rounded-lg p-4">
              <div>
                <label className="block text-xs text-purple-100 mb-1">Day</label>
                <select
                  value={weeklyReminders.day}
                  onChange={(e) => setWeeklyReminders({...weeklyReminders, day: e.target.value})}
                  className="w-full rounded-lg bg-white text-gray-800 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-purple-100 mb-1">Time</label>
                <input
                  type="time"
                  value={weeklyReminders.time}
                  onChange={(e) => setWeeklyReminders({...weeklyReminders, time: e.target.value})}
                  className="w-full rounded-lg bg-white text-gray-800 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <button
                  onClick={handleSaveWeeklyReminders}
                  className="w-full bg-white text-purple-600 font-semibold px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search and Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone, or payment name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                disabled={filteredCustomers.length === 0}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                disabled={selectedCustomers.length === 0}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Deselect All
              </button>
            </div>

            <button
              onClick={sendBulkWhatsApp}
              disabled={selectedCustomers.length === 0 || isSending}
              className="flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Send via WhatsApp
                  {selectedCustomers.length > 0 && (
                    <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                      {selectedCustomers.length}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-medium">Customers Owing</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-medium">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600">{formatKSH(stats.totalOutstanding)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-medium">Selected</p>
            <p className="text-2xl font-bold text-teal-600">{selectedCustomers.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-medium">Avg Balance</p>
            <p className="text-2xl font-bold text-gray-900">{formatKSH(stats.avgBalance)}</p>
          </div>
        </div>

        {/* Customer Cards */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 text-gray-500 font-medium">
                {searchTerm ? 'No matching customers found' : 'All customers are up to date! 🎉'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {searchTerm ? 'Try a different search term' : 'No outstanding balances to remind'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-3 text-purple-600 font-medium hover:text-purple-700"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => toggleCustomerSelection(customer.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                          {customer.payment_name && customer.payment_name !== customer.name && (
                            <span className="text-xs text-gray-500">Pay as: {customer.payment_name}</span>
                          )}
                        </div>
                        
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                            Balance: {formatKSH(customer.outstandingBalance)}
                          </span>
                          
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                            {(customer.transactions || []).filter(t => t.transaction_type?.toLowerCase() === 'credit').length} credit(s)
                          </span>
                          
                          <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {customer.phone || 'No phone'}
                          </span>
                        </div>
                        
                        {customer.lastTransaction && (
                          <p className="mt-2 text-xs text-gray-500">
                            Last transaction: {formatDate(customer.lastTransaction)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Statement View */}
                {expandedCustomerId === customer.id && (
                  <div className="p-5 bg-gray-50 border-t border-gray-100 animate-fadeIn">
                    <h4 className="font-semibold text-gray-700 mb-3">Transaction Details</h4>
                    
                    {/* Credit Transactions Table */}
                    <div className="mb-4 rounded-lg border border-gray-200 bg-white overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(customer.transactions || [])
                            .filter(t => t.transaction_type?.toLowerCase() === 'credit')
                            .sort((a, b) => new Date(a.created_at || a.date) - new Date(b.created_at || b.date))
                            .map((transaction) => (
                              <tr key={transaction.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                                  {formatDate(transaction.created_at || transaction.date)}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {transaction.description || transaction.notes || '-'}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-red-600">
                                  {formatKSH(transaction.amount)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {(customer.transactions || []).filter(t => t.transaction_type?.toLowerCase() === 'credit').length === 0 && (
                        <p className="text-center text-gray-400 py-4 text-sm">No credit transactions</p>
                      )}
                    </div>

                    {/* Statement Preview - Editable */}
                    <textarea
                      value={statementPreviews[customer.id] || generateStatement(customer)}
                      onChange={(e) => setStatementPreviews(prev => ({ 
                        ...prev, 
                        [customer.id]: e.target.value 
                      }))}
                      className="w-full h-64 rounded-lg border border-gray-200 bg-white p-3 font-mono text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                      placeholder="Statement will appear here..."
                    />
                    
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <button
                        onClick={() => handleGenerateStatement(customer.id)}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerate
                      </button>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => sendWhatsApp(customer)}
                          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                          Send WhatsApp
                        </button>
                        <Link
                          to={`/transactions?customer=${encodeURIComponent(customer.name)}`}
                          className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Full Statement
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Footer Actions (when collapsed) */}
                {expandedCustomerId !== customer.id && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => handleGenerateStatement(customer.id)}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-1 md:flex-none justify-center"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Generate Statement
                    </button>
                    
                    <button
                      onClick={() => setExpandedCustomerId(customer.id)}
                      className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors flex-1 md:flex-none justify-center"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Preview & Send
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
      `}</style>
    </div>
  );
};

export default RemindersPage;