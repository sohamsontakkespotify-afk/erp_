import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';

import { 
  Factory, 
  PlusCircle, 
  ArrowLeft,
  List,
  ShoppingCart,
  Loader2,
  Building,
  FileText,
  Calendar,
  Users,
  Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import productData from '@/data/productData.js';

import { API_BASE as API_BASE_URL } from '@/lib/api';
import OrderStatusBar from '@/components/ui/OrderStatusBar';

const ProductionPlanning = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [newOrder, setNewOrder] = useState({ category: 'RCM', subCategory: '', quantity: '' });
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // API Functions
  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await fetch(`${API_BASE_URL}/production-orders`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load production orders. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders`);
      if (!response.ok) throw new Error('Failed to fetch purchase orders');
      const data = await response.json();
      setPurchaseOrders(data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchPurchaseOrders();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrder.category || !newOrder.subCategory || !newOrder.quantity) {
      toast({
        title: "Missing Information",
        description: "Please select a category, sub-category, and quantity.",
        variant: "destructive"
      });
      return;
    }

    const selectedProduct = productData[newOrder.category].find(p => p.name === newOrder.subCategory);
    if (!selectedProduct) {
      toast({ 
        title: "Invalid Product", 
        description: "Selected product not found.", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        productName: selectedProduct.name,
        category: newOrder.category,
        quantity: parseInt(newOrder.quantity),
        materials: selectedProduct.materials.map(m => ({
          ...m, 
          quantity: m.quantity * parseInt(newOrder.quantity)
        })),
        createdBy: user?.name || user?.email || 'Unknown User'
      };

      const response = await fetch(`${API_BASE_URL}/production-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const result = await response.json();

      toast({
        title: "Production Order Created",
        description: `Order for ${result.productionOrder.productName} has been successfully submitted.`,
      });

      // Reset form
      setNewOrder({ category: 'RCM', subCategory: '', quantity: '' });
      setSearchTerm("");
      setShowDropdown(false);

      // Refresh orders
      await fetchOrders();
      await fetchPurchaseOrders();

    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create production order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatus = (orderId) => {
    const po = purchaseOrders.find(p => p.productionOrderId === orderId);
    return po ? po.status.replace(/_/g, ' ') : 'pending materials';
  };

  const handleSearchFocus = () => {
    setShowDropdown(true);
  };

  const handleSearchBlur = () => {
    // Increased timeout to allow for trackpad/touchpad clicks
    setTimeout(() => setShowDropdown(false), 300);
  };

  const handleItemSelect = (productName) => {
    setNewOrder({...newOrder, subCategory: productName});
    setSearchTerm(productName);
    setShowDropdown(false);
  };

  // Handle mouse down to prevent blur when clicking on dropdown items
  const handleDropdownMouseDown = (e) => {
    e.preventDefault();
  };

  const filteredProducts = productData[newOrder.category]
    ?.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];

  const getStatusBadgeColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending materials':
      case 'pending_materials':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'materials ready':
      case 'materials_ready':
        return 'bg-blue-50 text-blue-800 border border-blue-200';
      case 'in production':
      case 'in_production':
        return 'bg-orange-50 text-orange-800 border border-orange-200';
      case 'completed':
        return 'bg-green-50 text-green-800 border border-green-200';
      default:
        return 'bg-gray-50 text-gray-800 border border-gray-200';
    }
  };
  
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
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg">
                  <Factory className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Production Department</h1>
                  <p className="text-gray-600 text-sm sm:text-base font-medium">Production Order Management System</p>
                </div>
              </div>
            </div>
            {/* Right: User Panel */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-gray-600 text-xs font-medium">Production Team</p>
                  <p className="text-blue-600 text-xs font-medium">Production Planning Department</p>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Order Creation Form */}
          <div className="space-y-6">
            <Card className="bg-white shadow-lg border-2 border-blue-100">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center text-xl font-bold">
                  <FileText className="w-6 h-6 mr-3"/>
                  New Production Order Request
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleCreateOrder} className="space-y-6">
                  
                  {/* Form Header */}
                  <div className="bg-gray-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Production Order Details</h3>
                    <p className="text-gray-600 text-sm">Please fill all required fields marked with *</p>
                  </div>

                  {/* Product Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-gray-900 font-bold text-base flex items-center">
                      <Package className="w-4 h-4 mr-2 text-blue-600" />
                      Product Category *
                    </Label>
                    <select 
                      id="category" 
                      value={newOrder.category} 
                      onChange={(e) => { 
                        setNewOrder({...newOrder, category: e.target.value, subCategory: ''}); 
                        setSearchTerm(""); 
                        setShowDropdown(false);
                      }} 
                      className="w-full border-2 border-gray-300 text-gray-900 rounded-lg p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white"
                    >
                      <option value="RCM" className="font-medium">RCM - Road Construction Machines</option>
                      <option value="BCE" className="font-medium">BCE - Building Construction Equipments</option>
                    </select>
                  </div>

                  {/* Sub-Category Search */}
                  <div className="relative space-y-2">
                    <Label htmlFor="subCategory" className="text-gray-900 font-bold text-base">
                      Product Sub-Category *
                    </Label>
                    <Input 
                      type="text"
                      placeholder="Type to search products..."
                      className="w-full border-2 border-gray-300 text-gray-900 bg-white rounded-lg p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium placeholder:text-gray-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={handleSearchFocus}
                      onBlur={handleSearchBlur}
                    />
                    {showDropdown && searchTerm && (
                      <div 
                        className="absolute z-10 w-full max-h-48 overflow-y-auto bg-white rounded-lg mt-1 border-2 border-gray-200 shadow-xl"
                        onMouseDown={handleDropdownMouseDown}
                      >
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map(p => (
                            <div
                              key={p.name}
                              onClick={() => handleItemSelect(p.name)}
                              onMouseDown={handleDropdownMouseDown}
                              className={`p-3 cursor-pointer hover:bg-blue-50 text-gray-900 font-medium border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                                newOrder.subCategory === p.name ? "bg-blue-100 text-blue-800" : ""
                              }`}
                            >
                              {p.name}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-gray-500 text-center font-medium">No matching products found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-gray-900 font-bold text-base">
                      Required Quantity *
                    </Label>
                    <Input 
                      id="quantity" 
                      type="number" 
                      value={newOrder.quantity} 
                      onChange={(e) => setNewOrder({...newOrder, quantity: e.target.value})} 
                      placeholder="Enter quantity (e.g., 100)" 
                      className="w-full border-2 border-gray-300 text-gray-900 bg-white rounded-lg p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium placeholder:text-gray-500"
                      min="1"
                      step="1"
                    />
                  </div>
                  
                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 text-lg rounded-lg shadow-lg border-2 border-blue-800 transition-all duration-200"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      ) : (
                        <PlusCircle className="w-5 h-5 mr-3"/>
                      )}
                      {loading ? 'Submitting Order...' : 'Submit Production Order'}
                    </Button>
                  </div>
                  
                  {/* Official Notice */}
                </form>
              </CardContent>
            </Card>
          </div>
          
          {/* Active Orders List */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white shadow-lg border-2 border-green-100">
                <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
                  <CardTitle className="flex items-center justify-between text-xl font-bold">
                    <div className="flex items-center">
                      <List className="w-6 h-6 mr-3" />
                      Active Production Orders
                    </div>
                    <Badge className="bg-white text-green-700 font-bold px-3 py-1">
                      Total: {orders.length}
                    </Badge>
                  </CardTitle>
                  <p className="text-green-100 text-sm font-medium mt-1">
                    Current Production Queue Status
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {ordersLoading ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="text-center">
                          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                          <span className="text-gray-700 font-medium text-lg">Loading production orders...</span>
                          <p className="text-gray-500 text-sm mt-1">Please wait while we fetch the data</p>
                        </div>
                      </div>
                    ) : orders.length > 0 ? (
                      orders.map((order, index) => (
                          <motion.div 
                          key={order.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300 max-w-full overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center mb-3">
                                <Package className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" />
                                <h4 className="font-semibold text-gray-800 text-xl break-words">{order.productName}</h4>
                              </div>
                              <div className="space-y-2 text-sm text-gray-700">
                                <div className="flex items-center">
                                  <span className="font-semibold w-24 flex-shrink-0">Quantity:</span>
                                  <span className="font-bold text-blue-700 truncate">{order.quantity} units</span>
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="w-5 h-5 mr-2 text-gray-600 flex-shrink-0" />
                                  <span className="font-semibold">Ordered:</span>
                                  <span className="ml-2 font-medium truncate">{order.createdAt}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="font-semibold">Order ID:</span>
                                  <span className="ml-2 font-mono text-xs bg-gray-200 px-3 py-1 rounded truncate">
                                    #{order.id}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="ml-0 sm:ml-6 flex-shrink-0">
                              <Badge className={`${getStatusBadgeColor(getOrderStatus(order.id))} font-bold text-sm px-4 py-2 rounded-full flex items-center space-x-2 whitespace-nowrap`}>
                                <ShoppingCart className="w-5 h-5" />
                                <span>{getOrderStatus(order.id).toUpperCase()}</span>
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Factory className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-700 mb-2">No Active Production Orders</h3>
                        <p className="text-gray-500 font-medium">Submit your first production order using the form on the left.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="text-center text-gray-600">
            <p className="font-medium">
              © Production Management System
            </p>
            <p className="text-sm mt-1">
              For technical support, contact IT Department
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionPlanning;