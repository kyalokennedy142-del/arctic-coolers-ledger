import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const AdminPage = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

// Add this after the imports
const ADMIN_EMAIL = 'kyalokennedy142@gmail.com'; // Your admin email

// In the component, add this useEffect:
useEffect(() => {
  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Check if user email matches admin email
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      toast.error('Admin access required');
      navigate('/');
      return;
    }
    
    setIsAdmin(true);
  };
  
  checkAdminAccess();
}, [navigate]);






  // ✅ Check admin status FIRST (before any other logic)
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        // Simple admin check: hardcoded email
        const ADMIN_EMAIL = 'kyalokennedy142@gmail.com'; // ⚠️ Replace with your email
        
        if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
          toast.error('Admin access required');
          navigate('/');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Admin check error:', error);
        toast.error('Admin access check failed');
        navigate('/');
      }
    };

    checkAdminAccess();
  }, [navigate]);

  // ✅ Load pending users ONLY after admin check passes
  useEffect(() => {
    if (!isAdmin) return; // Don't load if not admin

    const loadPendingUsers = async () => {
      try {
        console.log('🔍 Loading pending users...');
        
        const { data, error } = await supabase
          .from('user_approvals')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Supabase error:', error);
          throw error;
        }
        
        console.log('✅ Loaded pending users:', data?.length || 0);
        setPendingUsers(data || []);
      } catch (error) {
        console.error('Error loading pending users:', error);
        
        let errorMessage = 'Failed to load pending users';
        if (error.message?.includes('relation')) {
          errorMessage = 'Approval table not found. Run setup SQL or use simple admin check.';
        } else if (error.message?.includes('permission')) {
          errorMessage = 'Permission denied. Check RLS policies.';
        }
        
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadPendingUsers();
  }, [isAdmin]); // Only run when isAdmin changes

  const handleApprove = async (userId, email) => {
    if (!window.confirm(`Approve user ${email}?`)) return;
    
    setIsProcessing(userId);
    
    try {
      const { error } = await supabase
        .from('user_approvals')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`✅ ${email} approved!`);
      // Reload list
      const { data } = await supabase
        .from('user_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setPendingUsers(data || []);
      
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(`Failed to approve: ${error.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    
    if (!window.confirm(`Reject user ${selectedUser.email}?`)) {
      setShowRejectModal(false);
      return;
    }
    
    setIsProcessing(selectedUser.id);
    
    try {
      const { error } = await supabase
        .from('user_approvals')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: rejectionReason || 'No reason provided',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success(`❌ ${selectedUser.email} rejected`);
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedUser(null);
      // Reload list
      const { data } = await supabase
        .from('user_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setPendingUsers(data || []);
      
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error(`Failed to reject: ${error.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const openRejectModal = (user) => {
    setSelectedUser(user);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  // Show loading while checking admin status
  if (!isAdmin && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  // Redirect if not admin
  if (!isAdmin) {
    return null; // useEffect will navigate away
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4 text-white shadow-lg sticky top-0 z-30">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Admin - User Approvals</h1>
              <p className="text-purple-100 text-sm">Review and approve new user registrations</p>
            </div>
          </div>
          
          {/* Admin Badge */}
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs font-medium">Admin</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Pending Approvals</p>
            <p className="text-2xl font-bold text-amber-600">{pendingUsers.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-blue-600">{pendingUsers.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Admin Users</p>
            <p className="text-2xl font-bold text-purple-600">1</p>
          </div>
        </div>

        {/* Pending Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pending User Approvals</h2>
            <button
              onClick={() => {
                setIsLoading(true);
                supabase
                  .from('user_approvals')
                  .select('*')
                  .eq('status', 'pending')
                  .order('created_at', { ascending: false })
                  .then(({ data }) => {
                    setPendingUsers(data || []);
                    setIsLoading(false);
                  });
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading pending users...</p>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 text-gray-500 font-medium">All caught up!</p>
              <p className="text-sm text-gray-400 mt-2">No pending user approvals</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                  <tr>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Signed Up</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(user.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApprove(user.id, user.email)}
                            disabled={isProcessing === user.id}
                            className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {isProcessing === user.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => openRejectModal(user)}
                            disabled={isProcessing === user.id}
                            className="flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {isProcessing === user.id ? '...' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900">Reject User</h3>
              <p className="text-sm text-gray-600 mt-1">
                Reject <strong>{selectedUser.email}</strong>?
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                rows="3"
                placeholder="e.g., Invalid email domain, duplicate account, etc."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedUser(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing === selectedUser.id}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isProcessing === selectedUser.id ? 'Processing...' : 'Reject User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;