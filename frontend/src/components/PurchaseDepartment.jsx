import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ShoppingCart, 
  CheckCircle, 
  ArrowLeft, 
  Users,
  Clock,
  DollarSign,
  ThumbsUp,
  Undo2,
  RefreshCw,
  Edit,
  Plus,
  Trash2,
  Save,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

import { API_BASE as API_URL } from '@/lib/api';
import OrderStatusBar from '@/components/ui/OrderStatusBar';

const PurchaseDepartment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    productName: '',
    quantity: 0,
    materials: []
  });

  // Fetch purchase orders
  const fetchPurchaseOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/purchase-orders`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setPurchaseOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching purchase orders:", err);
      toast({
        title: "Error",
        description: `Failed to load purchase orders: ${err.message}`,
        variant: "destructive",
      });
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Approve order
  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_URL}/purchase-orders/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Approval failed");
      }
      await res.json();
      toast({
        title: "✅ Order Approved",
        description: "Purchase order has been approved and sent to Store for inventory check.",
      });
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Could not approve purchase order.",
        variant: "destructive",
      });
    }
  };

  // Reject order
  const handleReject = async (id) => {
    try {
      const res = await fetch(`${API_URL}/purchase-orders/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Rejection failed");
      }
      toast({
        title: "❌ Order Rejected",
        description: "Purchase order has been rejected.",
      });
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Could not reject purchase order.",
        variant: "destructive",
      });
    }
  };

  // Request finance approval
  const handleRequestFinanceApproval = async (id) => {
    try {
      const res = await fetch(`${API_URL}/purchase-orders/${id}/request-finance-approval`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Finance request failed");
      }
      toast({
        title: "💰 Finance Approval Requested",
        description: "Request sent to Finance Department for approval.",
      });
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Could not request finance approval.",
        variant: "destructive",
      });
    }
  };

  // Start editing order
  const handleEditOrder = (order) => {
    setEditingOrder(order.id);
    setEditForm({
      productName: order.productName,
      quantity: order.quantity,
      materials: order.materials || []
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingOrder(null);
    setEditForm({ productName: '', quantity: 0, materials: [] });
  };

  // Save edited order
  const handleSaveEdit = async (id) => {
    try {
      const res = await fetch(`${API_URL}/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: editForm.productName,
          quantity: editForm.quantity,
          materials: editForm.materials
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Update failed");
      }
      toast({
        title: "✅ Order Updated",
        description: "Purchase order has been updated successfully.",
      });
      setEditingOrder(null);
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Could not update purchase order.",
        variant: "destructive",
      });
    }
  };

  // Add new material
  const handleAddMaterial = () => {
    setEditForm(prev => ({
      ...prev,
      materials: [...prev.materials, { name: '', quantity: 1, unit_cost: 0 }]
    }));
  };

  // Update material
  const handleUpdateMaterial = (index, field, value) => {
    setEditForm(prev => ({
      ...prev,
      materials: prev.materials.map((material, i) => 
        i === index ? { ...material, [field]: value } : material
      )
    }));
  };

  // Remove material
  const handleRemoveMaterial = (index) => {
    setEditForm(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  // Status badge (aligned with backend statuses)
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_request: { color: "bg-yellow-100 text-yellow-800 border border-yellow-300", text: "Pending Request" },
      pending_store_check: { color: "bg-blue-100 text-blue-800 border border-blue-300", text: "Pending Store Check" },
      store_allocated: { color: "bg-green-100 text-green-800 border border-green-300", text: "Store Allocated" },
      partially_allocated: { color: "bg-amber-100 text-amber-800 border border-amber-300", text: "Partially Allocated" },
      insufficient_stock: { color: "bg-orange-100 text-orange-800 border border-orange-300", text: "Insufficient Stock" },
      pending_finance_approval: { color: "bg-indigo-100 text-indigo-800 border border-indigo-300", text: "Pending Finance Approval" },
      finance_approved: { color: "bg-purple-100 text-purple-800 border border-purple-300", text: "Finance Approved" },
      verified_in_store: { color: "bg-teal-100 text-teal-800 border border-teal-300", text: "Verified in Store" },
      approved: { color: "bg-green-100 text-green-800 border border-green-300", text: "Approved" },
      rejected: { color: "bg-red-100 text-red-800 border border-red-300", text: "Rejected" },
      completed: { color: "bg-gray-100 text-gray-800 border border-gray-300", text: "Completed" }
    };
    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-800 border border-gray-300", text: status?.replace(/_/g, ' ') || "Unknown" };
    return <Badge className={`${config.color} font-medium`}>{config.text}</Badge>;
  };

  // Available actions (aligned with backend statuses)
  const getAvailableActions = (order) => {
    const actions = [];
    switch (order.status) {
      case 'pending_request':
        actions.push({
          label: 'Accept & Send to Store',
          action: () => handleApprove(order.id),
          icon: <ThumbsUp className="w-4 h-4 mr-2" />,
          className: 'bg-green-600 hover:bg-green-700 text-white'
        });
        actions.push({
          label: 'Reject',
          action: () => handleReject(order.id),
          icon: <Undo2 className="w-4 h-4 mr-2" />,
          className: 'bg-red-600 hover:bg-red-700 text-white'
        });
        break;
      case 'insufficient_stock':
      case 'partially_allocated':
        actions.push({
          label: 'Edit Order',
          action: () => handleEditOrder(order),
          icon: <Edit className="w-4 h-4 mr-2" />,
          className: 'bg-orange-600 hover:bg-orange-700 text-white'
        });
        actions.push({
          label: 'Send to Finance for Approval',
          action: () => handleRequestFinanceApproval(order.id),
          icon: <DollarSign className="w-4 h-4 mr-2" />,
          className: 'bg-blue-600 hover:bg-blue-700 text-white'
        });
        break;
      default:
        break;
    }
    return actions;
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  // Split orders into two sections
  const actionRequiredStatuses = [
    'pending_request',
    'insufficient_stock',
    'partially_allocated',
    'pending_store_check',
    'pending_finance_approval'
  ];
  const processedStatuses = [
    'approved',
    'completed',
    'finance_approved',
    'store_allocated',
    'verified_in_store',
    'rejected'
  ];

  const actionRequiredOrders = purchaseOrders.filter(order => actionRequiredStatuses.includes(order.status));
  const processedOrders = purchaseOrders.filter(order => processedStatuses.includes(order.status));

  // Tab state: 0 = Orders Requiring Action, 1 = Processed Orders
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto bg-white shadow-md border-b-4 border-blue-800 rounded-b-lg">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            {/* Left: Back + Title */}
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <Button
                onClick={() => navigate(user.department === 'admin' ? '/dashboard/admin' : '/dashboard')}
                variant="outline"
                className="border border-gray-300 bg-white text-gray-800 text-sm placeholder-gray-500 w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center shadow-lg">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchase Department</h1>
                  <p className="text-gray-600 text-sm sm:text-base font-medium">Purchase Management</p>
                </div>
              </div>
            </div>
            {/* Right: User Panel */}
            <div className="bg-gradient-to-r from-green-50 to-indigo-50 border-2 border-green-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-gray-600 text-xs font-medium">Purchase Team</p>
                  <p className="text-green-600 text-xs font-medium">Purchase Management</p>
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
        <div className="flex space-x-2 border-b border-blue-200 mb-8">
          <button
            className={`relative px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 0 ? 'border-blue-700 text-blue-800 bg-white' : 'border-transparent text-gray-500 bg-blue-50 hover:text-blue-700'}`}
            onClick={() => setActiveTab(0)}
          >
            Orders Requiring Action
            {actionRequiredOrders.length > 0 && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {actionRequiredOrders.length}
              </span>
            )}
          </button>
          <button
            className={`px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 1 ? 'border-blue-700 text-blue-800 bg-white' : 'border-transparent text-gray-500 bg-blue-50 hover:text-blue-700'}`}
            onClick={() => setActiveTab(1)}
          >
            Processed Orders
          </button>
        </div>
      </div>

      {/* Orders Section (Tab Content) */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid gap-10">
          {activeTab === 0 ? (
            // Orders Requiring Action Tab
            <div>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">Orders Requiring Action</h2>
              {loading ? (
                <div className="min-h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-800 text-lg font-medium">Loading Purchase dashboard...</p>
                    <p className="text-gray-600 text-sm mt-1">Please wait while we retrieve the data</p>
                  </div>
                </div>
              ) : actionRequiredOrders.length === 0 ? (
                <Card className="bg-white border border-gray-300 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Orders Requiring Action</h3>
                    <p className="text-gray-600">All new or pending orders will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                actionRequiredOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {/* ...existing code for order card... */}
                    <Card className="bg-white border border-gray-300 shadow-sm hover:shadow-md transition-shadow mb-6">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-gray-800 text-lg">
                              Purchase Order #{order.id}
                            </CardTitle>
                            <p className="text-gray-600 text-sm mt-1">
                              Product: {order.productName} | Quantity: {order.quantity}
                            </p>
                            {order.materials && order.materials.length > 0 && (
                              <p className="text-green-700 text-sm font-semibold mt-1">
                                Total Cost: ₹{order.materials.reduce((sum, material) => 
                                  sum + ((material.quantity || 0) * (material.unit_cost || 0)), 0
                                ).toFixed(2)}
                              </p>
                            )}
                            <p className="text-gray-500 text-xs mt-1">
                              Created: {order.createdAt}
                            </p>
                          </div>
                          <div className="text-right">{getStatusBadge(order.status)}</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {editingOrder === order.id ? (
                            // ...existing code for edit mode...
                            <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="text-blue-800 font-semibold mb-3 flex items-center">
                                <Edit className="w-4 h-4 mr-2" />
                                Editing Purchase Order
                              </h4>
                              {/* Product Name */}
                              <div>
                                <Label htmlFor="productName" className="text-sm font-medium text-gray-700">Product Name</Label>
                                <Input
                                  id="productName"
                                  value={editForm.productName}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, productName: e.target.value }))}
                                  className="mt-1"
                                />
                              </div>
                              {/* Quantity */}
                              <div>
                                <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">Quantity</Label>
                                <Input
                                  id="quantity"
                                  type="number"
                                  value={editForm.quantity}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                  className="mt-1"
                                />
                              </div>
                              {/* Materials */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <Label className="text-sm font-medium text-gray-700">Materials</Label>
                                  <Button
                                    type="button"
                                    onClick={handleAddMaterial}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Material
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {editForm.materials.map((material, idx) => (
                                    <div key={idx} className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg p-2">
                                      <Input
                                        placeholder="Material name"
                                        value={material.name || ''}
                                        onChange={(e) => handleUpdateMaterial(idx, 'name', e.target.value)}
                                        className="flex-1"
                                      />
                                      <Input
                                        type="number"
                                        placeholder="Qty"
                                        value={material.quantity || 1}
                                        onChange={(e) => handleUpdateMaterial(idx, 'quantity', parseInt(e.target.value) || 1)}
                                        className="w-20"
                                      />
                                      <Input
                                        type="number"
                                        placeholder="Unit Cost (₹)"
                                        value={material.unit_cost || 0}
                                        onChange={(e) => handleUpdateMaterial(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                                        className="w-32"
                                      />
                                      <div className="text-sm text-gray-600 font-medium w-24">
                                        ₹{((material.quantity || 1) * (material.unit_cost || 0)).toFixed(2)}
                                      </div>
                                      <Button
                                        type="button"
                                        onClick={() => handleRemoveMaterial(idx)}
                                        size="sm"
                                        variant="destructive"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Edit Actions */}
                              <div className="flex space-x-3 pt-4">
                                <Button
                                  onClick={() => handleSaveEdit(order.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Changes
                                </Button>
                                <Button
                                  onClick={handleCancelEdit}
                                  variant="outline"
                                  className="border-gray-300"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <>
                              {order.materials && order.materials.length > 0 && (
                                <div>
                                  <h4 className="text-gray-800 font-semibold mb-3">Required Materials:</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {order.materials.map((material, idx) => (
                                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                        <div className="flex justify-between items-center">
                                          <span className="text-gray-800 font-medium">
                                            {typeof material === 'string' ? material : material.name || material}
                                          </span>
                                          <div className="text-right text-sm">
                                            {typeof material === 'object' && material.quantity && (
                                              <div className="text-gray-600">
                                                Qty: {material.quantity}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="flex space-x-3 pt-4">
                                {getAvailableActions(order).map((actionItem, idx) => (
                                  <Button
                                    key={idx}
                                    onClick={actionItem.action}
                                    className={actionItem.className}
                                  >
                                    {actionItem.icon}
                                    {actionItem.label}
                                  </Button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            // Processed Orders Tab
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Processed Orders</h2>
              {loading ? (
                <div className="min-h-[100px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : processedOrders.length === 0 ? (
                <Card className="bg-white border border-gray-300 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Processed Orders</h3>
                    <p className="text-gray-600">Orders that have been processed will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                processedOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-white border border-gray-300 shadow-sm hover:shadow-md transition-shadow mb-6">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-gray-800 text-lg">
                              Purchase Order #{order.id}
                            </CardTitle>
                            <p className="text-gray-600 text-sm mt-1">
                              Product: {order.productName} | Quantity: {order.quantity}
                            </p>
                            {order.materials && order.materials.length > 0 && (
                              <p className="text-green-700 text-sm font-semibold mt-1">
                                Total Cost: ₹{order.materials.reduce((sum, material) => 
                                  sum + ((material.quantity || 0) * (material.unit_cost || 0)), 0
                                ).toFixed(2)}
                              </p>
                            )}
                            <p className="text-gray-500 text-xs mt-1">
                              Created: {order.createdAt}
                            </p>
                          </div>
                          <div className="text-right">{getStatusBadge(order.status)}</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {order.materials && order.materials.length > 0 && (
                            <div>
                              <h4 className="text-gray-800 font-semibold mb-3">Required Materials:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {order.materials.map((material, idx) => (
                                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-800 font-medium">
                                        {typeof material === 'string' ? material : material.name || material}
                                      </span>
                                      <div className="text-right text-sm">
                                        {typeof material === 'object' && material.quantity && (
                                          <div className="text-gray-600">
                                            Qty: {material.quantity}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* No action buttons for processed orders */}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm text-center text-gray-600">
            <p className="font-medium">© Procurement Management System</p>
            <p className="text-sm mt-1">For technical support, contact IT Department</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDepartment;
