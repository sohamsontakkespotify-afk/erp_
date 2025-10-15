import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Shield, Users, LayoutDashboard,RefreshCw, UserCheck, UserX, AlertCircle,UserPlus , Building, Search, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from '@/components/ui/use-toast';
import { API_BASE } from '@/lib/api';

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

const UserManagement = () => {
  const { getAllUsers, updateUserDepartment, deleteUser } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    // Load departments dynamically from backend
    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/departments`);
        if (response.ok) {
          const data = await response.json();
          setDepartments(data.departments || []);
        } else {
          setDepartments([]);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        setDepartments([]);
      }
    };

    fetchDepartments();
    loadAllUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    if (searchTerm.trim() === '') {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user => 
        (user.fullName || user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setAllUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDepartment = async (userId, newDepartment) => {
    try {
      await updateUserDepartment(userId, newDepartment);
      toast({
        title: "Department Updated",
        description: "User department has been successfully updated.",
      });
      // Refresh the users list
      loadAllUsers();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error.message || "An error occurred while updating the department.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteUser(userId);
        toast({
          title: "User Deleted",
          description: "The user has been successfully deleted.",
        });
        // Refresh the users list
        loadAllUsers();
      } catch (error) {
        toast({
          title: "Delete Failed",
          description: error.message || "An error occurred while deleting the user.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <Card className="bg-white border-2 border-gray-200 shadow-lg mt-6">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardTitle className="text-white text-xl font-bold flex items-center">
          <Users className="mr-3 h-6 w-6"/> User Management
        </CardTitle>
        <p className="text-blue-100 text-sm font-medium mt-1">Manage system users and their departments</p>
      </CardHeader>
      <CardContent className="p-6">
        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search users by name, username, or department..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-800 text-lg font-medium">Loading Users...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 border border-gray-200 rounded-lg">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Users Found</h3>
            <p className="text-gray-600 font-medium">
              {searchTerm ? 'No users match your search criteria.' : 'No users are registered in the system.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="p-4 text-gray-900 font-bold">Full Name</th>
                  <th className="p-4 text-gray-900 font-bold">Username</th>
                  <th className="p-4 text-gray-900 font-bold">Email</th>
                  <th className="p-4 text-gray-900 font-bold">Department</th>
                  <th className="p-4 text-gray-900 font-bold">Status</th>
                  <th className="p-4 text-gray-900 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredUsers.map((user) => (
                  <motion.tr 
                    key={user.id} 
                    className="border-b border-gray-100 hover:bg-gray-50" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                  >
                    <td className="p-4 text-gray-900 font-medium">{user.fullName || user.full_name}</td>
                    <td className="p-4 text-gray-900 font-medium">{user.username}</td>
                    <td className="p-4 text-gray-900 font-medium">{user.email}</td>
                    <td className="p-4">
                      <select
                        value={user.department}
                        onChange={(e) => handleUpdateDepartment(user.id, e.target.value)}
                        className={`px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize font-medium text-xs ${
                          user.department === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                          user.department === 'finance' ? 'bg-green-100 text-green-800 border-green-300' :
                          user.department === 'sales' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          user.department === 'dispatch' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                          user.department === 'production' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                          'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                      >
                        {departments.map(dept => (
                          <option key={dept} value={dept} className="capitalize bg-white text-gray-900">
                            {dept}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        user.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.status || 'APPROVED'}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-medium"
                        size="sm"
                      >
                        Delete
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const UserApproval = () => {
  const { users, getPendingUsers, approveUser, rejectUser } = useAuth();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [orderApprovals, setOrderApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(true);
  const [activeApprovalTab, setActiveApprovalTab] = useState('users');
  const [notificationCounts, setNotificationCounts] = useState({
    pendingUsers: 0,
    pendingOrderBypass: 0,
    pendingFreeDelivery: 0
  });

  useEffect(() => {
    loadPendingUsers();
    loadOrderApprovals();
  }, []);

  // Update notification counts when data changes
  useEffect(() => {
    setNotificationCounts({
      pendingUsers: pendingUsers.length,
      pendingOrderBypass: orderApprovals.filter(approval => approval.requestType === 'coupon_applied').length,
      pendingFreeDelivery: orderApprovals.filter(approval => approval.requestType === 'free_delivery').length
    });
  }, [pendingUsers, orderApprovals]);

  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const data = await getPendingUsers();
      setPendingUsers(data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      const localPendingUsers = users.filter(user => user.status === 'PENDING');
      setPendingUsers(localPendingUsers);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderApprovals = async () => {
    setOrderLoading(true);
    try {
      console.log('Fetching order approvals from:', `${API_BASE}/approval/pending`);
      const response = await fetch(`${API_BASE}/approval/pending`);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Approval data received:', data);
        setOrderApprovals(data.approvals || []);
      } else {
        console.error('Failed to fetch approvals:', response.status);
      }
    } catch (error) {
      console.error('Error fetching order approvals:', error);
    } finally {
      setOrderLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await approveUser(userId);
      toast({
        title: "User Approved",
        description: "The user can now log in to the system.",
      });
      loadPendingUsers();
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: error.message || "An error occurred while approving the user.",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (userId) => {
    try {
      await rejectUser(userId);
      toast({
        title: "User Rejected",
        description: "The user has been rejected and cannot log in.",
      });
      loadPendingUsers();
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: error.message || "An error occurred while rejecting the user.",
        variant: "destructive"
      });
    }
  };

  const handleApproveOrder = async (approvalId) => {
    try {
      console.log('Approving order with ID:', approvalId);
      const response = await fetch(`${API_BASE}/approval/approve/${approvalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approvedBy: 'admin'
        })
      });
      
      console.log('Approval response status:', response.status);
      const responseData = await response.json().catch(() => ({}));
      console.log('Approval response data:', responseData);
      
      if (response.ok) {
        toast({
          title: "Order Approved",
          description: "The coupon bypass request has been approved.",
        });
        loadOrderApprovals();
      } else {
        throw new Error(responseData.error || `HTTP ${response.status}: Failed to approve order`);
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: "Approval Failed",
        description: error.message || "An error occurred while approving the order.",
        variant: "destructive"
      });
    }
  };

  const handleRejectOrder = async (approvalId) => {
    try {
      const response = await fetch(`${API_BASE}/approval/reject/${approvalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rejectedBy: 'admin'
        })
      });
      
      if (response.ok) {
        toast({
          title: "Order Rejected",
          description: "The coupon bypass request has been rejected.",
        });
        loadOrderApprovals();
      } else {
        throw new Error('Failed to reject order');
      }
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: error.message || "An error occurred while rejecting the order.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeApprovalTab} onValueChange={setActiveApprovalTab} className="w-full">
        <TabsList className="hidden md:grid w-full grid-cols-3 overflow-hidden">
          <TabsTrigger value="users" className="relative whitespace-nowrap">
            User Approvals
            {notificationCounts.pendingUsers > 0 && (
              <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                {notificationCounts.pendingUsers}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="relative whitespace-nowrap">
            Order Bypass Approvals
            {notificationCounts.pendingOrderBypass > 0 && (
              <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                {notificationCounts.pendingOrderBypass}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="freedelivery" className="relative whitespace-nowrap">
            Free Delivery Approval
            {notificationCounts.pendingFreeDelivery > 0 && (
              <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                {notificationCounts.pendingFreeDelivery}
              </div>
            )}
          </TabsTrigger>
        </TabsList>
        <div className="overflow-x-auto md:hidden">
          <TabsList className="flex w-max overflow-y-hidden no-scrollbar">
            <TabsTrigger value="users" className="relative whitespace-nowrap px-4 py-2 min-w-[8rem] text-sm">
              User Approvals
              {notificationCounts.pendingUsers > 0 && (
                <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                  {notificationCounts.pendingUsers}
                </div>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="relative whitespace-nowrap px-4 py-2 min-w-[8rem] text-sm">
              Order Bypass Approvals
              {notificationCounts.pendingOrderBypass > 0 && (
                <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                  {notificationCounts.pendingOrderBypass}
                </div>
              )}
            </TabsTrigger>
            <TabsTrigger value="freedelivery" className="relative whitespace-nowrap px-4 py-2 min-w-[8rem] text-sm">
              Free Delivery Approval
              {notificationCounts.pendingFreeDelivery > 0 && (
                <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                  {notificationCounts.pendingFreeDelivery}
                </div>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="users">
          <Card className="bg-white border-2 border-gray-200 shadow-lg mt-6">
            <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
              <CardTitle className="text-white text-xl font-bold flex items-center">
                <UserPlus className="mr-3 h-6 w-6"/> Pending User Approvals
              </CardTitle>
              <p className="text-amber-100 text-sm font-medium mt-1">Review and approve new user registrations</p>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-800 text-lg font-medium">Loading Pending Approvals...</p>
                  </div>
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 border border-gray-200 rounded-lg">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Pending Approvals</h3>
                  <p className="text-gray-600 font-medium">All user registrations have been processed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr className="border-b border-gray-200">
                        <th className="p-4 text-gray-900 font-bold">Full Name</th>
                        <th className="p-4 text-gray-900 font-bold">Username</th>
                        <th className="p-4 text-gray-900 font-bold">Email</th>
                        <th className="p-4 text-gray-900 font-bold">Department</th>
                        <th className="p-4 text-gray-900 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {pendingUsers.map((user) => (
                        <motion.tr 
                          key={user.id} 
                          className="border-b border-gray-100 hover:bg-gray-50" 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }}
                        >
                          <td className="p-4 text-gray-900 font-medium">{user.fullName || user.full_name}</td>
                          <td className="p-4 text-gray-900 font-medium">{user.username}</td>
                          <td className="p-4 text-gray-900 font-medium">{user.email}</td>
                          <td className="p-4 text-gray-900 font-medium capitalize">{user.department}</td>
                          <td className="p-4 flex space-x-3">
                            <Button 
                              onClick={() => handleApprove(user.id)}
                              className="bg-green-600 hover:bg-green-700 text-white font-medium"
                              size="sm"
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              onClick={() => handleReject(user.id)}
                              className="bg-red-600 hover:bg-red-700 text-white font-medium"
                              size="sm"
                            >
                              <UserX className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="orders">
          <Card className="bg-white border-2 border-gray-200 shadow-lg mt-6">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardTitle className="text-white text-xl font-bold flex items-center">
                <FileText className="mr-3 h-6 w-6"/> Order Bypass Approvals
              </CardTitle>
              <p className="text-blue-100 text-sm font-medium mt-1">Review and approve coupon bypass requests</p>
            </CardHeader>
            <CardContent className="p-6">
              {orderLoading ? (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-800 text-lg font-medium">Loading Order Approvals...</p>
                  </div>
                </div>
              ) : orderApprovals.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 border border-gray-200 rounded-lg">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Pending Order Approvals</h3>
                  <p className="text-gray-600 font-medium">All coupon bypass requests have been processed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr className="border-b border-gray-200">
                        <th className="p-4 text-gray-900 font-bold">Order ID</th>
                        <th className="p-4 text-gray-900 font-bold">Customer</th>
                        <th className="p-4 text-gray-900 font-bold">Product</th>
                        <th className="p-4 text-gray-900 font-bold">Quantity</th>
                        <th className="p-4 text-gray-900 font-bold">Amount</th>
                        <th className="p-4 text-gray-900 font-bold">Coupon Code</th>
                        <th className="p-4 text-gray-900 font-bold">Reason</th>
                        <th className="p-4 text-gray-900 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {orderApprovals
                        .filter(approval => approval.requestType === 'coupon_applied')
                        .map((approval) => (
                        <motion.tr 
                          key={approval.id} 
                          className="border-b border-gray-100 hover:bg-gray-50" 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <td className="p-4 text-gray-800 font-medium">#{approval.orderNumber}</td>
                          <td className="p-4 text-gray-700">{approval.customerName}</td>
                          <td className="p-4 text-gray-700">{approval.productName}</td>
                          <td className="p-4 text-gray-700">{approval.quantity || 1}</td>
                          <td className="p-4 text-gray-700">₹{approval.finalAmount}</td>
                          <td className="p-4 text-gray-700">{approval.coupon_code}</td>
                          <td className="p-4 text-gray-700">{approval.requestDetails}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApproveOrder(approval.id, approval.requestType)}
                              >
                                ✓ Approve
                              </Button>
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleRejectOrder(approval.id)}
                              >
                                ✗ Reject
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
              <TabsContent value="freedelivery">
          <Card className="bg-white border-2 border-gray-200 shadow-lg mt-6">
            <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
              <CardTitle className="text-white text-xl font-bold flex items-center">
                <FileText className="mr-3 h-6 w-6"/> Free Delivery Approvals
              </CardTitle>
              <p className="text-green-100 text-sm font-medium mt-1">Review and approve free delivery requests</p>
            </CardHeader>
            <CardContent className="p-6">
              {orderLoading ? (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-800 text-lg font-medium">Loading Free Delivery Approvals...</p>
                  </div>
                </div>
              ) : orderApprovals.filter(a => a.requestType === 'free_delivery').length === 0 ? (
                <div className="text-center p-12 bg-gray-50 border border-gray-200 rounded-lg">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Pending Free Delivery Approvals</h3>
                  <p className="text-gray-600 font-medium">All free delivery requests have been processed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr className="border-b border-gray-200">
                        <th className="p-4 text-gray-900 font-bold">Order ID</th>
                        <th className="p-4 text-gray-900 font-bold">Customer</th>
                        <th className="p-4 text-gray-900 font-bold">Product</th>
                        <th className="p-4 text-gray-900 font-bold">Quantity</th>
                        <th className="p-4 text-gray-900 font-bold">Amount</th>
                        <th className="p-4 text-gray-900 font-bold">Requested By</th>
                        <th className="p-4 text-gray-900 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {orderApprovals
                        .filter(approval => approval.requestType === 'free_delivery')
                        .map((approval) => (
                          <motion.tr 
                            key={approval.id} 
                            className="border-b border-gray-100 hover:bg-gray-50" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <td className="p-4 text-gray-800 font-medium">#{approval.orderNumber}</td>
                            <td className="p-4 text-gray-700">{approval.customerName}</td>
                            <td className="p-4 text-gray-700">{approval.productName}</td>
                            <td className="p-4 text-gray-700">{approval.quantity || 1}</td>
                            <td className="p-4 text-gray-700">₹{approval.finalAmount}</td>
                            <td className="p-4 text-gray-700">{approval.requestedBy}</td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleApproveOrder(approval.id)}
                                >
                                  ✓ Approve
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => handleRejectOrder(approval.id)}
                                >
                                  ✗ Reject
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
              </Tabs>
            </div>
          );
        };const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Government Header */}
      <div className="bg-white shadow-md border-b-4 border-blue-800">
        <div className="max-w-7xl mx-auto">
          {/* Top Bar */}
          <div className="bg-blue-800 text-white px-6 py-2 text-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Building className="w-4 h-4" />
                <span className="font-medium">Administrative Control</span>
              </div>
              <div className="text-blue-100">
                {new Date().toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>

          {/* Main Header */}
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-600 p-3 rounded-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Administrative Control Panel</h1>
                  <p className="text-gray-600">System Administrator: <span className="font-medium">{user?.username || 'admin'}</span></p>
                </div>
              </div>
              <Button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-medium flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
        
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
      <Tabs defaultValue="overview" className="w-full">
          <div className="overflow-x-auto hidden md:block">
            <TabsList className="flex w-full bg-white border-2 border-gray-300 shadow-sm overflow-hidden">
              <TabsTrigger value="overview" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="approvals" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">Approvals</TabsTrigger>
              <TabsTrigger value="production" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">Production</TabsTrigger>
              <TabsTrigger value="purchase" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">Purchase</TabsTrigger>
              <TabsTrigger value="store" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">Store</TabsTrigger>
              <TabsTrigger value="assembly" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">Assembly</TabsTrigger>
              <TabsTrigger value="finance" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">Finance</TabsTrigger>
              <TabsTrigger value="showroom" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">Showroom</TabsTrigger>
              <TabsTrigger value="sales" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">Sales</TabsTrigger>
              <TabsTrigger value="dispatch" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">Dispatch</TabsTrigger>
              <TabsTrigger value="transport" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">Transport</TabsTrigger>
              <TabsTrigger value="hr" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">HR</TabsTrigger>
              <TabsTrigger value="watchman" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap flex-1 px-2 py-2 text-xs lg:text-sm">Security</TabsTrigger>
            </TabsList>
          </div>
          <div className="overflow-x-auto md:hidden">
            <TabsList className="flex w-max bg-white border-2 border-gray-300 shadow-sm overflow-y-hidden no-scrollbar">
              <TabsTrigger value="overview" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">Overview</TabsTrigger>
              <TabsTrigger value="approvals" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">Approvals</TabsTrigger>
              <TabsTrigger value="production" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">Production</TabsTrigger>
              <TabsTrigger value="purchase" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">Purchase</TabsTrigger>
              <TabsTrigger value="store" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">Store</TabsTrigger>
              <TabsTrigger value="assembly" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">Assembly</TabsTrigger>
              <TabsTrigger value="finance" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">Finance</TabsTrigger>
              <TabsTrigger value="showroom" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">Showroom</TabsTrigger>
              <TabsTrigger value="sales" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">Sales</TabsTrigger>
              <TabsTrigger value="dispatch" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">Dispatch</TabsTrigger>
              <TabsTrigger value="transport" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">Transport</TabsTrigger>
              <TabsTrigger value="hr" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">HR</TabsTrigger>
              <TabsTrigger value="watchman" className="text-gray-700 font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap px-4 py-2 min-w-[5rem] text-sm">Security</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="overview"><UserManagement /></TabsContent>
          <TabsContent value="approvals"><UserApproval /></TabsContent>
          <TabsContent value="production"><ProductionDashboard /></TabsContent>
          <TabsContent value="purchase"><PurchaseDashboard /></TabsContent>
          <TabsContent value="store"><StoreDashboard /></TabsContent>
          <TabsContent value="assembly"><AssemblyDashboard /></TabsContent>
          <TabsContent value="finance"><FinanceDashboard /></TabsContent>
          <TabsContent value="showroom"><ShowroomDashboard /></TabsContent>
          <TabsContent value="sales"><SalesDashboard /></TabsContent>
          <TabsContent value="dispatch"><DispatchDashboard /></TabsContent>
          <TabsContent value="transport"><TransportDashboard /></TabsContent>
          <TabsContent value="hr"><HRDepartment /></TabsContent>
          <TabsContent value="watchman"><WatchmanDashboard /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
