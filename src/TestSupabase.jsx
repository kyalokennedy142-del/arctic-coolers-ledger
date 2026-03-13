import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const TestSupabase = () => {
  const [results, setResults] = useState([]);

  const addLog = (message, type = 'info') => {
    setResults(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  // Test Connection
  const testConnection = async () => {
    addLog('🔌 Testing Supabase connection...', 'info');
    
    try {
      const { data, error } = await supabase.from('customers').select('*').limit(1);
      
      if (error) throw error;
      
      addLog('✅ Connection successful!', 'success');
      addLog(`📊 Found ${data.length} customer(s) in Supabase`, 'success');
      toast.success('Supabase connected!');
    } catch (error) {
      addLog(`❌ Connection failed: ${error.message}`, 'error');
      toast.error('Connection failed');
    }
  };

  // Test Insert
  const testInsert = async () => {
    addLog('📝 Testing INSERT...', 'info');
    
    try {
      const testCustomer = {
        name: `Test ${Date.now()}`,
        phone: '0700000000',
        location: 'Test Location',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([testCustomer])
        .select()
        .single();

      if (error) throw error;

      addLog(`✅ Insert successful! Customer ID: ${data.id}`, 'success');
      addLog('🔍 Check Supabase Dashboard → Table Editor → customers', 'info');
      toast.success('Customer inserted!');
      return data.id;
    } catch (error) {
      addLog(`❌ Insert failed: ${error.message}`, 'error');
      toast.error('Insert failed');
      return null;
    }
  };

  // Test Select
  const testSelect = async () => {
    addLog('📖 Testing SELECT...', 'info');
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      addLog(`✅ Select successful! Found ${data.length} customers`, 'success');
      data.forEach(c => {
        addLog(`   - ${c.name} (${c.phone})`, 'info');
      });
      toast.success(`Found ${data.length} customers`);
    } catch (error) {
      addLog(`❌ Select failed: ${error.message}`, 'error');
      toast.error('Select failed');
    }
  };

  // Run All Tests
  const runAllTests = async () => {
    setResults([]);
    await testConnection();
    await new Promise(r => setTimeout(r, 500));
    await testSelect();
    await new Promise(r => setTimeout(r, 500));
    const insertedId = await testInsert();
    
    if (insertedId) {
      await new Promise(r => setTimeout(r, 500));
      addLog('🗑️ Cleaning up test data...', 'info');
      await supabase.from('customers').delete().eq('id', insertedId);
      addLog('✅ Test data cleaned up', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🧪 Supabase Test Page</h1>
            <p className="text-gray-500 mt-1">Test Supabase connection & CRUD operations</p>
          </div>
          <Link to="/" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            ← Back to App
          </Link>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">Supabase Client Status</h2>
          {supabase ? (
            <div className="flex items-center gap-2 text-green-600">
              <span className="text-2xl">✅</span>
              <span className="font-semibold">Supabase Client Initialized</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <span className="text-2xl">❌</span>
              <span className="font-semibold">Supabase Client NOT Initialized</span>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-2">
            URL: {import.meta.env.VITE_SUPABASE_URL?.substring(0, 40)}...
          </p>
        </div>

        {/* Test Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={runAllTests} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
            🚀 Run All Tests
          </button>
          <button onClick={testConnection} className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700">
            Test Connection
          </button>
          <button onClick={testSelect} className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700">
            View Customers
          </button>
          <button onClick={testInsert} className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700">
            Insert Test Customer
          </button>
        </div>

        {/* Results Log */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500">Click a button to run tests...</p>
            ) : (
              results.map((log, i) => (
                <div key={i} className={`mb-2 ${
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'error' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  <span className="text-gray-600">[{log.time}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">📋 What to Verify:</h3>
          <ol className="list-decimal list-inside space-y-1 text-yellow-700 text-sm">
            <li>Supabase Client Status shows ✅</li>
            <li>Click "Run All Tests" - all should pass</li>
            <li>Go to Supabase Dashboard → Table Editor → customers</li>
            <li>You should see test customer appear (then deleted after cleanup)</li>
          </ol>
        </div>

      </div>
    </div>
  );
};

export default TestSupabase;