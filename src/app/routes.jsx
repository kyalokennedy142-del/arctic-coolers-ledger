import { createBrowserRouter } from "react-router-dom";

// Layout & Auth
import Layout from "./layout";
import LoginPage from "../modules/auth/LoginPage";
import SignUpPage from "../modules/auth/SignUpPage";
import AuthGuard from "../lib/AuthGuard";

// Pages
import DashboardPage from "../modules/dashboard/DashboardPage";
import CustomersPage from "../modules/customers/CustomersPage";
import TransactionsPage from "../modules/transactions/TransactionsPage";
import RemindersPage from "../modules/reminders/RemindersPage";
import PurchasesPage from "../modules/purchases/PurchasesPage";
import BrokersPage from "../modules/brokers/BrokersPage";

// ✅ Admin Page
import AdminPage from "../modules/admin/AdminPage";

const router = createBrowserRouter([
  // Public routes
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignUpPage />,
  },
  
  // Protected routes (require login + approval)
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
      // ✅ Admin route (protected by AuthGuard + admin check in component)
      {
        path: "admin",
        element: <AdminPage />,
      },
    ],
  },
]);

export default router;