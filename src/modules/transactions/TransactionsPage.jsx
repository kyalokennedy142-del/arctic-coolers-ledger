import React, { useState } from "react";
import { useData } from "../../context/DataContext";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const TransactionsPage = () => {

  const {
    customers,
    addTransaction,
    updateTransaction,
    deleteTransaction
  } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [newTransaction, setNewTransaction] = useState({
    customerId: "",
    date: new Date().toISOString().slice(0, 10),
    type: "Credit",
    amount: "",
    notes: ""
  });

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const openAddModal = () => {
    setEditingTransaction(null);

    setNewTransaction({
      customerId: "",
      date: new Date().toISOString().slice(0, 10),
      type: "Credit",
      amount: "",
      notes: ""
    });

    setIsModalOpen(true);
  };

  const openEditModal = (transaction) => {

    setEditingTransaction(transaction);

    setNewTransaction({
      customerId: transaction.customer_id,
      date: transaction.transaction_date,
      type: transaction.transaction_type,
      amount: transaction.amount,
      notes: transaction.notes || ""
    });

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!newTransaction.customerId) {
      toast.error("Select a customer");
      return;
    }

    const transactionData = {
      customer_id: newTransaction.customerId,
      transaction_date: newTransaction.date,
      transaction_type: newTransaction.type,
      amount: Number(newTransaction.amount),
      notes: newTransaction.notes || null
    };

    if (editingTransaction) {

      await updateTransaction(editingTransaction.id, transactionData);
      toast.success("Transaction updated");

    } else {

      await addTransaction(transactionData);
      toast.success("Transaction added");

    }

    closeModal();
  };

  const handleDelete = async (id) => {

    if (window.confirm("Delete transaction?")) {

      await deleteTransaction(id);
      toast.success("Transaction deleted");

    }

  };

  const customersWithTotals = (customers || []).map((customer) => {

    const totalCredit = (customer.transactions || [])
      .filter((t) => t.transaction_type === "Credit")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalPaid = (customer.transactions || [])
      .filter(
        (t) =>
          t.transaction_type === "Payment" ||
          t.transaction_type === "Paid"
      )
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const balance = totalCredit - totalPaid;

    return {
      ...customer,
      totalCredit,
      totalPaid,
      balance
    };
  });

  return (

    <div className="min-h-screen bg-slate-50 p-6">

      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER */}

        <header className="flex justify-between items-center">

          <div className="flex items-center gap-4">

            <Link
              to="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              ← Dashboard
            </Link>

            <h1 className="text-3xl font-bold text-blue-900">
              Transactions
            </h1>

          </div>

          <button
            onClick={openAddModal}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg"
          >
            Add Transaction
          </button>

        </header>

        {/* CUSTOMER TABLE */}

        <table className="w-full bg-white rounded-xl shadow">

          <thead>
            <tr className="border-b">

              <th className="p-4 text-left">Customer</th>
              <th className="p-4 text-left">Credit</th>
              <th className="p-4 text-left">Paid</th>
              <th className="p-4 text-left">Balance</th>

            </tr>
          </thead>

          <tbody>

            {customersWithTotals.map((customer) => (

              <tr key={customer.id} className="border-b">

                <td className="p-4">{customer.name}</td>

                <td className="p-4 text-red-600">
                  KSh {customer.totalCredit.toFixed(2)}
                </td>

                <td className="p-4 text-green-600">
                  KSh {customer.totalPaid.toFixed(2)}
                </td>

                <td className="p-4 font-semibold">
                  KSh {customer.balance.toFixed(2)}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

        {/* TRANSACTIONS LIST */}

        <table className="w-full bg-white rounded-xl shadow">

          <thead>
            <tr className="border-b">

              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Customer</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">Amount</th>
              <th className="p-4 text-left">Notes</th>
              <th className="p-4 text-right">Actions</th>

            </tr>
          </thead>

          <tbody>

            {customers.flatMap((customer) =>
              (customer.transactions || []).map((transaction) => (

                <tr key={transaction.id} className="border-b">

                  <td className="p-4">
                    {formatDate(transaction.transaction_date)}
                  </td>

                  <td className="p-4">
                    {customer.name}
                  </td>

                  <td className="p-4">

                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        transaction.transaction_type === "Credit"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {transaction.transaction_type}
                    </span>

                  </td>

                  <td className="p-4">
                    KSh {Number(transaction.amount).toFixed(2)}
                  </td>

                  <td className="p-4">
                    {transaction.notes || "-"}
                  </td>

                  <td className="p-4 text-right space-x-2">

                    <button
                      onClick={() => openEditModal(transaction)}
                      className="text-blue-600"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="text-red-600"
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              ))
            )}

          </tbody>

        </table>

      </div>

      {/* MODAL */}

      {isModalOpen && (

        <div className="fixed inset-0 flex items-center justify-center bg-black/50">

          <div className="bg-white p-6 rounded-xl w-96">

            <h2 className="text-xl font-bold mb-4">

              {editingTransaction
                ? "Edit Transaction"
                : "Add Transaction"}

            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">

              <select
                value={newTransaction.customerId}
                onChange={(e) =>
                  setNewTransaction({
                    ...newTransaction,
                    customerId: e.target.value
                  })
                }
                className="w-full border p-2 rounded"
                required
              >

                <option value="">Select Customer</option>

                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}

              </select>

              <input
                type="date"
                value={newTransaction.date}
                onChange={(e) =>
                  setNewTransaction({
                    ...newTransaction,
                    date: e.target.value
                  })
                }
                className="w-full border p-2 rounded"
              />

              <select
                value={newTransaction.type}
                onChange={(e) =>
                  setNewTransaction({
                    ...newTransaction,
                    type: e.target.value
                  })
                }
                className="w-full border p-2 rounded"
              >

                <option value="Credit">Credit</option>
                <option value="Payment">Payment</option>

              </select>

              <input
                type="number"
                placeholder="Amount"
                value={newTransaction.amount}
                onChange={(e) =>
                  setNewTransaction({
                    ...newTransaction,
                    amount: e.target.value
                  })
                }
                className="w-full border p-2 rounded"
                required
              />

              <textarea
                placeholder="Notes"
                value={newTransaction.notes}
                onChange={(e) =>
                  setNewTransaction({
                    ...newTransaction,
                    notes: e.target.value
                  })
                }
                className="w-full border p-2 rounded"
              />

              <div className="flex gap-3">

                <button
                  type="button"
                  onClick={closeModal}
                  className="border px-4 py-2 rounded w-full"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded w-full"
                >
                  Save
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

};

export default TransactionsPage;