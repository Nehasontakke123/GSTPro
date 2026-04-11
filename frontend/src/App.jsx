import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore, useThemeStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  const { isAuthenticated, initAuth, user } = useAuthStore();
  const { isDark, init } = useThemeStore();

  useEffect(() => {
    initAuth();
    init(isDark);
  }, []);

  const getDashboard = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'officer') return '/officer';
    return '/client';
  };

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        gutter={8}
        containerStyle={{ top: 20, right: 20 }}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
        }}
      />

      <Routes>
        {/* Public */}
        <Route path="/login"    element={!isAuthenticated ? <LoginPage />    : <Navigate to={getDashboard()} replace />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to={getDashboard()} replace />} />

        {/* Protected - Admin */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route element={<Layout />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>

        {/* Protected - Client */}
        <Route element={<ProtectedRoute roles={['client', 'admin']} />}>
          <Route element={<Layout />}>
            <Route path="/client" element={<ClientDashboard />} />
          </Route>
        </Route>

        {/* Protected - Officer */}
        <Route element={<ProtectedRoute roles={['officer', 'admin']} />}>
          <Route element={<Layout />}>
            <Route path="/officer" element={<OfficerDashboard />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/" element={isAuthenticated ? <Navigate to={getDashboard()} replace /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
