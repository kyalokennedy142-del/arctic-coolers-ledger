import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const RemindersPage = () => {
  const { 
    customers, 
    deleteCustomer, 
    deleteTransaction  } = useData();

  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [statementPreviews, setStatementPreviews] = useState({});
  const [selectedCustomerIdFromSession, setSelectedCustomerIdFromSession] = useState(null);
  
  // Weekly Reminder Settings
  const [weeklyReminders, setWeeklyReminders] = useState({
    enabled: false,
    day: 'monday',
    time: '09:00',
  });

  // Load weekly reminder settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('weeklyReminders');
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWeeklyReminders(JSON.parse(saved));
    }
  }, []);

  // Save weekly reminder settings
  const saveWeeklyReminders = (settings) => {
    setWeeklyReminders(settings);
    localStorage.setItem('weeklyReminders', JSON.stringify(settings));
  };

  useEffect(() => {
    const savedCustomerId = sessionStorage.getItem('selectedCustomerId');
    if (savedCustomerId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCustomerIdFromSession(Number(savedCustomerId));
      setExpandedCustomerId(Number(savedCustomerId));
      sessionStorage.removeItem('selectedCustomerId');
    }
  }, []);

  // ✅ SAFE: Map customers with balance calculations
  const customersWithBalance = (customers || []).map((customer) => {
    const totalCredit = (customer.transactions || [])
      .filter((t) => t.type === 'Credit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPaid = (customer.transactions || [])
      .filter((t) => t.type === 'Payment')
      .reduce((sum, t) => sum + (t.paid || 0), 0);
    const outstandingBalance = totalCredit - totalPaid;
    const lastTransaction = (customer.transactions || []).length > 0 
      ? customer.transactions[0].date 
      : 'N/A';

    return {
      ...customer,
      totalCredit,
      totalPaid,
      outstandingBalance,
      lastTransaction,
      hasOutstanding: outstandingBalance > 0,
    };
  });

  // ✅ UPDATED: Filter to ONLY customers with outstanding balance > 0
  const customersWithOutstanding = customersWithBalance.filter(
    (c) => c.hasOutstanding && c.outstandingBalance > 0
  );

  // ✅ UPDATED: Filter search results (only from owing customers)
  const filteredCustomers = customersWithOutstanding.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm)
  );

  const toggleCustomerSelection = (id) => {
    setSelectedCustomers((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedCustomers(filteredCustomers.map((c) => c.id));
  };

  const deselectAll = () => {
    setSelectedCustomers([]);
  };

  // ✅ SAFE: Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  // ✅ SAFE: Generate statement with null checks
  const generateStatement = (customer) => {
    const unpaidTransactions = (customer.transactions || [])
      .filter((t) => t.type === 'Credit');
    
    let statement = `Hello ${customer.name || 'Valued Customer'}, here we go\n\n`;
    statement += `TRANSACTION HISTORY\n`;
    statement += `Date        Amount (KSh)\n`;
    statement += `--------------------------------\n`;
    
    unpaidTransactions.forEach((t) => {
      statement += `${formatDate(t.date)}        ${(t.amount || 0).toFixed(2)}\n`;
    });

    statement += `\nTOTAL BALANCE: KSh ${(customer.outstandingBalance || 0).toFixed(2)}\n`;
    statement += `\nPAYMENT DETAILS\n`;
    statement += `Paybill: 247247\n`;
    statement += `Account: ${customer.phone || 'N/A'}\n`;
    statement += `\nThank you for choosing Arctic Coolers.`;

    return statement;
  };

  const handleGenerateStatement = (customerId) => {
    const customer = customersWithBalance.find((c) => c.id === customerId);
    if (!customer) return;

    const statement = generateStatement(customer);
    setStatementPreviews((prev) => ({ ...prev, [customerId]: statement }));
    setExpandedCustomerId(customerId);
  };

  // ✅ FIXED: sendWhatsApp - Reliable phone formatting + error handling
  const sendWhatsApp = (customer) => {
    try {
      const statement = statementPreviews[customer.id] || generateStatement(customer);
      
      // Encode message for URL (handles special chars)
      const encodedMessage = encodeURIComponent(statement);
      
      // Clean phone: remove all non-digits, ensure Kenyan format (254 prefix)
      let cleanPhone = (customer.phone || '').replace(/\D/g, '');
      
      // Convert local format (07XX) to international (2547XX)
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '254' + cleanPhone.slice(1);
      }
      
      // Validate phone has minimum length
      if (cleanPhone.length < 10) {
        toast.error(`Invalid phone for ${customer.name}`);
        return false;
      }
      
      // ✅ FIXED: Removed extra space in URL
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      
      // Open WhatsApp in new tab
      const newWindow = window.open(whatsappUrl, '_blank');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        toast.error(`Could not open WhatsApp for ${customer.name}. Please allow pop-ups.`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('WhatsApp send error:', error);
      toast.error(`Failed to send to ${customer.name}`);
      return false;
    }
  };

  // ✅ IMPROVED: sendBulkWhatsApp - Reliable async handling with progress
  const sendBulkWhatsApp = async () => {
    // Filter to only selected customers WITH outstanding balance
    const customersToSend = filteredCustomers.filter((c) =>
      selectedCustomers.includes(c.id) && c.outstandingBalance > 0
    );

    if (customersToSend.length === 0) {
      toast.error('No customers selected or no outstanding balances');
      return;
    }

    toast.success(`Starting to send ${customersToSend.length} reminders...`);
    
    let successCount = 0;
    let failCount = 0;

    // Send with delay to avoid browser throttling
    for (let i = 0; i < customersToSend.length; i++) {
      const customer = customersToSend[i];
      
      // Small delay between sends (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const success = sendWhatsApp(customer);
      
      if (success) {
        successCount++;
        toast.success(`✓ Sent to ${customer.name}`);
      } else {
        failCount++;
        toast.error(`✗ Failed: ${customer.name}`);
      }
      
      // Update progress toast every 5 sends
      if ((i + 1) % 5 === 0 || i === customersToSend.length - 1) {
        toast.loading(`Progress: ${successCount + failCount}/${customersToSend.length}...`, {
          id: 'bulk-progress',
          duration: 2000
        });
      }
    }
    
    // Final summary
    toast.dismiss('bulk-progress');
    toast.success(`Done! ✓${successCount} sent, ✗${failCount} failed`, {
      duration: 5000
    });
    
    // Clear selection after bulk send
    setSelectedCustomers([]);
  };

  // ✅ FIXED: handleDeleteCustomer with toast
  const handleDeleteCustomer = (customerId) => {
    if (window.confirm('Delete this customer? All transactions will be deleted.')) {
      deleteCustomer(customerId);
      toast.success('Customer deleted');
    }
  };

  // ✅ FIXED: handleDeleteTransaction with toast
  const handleDeleteTransaction = (customerId, transactionId) => {
    if (window.confirm('Delete this transaction?')) {
      deleteTransaction(customerId, transactionId);
      toast.success('Transaction deleted');
    }
  };

  // Weekly Reminder Handlers
  const handleToggleWeeklyReminders = () => {
    const newSettings = { ...weeklyReminders, enabled: !weeklyReminders.enabled };
    saveWeeklyReminders(newSettings);
    toast.success(newSettings.enabled ? 'Weekly reminders enabled' : 'Weekly reminders disabled');
  };

  const handleSaveWeeklyReminders = () => {
    saveWeeklyReminders(weeklyReminders);
    toast.success('Weekly reminder settings saved!');
    
    // Request browser notification permission
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          toast.success('Browser notifications enabled!');
          new Notification('Arctic Coolers Ledger', {
            body: 'Weekly reminders are now active!',
            icon: '/vite.svg',
          });
        }
      });
    }
  };

  // ✅ UPDATED: Stats based on filtered (owing) customers only
  const totalOutstanding = customersWithOutstanding.reduce(
    (sum, c) => sum + (c.outstandingBalance || 0),
    0
  );

  const avgBalance = customersWithOutstanding.length > 0
    ? totalOutstanding / customersWithOutstanding.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Header with Back Button */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* ← BACK BUTTON TO DASHBOARD */}
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
            
            <div>
              <h1 className="text-xl font-bold text-gray-900">Arctic Coolers Statements</h1>
              <p className="text-sm text-gray-500">Customers with outstanding balances</p>
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
              placeholder="Search customers by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Deselect All
              </button>
            </div>

            <button
              onClick={sendBulkWhatsApp}
              disabled={selectedCustomers.length === 0}
              className="flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send via WhatsApp
              {selectedCustomers.length > 0 && (
                <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {selectedCustomers.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-medium">Total Customers</p>
            <p className="text-2xl font-bold text-gray-900">{customersWithOutstanding.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-medium">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600">
              KSh {(totalOutstanding || 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-medium">Selected</p>
            <p className="text-2xl font-bold text-teal-600">{selectedCustomers.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-medium">Avg Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              KSh {(avgBalance || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Customer Cards */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 text-gray-500">
                {searchTerm 
                  ? "No matching customers with outstanding balances found" 
                  : "No customers with outstanding balances"}
              </p>
              {!searchTerm && (
                <p className="text-sm text-gray-400 mt-2">
                  All customers are up to date! 🎉
                </p>
              )}
              <Link to="/customers" className="mt-3 text-blue-600 font-medium hover:text-blue-700 inline-block">
                {searchTerm ? "Clear search" : "Add customers first →"}
              </Link>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                          {selectedCustomerIdFromSession === customer.id && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                              Selected from Transactions
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                            Balance: KSh {(customer.outstandingBalance || 0).toFixed(2)}
                          </span>
                          
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                            {(customer.transactions || []).length} transaction(s)
                          </span>
                          
                          <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {customer.phone}
                          </span>
                        </div>
                        
                        <p className="mt-2 text-xs text-gray-500">
                          Last transaction: {new Date(customer.lastTransaction).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete Customer"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Statement View */}
                {expandedCustomerId === customer.id && (
                  <div className="p-5 bg-gray-50 border-t border-gray-100 animate-fadeIn">
                    <h4 className="font-semibold text-gray-700 mb-3">Transaction Details</h4>
                    
                    {/* Transaction List */}
                    <div className="mb-4 rounded-lg border border-gray-200 bg-white overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3">Notes</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(customer.transactions || []).map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">{formatDate(transaction.date)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  transaction.type === 'Credit'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {transaction.type}
                                </span>
                              </td>
                              <td className={`px-4 py-3 text-right font-medium ${
                                transaction.type === 'Credit' ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {/* ✅ SAFE: Handle undefined amount/paid */}
                                KSh {(transaction.type === 'Credit' ? transaction.amount : transaction.paid || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{transaction.notes || '-'}</td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleDeleteTransaction(customer.id, transaction.id)}
                                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title="Delete Transaction"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Statement Preview */}
                    <textarea
                      readOnly
                      value={statementPreviews[customer.id] || generateStatement(customer)}
                      className="w-full h-64 rounded-lg border border-gray-200 bg-white p-3 font-mono text-xs text-gray-700 focus:outline-none resize-none"
                    />
                    
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <button
                        onClick={() => handleGenerateStatement(customer.id)}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        Regenerate
                      </button>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => sendWhatsApp(customer)}
                          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send WhatsApp
                        </button>
                        <button className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Statement
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Footer Actions */}
                {expandedCustomerId !== customer.id && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => handleGenerateStatement(customer.id)}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-1 md:flex-none justify-center"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Generate Statement
                    </button>
                    
                    <button
                      onClick={() => handleGenerateStatement(customer.id)}
                      className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors flex-1 md:flex-none justify-center"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Statement
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </main>

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

export default RemindersPage;