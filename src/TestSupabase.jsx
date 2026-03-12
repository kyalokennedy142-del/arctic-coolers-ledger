import React, { useState } from 'react';
import { supabase } from './lib/supabaseClient';
import toast from 'react-hot-toast';

const TestSupabase = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');

  const testSave = async () => {
    setStatus('🔄 Saving...');
    console.log('🔄 Testing save:', { name, phone });
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ name, phone, location: 'Test' }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase error:', error);
        setStatus(`❌ Error: ${error.message}`);
        toast.error(`Failed: ${error.message}`);
        return;
      }
      
      console.log('✅ Saved:', data);
      setStatus('✅ Saved! Check Supabase dashboard');
      toast.success('Customer saved to Supabase!');
      setName('');
      setPhone('');
    } catch (err) {
      console.error('💥 Exception:', err);
      setStatus(`❌ Exception: ${err.message}`);
      toast.error('Unexpected error');
    }
  };

  return (
    <div style={{ padding: '20px', border: '2px solid #3b82f6', borderRadius: '8px', margin: '20px' }}>
      <h3>🧪 Supabase Test</h3>
      <input 
        placeholder="Name" 
        value={name} 
        onChange={e => setName(e.target.value)}
        style={{ margin: '5px', padding: '8px' }}
      />
      <input 
        placeholder="Phone" 
        value={phone} 
        onChange={e => setPhone(e.target.value)}
        style={{ margin: '5px', padding: '8px' }}
      />
      <button onClick={testSave} style={{ margin: '5px', padding: '8px 16px' }}>
        Test Save
      </button>
      <p><strong>Status:</strong> {status}</p>
      <p style={{ fontSize: '12px', color: '#666' }}>
        Open browser console (F12) for detailed logs
      </p>
    </div>
  );
};

export default TestSupabase;