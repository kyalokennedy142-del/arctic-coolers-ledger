import { createBrowserRouter } from "react-router-dom";
import Layout from "./layout";

import DashboardPage from "../modules/dashboard/DashboardPagetemp";
import CustomersPage from "../modules/customers/CustomersPage";
import TransactionsPage from "../modules/transactions/TransactionsPage";
import RemindersPage from "../modules/reminders/RemindersPage";
import PurchasesPage from "../modules/purchases/PurchasesPage";
import BrokersPage from "../modules/brokers/BrokersPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
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
