import React, { createContext, useContext, useReducer } from 'react';

// ============================================
// 1. INITIAL STATE
// ============================================
const initialState = {
  customers: [],
  brokers: [],
  purchases: [],
};

// ============================================
// 2. LOCALSTORAGE HELPERS
// ============================================
const loadState = () => {
  try {
    const savedState = localStorage.getItem('aquaLedgerState');
    if (savedState) {
      return JSON.parse(savedState);
    }
  } catch (error) {
    console.error('Error loading state from localStorage:', error);
  }
  return initialState;
};

const saveState = (state) => {
  try {
    localStorage.setItem('aquaLedgerState', JSON.stringify(state));
  } catch (error) {
    console.error('Error saving state to localStorage:', error);
  }
};

// ============================================
// 3. ACTION TYPES
// ============================================
const ActionTypes = {
  ADD_CUSTOMER: 'ADD_CUSTOMER',
  UPDATE_CUSTOMER: 'UPDATE_CUSTOMER',
  DELETE_CUSTOMER: 'DELETE_CUSTOMER',
  ADD_TRANSACTION: 'ADD_TRANSACTION',
  UPDATE_TRANSACTION: 'UPDATE_TRANSACTION',
  DELETE_TRANSACTION: 'DELETE_TRANSACTION',
  ADD_BROKER: 'ADD_BROKER',
  UPDATE_BROKER: 'UPDATE_BROKER',
  DELETE_BROKER: 'DELETE_BROKER',
  ADD_ENTRY: 'ADD_ENTRY',
  UPDATE_ENTRY: 'UPDATE_ENTRY',
  DELETE_ENTRY: 'DELETE_ENTRY',
  ADD_PURCHASE: 'ADD_PURCHASE',
  UPDATE_PURCHASE: 'UPDATE_PURCHASE',
  DELETE_PURCHASE: 'DELETE_PURCHASE',
};

