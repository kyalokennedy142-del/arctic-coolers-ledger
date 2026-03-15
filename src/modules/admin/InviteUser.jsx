import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const InviteUser = () => {
  const [email, setEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Memoized loader to prevent unnecessary re-renders
  const loadPendingInvites = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .neq('status', 'joined') // Shows pending and revoked if you want, or change to .eq('status', 'pending')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingInvites(data || []);
    } catch (error) {
      console.error('Error loading invites:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingInvites();
  }, [loadPendingInvites]);

  const handleInvite = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsInviting(true);

    try {
      // 1. Check if already exists in one call
      const { data: existing } = await supabase
        .from('invites')
        .select('status')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existing) {
        const msg = existing.status === 'joined' ? 'User already joined' : 'Email already has a pending invite';
        toast.error(msg);
        setIsInviting(false);
        return;
      }

      // 2. Insert new invite
      const { error: insertError } = await supabase
        .from('invites')
        .insert([{
          email: cleanEmail,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      toast.success(`Invite sent to ${cleanEmail}`);
      setEmail('');
      loadPendingInvites();
      
    } catch (error) {
      toast.error(`Invite failed: ${error.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (inviteId, inviteEmail) => {
    if (!window.confirm(`Revoke access for ${inviteEmail}?`)) return;

    // Optimistic Update: Remove from UI immediately for "snappy" feel
    const previousInvites = [...pendingInvites];
    setPendingInvites(pendingInvites.filter(inv => inv.id !== inviteId));

    try {
      const { error } = await supabase
        .from('invites')
        .delete() // Or update status to 'revoked' if you want to keep logs
        .eq('id', inviteId);

      if (error) throw error;
      toast.success('Invite removed');
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      setPendingInvites(previousInvites); // Rollback on error
      toast.error('Failed to revoke invite');
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/60 border border-white/40 rounded-3xl p-6 shadow-xl shadow-blue-900/5 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </span>
          Invite Staff
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
          {pendingInvites.length} Pending
        </span>
      </div>
      
      {/* Invite Form */}
      <form onSubmit={handleInvite} className="space-y-3 mb-8">
        <div className="relative group">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff.name@company.com"
            className="w-full bg-white/80 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all group-hover:border-slate-300"
            required
            disabled={isInviting}
          />
        </div>
        <button
          type="submit"
          disabled={isInviting || !email}
          className="w-full bg-slate-900 hover:bg-blue-600 text-white py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isInviting ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : 'Grant Access'}
        </button>
      </form>

      {/* Pending Invites List */}
      <div className="space-y-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">Current Pending Invites</p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-14 w-full bg-slate-100 animate-pulse rounded-2xl" />)}
          </div>
        ) : pendingInvites.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-3xl">
            <p className="text-slate-400 text-sm italic">No open invitations</p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="group flex items-center justify-between bg-white/40 hover:bg-white/80 border border-white/60 p-4 rounded-2xl transition-all"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-500 font-bold text-xs">
                    {invite.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-700 truncate">{invite.email}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(invite.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(invite.id, invite.email)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Revoke Invite"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteUser;