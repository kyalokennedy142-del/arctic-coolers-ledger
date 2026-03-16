import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import toast from 'react-hot-toast';

const TABLE_OPTIONS = [
  { value: 'customers', label: 'Customers' },
  { value: 'brokers', label: 'Brokers' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'broker_ledger', label: 'Broker Ledger' },
  { value: 'purchases', label: 'Purchases' },
  { value: 'products', label: 'Products' },
  { value: 'bottles', label: 'Bottles' },
];

const DataImportModal = ({ isOpen, onClose }) => {
  const { importTableData } = useData();
  const [tableName, setTableName] = useState('customers');
  const [base64Data, setBase64Data] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(null);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!base64Data.trim()) {
      toast.error('Please paste Base64-encoded data');
      return;
    }
    
    setIsImporting(true);
    setProgress(null);
    
    try {
      const result = await importTableData(tableName, base64Data, setProgress);
      
      if (result.success) {
        setBase64Data('');
        onClose();
      }
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📥 Import Data</h3>
        
        <form onSubmit={handleImport} className="space-y-4">
          {/* Table selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Table
            </label>
            <select
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              disabled={isImporting}
            >
              {TABLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Base64 input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base64-Encoded Data
            </label>
            <textarea
              value={base64Data}
              onChange={(e) => setBase64Data(e.target.value)}
              placeholder="Paste Base64-encoded CSV or JSON here..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 h-32 font-mono text-sm focus:border-blue-500 focus:outline-none"
              disabled={isImporting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Tip: Use export function to get Base64 data, or encode CSV/JSON manually
            </p>
          </div>
          
          {/* Progress bar */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                Imported: {progress.imported}/{progress.total} • Errors: {progress.errors}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isImporting || !base64Data.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DataImportModal;