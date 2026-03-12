import { createBrowserRouter } from "react-router-dom";
import Layout from "./layout";
import LoginPage from "../modules/auth/LoginPage";
import AuthGuard from "../lib/AuthGuard";

import DashboardPage from "../modules/dashboard/DashboardPage";
import CustomersPage from "../modules/customers/CustomersPage";
import TransactionsPage from "../modules/transactions/TransactionsPage";
import RemindersPage from "../modules/reminders/RemindersPage";
import PurchasesPage from "../modules/purchases/PurchasesPage";
import BrokersPage from "../modules/brokers/BrokersPage";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
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
// Add to the routes array:
{
  path: "/debug-env",
  element: (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🔍 Environment Debug</h2>
      <p><strong>Mode:</strong> {import.meta.env.MODE}</p>
      <p><strong>VITE_SUPABASE_URL:</strong> {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
      <p><strong>VITE_SUPABASE_ANON_KEY:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set (length: ' + import.meta.env.VITE_SUPABASE_ANON_KEY?.length + ')' : '❌ Missing'}</p>
      <p><strong>VITE_APP_PASSWORD:</strong> {import.meta.env.VITE_APP_PASSWORD ? '✅ Set' : '❌ Missing'}</p>
      <button onClick={() => console.log('🚀 Test log from debug page')}>
        Click to test console.log
      </button>
    </div>
  )
}


    ],
  },
]);

export default router;