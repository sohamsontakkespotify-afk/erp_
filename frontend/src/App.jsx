import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import AuthPage from '@/pages/AuthPage';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import ProductionDashboard from '@/components/ProductionPlanning';
import PurchaseDashboard from '@/components/PurchaseDepartment';
import StoreDashboard from '@/components/StoreDepartment';
import AssemblyDashboard from '@/components/AssemblyTeam';
import FinanceDashboard from '@/components/FinanceDepartment';
import ShowroomDashboard from '@/components/ShowroomDepartment';
import SalesDashboard from '@/components/SalesDepartment';
import DispatchDashboard from '@/components/DispatchDepartment';
import WatchmanDashboard from '@/components/WatchmanDepartment';
import TransportDashboard from '@/components/TransportDepartment';
import HRDepartment from '@/components/HRDepartment';
import { useAuth } from '@/hooks/useAuth';


const ProtectedRoute = ({ user, department, children }) => {
    const location = useLocation();

    if (!user) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }
    // Admin can access everything
    if (user.department === 'admin') {
        return children;
    }
    if (user.department !== department) {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
};

const AdminRoute = ({ user, children }) => {
    const location = useLocation();

    if (!user) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }
    if (user.department !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
};


function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        {/* <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div> */}
      </div>
    );
  }

  // Determine the dashboard path based on user department
  const getDashboardPath = () => {
    if (!user) return '/auth';

    if (user.department === 'admin') {
      return '/dashboard/admin';
    } else if (user.department) {
      return `/dashboard/${user.department}`;
    } else {
      return '/dashboard';
    }
  };

  const dashboardPath = getDashboardPath();

  return (
    <Router>
      <Helmet>
        <title>ERP Management System</title>
        <meta name="description" content="Comprehensive ERP system for production, inventory, and department management" />
        <meta property="og:title" content="ERP Management System" />
        <meta property="og:description" content="Streamline your business operations with our advanced ERP solution" />
      </Helmet>

      <div className="min-h-screen">
        <Routes>
          <Route
            path="/auth"
            element={!user ? <AuthPage /> : <Navigate to={dashboardPath} replace />}
          />
          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />
          <Route
            path="/dashboard"
            element={user ? (user.department === 'admin' ? <Navigate to="/dashboard/admin" replace /> : <Dashboard />) : <Navigate to="/auth" replace />}
          />
          <Route path="/dashboard/admin" element={<AdminRoute user={user}><AdminDashboard /></AdminRoute>} />
          <Route path="/dashboard/production" element={<ProtectedRoute user={user} department="production"><ProductionDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/purchase" element={<ProtectedRoute user={user} department="purchase"><PurchaseDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/store" element={<ProtectedRoute user={user} department="store"><StoreDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/assembly" element={<ProtectedRoute user={user} department="assembly"><AssemblyDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/finance" element={<ProtectedRoute user={user} department="finance"><FinanceDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/showroom" element={<ProtectedRoute user={user} department="showroom"><ShowroomDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/sales" element={<ProtectedRoute user={user} department="sales"><SalesDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/dispatch" element={<ProtectedRoute user={user} department="dispatch"><DispatchDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/watchman" element={<ProtectedRoute user={user} department="watchman"><WatchmanDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/transport" element={<ProtectedRoute user={user} department="transport"><TransportDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/hr" element={<ProtectedRoute user={user} department="hr"><HRDepartment /></ProtectedRoute>} />
          <Route
            path="/"
            element={<Navigate to={dashboardPath} replace />}
          />
          <Route path="*" element={<Navigate to={dashboardPath} replace />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
