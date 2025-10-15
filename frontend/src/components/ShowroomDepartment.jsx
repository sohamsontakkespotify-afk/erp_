import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { 
  Store, 
  Package, 
  CheckCircle, 
  Star,
  ArrowLeft,
  Eye,
  ShoppingBag,
  Award,
  AlertCircle,
  TestTube,
  Settings,
  Shield,
  Users,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { API_BASE } from '@/lib/api';
import OrderStatusBar from '@/components/ui/OrderStatusBar';
const ShowroomDepartment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // All hooks must be at the top level and in the same order on every render
  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // Tab state: 0 = Products Ready for Showroom, 1 = Products on Display
  const [testingDialogOpen, setTestingDialogOpen] = useState(false);
  const [selectedProductForTesting, setSelectedProductForTesting] = useState(null);
  const [productTestResults, setProductTestResults] = useState({}); // Store test results for each product
  // Test types configuration
  const testTypes = [
    { id: 'UT', name: 'Unit Testing', description: 'Individual component functionality tests', icon: TestTube },
    { id: 'IT', name: 'Integration Testing', description: 'Component interaction tests', icon: Settings },
    { id: 'ST', name: 'System Testing', description: 'Complete system functionality tests', icon: Shield },
    { id: 'AT', name: 'Acceptance Testing', description: 'User acceptance and requirements validation', icon: Users }
  ];

  // Load data from backend (MySQL via Flask)
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch completed assembly products
      console.log('Fetching completed assembly products...');
      const assemblyResponse = await fetch(`${API_BASE}/assembly/completed`);
      if (!assemblyResponse.ok) {
        throw new Error(`Assembly API error: ${assemblyResponse.status} ${assemblyResponse.statusText}`);
      }
      const assemblyData = await assemblyResponse.json();
      console.log('Assembly data received:', assemblyData);
      setProducts(assemblyData);

      // Fetch displayed showroom products (SYNC with Sales Department)
      // This endpoint must return the up-to-date quantity after sales
      console.log('Fetching displayed showroom products from sales...');
      const showroomResponse = await fetch(`${API_BASE}/sales/showroom/available`);
      if (!showroomResponse.ok) {
        throw new Error(`Sales Showroom API error: ${showroomResponse.status} ${showroomResponse.statusText}`);
      }
      const showroomData = await showroomResponse.json();
      console.log('Sales Showroom data received:', showroomData);
      setDisplayedProducts(showroomData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
      toast({
        title: "Error Loading Data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Testing system functions
  const openTestingDialog = (product) => {
    setSelectedProductForTesting(product);
    setTestingDialogOpen(true);
  };

  const closeTestingDialog = () => {
    setTestingDialogOpen(false);
    setSelectedProductForTesting(null);
  };

  const handleTestChange = (productId, testId, value) => {
    setProductTestResults(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [testId]: value
      }
    }));
  };

  const areAllTestsPassed = (productId) => {
    const tests = productTestResults[productId];
    if (!tests) return false;
    return testTypes.every(test => tests[test.id] === 'pass');
  };

  const getTestProgress = (productId) => {
    const tests = productTestResults[productId];
    if (!tests) return 0;
    const completedTests = testTypes.filter(test => tests[test.id] && tests[test.id] !== '').length;
    return completedTests;
  };

  const getPassedTests = (productId) => {
    const tests = productTestResults[productId];
    if (!tests) return 0;
    const passedTests = testTypes.filter(test => tests[test.id] === 'pass').length;
    return passedTests;
  };

  // Helper to convert string test results to booleans expected by backend
  const mapTestResultsToBoolean = (results) => {
    if (!results) return undefined;
    const mapped = {};
    for (const [k, v] of Object.entries(results)) {
      mapped[k] = v === 'pass';
    }
    return mapped;
  };

  const addToShowroom = async (productId) => {
    // Validate that all tests are passed before adding to showroom
    if (!areAllTestsPassed(productId)) {
      toast({
        title: "Testing Required",
        description: "All tests (UT, IT, ST, AT) must be completed and passed before adding to showroom.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Adding product to showroom:', productId);
      const res = await fetch(`${API_BASE}/showroom/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          test_results: mapTestResultsToBoolean(productTestResults[productId]) // booleans for backend
        })
      });

      const data = await res.json();
      console.log('Add to showroom response:', data);

      if (res.ok) {
        // Remove from available products and add to displayed
        setProducts(prev => prev.filter(p => p.id !== productId));
        setDisplayedProducts(prev => [...prev, data]);
        toast({
          title: "🏪 Product Added to Showroom!",
          description: `${data.productName} is now displayed in the showroom.`,
        });
      } else if (data.failedTests) {
        // Product sent back to assembly due to failed tests
        toast({
          title: "Product Sent Back to Assembly",
          description: `Product sent back due to failed tests: ${data.failedTests.join(', ')}`,
          variant: "destructive",
        });
        // Refresh the products list to show the product back in assembly
        loadData();
      } else {
        toast({
          title: "Error",
          description: data.message || 'Failed to add product to showroom',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding to showroom:', error);
      toast({
        title: "Error",
        description: "Failed to add product to showroom. Please check your connection.",
        variant: "destructive"
      });
    }
  };

  const sendBackToAssembly = async (productId) => {
    try {
      console.log('Sending product back to assembly:', productId);
      const res = await fetch(`${API_BASE}/showroom/send-back`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          test_results: mapTestResultsToBoolean(productTestResults[productId]), // backend expects booleans
          reason: 'Failed showroom testing'
        })
      });

      const data = await res.json();
      console.log('Send back to assembly response:', data);

      if (res.ok) {
        // Remove from available products (it will be marked as rework in assembly)
        setProducts(prev => prev.filter(p => p.id !== productId));
        toast({
          title: "🔄 Product Sent Back to Assembly",
          description: data.message || `${data.productName || 'Product'} has been sent back for rework due to testing failures.`,
        });
        // Refresh the products list
        loadData();
      } else {
        toast({
          title: "Error",
          description: data.message || 'Failed to send product back to assembly',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending back to assembly:', error);
      toast({
        title: "Error",
        description: "Failed to send product back to assembly. Please check your connection.",
        variant: "destructive"
      });
    }
  };



  // Removed markAsSold function - selling is handled by Sales department

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': 
        return 'bg-green-100 text-green-800';
      default: 
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <Eye className="w-3 h-3" />;
      default: 
        return <Package className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-800 text-lg font-medium">Loading Showroom dashboard...</p>
          <p className="text-gray-600 text-sm mt-1">Please wait while we retrieve the data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="bg-white border border-red-300 shadow-sm p-8 max-w-md">
          <CardContent className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">System Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Reload System
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  const readyCount = products.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto bg-white shadow-md border-b-4 border-green-800 rounded-b-lg">
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
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center shadow-lg">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Showroom Department</h1>
                  <p className="text-gray-600 text-sm sm:text-base font-medium">Product Display Management System</p>
                </div>
              </div>
            </div>
            {/* Right: User Panel */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-gray-600 text-xs font-medium">Showroom Team</p>
                  <p className="text-blue-600 text-xs font-medium">Product Display Management</p>
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
            Products Ready for Showroom
            {readyCount > 0 && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {readyCount}
              </span>
            )}
          </button>
          <button
            className={`px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 1 ? 'border-blue-700 text-blue-800 bg-white' : 'border-transparent text-gray-500 bg-blue-50 hover:text-blue-700'}`}
            onClick={() => setActiveTab(1)}
          >
            Products on Display
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 0 ? (
        // Products Ready for Showroom Tab
        <div className="px-6 mb-8">
          <div className="bg-white border border-gray-300 rounded-sm shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-800">Products Ready for Showroom</h2>
              <p className="text-gray-600 text-sm mt-1">Products ready for testing and showroom display</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {products.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-sm">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Products Available</h3>
                    <p className="text-gray-600">
                      {loading ? 'Loading products...' : 'Completed products from assembly will appear here.'}
                    </p>
                    {!loading && (
                      <p className="text-gray-500 text-sm mt-2">
                        Ensure assembly orders are marked as "completed" to display them here.
                      </p>
                    )}
                  </div>
                ) : (
                  products.map((product, index) => (
                    <div key={product.id}>
                      {/* ...existing card rendering for available products... */}
                      <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader className="bg-gray-50 border-b border-gray-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-gray-800 text-lg font-semibold">{product.productName}</CardTitle>
                              <div className="mt-2 space-y-1">
                                <p className="text-gray-600 text-sm">
                                <span className="font-medium">Quantity:</span> {product.quantity} units
                                </p>
                                <p className="text-gray-600 text-sm">
                                  <span className="font-medium">Assembly Order:</span> #{product.id}
                                </p>
                                <p className="text-gray-600 text-sm">
                                  <span className="font-medium">Completed:</span> {new Date(product.completedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-800 border border-green-300">
                              <CheckCircle className="w-3 h-3 mr-1" /> 
                              Assembly Complete
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">

                          {/* Testing Progress */}
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-gray-700 text-sm font-medium">Testing Status:</span>
                              <span className="text-gray-600 text-sm">
                                {getTestProgress(product.id)}/{testTypes.length} Tests Completed
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-sm h-3 mb-3">
                              <div 
                                className={`h-3 rounded-sm transition-all duration-300 ${
                                  areAllTestsPassed(product.id) 
                                    ? 'bg-green-600' 
                                    : getTestProgress(product.id) > 0 
                                      ? 'bg-yellow-500' 
                                      : 'bg-gray-300'
                                }`}
                                style={{ width: `${(getTestProgress(product.id) / testTypes.length) * 100}%` }}
                              ></div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {testTypes.map((test) => {
                                const Icon = test.icon;
                                const currentValue = productTestResults[product.id]?.[test.id] || '';
                                const isPassed = currentValue === 'pass';
                                const isFailed = currentValue === 'fail';
                                return (
                                  <div key={test.id} className={`text-center p-2 rounded-sm border ${
                                    isPassed ? 'bg-green-50 border-green-300' : isFailed ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-300'
                                  }`}>
                                    <Icon className={`w-4 h-4 mx-auto mb-1 ${isPassed ? 'text-green-600' : isFailed ? 'text-red-700' : 'text-gray-400'}`} />
                                    <span className={`text-xs font-medium ${isPassed ? 'text-green-700' : isFailed ? 'text-red-700' : 'text-gray-500'}`}>
                                      {test.id}
                                    </span>
                                    {isPassed && (
                                      <div className="text-green-600 text-xs mt-1">✓</div>
                                    )}
                                    {isFailed && (
                                      <div className="text-red-600 text-xs mt-1">✗</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3">
                            <Button
                              onClick={() => openTestingDialog(product)}
                              variant="outline"
                              className="flex-1 border-blue-300 text-blue-700 hover:bg-blue"
                            >
                              <TestTube className="w-4 h-4 mr-2" />
                              Conduct Tests
                            </Button>
                            <Button
                              onClick={() => addToShowroom(product.id)}
                              className={`flex-1 ${
                                areAllTestsPassed(product.id)
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              }`}
                              disabled={
                                !areAllTestsPassed(product.id) ||
                                displayedProducts.some(p => p.productionOrderId === product.productionOrderId)
                              }
                            >
                              <Store className="w-4 h-4 mr-2" />
                              {displayedProducts.some(p => p.productionOrderId === product.productionOrderId)
                                ? 'In Showroom'
                                : areAllTestsPassed(product.id)
                                  ? 'Add to Showroom'
                                  : 'Testing Required'}
                            </Button>
                            {getTestProgress(product.id) > 0 && !areAllTestsPassed(product.id) && (
                              <Button
                                onClick={() => sendBackToAssembly(product.id)}
                                variant="outline"
                                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                              >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Send Back to Assembly
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Products on Display Tab
        <div className="px-6 mb-8">
          <div className="bg-white border border-gray-300 rounded-sm shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-800">Products on Display</h2>
              <p className="text-gray-600 text-sm mt-1">Products currently on display for customers</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {displayedProducts.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-sm">
                    <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Products on Display</h3>
                    <p className="text-gray-600">Complete product testing to add items to the showroom display.</p>
                  </div>
                ) : (
                  displayedProducts.map((product, index) => (
                    <div key={`showroom-${product.id}`}>
                      <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader className="bg-blue-50 border-b border-gray-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-gray-800 text-lg font-semibold">{product.name || product.productName}</CardTitle>
                              <div className="mt-2 space-y-1">
                                <p className="text-gray-600 text-sm">
                                  <span className="font-medium">Total Quantity:</span> {product.original_qty} units
                                </p>
                                <p className="text-gray-600 text-sm">
                                  <span className="font-medium">Remaining Quantity:</span> {product.quantity} units
                                </p>
                                {product.customerInterest && (
                                  <p className="text-gray-600 text-sm">
                                    <span className="font-medium">Customer Interest:</span> {product.customerInterest}/10
                                    <span className="font-medium">Customer Interest:</span> {product.customerInterest}/10
                                  </p>
                                )}
                                <p className="text-gray-600 text-sm">
                                  <span className="font-medium">Display Date:</span> {new Date(product.displayedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge className={`${getStatusColor(product.showroomStatus)} border`}>
                              {getStatusIcon(product.showroomStatus)}
                              <span className="ml-1 capitalize">{product.showroomStatus || 'available'}</span>
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-center">
                            {(product.showroomStatus === 'available' || !product.showroomStatus) && (
                              <div className="text-right">
                                <p>
                                  <Badge className="bg-green-100 text-green-800 border border-green-300">
                                  <Eye className="w-3 h-3 mr-1" />
                                  On Display and Ready for Sales
                                </Badge>
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Testing Dialog */}
      <Dialog open={testingDialogOpen} onOpenChange={setTestingDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg text-gray-800">
              <div className="bg-blue-100 p-1 rounded-sm">
                <TestTube className="w-4 h-4 text-blue-700" />
              </div>
              Product Testing Protocol
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-2">
              <strong>Product:</strong> {selectedProductForTesting?.productName}<br/>
              Complete all mandatory tests before showroom approval.
            </DialogDescription>
          </DialogHeader>
          {/* ...existing dialog content... */}
          <div className="space-y-3 py-4">
            {selectedProductForTesting && testTypes.map((test) => {
              const Icon = test.icon;
              const currentValue = productTestResults[selectedProductForTesting.id]?.[test.id] || '';
              const isPassed = currentValue === 'pass';
              const isFailed = currentValue === 'fail';

              return (
                <div key={test.id} className={`p-4 border rounded-sm ${
                  isPassed ? 'bg-green-50 border-green-300' : isFailed ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-300'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-sm ${isPassed ? 'bg-green-100' : isFailed ? 'bg-red-100' : 'bg-gray-100'}`}>
                      <Icon className={`w-4 h-4 ${isPassed ? 'text-green-700' : isFailed ? 'text-red-700' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1">
                      <Label className={`font-medium text-sm ${isPassed ? 'text-green-800' : isFailed ? 'text-red-800' : 'text-gray-700'}`}>
                        {test.name} ({test.id})
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">{test.description}</p>
                      <RadioGroup
                        value={currentValue}
                        onValueChange={(value) => handleTestChange(selectedProductForTesting.id, test.id, value)}
                        className="flex space-x-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pass" id={`pass-${test.id}`} />
                          <Label htmlFor={`pass-${test.id}`} className="text-sm text-green-700 font-medium">Pass</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fail" id={`fail-${test.id}`} />
                          <Label htmlFor={`fail-${test.id}`} className="text-sm text-red-700 font-medium">Fail</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    {isPassed && (
                      <Badge className="bg-green-600 text-white text-xs px-2 py-1 border-0">
                        PASSED
                      </Badge>
                    )}
                    {isFailed && (
                      <Badge className="bg-red-600 text-white text-xs px-2 py-1 border-0">
                        FAILED
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* ...existing dialog footer... */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Testing Progress:</span>
              <span className="text-sm text-gray-600">
                {selectedProductForTesting ? getTestProgress(selectedProductForTesting.id) : 0}/{testTypes.length} Tests Completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-sm h-3">
              <div 
                className={`h-3 rounded-sm transition-all duration-300 ${
                  selectedProductForTesting && areAllTestsPassed(selectedProductForTesting.id)
                    ? 'bg-green-600' 
                    : selectedProductForTesting && getTestProgress(selectedProductForTesting.id) > 0 
                      ? 'bg-yellow-500' 
                      : 'bg-gray-300'
                }`}
                style={{ 
                  width: selectedProductForTesting 
                    ? `${(getTestProgress(selectedProductForTesting.id) / testTypes.length) * 100}%`
                    : '0%'
                }}
              ></div>
            </div>
            {selectedProductForTesting && areAllTestsPassed(selectedProductForTesting.id) && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-green-50 border border-green-300 rounded-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">All tests completed successfully. Product approved for showroom display.</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={closeTestingDialog} className="border-gray-300 text-gray-400">
              Cancel
            </Button>
            {selectedProductForTesting && areAllTestsPassed(selectedProductForTesting.id) && (
              <Button 
                onClick={() => {
                  addToShowroom(selectedProductForTesting.id);
                  closeTestingDialog();
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Store className="w-4 h-4 mr-2" />
                Approve for Showroom
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="text-center text-gray-600">
          <p className="font-medium">
            © Product Display Management System
          </p>
          <p className="text-sm mt-1">
            For technical support, contact IT Department
          </p>
        </div>
      </div>
    </div>
  );
// Removed duplicate dialog and footer
};

export default ShowroomDepartment;
