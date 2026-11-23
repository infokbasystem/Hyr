import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, createBrowserRouter, createRoutesFromElements, RouterProvider, useLocation } from 'react-router-dom'

import { AuthProvider } from "./AuthContext";
import ProtectedRoute from "./ProtectedRoute"
import DesktopLayout from './layouts/DesktopLayout'
import { getMobileRedirectTarget, isMobileDevice, isMobilePath, prefersDesktop } from './mobile/mobileRouting'


const MainLayout = lazy(() => import('./layouts/MainLayout'))
const OperationsLayout = lazy(() => import('./layouts/OperationsLayout'))
const FinanceLayout = lazy(() => import('./layouts/FinanceLayout'))
const SettingsLayout = lazy(() => import('./layouts/SettingsLayout'))

const Login = lazy(() => import('./pages/Login'))
const NotFound = lazy(() => import('./pages/NotFound'))
const SomethingWentWrong = lazy(() => import('./pages/SomethingWentWrong'))
const Overview = lazy(() => import('./pages/planning/Overview'))

const OperationsOverview = lazy(() => import('./pages/operations/Overview'))
const Reservation = lazy(() => import('./pages/operations/Reservation'))
const Reservations = lazy(() => import('./pages/operations/Reservations'))
const Customers = lazy(() => import('./pages/operations/Customers'))
const Customer = lazy(() => import('./pages/operations/Customer'))
const Items = lazy(() => import('./pages/operations/Items'))
const Item = lazy(() => import('./pages/operations/Item'))
const InOut = lazy(() => import('./pages/operations/InOut'))

const FinanceOverview = lazy(() => import('./pages/finance/FinanceOverview'))
const Invoice = lazy(() => import('./pages/finance/Invoice'))
const InvoicesToAccount = lazy(() => import('./pages/finance/InvoicesToAccount'))
const Invoices = lazy(() => import('./pages/finance/Invoices'))
const ToBeInvoiced = lazy(() => import('./pages/finance/ToBeInvoiced'))
const FinanceSectionPlaceholder = lazy(() => import('./pages/finance/FinanceSectionPlaceholder'))

const OfficeSettingsLayout = lazy(() => import('./pages/settings/OfficeSettingsLayout'))
const OfficeCompanyInfo = lazy(() => import('./pages/settings/office/OfficeCompanyInfo'))
const OfficeGeneralSettings = lazy(() => import('./pages/settings/office/OfficeGeneralSettings'))
const OfficeDepartments = lazy(() => import('./pages/settings/office/OfficeDepartments'))
const OfficeFinance = lazy(() => import('./pages/settings/office/OfficeFinance'))
const OfficeMailTexts = lazy(() => import('./pages/settings/office/OfficeMailTexts'))
const OfficeSmsTexts = lazy(() => import('./pages/settings/office/OfficeSmsTexts'))
const OfficeWebBooking = lazy(() => import('./pages/settings/office/OfficeWebBooking'))
const OfficeIntegrations = lazy(() => import('./pages/settings/office/OfficeIntegrations'))
const SettingsSection = lazy(() => import('./pages/settings/SettingsSection'))
const FortnoxRedirect = lazy(() => import('./pages/settings/FortnoxRedirect'))
const Categories = lazy(() => import('./pages/settings/Categories'))
const Models = lazy(() => import('./pages/settings/Models'))
const Articles = lazy(() => import('./pages/settings/Articles'))
const ServiceTypes = lazy(() => import('./pages/settings/ServiceTypes'))
const InsuranceCompanies = lazy(() => import('./pages/settings/InsuranceCompanies'))
const Currencies = lazy(() => import('./pages/settings/Currencies'))
const Vat = lazy(() => import('./pages/settings/Vat'))
const Accounts = lazy(() => import('./pages/settings/Accounts'))
const Users = lazy(() => import('./pages/settings/Users'))
const Pricing = lazy(() => import('./pages/settings/Pricing'))
const TinkPaymentDone = lazy(() => import('./pages/pay/TinkPaymentDone'))
const Reports = lazy(() => import('./pages/Reports'))
const Management = lazy(() => import('./pages/Management'))

const MobileShell = lazy(() => import('./mobile/MobileShell'))
const MobileAuthGuard = lazy(() => import('./mobile/MobileAuthGuard'))
const MobileLayout = lazy(() => import('./mobile/MobileLayout'))
const MobileLogin = lazy(() => import('./mobile/MobileLogin'))
const MobileInOutList = lazy(() => import('./mobile/pages/MobileInOutList'))
const MobileAvailableNow = lazy(() => import('./mobile/pages/MobileAvailableNow'))
const MobileAvailabilitySearch = lazy(() => import('./mobile/pages/MobileAvailabilitySearch'))
const MobileReservation = lazy(() => import('./mobile/pages/MobileReservation'))