// ============================================
// 4. REDUCER FUNCTION
// ============================================
function dataReducer(state, action) {
  let newState;

  switch (action.type) {
    // ==================== CUSTOMERS ====================
    case ActionTypes.ADD_CUSTOMER:
      newState = {
        ...state,
        customers: [
          ...state.customers,
          { ...action.payload, id: Date.now(), transactions: [] },
        ],
      };
      saveState(newState);
      return newState;

    case ActionTypes.UPDATE_CUSTOMER:
      newState = {
        ...state,
        customers: state.customers.map((customer) =>
          customer.id === action.payload.id
            ? { ...customer, ...action.payload }
            : customer
        ),
      };
      saveState(newState);
      return newState;

    case ActionTypes.DELETE_CUSTOMER:
      newState = {
        ...state,
        customers: state.customers.filter(
          (customer) => customer.id !== action.payload
        ),
      };
      saveState(newState);
      return newState;

    case ActionTypes.ADD_TRANSACTION:
      newState = {
        ...state,
        customers: state.customers.map((customer) =>
          customer.id === action.payload.customerId
            ? {
                ...customer,
                transactions: [
                  { ...action.payload.transaction, id: Date.now() },
                  ...customer.transactions,
                ],
              }
            : customer
        ),
      };
      saveState(newState);
      return newState;

    case ActionTypes.UPDATE_TRANSACTION:
      newState = {
        ...state,
        customers: state.customers.map((customer) =>
          customer.id === action.payload.customerId
            ? {
                ...customer,
                transactions: customer.transactions.map((t) =>
                  t.id === action.payload.transactionId
                    ? { ...t, ...action.payload.transaction }
                    : t
                ),
              }
            : customer
        ),
      };
      saveState(newState);
      return newState;

    case ActionTypes.DELETE_TRANSACTION:
      newState = {
        ...state,
        customers: state.customers.map((customer) =>
          customer.id === action.payload.customerId
            ? {
                ...customer,
                transactions: customer.transactions.filter(
                  (t) => t.id !== action.payload.transactionId
                ),
              }
            : customer
        ),
      };
      saveState(newState);
      return newState;

    // ==================== BROKERS ====================
    case ActionTypes.ADD_BROKER:
      newState = {
        ...state,
        brokers: [
          ...state.brokers,
          { ...action.payload, id: Date.now(), entries: [] },
        ],
      };
      saveState(newState);
      return newState;

    case ActionTypes.UPDATE_BROKER:
      newState = {
        ...state,
        brokers: state.brokers.map((broker) =>
          broker.id === action.payload.id
            ? { ...broker, ...action.payload }
            : broker
        ),
      };
      saveState(newState);
      return newState;

    case ActionTypes.DELETE_BROKER:
      newState = {
        ...state,
        brokers: state.brokers.filter((broker) => broker.id !== action.payload),
      };
      saveState(newState);
      return newState;

    case ActionTypes.ADD_ENTRY:
      newState = {
        ...state,
        brokers: state.brokers.map((broker) =>
          broker.id === action.payload.brokerId
            ? {
                ...broker,
                entries: [
                  ...broker.entries,
                  { ...action.payload.entry, id: Date.now() },
                ],
              }
            : broker
        ),
      };
      saveState(newState);
      return newState;

    case ActionTypes.UPDATE_ENTRY:
      newState = {
        ...state,
        brokers: state.brokers.map((broker) =>
          broker.id === action.payload.brokerId
            ? {
                ...broker,
                entries: broker.entries.map((e) =>
                  e.id === action.payload.entryId
                    ? { ...e, ...action.payload.entry }
                    : e
                ),
              }
            : broker
        ),
      };
      saveState(newState);
      return newState;

    case ActionTypes.DELETE_ENTRY:
      newState = {
        ...state,
        brokers: state.brokers.map((broker) =>
          broker.id === action.payload.brokerId
            ? {
                ...broker,
                entries: broker.entries.filter(
                  (e) => e.id !== action.payload.entryId
                ),
              }
            : broker
        ),
      };
      saveState(newState);
      return newState;

    // ==================== PURCHASES ====================
    case ActionTypes.ADD_PURCHASE:
      newState = {
        ...state,
        purchases: [{ ...action.payload, id: Date.now() }, ...state.purchases],
      };
      saveState(newState);
      return newState;

    case ActionTypes.UPDATE_PURCHASE:
      newState = {
        ...state,
        purchases: state.purchases.map((purchase) =>
          purchase.id === action.payload.id
            ? { ...purchase, ...action.payload }
            : purchase
        ),
      };
      saveState(newState);
      return newState;

    case ActionTypes.DELETE_PURCHASE:
      newState = {
        ...state,
        purchases: state.purchases.filter(
          (purchase) => purchase.id !== action.payload
        ),
      };
      saveState(newState);
      return newState;

    // ==================== DEFAULT ====================
    default:
      return state;
  }
}

// ============================================
// 5. CREATE CONTEXT
// ============================================
const DataContext = createContext(null);

