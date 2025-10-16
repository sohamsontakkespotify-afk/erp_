import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
    Package, 
    Truck, 
    ClipboardCheck, 
    Clock, 
    CheckCircle, 
    AlertCircle,
    Users,
    Bell,
    Phone,
    Mail,
    MapPin,
    FileText,
    BarChart3,
    RefreshCw,
    ArrowLeft,
    Box
} from 'lucide-react';

import { API_BASE } from '@/lib/api';
import OrderStatusBar from '@/components/ui/OrderStatusBar';

const DispatchDepartment = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [dispatchOrders, setDispatchOrders] = useState([]);
    const [dispatchSummary, setDispatchSummary] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showProcessDialog, setShowProcessDialog] = useState(false);
    const [showCustomerDetailsDialog, setShowCustomerDetailsDialog] = useState(false);
    const { toast } = useToast();
    
    // Notification counts
    const [notificationCounts, setNotificationCounts] = useState({
        pendingOrders: 0,
        detailsRequired: 0
    });

    // Form states
    const [customerDetailsForm, setCustomerDetailsForm] = useState({
        partyName: '',
        partyContact: '',
        partyAddress: '',
        partyEmail: ''
    });

    const [processForm, setProcessForm] = useState({
        notes: '',
        customerVehicleNo: '',
        transporterName: '',
        vehicleNo: ''
    });

    useEffect(() => {
        fetchData();
        
        // Set up polling for notifications
        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000); // Poll every 30 seconds
        
        return () => clearInterval(interval);
    }, []);
    
    // Update notification counts when dispatchSummary changes
    useEffect(() => {
        if (dispatchSummary) {
            // Calculate total pending orders from all three sections in the "Pending Orders" tab:
            // 1. Pending Dispatch Orders (status = 'pending')
            // 2. Self-Delivery Loading Queue (delivery_type = 'self' AND status IN ['ready_for_load', 'entered_for_pickup'])
            // 3. Part Load - Delivery Loading Queue (originalDeliveryType = 'part load' AND status IN ['ready_for_pickup', 'entered_for_pickup'])
            const totalPendingCount = (dispatchSummary.pendingOrders || 0) + 
                                     (dispatchSummary.selfDeliveryLoadingQueue || 0) + 
                                     (dispatchSummary.partLoadLoadingQueue || 0);
            
            setNotificationCounts({
                pendingOrders: totalPendingCount,
                detailsRequired: dispatchSummary.customerDetailsRequired || 0
            });
        }
    }, [dispatchSummary]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ordersRes, summaryRes, notificationsRes] = await Promise.all([
                fetch(`${API_BASE}/dispatch/all`),
                fetch(`${API_BASE}/dispatch/summary`),
                fetch(`${API_BASE}/dispatch/notifications`)
            ]);

            if (ordersRes.ok) {
                const orders = await ordersRes.json();
                setDispatchOrders(orders);
            }

            if (summaryRes.ok) {
                const summary = await summaryRes.json();
                setDispatchSummary(summary);
            }

            if (notificationsRes.ok) {
                const notifs = await notificationsRes.json();
                setNotifications(notifs);
                
                // Show toast notifications for new vehicle entries
                notifs.forEach(notif => {
                    if (notif.isNew && notif.type === 'vehicle_entered') {
                        toast({
                            title: "🚛 Vehicle Entered for Loading",
                            description: `${notif.message} - Order: ${notif.orderNumber} | Vehicle: ${notif.vehicleNumber}`,
                            className: "bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-500 shadow-2xl text-green-900 font-semibold text-lg p-6",
                            duration: 8000
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({
                title: "Error",
                description: "Failed to fetch dispatch data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${API_BASE}/dispatch/notifications`);
            if (res.ok) {
                const notifs = await res.json();
                setNotifications(notifs);
                
                // Show toast for new notifications
                notifs.forEach(notif => {
                    if (notif.isNew && notif.type === 'vehicle_entered') {
                        toast({
                            title: "🚛 Vehicle Entered for Loading",
                            description: `${notif.message} - Order: ${notif.orderNumber} | Vehicle: ${notif.vehicleNumber}`,
                            className: "bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-500 shadow-2xl text-green-900 font-semibold text-lg p-6",
                            duration: 8000
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const handleProcessOrder = async (orderId, deliveryType) => {
        try {
            const processData = {
                notes: processForm.notes
            };

            if (deliveryType === 'self') {
                processData.customerVehicleNo = processForm.customerVehicleNo;
            } else {
                processData.transporterName = processForm.transporterName;
                processData.vehicleNo = processForm.vehicleNo;
            }

            const response = await fetch(`${API_BASE}/dispatch/process/${orderId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(processData),
            });

            if (response.ok) {
                const result = await response.json();
                setShowProcessDialog(false);
                setProcessForm({
                    notes: '',
                    customerVehicleNo: '',
                    transporterName: '',
                    vehicleNo: ''
                });

                if (result.status === 'customer_details_required') {
                    toast({
                        title: (
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-500" />
                                <span>Required</span>
                            </div>
                        ),
                        description: (
                            <p className="text-sm">{result.message}</p>
                        ),
                        variant: "destructive"
                    });
                } else {
                    toast({
                        title: "Success",
                        description: result.message,
                    });
                }
                
                fetchData(); // Refresh data
            } else {
                const error = await response.json();
                toast({
                    title: "Error",
                    description: error.error || "Failed to process order",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error processing order:', error);
            toast({
                title: "Error",
                description: "Failed to process order",
                variant: "destructive"
            });
        }
    };

    const handleUpdateCustomerDetails = async (dispatchId) => {
        try {
            const response = await fetch(`${API_BASE}/dispatch/customer-details/${dispatchId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(customerDetailsForm),
            });

            if (response.ok) {
                setShowCustomerDetailsDialog(false);
                setCustomerDetailsForm({
                    partyName: '',
                    partyContact: '',
                    partyAddress: '',
                    partyEmail: ''
                });
                
                toast({
                    title: "Success",
                    description: "Customer details updated successfully",
                });
                
                fetchData(); // Refresh data
            } else {
                const error = await response.json();
                toast({
                    title: "Error",
                    description: error.error || "Failed to update customer details",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error updating customer details:', error);
            toast({
                title: "Error",
                description: "Failed to update customer details",
                variant: "destructive"
            });
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'pending': { color: 'bg-yellow-500', text: 'Pending' },
            'customer_details_required': { color: 'bg-orange-500', text: 'Details Required' },
            'ready_for_pickup': { color: 'bg-blue-500', text: 'ready_for_load' },
            'assigned_transport': { color: 'bg-purple-500', text: 'Assigned to Transport' },
            'in_transit': { color: 'bg-indigo-500', text: 'In Transit' },
            'completed': { color: 'bg-green-500', text: 'Completed' },
            'cancelled': { color: 'bg-red-500', text: 'Cancelled' }
        };
        const config = statusConfig[status] || { color: 'bg-gray-500', text: status };
        return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
    };

    const getDeliveryTypeBadge = (deliveryType, originalLabel) => {
        const label = (originalLabel || deliveryType || '').toLowerCase();
        
        switch(label) {
            case 'company delivery':
                return <Badge className="bg-blue-100 text-blue-800 border border-blue-300 font-medium">COMPANY DELIVERY</Badge>;
            case 'part load':
                return <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-medium">PART LOAD</Badge>;
            case 'self delivery':
            case 'self pickup':
            case 'self':
                return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 font-medium">SELF PICKUP</Badge>;
            case 'free delivery':
            case 'free company delivery':
                return <Badge className="bg-green-100 text-green-800 border border-green-300 font-medium">FREE DELIVERY</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800 border border-gray-300 font-medium">{label.toUpperCase()}</Badge>;
        }
    };

    const openProcessDialog = (order) => {
        setSelectedOrder(order);
        setShowProcessDialog(true);
    };

    const openCustomerDetailsDialog = (order) => {
        setSelectedOrder(order);
        setCustomerDetailsForm({
            partyName: order.customerName || '',
            partyContact: order.customerContact || '',
            partyAddress: order.customerAddress || '',
            partyEmail: order.customerEmail || ''
        });
        setShowCustomerDetailsDialog(true);
    };

    // Pending Dispatch should exclude self-delivery loading/entered orders
    const pendingOrders = dispatchOrders.filter(order => order.status === 'pending');
    const customerDetailsPendingOrders = dispatchOrders.filter(order => order.status === 'customer_details_required');

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
                <Box className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dispatch Department</h1>
                <p className="text-gray-600 text-sm sm:text-base font-medium">Order Dispatch Management System</p>
              </div>
            </div>
          </div>
          {/* Right: User Panel */}
          <div className="bg-gradient-to-r from-green-50 to-indigo-50 border-2 border-green-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-gray-600 text-xs font-medium">Dispatch Team</p>
                <p className="text-green-600 text-xs font-medium">Order Dispatch Management</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Order Status Bar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <OrderStatusBar className="mb-4" />
     
                
                {/* Main Content */}
                <div className="px-6 py-6 space-y-6">

             <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="flex md:grid md:grid-cols-4 w-full overflow-x-auto overflow-y-hidden md:overflow-x-hidden whitespace-nowrap bg-gray-100 border border-gray-300 pl-24 md:pl-0">
                    <TabsTrigger value="dashboard" className="text-gray-800">Dashboard</TabsTrigger>
                    <TabsTrigger value="pending" className="text-gray-800 relative">
                        Pending Orders
                        {notificationCounts.pendingOrders > 0 && (
                            <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                                {notificationCounts.pendingOrders}
                            </div>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="all-orders" className="text-gray-800">All Orders</TabsTrigger>
                    <TabsTrigger value="customer-details" className="text-gray-800 relative">
                        Customer Details
                        {notificationCounts.detailsRequired > 0 && (
                            <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                                {notificationCounts.detailsRequired}
                            </div>
                        )}
                    </TabsTrigger>
                </TabsList>
            

                <TabsContent value="dashboard" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-white border border-gray-300 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-800">Pending Orders</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-800">{dispatchSummary.pendingOrders || 0}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border border-gray-300 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-800">Details Required</CardTitle>
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-800">{dispatchSummary.customerDetailsRequired || 0}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border border-gray-300 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-800">In Transit</CardTitle>
                                <Truck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-800">{dispatchSummary.inTransit || 0}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border border-gray-300 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-800">Completed Today</CardTitle>
                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-800">{dispatchSummary.todayCompleted || 0}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="bg-white border border-gray-300 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-gray-800">
                                    <BarChart3 className="h-5 w-5" />
                                    Delivery Types
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-800">Self Pickup</span>
                                        <Badge className="bg-blue-100 text-blue-800 border border-blue-300 font-medium">
                                            {dispatchSummary.selfDelivery || 0}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-800">Company Delivery</span>
                                        <Badge className="bg-green-100 text-green-800 border border-green-300 font-medium">
                                            {dispatchSummary.transportDelivery || 0}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border border-gray-300 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-gray-800">Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-800">Today's Dispatches</span>
                                        <span className="font-semibold text-gray-800">{dispatchSummary.todayDispatches || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-800">Today's Completed</span>
                                        <span className="font-semibold text-gray-800">{dispatchSummary.todayCompleted || 0}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="pending" className="space-y-4">
                    <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                                <Package className="h-5 w-5" />
                                Pending Dispatch Orders ({pendingOrders.length})
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                                Orders waiting to be processed and sent to appropriate departments
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            {loading ? (
                                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                                <div className="text-center">
                                <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                                <p className="text-gray-800 text-lg font-medium">Loading Dispatch dashboard...</p>
                                <p className="text-gray-600 text-sm mt-1">Please wait while we retrieve the data</p>
                                </div>
                            </div>
                            ) : pendingOrders.length === 0 ? (
                                <div className="text-center py-8 text-gray-600">
                                    <Package className="mx-auto h-12 w-12 mb-4" />
                                    <p>No pending dispatch orders</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                        <TableHead className="text-black">Order #</TableHead>
                                        <TableHead className="text-black">Product</TableHead>
                                        <TableHead className="text-black">Customer</TableHead>
                                        <TableHead className="text-black">Delivery Type</TableHead>
                                        <TableHead className="text-black">Quantity</TableHead>
                                        <TableHead className="text-black">Amount</TableHead>
                                        <TableHead className="text-black">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingOrders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium text-gray-800">{order.orderNumber}</TableCell>
                                                <TableCell className="text-gray-800">{order.productName}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium text-gray-800">{order.customerName}</div>
                                                        <div className="text-sm text-gray-600">{order.customerContact}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getDeliveryTypeBadge(order.deliveryType, order.originalDeliveryType)}</TableCell>
                                                <TableCell className="text-gray-800">{order.quantity}</TableCell>
                                                <TableCell className="text-gray-800">₹{order.finalAmount?.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openProcessDialog(order)}
                                                            className="bg-blue-600 hover:bg-blue-700"
                                                        >
                                                            Process
                                                        </Button>
                                                        {(!order.customerContact || !order.customerAddress) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openCustomerDetailsDialog(order)}
                                                            >
                                                                Update Details
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Self-Delivery Loading Queue */}
                    <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                                <Box className="h-5 w-5" /> Self-Delivery Loading Queue
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                                Orders in self-delivery flow. Load when status is Entered for Pickup.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-black">Order #</TableHead>
                                        <TableHead className="text-black">Customer</TableHead>
                                        <TableHead className="text-black">Vehicle</TableHead>
                                        <TableHead className="text-black">Driver Name</TableHead>
                                        <TableHead className="text-black">Status</TableHead>
                                        <TableHead className="text-black">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dispatchOrders.filter(o => o.deliveryType === 'self' && ['ready_for_load','entered_for_pickup'].includes(o.status)).map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium text-gray-800">{order.orderNumber}</TableCell>
                                            <TableCell className="text-gray-800">{order.customerName}</TableCell>
                                            <TableCell className="text-gray-800">
                                                {order.customerVehicle || '-'}
                                            </TableCell>
                                            <TableCell className="text-gray-800">
                                                {order.driverName || '-'}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={order.status !== 'entered_for_pickup'}
                                                        onClick={async () => {
                                                            const res = await fetch(`${API_BASE}/dispatch/self/loaded/${order.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: 'Loaded by dispatch' }) });
                                                            if (res.ok) {
                                                                toast({ title: 'Loaded', description: `Order ${order.orderNumber} marked loaded` });
                                                                fetchData();
                                                            } else {
                                                                const err = await res.json().catch(() => ({}));
                                                                toast({ title: 'Failed', description: err.error || 'Try again', variant: 'destructive' });
                                                            }
                                                        }}
                                                    >
                                                        Mark Loaded
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            </TableRow>
                                        ))}
                                    {dispatchOrders.filter(o => o.deliveryType === 'self' && ['ready_for_load','entered_for_pickup'].includes(o.status)).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-600">
                                                No self-delivery orders ready for loading.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Part Load - Delivery Loading Queue */}
                    <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                                <Truck className="h-5 w-5" /> Part Load - Delivery Loading Queue
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                                Part Load orders ready for loading. Load when status is Ready for Pickup.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-black">Order #</TableHead>
                                        <TableHead className="text-black">Customer</TableHead>
                                        <TableHead className="text-black">Vehicle</TableHead>
                                        <TableHead className="text-black">Driver Name</TableHead>
                                        <TableHead className="text-black">Company</TableHead>
                                        <TableHead className="text-black">Status</TableHead>
                                        <TableHead className="text-black">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dispatchOrders
                                        .filter(o =>
                                            o.originalDeliveryType?.toLowerCase() === 'part load' &&
                                            ['ready_for_pickup', 'entered_for_pickup'].includes(o.status)
                                        )
                                        .map(order => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium text-gray-800">{order.orderNumber}</TableCell>
                                                <TableCell className="text-gray-800">{order.customerName}</TableCell>
                                                <TableCell className="text-gray-800">
                                                    {order.customerVehicle || order.vehicleNumber || '-'}
                                                </TableCell>
                                                <TableCell className="text-gray-800">
                                                    {order.driverName || '-'}
                                                </TableCell>
                                                <TableCell className="text-gray-800">
                                                    {order.companyName || order.transporterName || '-'}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(order.status)}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={order.status !== 'entered_for_pickup'}
                                                            onClick={async () => {
                                                                const res = await fetch(`${API_BASE}/dispatch/part-load/loaded/${order.id}`, { 
                                                                    method: 'POST', 
                                                                    headers: { 'Content-Type': 'application/json' }, 
                                                                    body: JSON.stringify({ notes: 'Part Load loaded by dispatch' }) 
                                                                });
                                                                if (res.ok) {
                                                                    toast({ title: 'Loaded', description: `Part Load order ${order.orderNumber} marked loaded` });
                                                                    fetchData();
                                                                } else {
                                                                    const err = await res.json().catch(() => ({}));
                                                                    toast({ title: 'Failed', description: err.error || 'Try again', variant: 'destructive' });
                                                                }
                                                            }}
                                                        >
                                                            Mark Loaded
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    }
                                    {dispatchOrders.filter(o =>
                                        o.originalDeliveryType?.toLowerCase() === 'part load' &&
                                        ['ready_for_pickup', 'entered_for_pickup'].includes(o.status)
                                    ).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-gray-600">
                                                No Part Load orders ready for loading.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="all-orders" className="space-y-4">
                    <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                                <ClipboardCheck className="h-5 w-5" />
                                All Dispatch Orders ({dispatchOrders.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            {loading ? (
                                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                                <div className="text-center">
                                <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                                <p className="text-gray-800 text-lg font-medium">Loading Dispatch dashboard...</p>
                                <p className="text-gray-600 text-sm mt-1">Please wait while we retrieve the data</p>
                                </div>
                            </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-black">Order #</TableHead>
                                            <TableHead className="text-black">Product</TableHead>
                                            <TableHead className="text-black">Customer</TableHead>
                                            <TableHead className="text-black">Delivery Type</TableHead>
                                            <TableHead className="text-black">Status</TableHead>
                                            <TableHead className="text-black">Quantity</TableHead>
                                            <TableHead className="text-black">Created</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dispatchOrders
                                            .filter(order => !(order.deliveryType === 'self' && ['ready_for_load','entered_for_pickup'].includes(order.status)))
                                            .map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium text-gray-800">{order.orderNumber}</TableCell>
                                                <TableCell className="text-gray-800">{order.productName}</TableCell>
                                                <TableCell className="text-gray-800">{order.customerName}</TableCell>
                                                <TableCell>{getDeliveryTypeBadge(order.deliveryType, order.originalDeliveryType)}</TableCell>
                                                <TableCell>{getStatusBadge(order.status)}</TableCell>
                                                <TableCell className="text-gray-800">{order.quantity}</TableCell>
                                                <TableCell className="text-gray-800">{order.createdAt}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>



                <TabsContent value="customer-details" className="space-y-4">
                    <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                                <Users className="h-5 w-5" />
                                Orders Requiring Customer Details ({customerDetailsPendingOrders.length})
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                                Orders that need complete customer details before processing
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            {customerDetailsPendingOrders.length === 0 ? (
                                <div className="text-center py-8 text-gray-600">
                                    <Users className="mx-auto h-12 w-12 mb-4" />
                                    <p>No orders requiring customer details</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-black">Order #</TableHead>
                                            <TableHead className="text-black">Customer</TableHead>
                                            <TableHead className="text-black">Missing Details</TableHead>
                                            <TableHead className="text-black">Delivery Type</TableHead>
                                            <TableHead className="text-black">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customerDetailsPendingOrders.map((order) => {
                                            const missingDetails = [];
                                            if (!order.customerContact) missingDetails.push('Contact');
                                            if (!order.customerAddress) missingDetails.push('Address');
                                            
                                            return (
                                                <TableRow key={order.id}>
                                                    <TableCell className="font-medium text-gray-800">{order.orderNumber}</TableCell>
                                                    <TableCell className="text-gray-800">{order.customerName}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            {missingDetails.map(detail => (
                                                                <Badge key={detail} className="bg-red-100 text-red-800 border border-red-300 font-medium text-xs">
                                                                    {detail}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{getDeliveryTypeBadge(order.deliveryType, order.originalDeliveryType)}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openCustomerDetailsDialog(order)}
                                                        >
                                                            Update Details
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Process Order Dialog */}
            <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Process Dispatch Order</DialogTitle>
                        <DialogDescription>
                            {selectedOrder && (
                                <>Process order {selectedOrder.orderNumber} for {selectedOrder.deliveryType} delivery</>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="notes">Processing Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Add any notes for this dispatch..."
                                    value={processForm.notes}
                                    onChange={(e) => setProcessForm(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => handleProcessOrder(selectedOrder?.id, selectedOrder?.deliveryType)}>
                            {selectedOrder?.deliveryType === 'self' ? 'Send to Watchman' : 'Send to Transport'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Customer Details Dialog */}
            <Dialog open={showCustomerDetailsDialog} onOpenChange={setShowCustomerDetailsDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Customer Details</DialogTitle>
                        <DialogDescription>
                            Complete missing customer information for order processing
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="customerName">Customer Name *</Label>
                            <Input
                                id="customerName"
                                value={customerDetailsForm.partyName}
                                onChange={(e) => setCustomerDetailsForm(prev => ({ ...prev, partyName: e.target.value }))}
                                placeholder="Enter customer name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customerContact">Contact Number *</Label>
                            <Input
                                id="customerContact"
                                value={customerDetailsForm.partyContact}
                                onChange={(e) => setCustomerDetailsForm(prev => ({ ...prev, partyContact: e.target.value }))}
                                placeholder="Enter contact number"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customerEmail">Email Address</Label>
                            <Input
                                id="customerEmail"
                                type="email"
                                value={customerDetailsForm.partyEmail}
                                onChange={(e) => setCustomerDetailsForm(prev => ({ ...prev, partyEmail: e.target.value }))}
                                placeholder="Enter email address"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customerAddress">Address *</Label>
                            <Textarea
                                id="customerAddress"
                                value={customerDetailsForm.partyAddress}
                                onChange={(e) => setCustomerDetailsForm(prev => ({ ...prev, partyAddress: e.target.value }))}
                                placeholder="Enter complete address"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCustomerDetailsDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => handleUpdateCustomerDetails(selectedOrder?.id)}>
                            Update Details
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="text-center text-gray-600">
            <p className="font-medium">
              © Sales Management System
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

export default DispatchDepartment;
