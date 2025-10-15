import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

import { 
  Wrench, 
  Package, 
  CheckCircle, 
  Clock,
  ArrowLeft,
  Play,
  Pause,
  Square,
  Star,
  RefreshCw,
  Building,
  Users
} from 'lucide-react';
import { API_BASE as API_BASE_URL } from '@/lib/api';
import OrderStatusBar from '@/components/ui/OrderStatusBar';

import { useMediaQuery } from "react-responsive";

const AssemblyTeam = () => {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isDesktop = useMediaQuery({ minWidth: 769 });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  useEffect(() => {
    fetchAssemblyOrders();
    fetchPurchaseOrders();
  }, []);

  const fetchAssemblyOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/assembly-orders`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        const errorData = await response.text();
        console.error('Failed to fetch orders:', response.status, errorData);
        toast({ title: "Error", description: "Failed to fetch assembly orders", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error fetching assembly orders:', error);
      toast({ title: "Error", description: "Failed to connect to server", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Filter orders with status 'rework' for reassembly
  const reworkOrders = orders.filter(order => order.status === 'rework');


  const fetchPurchaseOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/purchase-orders`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setPurchaseOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      setPurchaseOrders([]);
    }
  };

  const updateAssemblyOrder = async (orderId, updateData) => {
    try {
      setUpdating(prev => ({ ...prev, [orderId]: true }));
      console.log('Updating order:', orderId, 'with data:', updateData);
      
      const response = await fetch(`${API_BASE_URL}/assembly-orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        console.log('Updated order received:', updatedOrder);
        
        // Update the orders state with the new data
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? updatedOrder : order
          )
        );
        
        return updatedOrder;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Update failed:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to update assembly order');
      }
    } catch (error) {
      console.error('Error updating assembly order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update assembly order",
        variant: "destructive"
      });
      return null;
    } finally {
      setUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const startAssembly = async (orderId) => {
    const updateData = {
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      progress: 0
    };

    const updatedOrder = await updateAssemblyOrder(orderId, updateData);
    if (updatedOrder) {
      toast({
        title: "🔧 Assembly Started!",
        description: "Production has begun for this order.",
      });
    }
  };

  const updateProgress = async (orderId, progressIncrement) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      return;
    }

    const currentProgress = order.progress || 0;
    const newProgress = Math.min(currentProgress + progressIncrement, 100);
    
    console.log(`Updating progress for order ${orderId}: ${currentProgress} -> ${newProgress}`);
    
    const updateData = {
      progress: newProgress
    };

    const updatedOrder = await updateAssemblyOrder(orderId, updateData);
    if (updatedOrder) {
      toast({
        title: "📈 Progress Updated",
        description: `Assembly progress: ${newProgress}%`,
      });
    }
  };

  const completeAssembly = async (orderId) => {
    const updateData = {
      status: 'completed',
      completedAt: new Date().toISOString(),
      progress: 100,
      qualityCheck: true,
      testingPassed: true
    };

    const updatedOrder = await updateAssemblyOrder(orderId, updateData);
    if (updatedOrder) {
      // Also create a showroom product
      try {
        const order = orders.find(o => o.id === orderId);
        const showroomResponse = await fetch(`${API_BASE_URL}/showroom/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: order.productName,
            category: 'General',
            costPrice: calculateCostPrice(order),
            salePrice: calculateSalePrice(order),
            productionOrderId: order.productionOrderId
          })
        });

        

        if (showroomResponse.ok) {
          toast({
            title: "✅ Assembly Completed!",
            description: "Product is ready for showroom display after quality testing.",
          });
        } else {
          toast({
            title: "✅ Assembly Completed!",
            description: "Product is ready for showroom display after quality testing.",
          });
        }
      } catch (error) {
        toast({
          title: "✅ Assembly Completed!",
          description: "Product is ready for showroom display after quality testing.",
        });
      }
    }
  };

  const pauseAssembly = async (orderId) => {
    const updateData = {
      status: 'paused',
      pausedAt: new Date().toISOString()
    };

    const updatedOrder = await updateAssemblyOrder(orderId, updateData);
    if (updatedOrder) {
      toast({
        title: "⏸️ Assembly Paused",
        description: "Assembly has been temporarily paused.",
      });
    }
  };

  const resumeAssembly = async (orderId) => {
    const updateData = {
      status: 'in_progress',
      resumedAt: new Date().toISOString()
    };

    const updatedOrder = await updateAssemblyOrder(orderId, updateData);
    if (updatedOrder) {
      toast({
        title: "▶️ Assembly Resumed",
        description: "Assembly work has been resumed.",
      });
    }
  };

  // Helper functions for pricing (you can adjust these based on your business logic)
  const calculateCostPrice = (order) => {
    return (order.quantity || 1) * 100; // Base cost calculation
  };

  const calculateSalePrice = (order) => {
    return calculateCostPrice(order) * 1.5; // 50% markup
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'in_progress': return 'bg-blue-50 text-blue-800 border border-blue-200';
      case 'paused': return 'bg-orange-50 text-orange-800 border border-orange-200';
      case 'completed': return 'bg-green-50 text-green-800 border border-green-200';
      default: return 'bg-gray-50 text-gray-800 border border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  // Tab logic
  const [activeTab, setActiveTab] = useState(0); // 0 = Pending, 1 = Completed
  const pendingStatuses = ['pending', 'in_progress', 'paused'];
  const completedStatuses = ['completed'];
  const pendingOrders = orders.filter(order => pendingStatuses.includes(order.status));
  const completedOrders = orders.filter(order => completedStatuses.includes(order.status));
  const pendingCount = pendingOrders.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-800 text-lg font-medium">Loading Assembly dashboard...</p>
          <p className="text-gray-600 text-sm mt-1">Please wait while we retrieve the data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto bg-white shadow-md border-b-4 border-orange-800 rounded-b-lg">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            {/* Left: Back + Title */}
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <Button
                onClick={() => navigate(user?.department === 'admin' ? '/dashboard/admin' : '/dashboard')}
                variant="outline"
                className="border border-gray-300 bg-white text-gray-800 text-sm placeholder-gray-500 w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-800 rounded-lg flex items-center justify-center shadow-lg">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Assembly Operations</h1>
                  <p className="text-gray-600 text-sm sm:text-base font-medium">Product Assembly Management System</p>
                </div>
              </div>
            </div>
            {/* Right: User Panel */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-gray-900 font-bold text-sm">Assembly Team</p>
                  <p className="text-orange-600 text-xs font-medium">Product Assembly Management</p>
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

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex space-x-2 border-b border-orange-200 mb-8">
          <button
            className={`relative px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 0 ? 'border-orange-700 text-orange-800 bg-white' : 'border-transparent text-gray-500 bg-orange-50 hover:text-orange-700'}`}
            onClick={() => setActiveTab(0)}
          >
            Pending Assembly
            {pendingCount > 0 && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            className={`px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 1 ? 'border-orange-700 text-orange-800 bg-white' : 'border-transparent text-gray-500 bg-orange-50 hover:text-orange-700'}`}
            onClick={() => setActiveTab(1)}
          >
            Completed Assembly Orders
          </button>
        </div>
      </div>

      {/* Rework Orders */}
      {reworkOrders.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-800">Rework Required</h2>
                <p className="text-red-600 text-sm">Products that failed showroom testing and need reassembly</p>
              </div>
            </div>
            <div className="space-y-4">
              {reworkOrders.map((order) => (
                <Card key={`rework-${order.id}`} className="bg-white border-2 border-red-200 shadow-lg">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-red-800 text-xl font-bold">
                          {order.productName}
                        </CardTitle>
                        <p className="text-gray-700 mt-1 font-medium">
                          Assembly Order #{order.id} | Production Order #{order.productionOrderId}
                        </p>
                        <p className="text-gray-700 mt-1 font-medium">
                          Quantity: {order.quantity}
                        </p>
                        <p className="text-red-600 text-sm font-medium">
                          Status: Failed showroom testing - requires rework
                        </p>
                      </div>
                      <Badge className="bg-red-100 text-red-800 border border-red-300 font-bold">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Rework Required
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => startAssembly(order.id)}
                        disabled={updating[order.id]}
                        className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 font-medium"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Rework Assembly
                      </Button>
                      <Button
                        onClick={() => updateProgress(order.id, 100)}
                        disabled={updating[order.id]}
                        className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 font-medium"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Rework
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {activeTab === 0 ? (
            // Pending Assembly Tab
            pendingOrders.length === 0 ? (
              <Card className="bg-white border-2 border-gray-200 shadow-lg">
                <CardContent className="p-8 text-center">
                  <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Pending Assembly Orders</h3>
                  <p className="text-gray-600">Assembly orders will appear here when materials are ready.</p>
                </CardContent>
              </Card>
            ) : (
              pendingOrders.map((order, index) => (
                <div key={order.id} className="opacity-100 translate-y-0">
                  {/* ...existing card rendering for each order... */}
                  <Card className="bg-white border-2 border-gray-200 shadow-lg">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-gray-900 text-xl font-bold">
                            {order.productName}
                          </CardTitle>
                          <p className="text-gray-700 mt-1 font-medium">
                            Assembly Order #{order.id} | Production Order #{order.productionOrderId}
                          </p>
                          <p className="text-gray-700 mt-1 font-medium">
                            Quantity: {order.quantity}
                          </p>
                          <p className="text-gray-600 text-sm font-medium">
                            Created: {(
                              purchaseOrders.find(p => p.productionOrderId === order.productionOrderId)?.createdAt
                            ) || order.createdAt}
                          </p>
                          {order.startedAt && (
                            <p className="text-blue-700 text-sm font-medium">
                              Started: {new Date(order.startedAt).toLocaleDateString()}
                            </p>
                          )}
                          {order.completedAt && (
                            <p className="text-green-700 text-sm font-medium">
                              Completed: {new Date(order.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className={`${getStatusColor(order.status)} font-bold`}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1 capitalize">
                              {order.status?.replace('_', ' ') || 'Pending'}
                            </span>
                          </Badge>
                          {updating[order.id] && (
                            <div className="flex items-center text-blue-600 text-sm font-medium">
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              Updating...
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(order.status === 'in_progress' || order.status === 'paused') && (
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-gray-900 font-bold">Assembly Progress</span>
                              <span className="text-blue-600 font-bold">{order.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-300 rounded-full h-3">
                              <div 
                                className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${order.progress || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        {order.status === 'in_progress' && (order.progress || 0) < 100 && (
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => updateProgress(order.id, 25)}
                              size="sm"
                              disabled={updating[order.id]}
                              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 font-medium"
                            >
                              +25% Progress
                            </Button>
                            <Button
                              onClick={() => updateProgress(order.id, 50)}
                              size="sm"
                              disabled={updating[order.id]}
                              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 font-medium"
                            >
                              +50% Progress
                            </Button>
                            <Button
                              onClick={() => updateProgress(order.id, 100 - (order.progress || 0))}
                              size="sm"
                              disabled={updating[order.id]}
                              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 font-medium"
                            >
                              Complete (100%)
                            </Button>
                          </div>
                        )}
                        <div className="flex space-x-3 pt-4">
                          {order.status === 'pending' && (
                            <Button
                              onClick={() => startAssembly(order.id)}
                              disabled={updating[order.id]}
                              className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 font-medium"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start Assembly
                            </Button>
                          )}
                          {order.status === 'in_progress' && (
                            <>
                              <Button
                                onClick={() => pauseAssembly(order.id)}
                                variant="outline"
                                disabled={updating[order.id]}
                                className="border-2 border-amber-300 text-amber-700 hover:disabled:opacity-50 font-medium"
                              >
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                              </Button>
                              {(order.progress || 0) >= 100 && (
                                <Button
                                  onClick={() => completeAssembly(order.id)}
                                  disabled={updating[order.id]}
                                  className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 font-medium"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Complete & Test
                                </Button>
                              )}
                            </>
                          )}
                          {order.status === 'paused' && (
                            <Button
                              onClick={() => resumeAssembly(order.id)}
                              disabled={updating[order.id]}
                              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 font-medium"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Resume Assembly
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            )
          ) : (
            // Completed Assembly Orders Tab
            completedOrders.length === 0 ? (
              <Card className="bg-white border-2 border-gray-200 shadow-lg">
                <CardContent className="p-8 text-center">
                  <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Completed Assembly Orders</h3>
                  <p className="text-gray-600">Completed assembly orders will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              completedOrders.map((order, index) => (
                <div key={order.id} className="opacity-100 translate-y-0">
                  <Card className="bg-white border-2 border-gray-200 shadow-lg">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-gray-900 text-xl font-bold">
                            {order.productName}
                          </CardTitle>
                          <p className="text-gray-700 mt-1 font-medium">
                            Assembly Order #{order.id} | Production Order #{order.productionOrderId}
                          </p>
                          <p className="text-gray-700 mt-1 font-medium">
                            Quantity: {order.quantity}
                          </p>
                          <p className="text-gray-600 text-sm font-medium">
                            Created: {(
                              purchaseOrders.find(p => p.productionOrderId === order.productionOrderId)?.createdAt
                            ) || order.createdAt}
                          </p>
                          {order.startedAt && (
                            <p className="text-blue-700 text-sm font-medium">
                              Started: {new Date(order.startedAt).toLocaleDateString()}
                            </p>
                          )}
                          {order.completedAt && (
                            <p className="text-green-700 text-sm font-medium">
                              Completed: {new Date(order.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className={`${getStatusColor(order.status)} font-bold`}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1 capitalize">
                              {order.status?.replace('_', ' ') || 'Completed'}
                            </span>
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-green-700 bg-green-50 border-2 border-green-200 px-4 py-2 rounded-lg">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span className="font-bold">Ready for Showroom</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            )
          )}

          <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="text-center text-gray-600">
              <p className="font-medium">
                © Product Assembly Management System
              </p>
              <p className="text-sm mt-1">
                For technical support, contact IT Department
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssemblyTeam;