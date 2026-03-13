import { createBrowserRouter } from "react-router-dom";
import Layout from "./layout";
import LoginPage from "../modules/auth/LoginPage";
import AuthGuard from "../lib/AuthGuard";
import TestSupabase from '../pages/TestSupabase';

import DashboardPage from "../modules/dashboard/DashboardPage";
import CustomersPage from "../modules/customers/CustomersPage";
import TransactionsPage from "../modules/transactions/TransactionsPage";
import RemindersPage from "../modules/reminders/RemindersPage";
import PurchasesPage from "../modules/purchases/PurchasesPage";
import BrokersPage from "../modules/brokers/BrokersPage";

const router = createBrowserRouter([
  // Login route (public)
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/test-supabase",
    element: <TestSupabase />,
  },
  // Protected routes (require login)
  {
    path: "/",
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "customers",
        element: <CustomersPage />,
      },
      {
        path: "transactions",
        element: <TransactionsPage />,
      },
      {
        path: "reminders",
        element: <RemindersPage />,
      },
      {
        path: "purchases",
        element: <PurchasesPage />,
      },
      {
        path: "brokers",
        element: <BrokersPage />,
      },
    ],
  },
]);

export default router;