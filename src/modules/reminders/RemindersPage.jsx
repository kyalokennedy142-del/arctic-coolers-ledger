import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Link } from 'react-router-dom';

const RemindersPage = () => {
  const { 
    customers, 
    deleteCustomer, 
    deleteTransaction,
    calculateCustomerBalance 
  } = useData();

  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [statementPreviews, setStatementPreviews] = useState({});
  const [selectedCustomerIdFromSession, setSelectedCustomerIdFromSession] = useState(null);

  // Check for selected customer from Transactions page
  useEffect(() => {
    const savedCustomerId = sessionStorage.getItem('selectedCustomerId');
    if (savedCustomerId) {
      setSelectedCustomerIdFromSession(Number(savedCustomerId));
      setExpandedCustomerId(Number(savedCustomerId));
      // Clear the session storage after using it
      sessionStorage.removeItem('selectedCustomerId');
    }
  }, []);

  // Calculate outstanding balance for each customer
  const customersWithBalance = customers.map((customer) => {
    const totalCredit = customer.transactions
      .filter((t) => t.type === 'Credit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPaid = customer.transactions
      .filter((t) => t.type === 'Payment')
      .reduce((sum, t) => sum + (t.paid || 0), 0);
    const outstandingBalance = totalCredit - totalPaid;
    const lastTransaction = customer.transactions.length > 0 
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

  // Filter customers with outstanding balances
  const customersWithOutstanding = customersWithBalance.filter((c) => c.hasOutstanding);

  // Filter based on search
  const filteredCustomers = customersWithOutstanding.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  // Toggle customer selection
  const toggleCustomerSelection = (id) => {
    setSelectedCustomers((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  // Select all visible customers
  const selectAll = () => {
    setSelectedCustomers(filteredCustomers.map((c) => c.id));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedCustomers([]);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  // Generate statement text for a customer
  const generateStatement = (customer) => {
    const unpaidTransactions = customer.transactions
      .filter((t) => t.type === 'Credit')
      .filter((t) => {
        // Check if this credit has been fully paid
        const totalPaidForCredit = customer.transactions
          .filter((pt) => pt.type === 'Payment')
          .reduce((sum, pt) => sum + (pt.paid || 0), 0);
        return true; // For simplicity, show all credits in statement
      });
    
    let statement = `Hello ${customer.name}, here we go\n\n`;
    statement += `TRANSACTION HISTORY\n`;
    statement += `Date        Amount (KSh)\n`;
    statement += `--------------------------------\n`;
    
    unpaidTransactions.forEach((t) => {
      statement += `${formatDate(t.date)}        ${t.amount.toFixed(2)}\n`;
    });

    statement += `\nTOTAL BALANCE: KSh ${customer.outstandingBalance.toFixed(2)}\n`;
    statement += `\nPAYMENT DETAILS\n`;
    statement += `Paybill: 247247\n`;
    statement += `Account: ${customer.phone}\n`;
    statement += `\nThank you for choosing Arctic Coolers.`;

    return statement;
  };

  // Handle Generate Statement
  const handleGenerateStatement = (customerId) => {
    const customer = customersWithBalance.find((c) => c.id === customerId);
    if (!customer) return;

    const statement = generateStatement(customer);
    setStatementPreviews((prev) => ({ ...prev, [customerId]: statement }));
    setExpandedCustomerId(customerId);
  };

  // Send WhatsApp message
  const sendWhatsApp = (customer) => {
    const statement = statementPreviews[customer.id] || generateStatement(customer);
    const encodedMessage = encodeURIComponent(statement);
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const whatsappURL = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappURL, '_blank');
  };

  // Send bulk WhatsApp messages
  const sendBulkWhatsApp = () => {
    const customersToSend = customersWithBalance.filter((c) =>
      selectedCustomers.includes(c.id)
    );

    if (customersToSend.length === 0) {
      alert('No customers selected');
      return;
    }

    customersToSend.forEach((customer, index) => {
      setTimeout(() => {
        sendWhatsApp(customer);
      }, index * 1000);
    });
  };

  // Handle Delete Customer
  const handleDeleteCustomer = (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer? All their transactions will also be deleted.')) {
      deleteCustomer(customerId);
    }
  };

  // Handle Delete Transaction
  const handleDeleteTransaction = (customerId, transactionId) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(customerId, transactionId);
    }
  };

  // Total outstanding
  const totalOutstanding = customersWithOutstanding.reduce(
    (sum, c) => sum + c.outstandingBalance,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-600 hover:text-gray-800 transition-colors">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
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
        
        {/* Search and Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            <p className="text-2xl font-bold text-red-600">KSh {totalOutstanding.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-medium">Selected</p>
            <p className="text-2xl font-bold text-teal-600">{selectedCustomers.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 uppercase font-medium">Avg Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              KSh {(totalOutstanding / (customersWithOutstanding.length || 1)).toFixed(2)}
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
              <p className="mt-4 text-gray-500">No customers with outstanding balances found</p>
              <Link to="/customers" className="mt-3 text-blue-600 font-medium hover:text-blue-700 inline-block">
                Add customers first →
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
                            Total Credit: KSh {customer.outstandingBalance.toFixed(2)}
                          </span>
                          
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                            {customer.transactions.length} transaction(s)
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
                          {customer.transactions.map((transaction) => (
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
                                KSh {(transaction.type === 'Credit' ? transaction.amount : transaction.paid).toFixed(2)}
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
