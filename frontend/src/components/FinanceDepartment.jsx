import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';

import { 
  DollarSign, 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  FileText,
  ThumbsUp,
  XCircle,
  RefreshCw,
  AlertCircle,
  Building,
  Users,
  Calendar
} from 'lucide-react';
import { API_BASE } from '@/lib/api';
import OrderStatusBar from '@/components/ui/OrderStatusBar';

const FinanceDepartment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [pendingSalesPayments, setPendingSalesPayments] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    recentTransactions: [],
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch purchase orders pending finance approval
  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch(`${API_BASE}/finance/purchase-orders`);
      if (!response.ok) throw new Error('Failed to fetch purchase orders');
      const data = await response.json();
      setPurchaseOrders(data);
    } catch (err) {
      setError('Failed to load purchase orders');
      console.error('Error fetching purchase orders:', err);
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE}/finance/dashboard`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error fetching dashboard data:', err);
    }
  };

  const fetchPendingSalesPayments = async () => {
    try {
      const res = await fetch(`${API_BASE}/finance/sales-payments/pending`);
      if (!res.ok) throw new Error('Failed to fetch pending sales payments');
      const data = await res.json();
      setPendingSalesPayments(data);
    } catch (err) {
      console.error('Error fetching pending sales payments:', err);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchPurchaseOrders(), fetchDashboardData(), fetchPendingSalesPayments()]);
    } catch (err) {
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    refreshData();
  }, []);
  
  const handleApproval = async (orderId, approved) => {
    try {
      const response = await fetch(`${API_BASE}/finance/purchase-orders/${orderId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved })
      });

      if (!response.ok) throw new Error('Failed to process approval');
      
      const data = await response.json();
      
      // Refresh data to get updated information
      await refreshData();
      
      toast({
        title: approved ? '✅ Finance Approved' : '❌ Purchase Rejected',
        description: approved ? `Order #${orderId} approved and sent to store for processing.` : `Order #${orderId} has been rejected.`,
        variant: approved ? 'default' : 'destructive'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to process the approval. Please try again.',
        variant: 'destructive'
      });
      console.error('Error handling approval:', err);
    }
  };

  const handleApproveSalesPayment = async (orderId, approved) => {
    try {
      const response = await fetch(`${API_BASE}/finance/sales-payments/${orderId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved })
      });
      if (!response.ok) throw new Error('Failed to update sales payment status');
      await refreshData();
      toast({
        title: approved ? 'Payment Approved' : 'Payment Rejected',
        description: `Sales order #${orderId} has been ${approved ? 'approved' : 'rejected'}.`
      });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update payment status', variant: 'destructive' });
      console.error('Error approving sales payment:', err);
    }
  };

  // Calculate material cost for display
  const calculateOrderCost = (materials) => {
    if (!materials || !Array.isArray(materials)) return 0;
    return materials.reduce((sum, material) => {
      const quantity = material.quantity || 0;
      const unitCost = material.unit_cost || 0;
      return sum + (quantity * unitCost);
    }, 0);
  };

  // Tab state: 0 = Finance Approval, 1 = Financial Performance Overview
  const [activeTab, setActiveTab] = useState(0);
  const approvalCount = (purchaseOrders?.length || 0) + (pendingSalesPayments?.length || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-800 text-lg font-medium">Loading Finance dashboard...</p>
          <p className="text-gray-600 text-sm mt-1">Please wait while we retrieve the data</p>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
    {/* Government Header */}
    <div className="max-w-7xl mx-auto bg-white shadow-md border-b-4 border-blue-800 rounded-b-lg">
      {/* Main Header */}
      <div className="px-4 py-6 sm:px-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
          {/* Left: Back + Title */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <Button
              onClick={() => navigate(user?.department === 'admin' ? '/dashboard/admin' : '/dashboard')}
              variant="outline"
              className="border border-gray-300 bg-white text-gray-800 text-sm placeholder-gray-500"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center shadow-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Finance Department</h1>
                <p className="text-gray-600 text-sm sm:text-base font-medium">
                  Financial Management & Approval System
                </p>
              </div>
            </div>
          </div>

          {/* User Info Panel */}
          <div className="bg-gradient-to-r from-green-50 to-indigo-50 border-2 border-green-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-gray-600 text-xs font-medium">Finance Team</p>
                <p className="text-green-600 text-xs font-medium">Financial Management</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
      
      {/* Order Status Bar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <OrderStatusBar className="mb-4" />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
        {/* Tabs */}
        <div className="flex space-x-2 border-b border-green-200 mb-8">
          <button
            className={`relative px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 0 ? 'border-green-700 text-green-800 bg-white' : 'border-transparent text-gray-500 bg-green-50 hover:text-green-700'}`}
            onClick={() => setActiveTab(0)}
          >
            Finance Approval
            {approvalCount > 0 && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {approvalCount}
              </span>
            )}
          </button>
          <button
            className={`px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 1 ? 'border-green-700 text-green-800 bg-white' : 'border-transparent text-gray-500 bg-green-50 hover:text-green-700'}`}
            onClick={() => setActiveTab(1)}
          >
            Financial Performance Overview
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 0 ? (
          <>
            {error && (
              <Card className="mb-6 bg-red-50 border-2 border-red-200 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-700 font-medium">{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Orders for Finance Approvals */}
            {purchaseOrders.length === 0 && pendingSalesPayments.length === 0 && (
              <Card className="bg-white border border-gray-300 shadow-sm">
                <CardContent className="p-8 text-center">
                  <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Orders for Finance Approvals</h3>
                  <p className="text-gray-600">All purchase orders and sales payments have been processed.</p>
                </CardContent>
              </Card>
            )}

            {/* Purchase Orders Awaiting Approval */}
            {purchaseOrders.length > 0 && (
              <Card className="mb-8 bg-white border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <CardTitle className="text-white flex items-center font-bold text-xl">
                    <FileText className="w-6 h-6 mr-3" />
                    Purchase Orders Awaiting Approval ({purchaseOrders.length})
                  </CardTitle>
                  <p className="text-blue-100 text-sm font-medium mt-1">Review and approve purchase requests</p>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {purchaseOrders.map(order => (
                    <motion.div 
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 bg-gray-50 border-2 border-gray-200 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="font-bold text-gray-900 text-lg">
                              Order #{order.id} - {order.productName}
                            </h3>
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full border border-amber-300">
                              {order.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="text-gray-700">
                              <span className="font-bold">Quantity:</span> {order.quantity} units
                            </div>
                            <div className="text-gray-700">
                              <span className="font-bold text-green-900">Total Cost : ₹ {calculateOrderCost(order.materials).toLocaleString()} </span> 
                            </div>
                            <div className="flex items-center text-gray-700">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span className="font-bold">Created:</span> {order.createdAt}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Materials List */}
                      {order.materials && order.materials.length > 0 && (
                        <div className="mb-4 p-4 bg-white border-2 border-gray-200 rounded-lg">
                          <p className="text-sm font-bold text-gray-900 mb-3">Required Materials:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {order.materials.map((material, index) => (
                              <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                                <span className="text-gray-900 font-medium">{material.name}</span>
                                <span className="text-gray-700 font-medium">
                                  {material.quantity} units × ₹{material.unit_cost || 0} = ₹{((material.quantity || 0) * (material.unit_cost || 0)).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-4 border-t border-gray-200">
                        <Button 
                          onClick={() => handleApproval(order.id, true)} 
                          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6"
                        >
                          <ThumbsUp className="w-4 h-4 mr-2"/>
                          Approve Purchase
                        </Button>
                        <Button 
                          onClick={() => handleApproval(order.id, false)} 
                          className="bg-red-600 hover:bg-red-700 text-white font-medium px-6"
                        >
                          <XCircle className="w-4 h-4 mr-2"/>
                          Reject Purchase
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Sales Payments Awaiting Finance Approval */}
            {pendingSalesPayments.length > 0 && (
              <Card className="mb-8 bg-white border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                  <CardTitle className="text-white flex items-center font-bold text-xl">
                    <FileText className="w-6 h-6 mr-3" />
                    Sales Payments Awaiting Approval ({pendingSalesPayments.length})
                  </CardTitle>
                  <p className="text-purple-100 text-sm font-medium mt-1">Review and approve sales payment requests</p>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {pendingSalesPayments.map(order => (
                    <motion.div 
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 bg-gray-50 border-2 border-gray-200 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="font-bold text-gray-900 text-lg">
                              Sales Order {order.orderNumber} - {order.customerName}
                            </h3>
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full border border-purple-300">
                              {order.paymentStatus.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="text-gray-700">
                              <span className="font-bold">Amount:</span> ₹{order.pendingApprovalAmount ?? order.finalAmount}
                            </div>
                            <div className="text-gray-700">
                              <span className="font-bold">Product:</span> {order.showroomProduct?.name}
                            </div>
                            <div className="flex items-center text-gray-700">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span className="font-bold">Requested:</span> {order.createdAt}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 pt-4 border-t border-gray-200">
                        <Button 
                          onClick={() => handleApproveSalesPayment(order.id, true)} 
                          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6"
                        >
                          <ThumbsUp className="w-4 h-4 mr-2"/>
                          Approve Payment
                        </Button>
                        <Button 
                          onClick={() => handleApproveSalesPayment(order.id, false)} 
                          className="bg-red-600 hover:bg-red-700 text-white font-medium px-6"
                        >
                          <XCircle className="w-4 h-4 mr-2"/>
                          Reject Payment
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          // Financial Performance Overview Tab
          <>
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white border-2 border-gray-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{dashboardData.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-gray-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">
                        ₹{dashboardData.totalExpenses.toLocaleString()}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className={`${dashboardData.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border-2 shadow-lg`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Net Profit</p>
                      <p className={`text-2xl font-bold ${dashboardData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        ₹{dashboardData.netProfit.toLocaleString()}
                      </p>
                    </div>
                    <span className="text-3xl">💰</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Financial Summary */}
            <Card className="bg-white border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white">
                <CardTitle className="text-white text-xl font-bold flex items-center">
                  <FileText className="w-6 h-6 mr-3" />
                  Financial Summary & Reports
                </CardTitle>
                <p className="text-gray-200 text-sm font-medium mt-1">Overall financial performance overview</p>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                    <span className="font-bold text-gray-900 text-lg">Total Revenue (from sold products)</span>
                    <span className="font-bold text-green-700 text-xl">+ ₹{dashboardData.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-red-50 border-2 border-red-200 rounded-lg">
                    <span className="font-bold text-gray-900 text-lg">Total Approved Expenses</span>
                    <span className="font-bold text-red-700 text-xl">- ₹{dashboardData.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-blue-50 border-4 border-blue-300 rounded-lg shadow-lg">
                    <span className="font-bold text-2xl text-gray-900">Net Profit</span>
                    <span className={`font-bold text-2xl ${dashboardData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      ₹{dashboardData.netProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="text-center text-gray-600">
            <p className="font-medium">
              © Financial Management & Approval System
            </p>
            <p className="text-sm mt-1">
              For financial queries, contact Finance IT Support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDepartment;