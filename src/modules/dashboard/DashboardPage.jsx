import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { customers,getStats } = useData();
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [roleLoading, setRoleLoading] = useState(true);
  
  const stats = getStats();

  // Load user role on mount
  useEffect(() => {
    const loadUserRole = async () => {
      try {
        setRoleLoading(true);
        
        // 1. Try localStorage first (fast)
        const storedRole = localStorage.getItem('user_role');
        if (storedRole === 'admin') {
          setUserRole('admin');
          setRoleLoading(false);
          return;
        }
        
        // 2. Fallback: Check Supabase for approval status
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: approval } = await supabase
            .from('user_approvals')
            .select('role, status')
            .eq('email', user.email)
            .maybeSingle();
          
          if (approval?.role === 'admin' && approval?.status === 'approved') {
            setUserRole('admin');
            localStorage.setItem('user_role', 'admin');
          } else {
            setUserRole('user');
            localStorage.setItem('user_role', 'user');
          }
        }
      } catch (error) {
        console.warn('Could not load user role:', error);
        setUserRole('user');
      } finally {
        setRoleLoading(false);
      }
    };
    
    loadUserRole();
  }, []);

  // Fixed logout function
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('arctic-logged-in');
      localStorage.removeItem('arctic-login-time');
      localStorage.removeItem('user_role');
      toast.success('Logged out successfully!');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  // Safe calculations
  const totalCustomers = stats?.totalCustomers || 0;
  const totalCredit = stats?.totalCredit || 0;
  const totalPaid = stats?.totalPaid || 0;
  const outstandingBalance = stats?.outstandingBalance || 0;
  const customersOwing = customers?.filter(c => {
    const balance = (c.transactions || []).reduce((sum, t) => {
      if (t.type === 'Credit') return sum + (t.amount || 0);
      if (t.type === 'Payment') return sum - (t.paid || 0);
      return sum;
    }, 0);
    return balance > 0;
  }).length || 0;
  const totalBrokers = stats?.totalBrokers || 0;
  const totalPurchases = stats?.totalPurchases || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600">
      
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 px-6 py-4">
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
          
          {/* Logout Button */}
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
          {/* Customers */}
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Customers</p>
                <p className="text-4xl font-bold mt-2">{totalCustomers}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Credit */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium uppercase tracking-wider">Total Credit</p>
                <p className="text-4xl font-bold mt-2">KSh {totalCredit.toFixed(2)}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Paid */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Total Paid</p>
                <p className="text-4xl font-bold mt-2">KSh {totalPaid.toFixed(2)}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg">
            <p className="text-gray-500 text-sm font-medium">Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-600 mt-1">KSh {outstandingBalance.toFixed(2)}</p>
          </div>
          <div className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg">
            <p className="text-gray-500 text-sm font-medium">Customers Owing</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{customersOwing}</p>
          </div>
          <div className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg">
            <p className="text-gray-500 text-sm font-medium">Total Brokers</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalBrokers}</p>
          </div>
          <div className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg">
            <p className="text-gray-500 text-sm font-medium">Total Purchases</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{totalPurchases}</p>
          </div>
        </div>

        {/* Quick Access */}
        <div className="mb-8">
          <h3 className="text-white text-lg font-semibold mb-4">Quick Access</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            
            {/* Dashboard */}
            <Link to="/" className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Dashboard</p>
                    <p className="text-sm text-gray-500">Overview & summaries</p>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* AI Reminders */}
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
                <svg className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Credit Statements */}
            <Link to="/transactions" className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group">
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
                <svg className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Customers */}
            <Link to="/customers" className="bg-white/95 backdrop-blur rounded-xl p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-xl group-hover:bg-indigo-200 transition-colors">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Customers</p>
                    <p className="text-sm text-gray-500">Manage customer records</p>
                  </div>
                </div>
                <svg className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Purchases */}
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
                <svg className="h-5 w-5 text-gray-400 group-hover:text-orange-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Brokers */}
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
                <svg className="h-5 w-5 text-gray-400 group-hover:text-yellow-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* ✅ Admin Panel - Show ONLY for approved admin users */}
            {!roleLoading && userRole === 'admin' && (
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
                  <svg className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )}
          </div>
        </div>

      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900">Confirm Logout</h3>
              <p className="text-sm text-gray-500 mt-1">Are you sure you want to logout?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700"
              >
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