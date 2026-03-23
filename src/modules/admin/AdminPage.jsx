// src/modules/admin/AdminPage.jsx
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

  const ADMIN_EMAIL = 'kyalokennedy142@gmail.com';

  // ✅ 1. Check Admin Access
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
          toast.error('Admin access required');
          navigate('/');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Admin check error:', error);
        navigate('/');
      }
    };
    checkAdminAccess();
  }, [navigate]);

  // ✅ 2. Load Pending Users (with graceful error handling)
  useEffect(() => {
    if (!isAdmin) return;
    loadPendingUsers();
  }, [isAdmin]);

  const loadPendingUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // ✅ Handle "table not found" gracefully
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('⚠️ user_approvals table not found, showing empty list');
          setPendingUsers([]);
          return;
        }
        throw error;
      }
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Failed to load pending users:', error);
      toast.error('Failed to load pending users');
      setPendingUsers([]); // Fallback to empty list
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId, email) => {
    if (!window.confirm(`Approve user ${email}?`)) return;
    setIsProcessing(userId);
    try {
      const { error } = await supabase
        .from('user_approvals')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success(`✅ ${email} approved!`);
      loadPendingUsers();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    setIsProcessing(selectedUser.id);
    try {
      const { error } = await supabase
        .from('user_approvals')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason || 'No reason provided',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;
      toast.success(`❌ Rejected`);
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedUser(null);
      loadPendingUsers();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsProcessing(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-linear-to-r from-blue-700 to-cyan-600 px-6 py-8 text-white shadow-xl sticky top-0 z-30">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-all">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Control Center</h1>
              <p className="text-blue-100 opacity-80">Arctic Coolers Ledger Staff Management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6 lg:p-8">
        {/* TOP SECTION: Stats Only (InviteUser removed) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          
          {/* Stats Cards - Now full width */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
              <p className="text-slate-500 font-medium">Waiting for Approval</p>
              <p className="text-4xl font-black text-amber-500">{pendingUsers.length}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
              <p className="text-slate-500 font-medium">System Status</p>
              <p className="text-xl font-bold text-emerald-500 flex items-center gap-2">
                <span className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse"></span>
                Security Active
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Approval Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800">Registration Requests</h2>
            <button onClick={loadPendingUsers} className="text-blue-600 font-semibold hover:underline">Refresh List</button>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-20 text-center text-slate-400">Loading requests...</div>
            ) : pendingUsers.length === 0 ? (
              <div className="p-20 text-center">
                <p className="text-slate-400 italic font-medium text-lg">No pending requests at the moment.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-8 py-4">Staff Email</th>
                    <th className="px-8 py-4">Request Date</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-8 py-5 font-bold text-slate-700">{user.email}</td>
                      <td className="px-8 py-5 text-slate-500 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="px-8 py-5">
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => handleApprove(user.id, user.email)}
                            disabled={isProcessing === user.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95"
                          >
                            {isProcessing === user.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button 
                            onClick={() => { setSelectedUser(user); setShowRejectModal(true); }}
                            disabled={isProcessing === user.id}
                            className="bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 px-5 py-2 rounded-xl text-sm font-bold transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Deny Access</h3>
            <p className="text-slate-500 mb-6">Explain why {selectedUser.email} is being rejected.</p>
            <textarea
              className="w-full border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-red-500 outline-none mb-6"
              rows="3"
              placeholder="Reason (optional)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-4">
              <button 
                onClick={() => { setShowRejectModal(false); setSelectedUser(null); setRejectionReason(''); }} 
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject} 
                disabled={isProcessing === selectedUser.id}
                className="flex-1 bg-red-600 text-white rounded-2xl py-3 font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isProcessing === selectedUser.id ? 'Processing...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;