// ============================================
// 6. CUSTOM HOOK
// ============================================
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// ============================================
// 7. PROVIDER COMPONENT
// ============================================
export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, null, loadState);

  // ==================== CUSTOMER ACTIONS ====================
  const addCustomer = (customer) => {
    dispatch({ type: ActionTypes.ADD_CUSTOMER, payload: customer });
  };

  const updateCustomer = (customer) => {
    dispatch({ type: ActionTypes.UPDATE_CUSTOMER, payload: customer });
  };

  const deleteCustomer = (customerId) => {
    dispatch({ type: ActionTypes.DELETE_CUSTOMER, payload: customerId });
  };

  const addTransaction = (customerId, transaction) => {
    dispatch({
      type: ActionTypes.ADD_TRANSACTION,
      payload: { customerId, transaction },
    });
  };

  const updateTransaction = (customerId, transactionId, transaction) => {
    dispatch({
      type: ActionTypes.UPDATE_TRANSACTION,
      payload: { customerId, transactionId, transaction },
    });
  };

  const deleteTransaction = (customerId, transactionId) => {
    dispatch({
      type: ActionTypes.DELETE_TRANSACTION,
      payload: { customerId, transactionId },
    });
  };

  // ==================== BROKER ACTIONS ====================
  const addBroker = (broker) => {
    dispatch({ type: ActionTypes.ADD_BROKER, payload: broker });
  };

  const updateBroker = (broker) => {
    dispatch({ type: ActionTypes.UPDATE_BROKER, payload: broker });
  };

  const deleteBroker = (brokerId) => {
    dispatch({ type: ActionTypes.DELETE_BROKER, payload: brokerId });
  };

  const addEntry = (brokerId, entry) => {
    dispatch({ type: ActionTypes.ADD_ENTRY, payload: { brokerId, entry } });
  };

  const updateEntry = (brokerId, entryId, entry) => {
    dispatch({
      type: ActionTypes.UPDATE_ENTRY,
      payload: { brokerId, entryId, entry },
    });
  };

  const deleteEntry = (brokerId, entryId) => {
    dispatch({
      type: ActionTypes.DELETE_ENTRY,
      payload: { brokerId, entryId },
    });
  };

  // ==================== PURCHASE ACTIONS ====================
  const addPurchase = (purchase) => {
    dispatch({ type: ActionTypes.ADD_PURCHASE, payload: purchase });
  };

  const updatePurchase = (purchase) => {
    dispatch({ type: ActionTypes.UPDATE_PURCHASE, payload: purchase });
  };

  const deletePurchase = (purchaseId) => {
    dispatch({ type: ActionTypes.DELETE_PURCHASE, payload: purchaseId });
  };

  // ==================== HELPER FUNCTIONS ====================
  const getCustomerById = (customerId) => {
    return state.customers.find((c) => c.id === customerId);
  };

  const getBrokerById = (brokerId) => {
    return state.brokers.find((b) => b.id === brokerId);
  };

  const calculateCustomerBalance = (customer) => {
    if (!customer) return 0;
    const totalCredit = customer.transactions
      .filter((t) => t.type === 'Credit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPaid = customer.transactions
      .filter((t) => t.type === 'Payment')
      .reduce((sum, t) => sum + (t.paid || 0), 0);
    return totalCredit - totalPaid;
  };

  const calculateBrokerBalance = (broker) => {
    if (!broker) return 0;
    if (broker.entries.length === 0) return broker.openingBalance || 0;
    return broker.entries[broker.entries.length - 1].balance;
  };

  const getStats = () => {
    const totalCustomers = state.customers.length;

    const totalCredit = state.customers.reduce((sum, c) => {
      return (
        sum +
        c.transactions
          .filter((t) => t.type === 'Credit')
          .reduce((s, t) => s + (t.amount || 0), 0)
      );
    }, 0);

    const totalPaid = state.customers.reduce((sum, c) => {
      return (
        sum +
        c.transactions
          .filter((t) => t.type === 'Payment')
          .reduce((s, t) => s + (t.paid || 0), 0)
      );
    }, 0);

    const totalPurchases = state.purchases.reduce(
      (sum, p) => sum + (p.totalExpenditure || 0),
      0
    );
    const outstandingBalance = totalCredit - totalPaid;

    return {
      totalCustomers,
      totalCredit,
      totalPaid,
      totalPurchases,
      outstandingBalance,
      totalBrokers: state.brokers.length,
    };
  };

  // ==================== PROVIDE VALUE ====================
  const value = {
    // State
    customers: state.customers,
    brokers: state.brokers,
    purchases: state.purchases,

    // Customer Actions
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addTransaction,
    updateTransaction,
    deleteTransaction,

    // Broker Actions
    addBroker,
    updateBroker,
    deleteBroker,
    addEntry,
    updateEntry,
    deleteEntry,

    // Purchase Actions
    addPurchase,
    updatePurchase,
    deletePurchase,

    // Helper Functions
    getCustomerById,
    getBrokerById,
    calculateCustomerBalance,
    calculateBrokerBalance,
    getStats,
  };

  return (
    <DataContext.Provider value={value}>{children}</DataContext.Provider>
  );
}

export default DataContext;