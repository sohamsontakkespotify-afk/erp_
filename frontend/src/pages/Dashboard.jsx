import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

import { 
  Factory, 
  ShoppingCart, 
  Package, 
  Wrench, 
  DollarSign, 
  Store,
  LogOut,
  User,
  Building2,
  Shield,
  TrendingUp,
  Truck,
  ClipboardCheck,
  Eye
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeOrders: 0,
    pendingPurchases: 0,
    itemsInStock: 0,
    completedToday: 0,
  });

  useEffect(() => {
    const productionOrders = JSON.parse(localStorage.getItem('productionOrders') || '[]');
    const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
    const storeInventory = JSON.parse(localStorage.getItem('storeInventory') || '[]');
    const assemblyOrders = JSON.parse(localStorage.getItem('assemblyOrders') || '[]');

    const activeOrders = productionOrders.filter(o => o.status !== 'completed').length;
    const pendingPurchases = purchaseOrders.filter(o => o.status.includes('pending')).length;
    const itemsInStock = storeInventory.reduce((sum, item) => sum + item.quantity, 0);
    
    const today = new Date().toDateString();
    const completedToday = assemblyOrders.filter(o => o.status === 'completed' && new Date(o.completedAt).toDateString() === today).length;

    setStats({
      activeOrders,
      pendingPurchases,
      itemsInStock,
      completedToday,
    });
  }, []);

  const departments = [
    {
      id: 'production',
      name: 'Production Planning',
      icon: Factory,
      color: 'from-blue-500 to-blue-600',
      description: 'Manage production orders and planning'
    },
    {
      id: 'purchase',
      name: 'Purchase Department',
      icon: ShoppingCart,
      color: 'from-green-500 to-green-600',
      description: 'Handle material procurement and vendor management'
    },
    {
      id: 'store',
      name: 'Store Department',
      icon: Package,
      color: 'from-purple-500 to-purple-600',
      description: 'Inventory management and stock control'
    },
    {
      id: 'assembly',
      name: 'Assembly Team',
      icon: Wrench,
      color: 'from-orange-500 to-orange-600',
      description: 'Product assembly and quality control'
    },
    {
      id: 'finance',
      name: 'Finance Department',
      icon: DollarSign,
      color: 'from-yellow-500 to-yellow-600',
      description: 'Financial management and reporting'
    },
    {
      id: 'showroom',
      name: 'Showroom Department',
      icon: Store,
      color: 'from-pink-500 to-pink-600',
      description: 'Product display and customer interaction'
    },
    {
      id: 'sales',
      name: 'Sales Department',
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      description: 'Sales management and customer orders'
    },
    {
      id: 'dispatch',
      name: 'Dispatch Department',
      icon: ClipboardCheck,
      color: 'from-indigo-500 to-indigo-600',
      description: 'Order processing and delivery coordination'
    },
    {
      id: 'watchman',
      name: 'Watchman Department',
      icon: Eye,
      color: 'from-red-500 to-red-600',
      description: 'Gate security and pickup verification'
    },
    {
      id: 'transport',
      name: 'Transport Department',
      icon: Truck,
      color: 'from-cyan-500 to-cyan-600',
      description: 'Vehicle fleet and delivery management'
    }
  ];

  const handleDepartmentAccess = (deptId) => {
    if (user.department === 'admin' || user.department === deptId) {
      navigate(`/dashboard/${deptId}`);
    } else {
      alert('Access denied. You can only access your assigned department.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const isUserAdmin = user?.department === 'admin';

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b-4 border-blue-700 shadow-sm">
          <div className="px-4 py-4 sm:px-6 sm:py-4">
            <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-700 rounded-sm flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Enterprise Resource Planning System</h1>
                  <p className="text-gray-600 text-sm">Welcome, {user?.username}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-gray-50 border border-gray-300 rounded-sm px-4 py-2">
                  {isUserAdmin ? <Shield className="w-4 h-4 text-blue-700" /> : <User className="w-4 h-4 text-gray-700" />}
                  <span className="font-medium text-gray-800 text-sm">{user?.departmentName}</span>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="border-red-400 text-red-700 hover:font-medium"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Department Access */}
        <div className="px-4 py-6 sm:px-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Department Access</h2>
            <p className="text-gray-600 text-sm">Select a department to access its management system</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept, index) => {
              const Icon = dept.icon;
              const isAccessible = isUserAdmin || user.department === dept.id;
              
              return (
                <div key={dept.id}>
                  <Card 
                    className={`transition-all duration-200 cursor-pointer border ${
                      isAccessible 
                        ? 'bg-white border-gray-300 shadow-sm hover:shadow-md hover:border-blue-400' 
                        : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => handleDepartmentAccess(dept.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${
                          isAccessible ? 'bg-blue-100' : 'bg-gray-200'
                        }`}>
                          <Icon className={`w-5 h-5 ${isAccessible ? 'text-blue-700' : 'text-gray-500'}`} />
                        </div>
                        {isAccessible && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                      <CardTitle className={`text-lg ${isAccessible ? 'text-gray-800' : 'text-gray-500'}`}>
                        {dept.name}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <p className={`text-sm mb-4 ${isAccessible ? 'text-gray-600' : 'text-gray-400'}`}>
                        {dept.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs px-2 py-1 rounded-sm border ${
                          isAccessible 
                            ? 'bg-green-50 text-green-700 border-green-300' 
                            : 'bg-red-50 text-red-700 border-red-300'
                        }`}>
                          {isAccessible ? 'Authorized' : 'Access Denied'}
                        </span>
                        {isAccessible && (
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                          >
                            Enter
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Statistics
        <div className="px-6 pb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">System Overview</h2>
            <p className="text-gray-600 text-sm">Current operational statistics and metrics</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Active Orders</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.activeOrders}</p>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-sm">
                    <Factory className="w-6 h-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Pending Purchases</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.pendingPurchases}</p>
                  </div>
                  <div className="bg-green-100 p-2 rounded-sm">
                    <ShoppingCart className="w-6 h-6 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Items in Stock</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.itemsInStock}</p>
                  </div>
                  <div className="bg-purple-100 p-2 rounded-sm">
                    <Package className="w-6 h-6 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Completed Today</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{stats.completedToday}</p>
                  </div>
                  <div className="bg-orange-100 p-2 rounded-sm">
                    <Wrench className="w-6 h-6 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default Dashboard;