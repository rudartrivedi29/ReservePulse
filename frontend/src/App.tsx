import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Layouts
import {
  PublicLayout,
  CustomerLayout,
  OrganiserLayout,
  AdminLayout,
} from './layouts';

// Pages
import {
  HomePage,
  NotFoundPage,
  DashboardPage,
  ServicesPage,
  CalendarPage,
  BookingsPage,
  ResourcesPage,
  AnalyticsPage,
  ProfilePage,
  UsersPage,
  SettingsPage,
  LoginPage,
  SignupPage,
  VerifyOtpPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  ServicePreviewPage,
  BookPage,
  BookingConfirmationPage,
  BookingDetailPage,
} from './pages';
import { DesignSystemShowcase } from './components/DesignSystemShowcase';
import { ErrorBoundary } from './components/common';
import './App.css';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider position="bottom-right">
            <Routes>
            {/* 1. Public & Auth Routes */}
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="services/preview/:shareToken" element={<ServicePreviewPage />} />
              <Route path="book" element={<BookPage />} />
              <Route path="book/:serviceId" element={<BookPage />} />
              <Route path="booking/confirmation/:bookingId" element={<BookingConfirmationPage />} />
              <Route path="book/confirmation/:bookingId" element={<BookingConfirmationPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="design-system" element={<DesignSystemShowcase />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
              <Route path="verify-otp" element={<VerifyOtpPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* 2. Customer Portal Routes (Protected) */}
            <Route
              path="/customer"
              element={
                <ProtectedRoute allowedRoles={['customer', 'admin']}>
                  <CustomerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/customer/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="book" element={<BookPage />} />
              <Route path="book/:serviceId" element={<BookPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
              <Route path="bookings/:bookingId/confirmation" element={<BookingConfirmationPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* 3. Organiser Workspace Routes (Protected) */}
            <Route
              path="/organiser"
              element={
                <ProtectedRoute allowedRoles={['organiser', 'admin']}>
                  <OrganiserLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/organiser/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="services/preview/:shareToken" element={<ServicePreviewPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* 4. Admin Console Routes (Protected) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="bookings/:bookingId" element={<BookingDetailPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="pulse" element={<HomePage />} />
              <Route path="design-system" element={<DesignSystemShowcase />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* 5. Catch-all Not Found Route */}
            <Route
              path="*"
              element={
                <PublicLayout>
                  <NotFoundPage />
                </PublicLayout>
              }
            />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
