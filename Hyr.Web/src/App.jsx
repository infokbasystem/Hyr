import { useState } from 'react'
import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom'

import { AuthProvider } from "./AuthContext";
import { useAuth } from "./hooks/AuthProvider";
import ProtectedRoute from "./ProtectedRoute"


import MainLayout from './layouts/MainLayout'
import OperationsLayout from './layouts/OperationsLayout'
import FinanceLayout from './layouts/FinanceLayout'
import SettingsLayout from './layouts/SettingsLayout';

import Login from './pages/Login'
import NotFound from './pages/NotFound'
import SomethingWentWrong from './pages/SomethingWentWrong'
import Overview from './pages/Overview'

import OperationsOverview from './pages/operations/Overview'
import Reservation from './pages/operations/Reservation';
import ReservationSearch from './pages/operations/ReservationSearch';
import CustomerSearch from './pages/operations/CustomerSearch';
import Customer from './pages/operations/Customer';

import FinanceOverview from './pages/finance/FinanceOverview'
import Invoice from './pages/finance/Invoice';
import InvoicesToAccount from './pages/finance/InvoicesToAccount';
import SearchInvoice from './pages/finance/SearchInvoice';

import SettingsOverview from './pages/settings/SettingsOverview';
import FortnoxRedirect from './pages/settings/FortnoxRedirect';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      {/* <Route element={<ProtectedRoute />}>
      </Route> */}
      <Route path="/" element={< MainLayout />}>
        <Route index element={<ProtectedRoute>< Overview /></ProtectedRoute>} />
      </Route>
      <Route path="operations" element={< OperationsLayout />}>
        <Route index element={<ProtectedRoute>< OperationsOverview /></ProtectedRoute>} />
        <Route path="reservation" element={<ProtectedRoute>< Reservation /></ProtectedRoute>} />
        <Route path="reservation/:id" element={<ProtectedRoute>< Reservation /></ProtectedRoute>} />
        <Route path="searchreservation" element={<ProtectedRoute>< ReservationSearch /></ProtectedRoute>} />
        <Route path="searchcustomer" element={<ProtectedRoute>< CustomerSearch /></ProtectedRoute>} />
        <Route path="invoicestoaccount" element={<ProtectedRoute>< InvoicesToAccount /></ProtectedRoute>} />
      </Route>
      <Route path="customer" element={< OperationsLayout />}>
        <Route path="new" element={<ProtectedRoute>< Customer /></ProtectedRoute>} />
        <Route path=":id" element={<ProtectedRoute>< Customer /></ProtectedRoute>} />
      </Route>
      <Route path="finance" element={< FinanceLayout />}>
        <Route index element={<ProtectedRoute>< FinanceOverview /></ProtectedRoute>} />
        <Route path="invoice/:id" element={<ProtectedRoute>< Invoice /></ProtectedRoute>} />  
        <Route path="invoicestoaccount" element={<ProtectedRoute>< InvoicesToAccount /></ProtectedRoute>} />
        <Route path="searchinvoice" element={<ProtectedRoute>< SearchInvoice /></ProtectedRoute>} />
      </Route>
      <Route path="settings" element={< SettingsLayout />}>
        <Route index element={<ProtectedRoute>< SettingsOverview /></ProtectedRoute>} />
        <Route path='fortnoxredirect' element={<ProtectedRoute>< FortnoxRedirect /></ProtectedRoute>} />
      </Route>
      <Route path="something-went-wrong" element={< MainLayout />}>
        <Route index element={<ProtectedRoute>< SomethingWentWrong /></ProtectedRoute>} />
      </Route>
      <Route path="login" element={<Login />} />
      <Route path="*" element={< NotFound />} />

    </Route>
  )
)


function App() {
  const [count, setCount] = useState(0)
  const auth = useAuth();

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
