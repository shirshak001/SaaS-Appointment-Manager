import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import SplashScreen from './components/ui/SplashScreen';
import AppLayout from './components/layout/AppLayout';
import RoleGuard from './components/ui/RoleGuard';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import CreateAppointment from './pages/CreateAppointment';
import AppointmentDetails from './pages/AppointmentDetails';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import Calendar from './pages/Calendar';
import Customers from './pages/Customers';
import CustomerProfile from './pages/CustomerProfile';
import Reports from './pages/Reports';

export default function App() {
  const [splashDone, setSplashDone] = useState(() => {
    // Only show splash once per session
    const shown = sessionStorage.getItem('rf_splash_done');
    return shown === 'true';
  });

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('rf_splash_done', 'true');
    setSplashDone(true);
  }, []);

  return (
    <ThemeProvider>
      {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/appointments/new" element={<CreateAppointment />} />
                <Route path="/appointments/:id" element={<AppointmentDetails />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:phone" element={<CustomerProfile />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/reports" element={<RoleGuard><Reports /></RoleGuard>} />
                <Route path="/settings" element={<RoleGuard><Settings /></RoleGuard>} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
