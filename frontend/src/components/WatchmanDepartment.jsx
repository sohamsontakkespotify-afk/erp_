import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
    Shield,
    CheckCircle,
    XCircle,
    Clock,
    User,
    AlertTriangle,
    BarChart3,
    RefreshCw,
    ArrowLeft,
    Users,
    FileText,
    Search,
    UserCheck,
    UserX,
    Plus,
    Edit,
    Trash2,
    Calendar,
    Building,
    Phone,
    Mail,
    Save
} from 'lucide-react';

import { API_BASE } from '@/lib/api';
import GateEntryTab from './GateEntryTab';
import OrderStatusBar from '@/components/ui/OrderStatusBar';

const WatchmanDepartment = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [pendingPickups, setPendingPickups] = useState([]);
    const [allGatePasses, setAllGatePasses] = useState([]);
    const [watchmanSummary, setWatchmanSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedGatePass, setSelectedGatePass] = useState(null);
    const [showVerifyDialog, setShowVerifyDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);

    const [allPassesSearchTerm, setAllPassesSearchTerm] = useState('');
    const [notificationCounts, setNotificationCounts] = useState({
        pendingPickups: 0
    });
    const { toast } = useToast();

    // Guest List States
    const [guests, setGuests] = useState([]);
    const [guestSummary, setGuestSummary] = useState({});
    const [showGuestDialog, setShowGuestDialog] = useState(false);
    const [guestDialogMode, setGuestDialogMode] = useState('add'); // 'add', 'edit', 'view'
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [guestSearchTerm, setGuestSearchTerm] = useState('');
    const [guestForm, setGuestForm] = useState({
        guestName: '',
        guestContact: '',
        guestEmail: '',
        guestCompany: '',
        meetingPerson: '',
        meetingPersonDepartment: '',
        meetingPersonContact: '',
        visitDate: '',
        visitTime: '',
        purpose: '',
        vehicleNumber: '',
        idProofType: '',
        idProofNumber: '',
        notes: ''
    });

    // Form states
    const [verificationForm, setVerificationForm] = useState({
        customerName: '',
        vehicleNo: '',
        driverName: '',
        note: ''
    });

    const [rejectionForm, setRejectionForm] = useState({
        rejectionReason: ''
    });

    useEffect(() => {
        fetchData();
        fetchGuests();
    }, []);
    
    // Update notification counts when pendingPickups changes
    useEffect(() => {
        setNotificationCounts({
            pendingPickups: pendingPickups.length
        });
    }, [pendingPickups]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [pickupsRes, gatePassesRes, summaryRes] = await Promise.all([
                fetch(`${API_BASE}/watchman/pending-pickups`),
                fetch(`${API_BASE}/watchman/gate-passes`),
                fetch(`${API_BASE}/watchman/summary`)
            ]);

            if (pickupsRes.ok) {
                const pickups = await pickupsRes.json();
                setPendingPickups(pickups);
            }

            if (gatePassesRes.ok) {
                const gatePasses = await gatePassesRes.json();
                setAllGatePasses(gatePasses);
            }

            if (summaryRes.ok) {
                const summary = await summaryRes.json();
                setWatchmanSummary(summary);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({
                title: "Error",
                description: "Failed to fetch watchman data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchGuests = async () => {
        try {
            const [guestsRes, summaryRes] = await Promise.all([
                fetch(`${API_BASE}/watchman/guests`),
                fetch(`${API_BASE}/watchman/guests/summary`)
            ]);

            if (guestsRes.ok) {
                const guestsData = await guestsRes.json();
                setGuests(guestsData);
            }

            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                setGuestSummary(summaryData);
            }
        } catch (error) {
            console.error('Error fetching guests:', error);
            toast({
                title: "Error",
                description: "Failed to fetch guest list",
                variant: "destructive"
            });
        }
    };

    const handleVerifyPickup = async (action) => {
        try {
            const requestData = {
                ...verificationForm,
                action: action
            };

            const response = await fetch(`${API_BASE}/watchman/verify/${selectedGatePass.gatePassId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            if (response.ok) {
                const result = await response.json();

                if (result.status === 'identity_mismatch') {
                    toast({
                        title: "Identity Mismatch",
                        description: result.message,
                        variant: "destructive"
                    });
                    return;
                }

                setShowVerifyDialog(false);
                setVerificationForm({
                    customerName: '',
                    vehicleNo: '',
                    driverName: '',
                    note: ''
                });

                toast({
                    title: "Success",
                    description: result.message,
                });

                fetchData(); // Refresh data
            } else {
                const error = await response.json();
                toast({
                    title: "Error",
                    description: error.error || "Failed to verify pickup",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error verifying pickup:', error);
            toast({
                title: "Error",
                description: "Failed to verify pickup",
                variant: "destructive"
            });
        }
    };

    const handleRejectPickup = async () => {
        try {
            const response = await fetch(`${API_BASE}/watchman/reject/${selectedGatePass.gatePassId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(rejectionForm),
            });

            if (response.ok) {
                const result = await response.json();
                setShowRejectDialog(false);
                setRejectionForm({
                    rejectionReason: ''
                });

                toast({
                    title: "Pickup Rejected",
                    description: result.message,
                    variant: "destructive"
                });

                fetchData(); // Refresh data
            } else {
                const error = await response.json();
                toast({
                    title: "Error",
                    description: error.error || "Failed to reject pickup",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error rejecting pickup:', error);
            toast({
                title: "Error",
                description: "Failed to reject pickup",
                variant: "destructive"
            });
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'pending': {
                className: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
                text: 'Pending Verification'
            },
            'verified': {
                className: 'bg-green-100 text-green-800 border border-green-300',
                text: 'Verified & Released'
            },
            'entered_for_pickup': {
                className: 'bg-blue-100 text-blue-800 border border-blue-300',
                text: 'Entered for Pickup'
            },
            'rejected': {
                className: 'bg-red-100 text-red-800 border border-red-300',
                text: 'Rejected'
            }
        };
        const config = statusConfig[status] || {
            className: 'bg-gray-100 text-gray-800 border border-gray-300',
            text: status
        };
        return <Badge className={`${config.className} font-medium`}>{config.text}</Badge>;
    };

    const openVerifyDialog = (gatePass) => {
        setSelectedGatePass(gatePass);
        setVerificationForm({
            customerName: gatePass.customerName || '',
            vehicleNo: gatePass.customerVehicle || '',
            driverName: gatePass.driverName || ''
        });
        setShowVerifyDialog(true);
    };

    const openRejectDialog = (gatePass) => {
        setSelectedGatePass(gatePass);
        setRejectionForm({
            rejectionReason: ''
        });
        setShowRejectDialog(true);
    };

    const filteredAllGatePasses = allGatePasses.filter((gatePass) => {
        if (!allPassesSearchTerm.trim()) return true;
        const searchLower = allPassesSearchTerm.toLowerCase();
        return (
            gatePass.customerName?.toLowerCase().includes(searchLower) ||
            gatePass.orderNumber?.toLowerCase().includes(searchLower) ||
            gatePass.productName?.toLowerCase().includes(searchLower) ||
            gatePass.customerVehicle?.toLowerCase().includes(searchLower)
        );
    });

    // Guest List Functions
    const openGuestDialog = (mode, guest = null) => {
        setGuestDialogMode(mode);
        setSelectedGuest(guest);
        if (guest && (mode === 'edit' || mode === 'view')) {
            setGuestForm({
                guestName: guest.guestName || '',
                guestContact: guest.guestContact || '',
                guestEmail: guest.guestEmail || '',
                guestCompany: guest.guestCompany || '',
                meetingPerson: guest.meetingPerson || '',
                meetingPersonDepartment: guest.meetingPersonDepartment || '',
                meetingPersonContact: guest.meetingPersonContact || '',
                visitDate: guest.visitDate || '',
                visitTime: guest.visitTime || '',
                purpose: guest.purpose || '',
                vehicleNumber: guest.vehicleNumber || '',
                idProofType: guest.idProofType || '',
                idProofNumber: guest.idProofNumber || '',
                notes: guest.notes || ''
            });
        } else {
            setGuestForm({
                guestName: '',
                guestContact: '',
                guestEmail: '',
                guestCompany: '',
                meetingPerson: '',
                meetingPersonDepartment: '',
                meetingPersonContact: '',
                visitDate: '',
                visitTime: '',
                purpose: '',
                vehicleNumber: '',
                idProofType: '',
                idProofNumber: '',
                notes: ''
            });
        }
        setShowGuestDialog(true);
    };

    const closeGuestDialog = () => {
        setShowGuestDialog(false);
        setGuestDialogMode('add');
        setSelectedGuest(null);
    };

    const handleGuestSubmit = async () => {
        try {
            if (!guestForm.guestName || !guestForm.meetingPerson || !guestForm.visitDate || !guestForm.purpose) {
                toast({
                    title: "Missing Information",
                    description: "Guest name, meeting person, visit date, and purpose are required.",
                    variant: "destructive"
                });
                return;
            }

            const url = guestDialogMode === 'add' 
                ? `${API_BASE}/watchman/guests` 
                : `${API_BASE}/watchman/guests/${selectedGuest.id}`;
            const method = guestDialogMode === 'add' ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(guestForm)
            });

            if (!response.ok) throw new Error('Failed to save guest');

            toast({
                title: "Success",
                description: `Guest ${guestDialogMode === 'add' ? 'added' : 'updated'} successfully`
            });

            closeGuestDialog();
            fetchGuests();
        } catch (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleCheckIn = async (guestId) => {
        try {
            console.log('Checking in guest:', guestId);
            console.log('API URL:', `${API_BASE}/watchman/guests/${guestId}/check-in`);
            
            const response = await fetch(`${API_BASE}/watchman/guests/${guestId}/check-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            console.log('Check-in response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Check-in error:', errorData);
                throw new Error(errorData.error || 'Failed to check in guest');
            }

            const result = await response.json();
            console.log('Check-in successful:', result);

            toast({
                title: "Success",
                description: "Guest checked in successfully"
            });

            fetchGuests();
        } catch (error) {
            console.error('Check-in exception:', error);
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleCheckOut = async (guestId) => {
        try {
            const response = await fetch(`${API_BASE}/watchman/guests/${guestId}/check-out`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to check out guest');
            }

            toast({
                title: "Success",
                description: "Guest checked out successfully"
            });

            fetchGuests();
        } catch (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleDeleteGuest = async (guestId) => {
        if (!confirm('Are you sure you want to delete this guest entry?')) return;

        try {
            const response = await fetch(`${API_BASE}/watchman/guests/${guestId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete guest');

            toast({
                title: "Success",
                description: "Guest entry deleted successfully"
            });

            fetchGuests();
        } catch (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const getGuestStatusBadge = (status) => {
        const statusConfig = {
            'scheduled': {
                className: 'bg-blue-100 text-blue-800 border border-blue-300',
                text: 'Scheduled'
            },
            'checked_in': {
                className: 'bg-green-100 text-green-800 border border-green-300',
                text: 'Checked In'
            },
            'checked_out': {
                className: 'bg-gray-100 text-gray-800 border border-gray-300',
                text: 'Checked Out'
            },
            'cancelled': {
                className: 'bg-red-100 text-red-800 border border-red-300',
                text: 'Cancelled'
            }
        };
        const config = statusConfig[status] || {
            className: 'bg-gray-100 text-gray-800 border border-gray-300',
            text: status
        };
        return <Badge className={`${config.className} font-medium`}>{config.text}</Badge>;
    };

    const filteredGuests = guests.filter((guest) => {
        if (!guestSearchTerm.trim()) return true;
        const searchLower = guestSearchTerm.toLowerCase();
        return (
            guest.guestName?.toLowerCase().includes(searchLower) ||
            guest.meetingPerson?.toLowerCase().includes(searchLower) ||
            guest.guestCompany?.toLowerCase().includes(searchLower) ||
            guest.purpose?.toLowerCase().includes(searchLower)
        );
    });

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
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Security Department</h1>
                <p className="text-gray-600 text-sm sm:text-base font-medium">Access Control & Security Management</p>
              </div>
            </div>
          </div>
          {/* Right: User Panel */}
          <div className="bg-gradient-to-r from-green-50 to-indigo-50 border-2 border-green-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-gray-600 text-xs font-medium">Security Team</p>
                <p className="text-green-600 text-xs font-medium">Security Management</p>
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
            <div className="px-6 py-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="flex md:grid md:grid-cols-5 w-full overflow-x-auto overflow-y-hidden md:overflow-x-hidden whitespace-nowrap bg-gray-100 border border-gray-300 pl-4 md:pl-0">
                        
                        <TabsTrigger value="dashboard" className="text-gray-800">Dashboard</TabsTrigger>
                        
                        <TabsTrigger value="pending" className="text-gray-800 relative">
                            Pending
                                {notificationCounts.pendingPickups > 0 && (
                                    <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                                        {notificationCounts.pendingPickups}
                                    </div>
                                )}
                        </TabsTrigger>
                        
                        <TabsTrigger value="all-passes" className="text-gray-800">
                            All Passes
                        </TabsTrigger>
                        
                        <TabsTrigger value="gate-entry" className="text-gray-800">Gate Entry</TabsTrigger>
                        
                        <TabsTrigger value="guest-list" className="text-gray-800">Guest List</TabsTrigger>
                        
                    </TabsList>
                    <TabsContent value="dashboard" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <Card className="bg-white border border-gray-300 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-800">Pending Verification</CardTitle>
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-gray-800">{watchmanSummary.todayPending || 0}</div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border border-gray-300 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-800">Entered Today</CardTitle>
                                    <User className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-gray-800">{watchmanSummary.todayEntered || 0}</div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border border-gray-300 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-800">Verified Today</CardTitle>
                                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-gray-800">{watchmanSummary.todayVerified || 0}</div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border border-gray-300 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-800">Rejected Today</CardTitle>
                                    <XCircle className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-gray-800">{watchmanSummary.todayRejected || 0}</div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border border-gray-300 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-800">Total Activity</CardTitle>
                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-gray-800">{watchmanSummary.todayTotal || 0}</div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card className="bg-white border border-gray-300 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-gray-800">
                                        <Shield className="h-5 w-5" />
                                        Security Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-800">Total Pending</span>
                                            <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 font-medium">
                                                {watchmanSummary.totalPending || 0}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-800">Total Verified</span>
                                            <Badge className="bg-green-100 text-green-800 border border-green-300 font-medium">
                                                {watchmanSummary.totalVerified || 0}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-800">Total Rejected</span>
                                            <Badge className="bg-red-100 text-red-800 border border-red-300 font-medium">
                                                {watchmanSummary.totalRejected || 0}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border border-gray-300 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-gray-800">Recent Pickups</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-sm">
                                        {pendingPickups.slice(0, 5).map((pickup) => (
                                            <div key={pickup.gatePassId} className="flex justify-between items-center">
                                                <div>
                                                    <div className="font-medium text-gray-800">{pickup.customerName}</div>
                                                    <div className="text-xs text-gray-600">{pickup.orderNumber}</div>
                                                </div>
                                                {getStatusBadge(pickup.status)}
                                            </div>
                                        ))}
                                        {pendingPickups.length === 0 && (
                                            <p className="text-gray-600 text-center">No recent pickups</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="pending" className="space-y-4">
                        <Card className="bg-white border border-gray-300 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-gray-800">
                                    <Shield className="h-5 w-5" />
                                    Pending Customer Pickups ({pendingPickups.length})
                                </CardTitle>
                                <CardDescription className="text-gray-600">
                                    Customers waiting for verification and product pickup
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : pendingPickups.length === 0 ? (
                                    <div className="text-center py-8 text-gray-600">
                                        <Shield className="mx-auto h-12 w-12 mb-4" />
                                        <p>No pending customer pickups</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-black">Gate Pass #</TableHead>
                                                <TableHead className="text-black">Order #</TableHead>
                                                <TableHead className="text-black">Customer</TableHead>
                                                <TableHead className="text-black">Product</TableHead>
                                                <TableHead className="text-black">Vehicle</TableHead>
                                                <TableHead className="text-black">Driver Name</TableHead>
                                                <TableHead className="text-black">Driver Contact</TableHead>
                                                <TableHead className="text-black">Ready Status</TableHead>
                                                <TableHead className="text-black">Issued At</TableHead>
                                                <TableHead className="text-black">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingPickups.map((pickup) => (
                                                <TableRow key={pickup.gatePassId}>
                                                    <TableCell className="font-medium text-gray-800">GP-{pickup.gatePassId}</TableCell>
                                                    <TableCell className="font-medium text-gray-800">{pickup.orderNumber}</TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium text-gray-800">{pickup.customerName}</div>
                                                            <div className="text-sm text-gray-600">{pickup.customerContact}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium text-gray-800">{pickup.productName}</div>
                                                            <div className="text-sm text-gray-600">Qty: {pickup.quantity}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-gray-800">{pickup.customerVehicle || 'Not provided'}</TableCell>
                                                    <TableCell className="font-medium text-gray-800">{pickup.driverName}</TableCell>
                                                    <TableCell className="font-medium text-gray-800">{pickup.driverContact || 'Not provided'}</TableCell>
                                                    <TableCell className="text-center">
                                                        {pickup.dispatchStatus === 'ready_for_pickup' || pickup.dispatchStatus === 'ready_for_load' || pickup.dispatchStatus === 'entered_for_pickup' || pickup.dispatchStatus === 'loaded' ? (
                                                            <div className="flex items-center justify-center">
                                                                <CheckCircle className="h-6 w-6 text-green-600" />
                                                                <span className="ml-2 text-green-600 font-semibold">
                                                                    {pickup.dispatchStatus === 'loaded' ? 'Loaded' :
                                                                     pickup.dispatchStatus === 'entered_for_pickup' ? 'Sent In' : 'Ready'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center">
                                                                <XCircle className="h-6 w-6 text-red-500" />
                                                                <span className="ml-2 text-red-500 font-semibold">Not Ready</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-gray-800">{new Date(pickup.issuedAt).toLocaleString()}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => openVerifyDialog(pickup)}
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                                Verify
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => openRejectDialog(pickup)}
                                                            >
                                                                <XCircle className="h-4 w-4 mr-1" />
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="all-passes" className="space-y-4">
                        <Card className="bg-white border border-gray-300 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-gray-800">
                                    <FileText className="h-5 w-5" />
                                    All Gate Passes ({filteredAllGatePasses.length})
                                </CardTitle>
                                <CardDescription className="text-gray-600">
                                    Search by customer name, order number, product name, or vehicle number
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="overflow-x-auto" >
                                <div className="flex gap-2 mb-4">
                                    <Input
                                        placeholder="Enter customer name, order number, product, or vehicle..."
                                        value={allPassesSearchTerm}
                                        onChange={(e) => setAllPassesSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && setAllPassesSearchTerm(e.target.value)}
                                    />
                                    <Button onClick={() => setAllPassesSearchTerm(allPassesSearchTerm)}>
                                        <Search className="h-4 w-4 mr-1" />
                                        Search
                                    </Button>
                                </div>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-black">Gate Pass #</TableHead>
                                                <TableHead className="text-black">Order #</TableHead>
                                                <TableHead className="text-black">Customer</TableHead>
                                                <TableHead className="text-black">Product</TableHead>
                                                <TableHead className="text-black">Delivery Type</TableHead>
                                                <TableHead className="text-black">Status</TableHead>
                                                <TableHead className="text-black">Issued</TableHead>
                                                <TableHead className="text-black">Verified</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredAllGatePasses.map((gatePass) => {
                                                const deliveryType = (gatePass.deliveryType || gatePass.originalDeliveryType || 'N/A').toUpperCase();
                                                let deliveryTypeClass = 'px-2 py-1 rounded font-semibold border whitespace-nowrap ';
                                                if (deliveryType === 'PART LOAD') {
                                                    deliveryTypeClass += 'bg-blue-100 text-blue-800 border-blue-200';
                                                } else if (deliveryType === 'SELF') {
                                                    deliveryTypeClass += 'bg-green-100 text-green-800 border-green-200';
                                                } else {
                                                    deliveryTypeClass += 'bg-gray-100 text-gray-800 border-gray-200';
                                                }
                                                return (
                                                    <TableRow key={gatePass.gatePassId}>
                                                        <TableCell className="font-medium text-gray-800">GP-{gatePass.gatePassId}</TableCell>
                                                        <TableCell className="text-gray-800">{gatePass.orderNumber}</TableCell>
                                                        <TableCell className="text-gray-800">{gatePass.customerName}</TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <div className="text-gray-800">{gatePass.productName}</div>
                                                                <div className="text-sm text-gray-600">Qty: {gatePass.quantity}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={deliveryTypeClass}>
                                                                {deliveryType}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-gray-800">{getStatusBadge(gatePass.status)}</TableCell>
                                                        <TableCell className="text-gray-800">{new Date(gatePass.issuedAt).toLocaleString()}</TableCell>
                                                        <TableCell className="text-gray-800">
                                                            {gatePass.verifiedAt
                                                                ? new Date(gatePass.verifiedAt).toLocaleString()
                                                                : '-'
                                                            }
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

                    <TabsContent value="gate-entry" className="space-y-4">
                        <GateEntryTab />
                    </TabsContent>

                    {/* Guest List Tab */}
                    <TabsContent value="guest-list" className="space-y-4">
                        <Card className="bg-white border border-gray-300 shadow-sm">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <CardTitle className="text-gray-800 flex items-center gap-2">
                                            <UserCheck className="h-5 w-5" />
                                            Guest List Management
                                        </CardTitle>
                                        <CardDescription>Track and manage visitor entries</CardDescription>
                                    </div>
                                    <Button 
                                        onClick={() => openGuestDialog('add')}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Guest
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <Card className="bg-blue-50 border border-blue-200">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-blue-600 font-medium">Total Guests</p>
                                                    <p className="text-2xl font-bold text-blue-800">{guestSummary.todayGuests || 0}</p>
                                                </div>
                                                <Calendar className="h-8 w-8 text-blue-600" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-green-50 border border-green-200">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-green-600 font-medium">Checked In</p>
                                                    <p className="text-2xl font-bold text-green-800">{guestSummary.checkedIn || 0}</p>
                                                </div>
                                                <UserCheck className="h-8 w-8 text-green-600" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-orange-50 border border-orange-200">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-orange-600 font-medium">Scheduled</p>
                                                    <p className="text-2xl font-bold text-orange-800">{guestSummary.scheduled || 0}</p>
                                                </div>
                                                <Clock className="h-8 w-8 text-orange-600" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gray-50 border border-gray-200">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-600 font-medium">Checked Out</p>
                                                    <p className="text-2xl font-bold text-gray-800">{guestSummary.checkedOut || 0}</p>
                                                </div>
                                                <UserX className="h-8 w-8 text-gray-600" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Search Bar */}
                                <div className="mb-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search by guest name, meeting person, company, or purpose..."
                                            value={guestSearchTerm}
                                            onChange={(e) => setGuestSearchTerm(e.target.value)}
                                            className="pl-10 border-gray-300"
                                        />
                                    </div>
                                </div>

                                {/* Guest List Table */}
                                {loading ? (
                                    <div className="text-center py-8 text-gray-600">Loading guests...</div>
                                ) : filteredGuests.length === 0 ? (
                                    <div className="text-center py-8 text-gray-600">No guests found</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-gray-800">Guest Name</TableHead>
                                                    <TableHead className="text-gray-800">Contact</TableHead>
                                                    <TableHead className="text-gray-800">Company</TableHead>
                                                    <TableHead className="text-gray-800">Meeting Person</TableHead>
                                                    <TableHead className="text-gray-800">Visit Date</TableHead>
                                                    <TableHead className="text-gray-800">Purpose</TableHead>
                                                    <TableHead className="text-gray-800">In Time</TableHead>
                                                    <TableHead className="text-gray-800">Out Time</TableHead>
                                                    <TableHead className="text-gray-800">Status</TableHead>
                                                    <TableHead className="text-gray-800">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredGuests.map((guest) => (
                                                    <TableRow key={guest.id}>
                                                        <TableCell className="font-medium text-gray-800">
                                                            <div>
                                                                <div>{guest.guestName}</div>
                                                                {guest.guestEmail && (
                                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                                        <Mail className="h-3 w-3" />
                                                                        {guest.guestEmail}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-gray-800">
                                                            {guest.guestContact && (
                                                                <div className="flex items-center gap-1">
                                                                    <Phone className="h-3 w-3" />
                                                                    {guest.guestContact}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-gray-800">
                                                            {guest.guestCompany && (
                                                                <div className="flex items-center gap-1">
                                                                    <Building className="h-3 w-3" />
                                                                    {guest.guestCompany}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-gray-800">
                                                            <div>
                                                                <div>{guest.meetingPerson}</div>
                                                                {guest.meetingPersonDepartment && (
                                                                    <div className="text-xs text-gray-500">
                                                                        {guest.meetingPersonDepartment}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-gray-800">
                                                            <div>
                                                                <div>{new Date(guest.visitDate).toLocaleDateString()}</div>
                                                                {guest.visitTime && (
                                                                    <div className="text-xs text-gray-500">{guest.visitTime}</div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-gray-800">
                                                            <div className="max-w-xs truncate" title={guest.purpose}>
                                                                {guest.purpose}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-gray-800">
                                                            {guest.inTime ? new Date(guest.inTime).toLocaleTimeString() : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-gray-800">
                                                            {guest.outTime ? new Date(guest.outTime).toLocaleTimeString() : '-'}
                                                        </TableCell>
                                                        <TableCell>{getGuestStatusBadge(guest.status)}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {guest.status === 'scheduled' && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleCheckIn(guest.id)}
                                                                        className="bg-green-600 hover:bg-green-700"
                                                                    >
                                                                        <UserCheck className="h-3 w-3 mr-1" />
                                                                        Check In
                                                                    </Button>
                                                                )}
                                                                {guest.status === 'checked_in' && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleCheckOut(guest.id)}
                                                                        className="bg-blue-600 hover:bg-blue-700"
                                                                    >
                                                                        <UserX className="h-3 w-3 mr-1" />
                                                                        Check Out
                                                                    </Button>
                                                                )}
                                                                {(guest.status === 'scheduled' || guest.status === 'checked_in') && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => openGuestDialog('edit', guest)}
                                                                    >
                                                                        <Edit className="h-3 w-3" />
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleDeleteGuest(guest.id)}
                                                                    className="text-red-600 hover:text-red-700"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Verify Pickup Dialog */}
            <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Verify Customer Pickup
                        </DialogTitle>
                        <DialogDescription>
                            {selectedGatePass && (
                                <>Verify identity for {selectedGatePass.customerName} - Gate Pass #{selectedGatePass.gatePassId}</>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="verifyCustomerName">Customer Name Verification</Label>
                            <Input
                                id="verifyCustomerName"
                                value={verificationForm.customerName}
                                onChange={(e) => setVerificationForm(prev => ({ ...prev, customerName: e.target.value }))}
                                placeholder="Enter customer name for verification"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="verifyDriverName">Driver Name</Label>
                            <Input
                                id="verifyDriverName"
                                value={verificationForm.driverName}
                                onChange={(e) => setVerificationForm(prev => ({ ...prev, driverName: e.target.value }))}
                                placeholder="Enter driver name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="verifyVehicle">Vehicle Number</Label>
                            <Input
                                id="verifyVehicle"
                                value={verificationForm.vehicleNo}
                                onChange={(e) => setVerificationForm(prev => ({ ...prev, vehicleNo: e.target.value }))}
                                placeholder="Enter vehicle number"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="verifyNote">Note</Label>
                            <Input
                                id="verifyNote"
                                value={verificationForm.note}
                                onChange={(e) => setVerificationForm(prev => ({ ...prev, note: e.target.value }))}
                                placeholder="Add any notes about the driver or verification"
                            />
                        </div>

                        {selectedGatePass && (
                            <div className="space-y-2">
                                <div><strong>Expected Customer:</strong> {selectedGatePass.customerName}</div>
                                <div><strong>Product:</strong> {selectedGatePass.productName}</div>
                                <div><strong>Quantity:</strong> {selectedGatePass.quantity}</div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
                            Cancel
                        </Button>
                        {(selectedGatePass?.dispatchStatus === 'ready_for_pickup' || 
                          selectedGatePass?.dispatchStatus === 'ready_for_load') ? (
                            <Button
                                onClick={() => handleVerifyPickup('send_in')}
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={selectedGatePass?.status === 'entered_for_pickup' || selectedGatePass?.status === 'loaded' || selectedGatePass?.status === 'verified'}
                            >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Verify & Send In
                            </Button>
                        ) : selectedGatePass?.dispatchStatus === 'loaded' ? (
                            <Button 
                                onClick={() => handleVerifyPickup('release')} 
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Verify & Release
                            </Button>
                        ) : null}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Pickup Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            Reject Customer Pickup
                        </DialogTitle>
                        <DialogDescription>
                            {selectedGatePass && (
                                <>Reject pickup for {selectedGatePass.customerName} - Gate Pass #{selectedGatePass.gatePassId}</>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="rejectionReason">Reason for Rejection *</Label>
                            <Input
                                id="rejectionReason"
                                value={rejectionForm.rejectionReason}
                                onChange={(e) => setRejectionForm(prev => ({ ...prev, rejectionReason: e.target.value }))}
                                placeholder="e.g., Invalid ID, Wrong vehicle, Security concerns..."
                            />
                        </div>

                        {selectedGatePass && (
                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-sm">
                                <div><strong>Customer:</strong> {selectedGatePass.customerName}</div>
                                <div><strong>Order:</strong> {selectedGatePass.orderNumber}</div>
                                <div><strong>Product:</strong> {selectedGatePass.productName}</div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectPickup}
                            disabled={!rejectionForm.rejectionReason.trim()}
                        >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject Pickup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Guest Dialog */}
            <Dialog open={showGuestDialog} onOpenChange={setShowGuestDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-green-600" />
                            {guestDialogMode === 'add' ? 'Add New Guest' : guestDialogMode === 'edit' ? 'Edit Guest' : 'Guest Details'}
                        </DialogTitle>
                        <DialogDescription>
                            {guestDialogMode === 'add' ? 'Register a new visitor' : 'Update visitor information'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Guest Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Guest Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="guestName">Guest Name *</Label>
                                    <Input
                                        id="guestName"
                                        value={guestForm.guestName}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, guestName: e.target.value }))}
                                        placeholder="Enter guest name"
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="guestContact">Contact Number</Label>
                                    <Input
                                        id="guestContact"
                                        value={guestForm.guestContact}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, guestContact: e.target.value }))}
                                        placeholder="Enter contact number"
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="guestEmail">Email</Label>
                                    <Input
                                        id="guestEmail"
                                        type="email"
                                        value={guestForm.guestEmail}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, guestEmail: e.target.value }))}
                                        placeholder="Enter email address"
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="guestCompany">Company</Label>
                                    <Input
                                        id="guestCompany"
                                        value={guestForm.guestCompany}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, guestCompany: e.target.value }))}
                                        placeholder="Enter company name"
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Meeting Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Meeting Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="meetingPerson">Meeting Person *</Label>
                                    <Input
                                        id="meetingPerson"
                                        value={guestForm.meetingPerson}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, meetingPerson: e.target.value }))}
                                        placeholder="Person to meet"
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="meetingPersonDepartment">Department</Label>
                                    <Input
                                        id="meetingPersonDepartment"
                                        value={guestForm.meetingPersonDepartment}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, meetingPersonDepartment: e.target.value }))}
                                        placeholder="Department"
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="meetingPersonContact">Contact Number</Label>
                                    <Input
                                        id="meetingPersonContact"
                                        value={guestForm.meetingPersonContact}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, meetingPersonContact: e.target.value }))}
                                        placeholder="Contact number"
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Visit Details */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Visit Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="visitDate">Visit Date *</Label>
                                    <Input
                                        id="visitDate"
                                        type="date"
                                        value={guestForm.visitDate}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, visitDate: e.target.value }))}
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="visitTime">Visit Time</Label>
                                    <Input
                                        id="visitTime"
                                        type="time"
                                        value={guestForm.visitTime}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, visitTime: e.target.value }))}
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="purpose">Purpose of Visit *</Label>
                                    <Textarea
                                        id="purpose"
                                        value={guestForm.purpose}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, purpose: e.target.value }))}
                                        placeholder="Enter purpose of visit"
                                        rows={3}
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Additional Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                                    <Input
                                        id="vehicleNumber"
                                        value={guestForm.vehicleNumber}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                                        placeholder="Enter vehicle number"
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="idProofType">ID Proof Type</Label>
                                    <Select
                                        value={guestForm.idProofType}
                                        onValueChange={(value) => setGuestForm(prev => ({ ...prev, idProofType: value }))}
                                        disabled={guestDialogMode === 'view'}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select ID type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Aadhar Card">Aadhar Card</SelectItem>
                                            <SelectItem value="PAN Card">PAN Card</SelectItem>
                                            <SelectItem value="Driving License">Driving License</SelectItem>
                                            <SelectItem value="Passport">Passport</SelectItem>
                                            <SelectItem value="Voter ID">Voter ID</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="idProofNumber">ID Proof Number</Label>
                                    <Input
                                        id="idProofNumber"
                                        value={guestForm.idProofNumber}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, idProofNumber: e.target.value }))}
                                        placeholder="Enter ID proof number"
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        value={guestForm.notes}
                                        onChange={(e) => setGuestForm(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Additional notes"
                                        rows={2}
                                        disabled={guestDialogMode === 'view'}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeGuestDialog}>
                            Cancel
                        </Button>
                        {guestDialogMode !== 'view' && (
                            <Button
                                onClick={handleGuestSubmit}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {guestDialogMode === 'add' ? 'Add Guest' : 'Update Guest'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Footer */}
            <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="text-center text-gray-600">
                    <p className="font-medium">
                        © Security Management System
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

export default WatchmanDepartment;
