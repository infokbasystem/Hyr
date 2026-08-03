import { useState } from 'react'
import { Navigate, Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom'

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
import Reservations from './pages/operations/Reservations';
import Customers from './pages/operations/Customers';
import Customer from './pages/operations/Customer';
import Items from './pages/operations/Items';
import Item from './pages/operations/Item';

import FinanceOverview from './pages/finance/FinanceOverview'
import Invoice from './pages/finance/Invoice';
import InvoicesToAccount from './pages/finance/InvoicesToAccount';
import Invoices from './pages/finance/Invoices';
import FinanceSectionPlaceholder from './pages/finance/FinanceSectionPlaceholder';

import OfficeSettingsLayout from './pages/settings/OfficeSettingsLayout';
import OfficeCompanyInfo from './pages/settings/office/OfficeCompanyInfo';
import OfficeGeneralSettings from './pages/settings/office/OfficeGeneralSettings';
import OfficeDepartments from './pages/settings/office/OfficeDepartments';
import OfficeFinance from './pages/settings/office/OfficeFinance';
import OfficeMailTexts from './pages/settings/office/OfficeMailTexts';
import OfficeSmsTexts from './pages/settings/office/OfficeSmsTexts';
import OfficeWebBooking from './pages/settings/office/OfficeWebBooking';
import OfficeIntegrations from './pages/settings/office/OfficeIntegrations';
import SettingsSection from './pages/settings/SettingsSection';
import FortnoxRedirect from './pages/settings/FortnoxRedirect';
import Categories from './pages/settings/Categories';
import Models from './pages/settings/Models';
import ServiceTypes from './pages/settings/ServiceTypes';
import InsuranceCompanies from './pages/settings/InsuranceCompanies';
import Users from './pages/settings/Users';

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
        <Route path="reservations" element={<ProtectedRoute>< Reservations /></ProtectedRoute>} />
        <Route path="customers" element={<ProtectedRoute>< Customers /></ProtectedRoute>} />
        <Route path="items" element={<ProtectedRoute>< Items /></ProtectedRoute>} />
        <Route path="invoicestoaccount" element={<ProtectedRoute>< InvoicesToAccount /></ProtectedRoute>} />
      </Route>
      <Route path="customer" element={< OperationsLayout />}>
        <Route path="new" element={<ProtectedRoute>< Customer /></ProtectedRoute>} />
        <Route path=":id" element={<ProtectedRoute>< Customer /></ProtectedRoute>} />
      </Route>
      <Route path="item" element={< OperationsLayout />}>
        <Route path="new" element={<ProtectedRoute>< Item /></ProtectedRoute>} />
        <Route path=":id" element={<ProtectedRoute>< Item /></ProtectedRoute>} />
      </Route>
      <Route path="finance" element={< FinanceLayout />}>
        <Route index element={<ProtectedRoute>< FinanceOverview /></ProtectedRoute>} />
        <Route path="tobeinvoiced" element={<ProtectedRoute>< InvoicesToAccount /></ProtectedRoute>} />
        <Route path="invoices" element={<ProtectedRoute>< Invoices /></ProtectedRoute>} />
        <Route path="newinvoice" element={<Navigate to="/finance/invoice/new" replace />} />
        <Route path="exporttoaccounting" element={<ProtectedRoute>< InvoicesToAccount /></ProtectedRoute>} />
        <Route path="stocktaking" element={<ProtectedRoute>< FinanceSectionPlaceholder title="StockTaking" /></ProtectedRoute>} />
        <Route path="stockreport" element={<ProtectedRoute>< FinanceSectionPlaceholder title="StockReport" /></ProtectedRoute>} />
        <Route path="accountsreceivable" element={<ProtectedRoute>< FinanceSectionPlaceholder title="AccountsReceivable" /></ProtectedRoute>} />
        <Route path="invoice/new" element={<ProtectedRoute>< Invoice /></ProtectedRoute>} />
        <Route path="invoice/:id" element={<ProtectedRoute>< Invoice /></ProtectedRoute>} />  
        <Route path="invoicestoaccount" element={<ProtectedRoute>< InvoicesToAccount /></ProtectedRoute>} />
      </Route>
      <Route path="settings" element={< SettingsLayout />}>
        <Route index element={<Navigate to="office" replace />} />
        <Route path='office' element={<ProtectedRoute><OfficeSettingsLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="companyinfo" replace />} />
          <Route path='companyinfo' element={<OfficeCompanyInfo />} />
          <Route path='settings' element={<OfficeGeneralSettings />} />
          <Route path='departments' element={<OfficeDepartments />} />
          <Route path='finance' element={<OfficeFinance />} />
          <Route path='mailtexts' element={<OfficeMailTexts />} />
          <Route path='smstexts' element={<OfficeSmsTexts />} />
          <Route path='webbooking' element={<OfficeWebBooking />} />
          <Route path='integrations' element={<OfficeIntegrations />} />
        </Route>
        <Route path='users' element={<ProtectedRoute><Users /></ProtectedRoute>} />
        <Route path='categories' element={<ProtectedRoute><Categories /></ProtectedRoute>} />
        <Route path='models' element={<ProtectedRoute><Models /></ProtectedRoute>} />
        <Route path='insurancecompanies' element={<ProtectedRoute><InsuranceCompanies /></ProtectedRoute>} />
        <Route path='articles' element={<ProtectedRoute><SettingsSection title="Articles" /></ProtectedRoute>} />
        <Route path='servicetypes' element={<ProtectedRoute><ServiceTypes /></ProtectedRoute>} />
        <Route path='pricing' element={<ProtectedRoute><SettingsSection title="Pricing" /></ProtectedRoute>} />
        <Route path='currencies' element={<ProtectedRoute><SettingsSection title="Valutor" /></ProtectedRoute>} />
        <Route path='vat' element={<ProtectedRoute><SettingsSection title="Moms" /></ProtectedRoute>} />
        <Route path='accounts' element={<ProtectedRoute><SettingsSection title="Kontoplan" /></ProtectedRoute>} />
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
