// src/modules/brokers/BrokerLedgerPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';  // ✅ ../../ not ../
import { supabase } from '../../lib/supabaseClient';  // ✅ ../../ not ../
import { formatKSH, formatPhoneForWhatsApp, formatPhoneForDisplay } from '../../utils/formatCurrency';  // ✅ ../../ not ../
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// Bottom Sheet Component
// ─────────────────────────────────────────────────────────────
const BottomSheet = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Add Broker Form
// ─────────────────────────────────────────────────────────────
const AddBrokerForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({ name: '', phone: '', area: '', opening_balance: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error, data } = await supabase.from('brokers').insert([{
        name: formData.name,
        phone: formData.phone,
        area: formData.area,
        opening_balance: parseFloat(formData.opening_balance) || 0
      }]).select().single();
      if (error) throw error;
      toast.success('Broker added!');
      onSuccess?.(data);
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Broker name" /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Phone number (e.g., 0712345678)" /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
        <input type="text" value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Area/Location" /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance (KSh)</label>
        <input type="number" value={formData.opening_balance} onChange={(e) => setFormData({...formData, opening_balance: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="0" step="1" /></div>
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">{isSaving ? 'Saving...' : 'Add Broker'}</button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────
// Entry Form (Add/Edit)
// ─────────────────────────────────────────────────────────────
const EntryForm = ({ broker, entry, previousBalance, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    date: entry?.date || new Date().toISOString().split('T')[0],
    bottles_taken: entry?.bottles_taken || '',
    amount: entry?.amount || '',
    amount_paid: entry?.amount_paid || ''
  });

  const dayName = useMemo(() => {
    if (!formData.date) return '';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(formData.date).getDay()];
  }, [formData.date]);

  const liveBalance = useMemo(() => {
    const amount = parseInt(formData.amount) || 0;
    const paid = parseInt(formData.amount_paid) || 0;
    return (previousBalance || 0) + amount - paid;
  }, [formData.amount, formData.amount_paid, previousBalance]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      day: dayName,
      balance: liveBalance,
      broker_id: broker.id,
      broker_name: broker.name
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
          <input type="text" value={dayName} disabled className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Bottles Taken</label>
        <input type="number" value={formData.bottles_taken} onChange={(e) => setFormData({...formData, bottles_taken: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Reference only" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (KSh) *</label>
          <input type="number" required min="0" step="1" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="0" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (KSh)</label>
          <input type="number" min="0" step="1" value={formData.amount_paid} onChange={(e) => setFormData({...formData, amount_paid: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="0" /></div>
      </div>
      <div className="text-sm text-gray-600">Previous Balance: <span className="font-semibold">{formatKSH(previousBalance || 0)}</span></div>
      <div className={`p-3 rounded-lg text-center font-semibold ${liveBalance >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>Live Balance: {formatKSH(liveBalance)}</div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">{entry ? 'Update Entry' : 'Add Entry'}</button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────
// Broker Card Component - ✅ Shows phone in 07XX format
// ─────────────────────────────────────────────────────────────
const BrokerCard = ({ broker, ledgerEntries, onExpand, isExpanded, onRefresh }) => {
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [statement, setStatement] = useState('');
  
  const currentBalance = useMemo(() => {
    if (!ledgerEntries || ledgerEntries.length === 0) return broker.opening_balance || 0;
    const lastEntry = ledgerEntries[ledgerEntries.length - 1];
    return lastEntry.balance || broker.opening_balance || 0;
  }, [ledgerEntries, broker.opening_balance]);

  const handleSaveEntry = async (entryData) => {
    try {
      if (editingEntry) {
        const { error } = await supabase.from('broker_ledger').update(entryData).eq('id', editingEntry.id);
        if (error) throw error;
        toast.success('Entry updated!');
      } else {
        const { error } = await supabase.from('broker_ledger').insert([entryData]);
        if (error) throw error;
        toast.success('Entry added!');
      }
      setShowEntryForm(false);
      setEditingEntry(null);
      onRefresh?.();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setShowEntryForm(true);
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Delete this entry?')) return;
    try {
      const { error } = await supabase.from('broker_ledger').delete().eq('id', entryId);
      if (error) throw error;
      toast.success('Entry deleted');
      onRefresh?.();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleGenerateStatement = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recent = ledgerEntries.filter(e => new Date(e.date) >= weekAgo).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let text = `🧊 ARCTIC COOLERS - BROKER STATEMENT\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `Broker: ${broker.name}\nPeriod: Last 7 days\n\n`;
    
    if (recent.length > 0) {
      text += `Date | Day | Bottles | Amount | Paid | Balance\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      recent.forEach(e => {
        const date = new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
        text += `${date} | ${e.day?.substring(0,3).padEnd(7)} | ${String(e.bottles_taken || 0).padStart(7)} | ${formatKSH(e.amount).padStart(9)} | ${formatKSH(e.amount_paid).padStart(9)} | ${formatKSH(e.balance)}\n`;
      });
    } else {
      text += `No transactions in the last 7 days.\n`;
    }
    
    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Current Balance: ${formatKSH(currentBalance)}\n\n`;
    text += `Thank you, Arctic Coolers! 🙏`;
    
    setStatement(text);
    toast.success('Statement generated!');
  };

  const handleSendWhatsApp = () => {
    if (!statement) { toast.error('Generate statement first'); return; }
    if (!broker.phone) { toast.error('No phone number'); return; }
    const phone = formatPhoneForWhatsApp(broker.phone);
    const encoded = encodeURIComponent(statement);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const previousBalance = editingEntry 
    ? (ledgerEntries.find(e => e.id === editingEntry.id)?.previous_balance || broker.opening_balance || 0)
    : currentBalance;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div onClick={() => onExpand(broker.id)} className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{broker.name}</h3>
            {/* ✅ Show phone in 07XX format */}
            {broker.phone && <p className="text-sm text-gray-500">📱 {formatPhoneForDisplay(broker.phone, 'local')}</p>}
            {broker.area && <p className="text-sm text-gray-500">📍 {broker.area}</p>}
          </div>
          <div className={`px-4 py-2 rounded-lg font-semibold ${currentBalance >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {formatKSH(currentBalance)}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {statement && (
            <textarea value={statement} onChange={(e) => setStatement(e.target.value)} className="w-full h-40 p-3 text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none resize-none" />
          )}
          
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setShowEntryForm(!showEntryForm); setEditingEntry(null); }} className={`px-4 py-2 rounded-lg font-medium ${showEntryForm ? 'bg-gray-200' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
              {showEntryForm ? 'Cancel' : '+ Add Entry'}
            </button>
            <button onClick={handleGenerateStatement} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              {statement ? 'Regenerate' : 'Generate Statement'}
            </button>
            <button onClick={handleSendWhatsApp} disabled={!statement || !broker.phone} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              💬 Send WhatsApp
            </button>
          </div>
          
          {showEntryForm && (
            <EntryForm broker={broker} entry={editingEntry} previousBalance={previousBalance} onSave={handleSaveEntry} onCancel={() => { setShowEntryForm(false); setEditingEntry(null); }} />
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Day</th><th className="px-4 py-3">Bottles</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledgerEntries?.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-3">{entry.day}</td>
                    <td className="px-4 py-3">{entry.bottles_taken || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatKSH(entry.amount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{formatKSH(entry.amount_paid)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatKSH(entry.balance)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleEditEntry(entry)} className="text-amber-600 hover:underline mr-3">Edit</button>
                      <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!ledgerEntries || ledgerEntries.length === 0) && <p className="text-center text-gray-500 py-4">No entries yet</p>}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Broker Ledger Page Component
// ─────────────────────────────────────────────────────────────
export default function BrokerLedgerPage() {
  const navigate = useNavigate();
  const { brokers, loading, error, refresh } = useData();
  
  const [expandedBrokerId, setExpandedBrokerId] = useState(null);
  const [showAddBrokerForm, setShowAddBrokerForm] = useState(false);
  const [brokerLedgers, setBrokerLedgers] = useState({});

  const fetchBrokerLedger = async (brokerId) => {
    try {
      const { data, error } = await supabase
        .from('broker_ledger')
        .select('*')
        .eq('broker_id', brokerId)
        .order('date', { ascending: true });
      
      if (error) throw error;
      setBrokerLedgers(prev => ({ ...prev, [brokerId]: data || [] }));
    } catch (err) {
      console.error('Error fetching broker ledger:', err);
      toast.error('Failed to load ledger entries');
    }
  };

  const handleExpand = async (brokerId) => {
    if (expandedBrokerId === brokerId) {
      setExpandedBrokerId(null);
    } else {
      setExpandedBrokerId(brokerId);
      await fetchBrokerLedger(brokerId);
    }
  };

  const handleAddBroker = (newBroker) => {
    setShowAddBrokerForm(false);
    refresh();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow">
        <p className="text-red-600 font-medium mb-2">⚠️ {error}</p>
        <button onClick={refresh} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 md:px-6 py-4 sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-white/20 rounded-lg">←</button>
            <div>
              <h1 className="text-xl font-bold">Broker Ledger</h1>
              <p className="text-sm opacity-90">Track broker transactions</p>
            </div>
          </div>
          <button onClick={() => setShowAddBrokerForm(true)} className="px-4 py-2 bg-white text-amber-700 rounded-lg hover:bg-amber-50 font-medium">+ Add Broker</button>
        </div>
      </header>
      
      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-4">
        {brokers?.map(broker => (
          <BrokerCard
            key={broker.id}
            broker={broker}
            ledgerEntries={brokerLedgers[broker.id] || []}
            onExpand={handleExpand}
            isExpanded={expandedBrokerId === broker.id}
            onRefresh={() => { if (expandedBrokerId === broker.id) fetchBrokerLedger(broker.id); }}
          />
        ))}
        
        {brokers?.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-500">No brokers yet</p>
            <button onClick={() => setShowAddBrokerForm(true)} className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">+ Add First Broker</button>
          </div>
        )}
      </main>
      
      {/* Add Broker Modal */}
      <BottomSheet isOpen={showAddBrokerForm} onClose={() => setShowAddBrokerForm(false)} title="Add New Broker">
        <AddBrokerForm onSuccess={handleAddBroker} onCancel={() => setShowAddBrokerForm(false)} />
      </BottomSheet>
    </div>
  );
}