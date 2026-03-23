// src/modules/dashboard/DashboardPage.jsx
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Link, useNavigate } from 'react-router-dom';
import { formatKSH } from '../../utils/formatCurrency';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { user, signOut, isAdmin } = useAuth();
  const { customers, brokers, purchases, transactions, loading, error } = useData();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ✅ Calculate stats from Supabase data
  const stats = useMemo(() => {
    const safeTxs = Array.isArray(transactions) ? transactions : [];
    
    const totalCredit = safeTxs
      .filter(t => t?.transaction_type?.toLowerCase() === 'credit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    const totalPaid = safeTxs
      .filter(t => ['payment', 'paid'].includes(t?.transaction_type?.toLowerCase()))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return {
      totalCustomers: Array.isArray(customers) ? customers.length : 0,
      totalBrokers: Array.isArray(brokers) ? brokers.length : 0,
      totalPurchases: Array.isArray(purchases) ? purchases.length : 0,
      credit: totalCredit,
      paid: totalPaid,
      outstanding: totalCredit - totalPaid,
    };
  }, [customers, brokers, purchases, transactions]);

  // ✅ Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully!');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  // ✅ Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-600 via-blue-700 to-cyan-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-600 via-blue-700 to-cyan-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-xl">
          <p className="text-red-600 font-medium mb-2">⚠️ {error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-600 via-blue-700 to-cyan-600 pb-12">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 px-6 py-4 sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Aqua Credit Ledger</h1>
              <p className="text-blue-100 text-sm">Dashboard Overview</p>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6 -mt-6">
        {/* Main Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          {/* Total Customers */}
          <div className="bg-linear-to-brrom-emerald-400 to-teal-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Total Customers</p>
                <p className="text-4xl font-bold mt-2">{stats.totalCustomers}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Credit */}
          <div className="bg-linear-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Total Credit</p>
                <p className="text-4xl font-bold mt-2">{formatKSH(stats.credit)}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Paid */}
          <div className="bg-linear-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Total Paid</p>
                <p className="text-4xl font-bold mt-2">{formatKSH(stats.paid)}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Navigation */}
        <div className="mb-8">
          <h3 className="text-white text-lg font-semibold mb-4">Quick Access</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            
            <Link to="/credit-statements" className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-200 transition-colors">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Credit Statements</p>
                    <p className="text-sm text-gray-500">View customer ledgers</p>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>

            <Link to="/brokers" className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-100 p-3 rounded-xl group-hover:bg-yellow-200 transition-colors">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Broker Ledger</p>
                    <p className="text-sm text-gray-500">Manage broker records</p>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400 group-hover:text-yellow-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>

            <Link to="/customers" className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-xl group-hover:bg-indigo-200 transition-colors">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Customers</p>
                    <p className="text-sm text-gray-500">Manage customer records</p>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>
            // Add Bottle Sales tile to the navigation grid (around line 200+)
<Link to="/bottle-sales" className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
        <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-gray-900">Bottle Sales</p>
        <p className="text-sm text-gray-500">Track bottle deliveries</p>
      </div>
    </div>
    <svg className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
  </div>
</Link>


            <Link to="/purchases" className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-xl group-hover:bg-orange-200 transition-colors">
                    <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Purchases</p>
                    <p className="text-sm text-gray-500">Bottles procurement</p>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400 group-hover:text-orange-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>

            <Link to="/reminders" className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition-colors">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">AI Reminders</p>
                    <p className="text-sm text-gray-500">Send debt reminders</p>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>

            {isAdmin && (
              <Link to="/admin" className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group border-2 border-purple-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition-colors">
                      <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Admin Panel</p>
                      <p className="text-sm text-gray-500">Approve new users</p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </Link>
            )}
          </div>
        </div>
        {/* ✅ Recent Activity section REMOVED */}
      </main>

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Confirm Logout</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleLogout} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;