// Sends phones from desktop entry points to /m unless the user has chosen the desktop version.
function AppShell() {
  const location = useLocation()
  const mobileTarget = !isMobilePath(location.pathname) && isMobileDevice() && !prefersDesktop()
    ? getMobileRedirectTarget(location.pathname)
    : null

  if (mobileTarget) {
    return <Navigate to={mobileTarget} replace state={location.state} />
  }

  return (
    <Suspense fallback={null}>
      <Outlet />
    </Suspense>
  )
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppShell />}>
      <Route path="m" element={<MobileShell />}>
        <Route path="login" element={<MobileLogin />} />
        <Route element={<MobileAuthGuard />}>
          <Route element={<MobileLayout />}>
            <Route index element={<Navigate to="out" replace />} />
            <Route path="out" element={<MobileInOutList key="return" type="return" />} />
            <Route path="upcoming" element={<MobileInOutList key="delivery" type="delivery" />} />
            <Route path="available" element={<MobileAvailableNow />} />
            <Route path="search" element={<MobileAvailabilitySearch />} />
            <Route path="reservation/:id" element={<MobileReservation />} />
            <Route path="*" element={<Navigate to="out" replace />} />
          </Route>
        </Route>
      </Route>
      <Route element={<DesktopLayout />}>
      <Route path="/" element={< MainLayout />}>
        <Route index element={<ProtectedRoute>< Overview /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute>< Reports /></ProtectedRoute>} />
        <Route path="management" element={<ProtectedRoute>< Management /></ProtectedRoute>} />
      </Route>
      <Route path="operations" element={< OperationsLayout />} handle={{ sectionMenu: true }}>
        <Route index element={<ProtectedRoute>< OperationsOverview /></ProtectedRoute>} />
        <Route path="reservation" element={<ProtectedRoute>< Reservation /></ProtectedRoute>} />
        <Route path="reservation/:id" element={<ProtectedRoute>< Reservation /></ProtectedRoute>} />
        <Route path="reservations" element={<ProtectedRoute>< Reservations /></ProtectedRoute>} />
        <Route path="customers" element={<ProtectedRoute>< Customers /></ProtectedRoute>} />
        <Route path="items" element={<ProtectedRoute>< Items /></ProtectedRoute>} />
        <Route path="in-out" element={<ProtectedRoute>< InOut /></ProtectedRoute>} />
        <Route path="invoicestoaccount" element={<ProtectedRoute>< InvoicesToAccount /></ProtectedRoute>} />
      </Route>
      <Route path="customer" element={< OperationsLayout />} handle={{ sectionMenu: true }}>
        <Route path="new" element={<ProtectedRoute>< Customer /></ProtectedRoute>} />
        <Route path=":id" element={<ProtectedRoute>< Customer /></ProtectedRoute>} />
      </Route>
      <Route path="item" element={< OperationsLayout />} handle={{ sectionMenu: true }}>
        <Route path="new" element={<ProtectedRoute>< Item /></ProtectedRoute>} />
        <Route path=":id" element={<ProtectedRoute>< Item /></ProtectedRoute>} />
      </Route>
      <Route path="finance" element={< FinanceLayout />} handle={{ sectionMenu: true }}>
        <Route index element={<ProtectedRoute>< FinanceOverview /></ProtectedRoute>} />
        <Route path="tobeinvoiced" element={<ProtectedRoute>< ToBeInvoiced /></ProtectedRoute>} />
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
      <Route path="settings" element={< SettingsLayout />} handle={{ sectionMenu: true }}>
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
        <Route path='articles' element={<ProtectedRoute><Articles /></ProtectedRoute>} />
        <Route path='servicetypes' element={<ProtectedRoute><ServiceTypes /></ProtectedRoute>} />
        <Route path='pricing' element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
        <Route path='currencies' element={<ProtectedRoute><Currencies /></ProtectedRoute>} />
        <Route path='vat' element={<ProtectedRoute><Vat /></ProtectedRoute>} />
        <Route path='accounts' element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
        <Route path='fortnoxredirect' element={<ProtectedRoute>< FortnoxRedirect /></ProtectedRoute>} />
      </Route>
      <Route path="something-went-wrong" element={< MainLayout />}>
        <Route index element={<ProtectedRoute>< SomethingWentWrong /></ProtectedRoute>} />
      </Route>
      </Route>
      <Route path="login" element={<Login />} />
      <Route path="pay/tink/done" element={<TinkPaymentDone />} />
      <Route path="*" element={< NotFound />} />

    </Route>
  )
)


function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
