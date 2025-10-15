import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  NativeSelect,
} from "@/components/ui/select";
import { Truck, Package, Clock, CheckCircle, AlertCircle, MapPin, RefreshCw, ArrowLeft , Users } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';

import { API_BASE } from '@/lib/api';
import OrderStatusBar from '@/components/ui/OrderStatusBar';
const TransportDepartment = () => {
  // Fix: Add missing afterDeliveryOrders state
  const [afterDeliveryOrders, setAfterDeliveryOrders] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboardStats, setDashboardStats] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [activeTransportOrders, setActiveTransportOrders] = useState([]);
  const [completedTransportOrders, setCompletedTransportOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationCounts, setNotificationCounts] = useState({
    pendingApprovals: 0,
    activeOrders: 0,
    partLoadOrders: 0,
    afterDelivery: 0
  });
  
  // NEW: Part Load Orders state
          const [partLoadOrders, setPartLoadOrders] = useState([]);
  const [completedPartLoads, setCompletedPartLoads] = useState([]);
  const [selectedPartLoadOrder, setSelectedPartLoadOrder] = useState(null);
  const [showDriverDetailsDialog, setShowDriverDetailsDialog] = useState(false);
  const [showAfterDeliveryDialog, setShowAfterDeliveryDialog] = useState(false);
  const [driverDetailsForm, setDriverDetailsForm] = useState({
    driverName: '',
    driverNumber: '',
    vehicleNumber: '',
    companyName: '',
    expectedDeliveryDate: ''
  });
  const [afterDeliveryForm, setAfterDeliveryForm] = useState({
    lrNumber: '',
    loadingDate: '',
    unloadingDate: '',
    deliveryDate: ''
  });  // NEW: Transport Approvals state
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('approve'); // 'approve' or 'reject'
  const [approvalForm, setApprovalForm] = useState({
    demandAmount: '',
    notes: ''
  });
  
  // Dialog states
  const [openDialogs, setOpenDialogs] = useState({
    assignVehicle: null, // stores the delivery ID for which dialog is open
    updateStatus: null,  // stores the delivery ID for which dialog is open
    addVehicle: false,
    manageVehicles: false
  });
  
  // Form states
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [vehicleAssignment, setVehicleAssignment] = useState({
    transporterName: '',
    vehicleNo: ''
  });
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    location: '',
    remarks: ''
  });
  const [newVehicle, setNewVehicle] = useState({
    license_plate: '',
    vehicle_type: '',
    capacity: '',
    driver_name: '',
    driver_phone: ''
  });
  // Edit vehicle dialog state
  const [editDialog, setEditDialog] = useState({ open: false, vehicle: null });
  const [editVehicle, setEditVehicle] = useState({
    vehicle_type: '',
    capacity: '',
    driver_name: '',
    driver_phone: '',
    status: 'available',
    current_location: '',
    notes: ''
  });

  // Transport cost estimation form state
  const [transportCostForm, setTransportCostForm] = useState({
    origin: '',
    destination: '',
    distance: '',
    weight: '',
    vehicleType: '',
    baseCost: 0,
    distanceCost: 0,
    weightCost: 0,
    fuelSurcharge: 0,
    totalCost: 0
  });

  useEffect(() => {
    fetchDashboardData();
    fetchVehicles();
    fetchDeliveries();
    fetchActiveTransportOrders();
    fetchCompletedTransportOrders();
    fetchPartLoadOrders(); // NEW: Fetch part load orders
    fetchCompletedPartLoads(); // NEW: Fetch completed part load orders
    fetchPendingApprovals(); // NEW: Fetch pending approvals
  }, []);

  // Optional: Auto-refresh data every 30 seconds to keep fleet status updated
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Silently refresh data in background (no error toasts)
        await Promise.all([
          fetchVehicles(),
          fetchDashboardData(true),
          fetchDeliveries(true),
          fetchActiveTransportOrders(true),
          fetchCompletedTransportOrders(true),
          fetchPartLoadOrders(true),
          fetchCompletedPartLoads(true)
        ]);
      } catch (error) {
        console.log('Background refresh failed:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Reset approval form when dialog closes or action changes
  useEffect(() => {
    if (!showApprovalDialog) {
      setApprovalForm({ demandAmount: '', notes: '' });
      console.log('Dialog closed, resetting approval form');
    }
  }, [showApprovalDialog]);
  
  // Update notification counts when data changes
  useEffect(() => {
    // For activeOrders, count orders with status 'pending' or any variation of 'in transit'
    const activeDeliveries = deliveries.filter(delivery => {
      // Convert to uppercase and remove spaces for consistent comparison
      const status = (delivery.status || '').toUpperCase().replace(/\s+/g, '');
      
      // Log each delivery status for debugging
      console.log('Delivery status:', delivery.status, 'Normalized:', status);
      
      // Check for any variation of pending or in transit
      return status === 'PENDING' || 
             status === 'INTRANSIT' || 
             status.includes('TRANSIT') || 
             status.includes('PEND');
    });
    
    // Log for debugging
    console.log('Deliveries:', deliveries);
    console.log('Active deliveries count (pending + in transit):', activeDeliveries.length);
    console.log('Active deliveries:', activeDeliveries);
    
    setNotificationCounts({
      pendingApprovals: pendingApprovals.length,
      activeOrders: activeDeliveries.length,
      partLoadOrders: partLoadOrders.length,
      afterDelivery: afterDeliveryOrders.length
    });
  }, [pendingApprovals, deliveries, partLoadOrders, afterDeliveryOrders]);

  const fetchAvailableVehicles = async () => {
    try {
      const response = await fetch(`${API_BASE}/fleet/available`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setAvailableVehicles(data);
    } catch (e) {
      console.error('Error fetching available vehicles:', e);
      setAvailableVehicles([]);
    }
  };

  const fetchDashboardData = async (silent = false) => {
    try {
      const response = await fetch(`${API_BASE}/transport/summary`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setDashboardStats(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive"
        });
      }
    }
  };

  const fetchVehicles = async (silent = false) => {
    try {
      const response = await fetch(`${API_BASE}/fleet`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Fleet vehicles:', data);
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load vehicles",
          variant: "destructive"
        });
      }
    }
  };

  const fetchDeliveries = async (silent = false) => {
    try {
      console.log('🚚 Fetching transport deliveries...');
      const response = await fetch(`${API_BASE}/transport/all`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Received deliveries data:', data);
      console.log('📊 Number of deliveries:', data.length);
      
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error fetching deliveries:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load deliveries: " + error.message,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveTransportOrders = async (silent = false) => {
    try {
      console.log('📋 Fetching active transport orders...');
      const response = await fetch(`${API_BASE}/transport/active-orders`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Received active transport orders data:', data);
      console.log('📊 Number of active transport orders:', data.length);
      
      setActiveTransportOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error fetching active transport orders:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load active transport orders: " + error.message,
          variant: "destructive"
        });
      }
    }
  };

  const fetchCompletedTransportOrders = async (silent = false) => {
    try {
      console.log('📋 Fetching completed transport orders...');
      const response = await fetch(`${API_BASE}/transport/completed-orders`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Received completed transport orders data:', data);
      console.log('📊 Number of completed transport orders:', data.length);
      
      setCompletedTransportOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error fetching completed transport orders:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load completed transport orders: " + error.message,
          variant: "destructive"
        });
      }
    }
  };

  // Fetch completed part load orders needing after delivery details
  const fetchCompletedPartLoads = async (silent = false) => {
    try {
      console.log('📋 Fetching completed part load orders...');
      const response = await fetch(`${API_BASE}/transport/part-load/completed`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Received completed part load orders data:', data);
      console.log('📊 Number of completed part load orders:', data.length);
      
      // Process the data to ensure we have driver details
      const processedData = data.map(order => ({
        ...order,
        driverName: order.driverName || '',
        driverNumber: order.driverNumber || ''
      }));
      
      console.log('Processed orders with driver details:', processedData);
      
      // Fix: set afterDeliveryOrders for rendering - don't filter
      setAfterDeliveryOrders(Array.isArray(processedData) ? processedData : []);
      setCompletedPartLoads(Array.isArray(processedData) ? processedData : []);
    } catch (error) {
      console.error('❌ Error fetching completed part load orders:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load completed part load orders: " + error.message,
          variant: "destructive"
        });
      }
    }
  };

  // NEW: Fetch part load orders needing driver details
  const fetchPartLoadOrders = async (silent = false) => {
    try {
      console.log('📋 Fetching part load orders needing driver details...');
      const response = await fetch(`${API_BASE}/transport/part-load/pending-driver-details`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Received part load orders data:', data);
      console.log('📊 Number of part load orders:', data.length);
      
      setPartLoadOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error fetching part load orders:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load part load orders: " + error.message,
          variant: "destructive"
        });
      }
    }
  };

  const handleAfterDeliverySubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log("All available orders:", afterDeliveryOrders);
      console.log("Currently selected order:", selectedPartLoadOrder);
      console.log("Form data:", afterDeliveryForm);
      
      // If no order is selected, show error
      if (!selectedPartLoadOrder || !selectedPartLoadOrder.transportJobId) {
        toast({
          title: "Error",
          description: "No part load order selected. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      // Determine if this is an edit or new entry
      const isEdit = !!(selectedPartLoadOrder.lrNumber || selectedPartLoadOrder.loadingDate || 
                     selectedPartLoadOrder.unloadingDate || selectedPartLoadOrder.deliveryDate);

      // Validate required fields 
      const requiredFields = {
        "LR Number": afterDeliveryForm.lrNumber,
        "Loading Date": afterDeliveryForm.loadingDate,
        "Unloading Date": afterDeliveryForm.unloadingDate,
        "Delivery Date": afterDeliveryForm.deliveryDate
      };

      for (const [field, value] of Object.entries(requiredFields)) {
        if (!value || value.toString().trim() === '') {
          toast({
            title: "Validation Error",
            description: `${field} is required`,
            variant: "destructive"
          });
          return;
        }
      }

      // Format dates for submission
      const formattedData = {
        lrNumber: afterDeliveryForm.lrNumber,
        loadingDate: afterDeliveryForm.loadingDate,
        unloadingDate: afterDeliveryForm.unloadingDate,
        deliveryDate: afterDeliveryForm.deliveryDate
      };

      console.log("Submitting data:", formattedData);
      console.log("For order ID:", selectedPartLoadOrder.transportJobId);

      const response = await fetch(`${API_BASE}/transport/part-load/${selectedPartLoadOrder.transportJobId}/after-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: isEdit ? "After delivery details updated successfully" : "After delivery details saved successfully"
        });
        
        // Clear form and close dialog
        setShowAfterDeliveryDialog(false);
        setAfterDeliveryForm({
          lrNumber: '',
          loadingDate: '',
          unloadingDate: '',
          deliveryDate: ''
        });
        
        // Only clear selected order after successful submit
        setSelectedPartLoadOrder(null);
        
        // Refresh the orders list
        await fetchPartLoadOrders();
      } else {
        throw new Error(data.error || "Failed to save after delivery details");
      }
    } catch (error) {
      console.error('❌ Error submitting after delivery details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save after delivery details",
        variant: "destructive"
      });
    }
  };

  // NEW: Handle filling driver details for part load orders
  const handleFillDriverDetails = async () => {
    try {
      // Determine if this is an edit or new entry
      const isEdit = !!(selectedPartLoadOrder?.driverName || selectedPartLoadOrder?.driverNumber || 
                     selectedPartLoadOrder?.vehicleNumber || selectedPartLoadOrder?.companyName);
      
      // Validate required fields
      if (!driverDetailsForm.driverName.trim()) {
        toast({
          title: "Validation Error",
          description: "Driver name is required",
          variant: "destructive"
        });
        return;
      }
      if (!driverDetailsForm.driverNumber.trim()) {
        toast({
          title: "Validation Error",
          description: "Driver number is required",
          variant: "destructive"
        });
        return;
      }
      if (!driverDetailsForm.vehicleNumber.trim()) {
        toast({
          title: "Validation Error",
          description: "Vehicle number is required",
          variant: "destructive"
        });
        return;
      }
      if (!driverDetailsForm.companyName.trim()) {
        toast({
          title: "Validation Error",
          description: "Company name is required",
          variant: "destructive"
        });
        return;
      }

      if (!driverDetailsForm.expectedDeliveryDate.trim()) {
        toast({
          title: "Validation Error",
          description: "Expected delivery date is required",
          variant: "destructive"
        });
        return;
      }

      // Validate that expected delivery date is not in the past
      const deliveryDate = new Date(driverDetailsForm.expectedDeliveryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deliveryDate < today) {
        toast({
          title: "Validation Error",
          description: "Expected delivery date cannot be in the past",
          variant: "destructive"
        });
        return;
      }

      if (!selectedPartLoadOrder?.transportJobId) {
        toast({
          title: "Error",
          description: "No part load order selected",
          variant: "destructive"
        });
        return;
      }

      console.log('🚚 Submitting driver details for part load order:', selectedPartLoadOrder.transportJobId);
      console.log('📝 Driver details:', driverDetailsForm);

       // Create the request payload with transporter_name set to company name
      const requestData = {             
        ...driverDetailsForm,
        transporterName: driverDetailsForm.companyName // Map companyName to transporterName
      };
      
      const response = await fetch(`${API_BASE}/transport/part-load/${selectedPartLoadOrder.transportJobId}/fill-driver-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(driverDetailsForm),
      });

      console.log('📡 Response status:', response.status);
      const responseData = await response.json();
      console.log('📦 Response data:', responseData);

      if (response.ok) {
        console.log('✅ Driver details submitted successfully');
        toast({
          title: "Success",
          description: isEdit ? "Driver details updated successfully" : "Driver details submitted to watchman successfully"
        });
        
        // Close dialog and reset form
        setShowDriverDetailsDialog(false);
        setSelectedPartLoadOrder(null);
        setDriverDetailsForm({
          driverName: '',
          driverNumber: '',
          vehicleNumber: '',
          companyName: '',
          expectedDeliveryDate: ''
        });
        
        // Refresh part load orders
        await fetchPartLoadOrders();
      } else {
        console.log('❌ Failed to submit driver details:', responseData);
        toast({
          title: "Error",
          description: responseData.error || "Failed to submit driver details",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error submitting driver details:', error);
      toast({
        title: "Error",
        description: `Error submitting driver details: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // NEW: Fetch pending transport approvals
  const fetchPendingApprovals = async (silent = false) => {
    try {
      console.log('📋 Fetching pending transport approvals...');
      const response = await fetch(`${API_BASE}/transport/approvals/pending`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Received pending approvals data:', data);
      console.log('📊 Number of pending approvals:', data.length);
      
      setPendingApprovals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error fetching pending approvals:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load pending approvals: " + error.message,
          variant: "destructive"
        });
      }
    }
  };

  // NEW: Handle transport approval decision
  const handleApprovalDecision = async () => {
    try {
      if (!selectedApproval?.id) {
        toast({
          title: "Error",
          description: "No approval selected",
          variant: "destructive"
        });
        return;
      }

      // Validation for rejection
      if (approvalAction === 'reject') {
        if (!approvalForm.demandAmount.trim()) {
          toast({
            title: "Validation Error",
            description: "Demand amount is required for rejection",
            variant: "destructive"
          });
          return;
        }
        if (!approvalForm.notes.trim()) {
          toast({
            title: "Validation Error",
            description: "Notes are required for rejection",
            variant: "destructive"
          });
          return;
        }
        // Validate demand amount is a positive number
        const demandValue = parseFloat(approvalForm.demandAmount);
        if (isNaN(demandValue) || demandValue <= 0) {
          toast({
            title: "Validation Error",
            description: "Please enter a valid positive amount",
            variant: "destructive"
          });
          return;
        }
      }

      console.log('🚚 Processing transport approval decision:', {
        approvalId: selectedApproval.id,
        action: approvalAction,
        formData: approvalForm
      });

      const payload = {
        action: approvalAction,
        demandAmount: approvalAction === 'reject' ? parseFloat(approvalForm.demandAmount) : null,
        notes: approvalForm.notes || null,
        reviewedBy: user?.username || 'Transport Department'
      };

      const response = await fetch(`${API_BASE}/transport/approvals/${selectedApproval.id}/${approvalAction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('🔗 API_BASE:', API_BASE);
      console.log('📡 Full URL:', `${API_BASE}/transport/approvals/${selectedApproval.id}/${approvalAction}`);
      console.log('📤 Payload sent:', payload);
      console.log('📡 Response status:', response.status);
      
      // Handle different response scenarios
      if (!response.ok) {
        let errorMessage = `Failed to ${approvalAction} order`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (jsonError) {
          // If response is not JSON, use status text
          errorMessage = `${errorMessage} (HTTP ${response.status}: ${response.statusText})`;
        }
        
        console.log(`❌ Failed to ${approvalAction} order:`, errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      const responseData = await response.json();
      console.log('📦 Response data:', responseData);
      
      const actionText = approvalAction === 'approve' ? 'approved' : 'rejected';
      console.log(`✅ Order ${actionText} successfully`);
      toast({
        title: "Success",
        description: `Order ${selectedApproval.orderNumber} has been ${actionText}`
      });
      
      // Close dialog and reset form
      setShowApprovalDialog(false);
      setSelectedApproval(null);
      setApprovalAction('approve');
      setApprovalForm({ demandAmount: '', notes: '' });
      
      // Refresh pending approvals
      await fetchPendingApprovals();
      
    } catch (error) {
      console.error(`❌ Error ${approvalAction}ing order:`, error);
      console.error('📅 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Provide more specific error messages based on error type
      let errorMessage = `Error ${approvalAction}ing order`;
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = "Network error: Unable to connect to server. The backend endpoint '/transport/approvals/{id}/decide' may not be implemented. Please contact IT support.";
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = "Connection failed: Please check if the backend server is running and accessible.";
      } else if (error.message) {
        errorMessage = `${errorMessage}: ${error.message}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleAssignVehicle = async () => {
    try {
      console.log('🚚 Starting vehicle assignment...');
      console.log('📝 Selected delivery:', selectedDelivery);
      console.log('🚛 Vehicle assignment data:', vehicleAssignment);
      
      // Validate required fields
      if (!vehicleAssignment.transporterName.trim()) {
        toast({
          title: "Validation Error",
          description: "Transporter name is required",
          variant: "destructive"
        });
        return;
      }
      if (!vehicleAssignment.vehicleNo.trim()) {
        toast({
          title: "Validation Error",
          description: "Please select a vehicle",
          variant: "destructive"
        });
        return;
      }
      
      if (!selectedDelivery?.transportJobId) {
        toast({
          title: "Error",
          description: "No delivery selected",
          variant: "destructive"
        });
        return;
      }
      
      const apiUrl = `${API_BASE}/transport/assign/${selectedDelivery.transportJobId}`;
      console.log('📡 Making API call to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleAssignment),
      });
      
      console.log('📈 Response status:', response.status);
      const responseData = await response.json();
      console.log('📦 Response data:', responseData);

      if (response.ok) {
        console.log('✅ Vehicle assigned successfully');
        // Immediately move to in_transit
        try {
          await fetch(`${API_BASE}/transport/status/${selectedDelivery.transportJobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'in_transit', notes: 'Transit started after assignment' })
          });
        } catch (_) {}
        toast({ title: "Success", description: "Assigned and set In Transit" });
        setOpenDialogs(prev => ({ ...prev, assignVehicle: null }));
        setVehicleAssignment({ transporterName: '', vehicleNo: '' });
        setSelectedDelivery(null);
        // Refresh all data to ensure fleet tab shows updated vehicle status
        await Promise.all([
          fetchDeliveries(),
          fetchDashboardData(),
          fetchVehicles() // Add this to refresh fleet tab
        ]);
      } else {
        console.log('❌ Assignment failed:', responseData);
        toast({
          title: "Error",
          description: responseData.error || "Failed to assign vehicle",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error assigning vehicle:', error);
      toast({
        title: "Error",
        description: `Error assigning vehicle: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleUpdateStatus = async () => {
    try {
      console.log('📋 Starting status update...');
      console.log('🚛 Selected delivery:', selectedDelivery);
      console.log('📝 Status update data:', statusUpdate);
      
      // Validate required fields
      if (!statusUpdate.status) {
        toast({
          title: "Validation Error",
          description: "Status is required",
          variant: "destructive"
        });
        return;
      }
      
      if (!selectedDelivery?.transportJobId) {
        toast({
          title: "Error",
          description: "No delivery selected",
          variant: "destructive"
        });
        return;
      }
      
      const apiUrl = `${API_BASE}/transport/status/${selectedDelivery.transportJobId}`;
      console.log('📡 Making API call to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statusUpdate),
      });
      
      console.log('📈 Response status:', response.status);
      const responseData = await response.json();
      console.log('📦 Response data:', responseData);

      if (response.ok) {
        console.log('✅ Status updated successfully');
        toast({
          title: "Success",
          description: "Status updated successfully"
        });
        setOpenDialogs(prev => ({ ...prev, updateStatus: null }));
        setStatusUpdate({ status: '', location: '', remarks: '' });
        setSelectedDelivery(null);
        // Refresh all data to ensure fleet tab shows updated vehicle status
        await Promise.all([
          fetchDeliveries(),
          fetchDashboardData(),
          fetchVehicles() // Add this to refresh fleet tab
        ]);
      } else {
        console.log('❌ Status update failed:', responseData);
        toast({
          title: "Error",
          description: responseData.error || "Failed to update status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error updating status:', error);
      toast({
        title: "Error",
        description: `Error updating status: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleAddVehicle = async () => {
    try {
      console.log('🟢 Add Vehicle clicked', newVehicle);
      // Basic client-side validation
      if (!newVehicle.license_plate.trim() || !newVehicle.vehicle_type.trim() || !newVehicle.driver_name.trim()) {
        toast({
          title: "Validation Error",
          description: "License plate, vehicle type, and driver name are required",
          variant: "destructive"
        });
        return;
      }
      // Convert frontend field names to backend field names
      const vehicleData = {
        vehicleNumber: newVehicle.license_plate,
        vehicleType: newVehicle.vehicle_type,
        capacity: newVehicle.capacity ? newVehicle.capacity + ' kg' : '',
        driverName: newVehicle.driver_name,
        driverContact: newVehicle.driver_phone
      };
      
      const response = await fetch('/api/fleet/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleData),
      });
      console.log('📡 Add Vehicle response status:', response.status);
      const respJson = await response.json().catch(() => ({}));
      console.log('📦 Add Vehicle response json:', respJson);
      if (response.ok) {
        toast({
          title: "Success",
          description: "Vehicle added successfully"
        });
        setOpenDialogs(prev => ({ ...prev, addVehicle: false }));
        setNewVehicle({
          license_plate: '',
          vehicle_type: '',
          capacity: '',
          driver_name: '',
          driver_phone: ''
        });
        // Refresh all data to ensure consistency across tabs
        await Promise.all([
          fetchVehicles(),
          fetchDashboardData()
        ]);
      } else {
        toast({
          title: "Error",
          description: respJson.error || `Failed to add vehicle (HTTP ${response.status})`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error adding vehicle:', error);
      toast({
        title: "Error",
        description: "Error adding vehicle",
        variant: "destructive"
      });
    }
  };

  const openEditVehicleDialog = (vehicle) => {
    setEditVehicle({
      vehicle_type: vehicle.vehicleType || '',
      capacity: (vehicle.capacity || '').toString().replace(/\s*kg$/i, ''),
      driver_name: vehicle.driverName || '',
      driver_phone: vehicle.driverContact || '',
      status: vehicle.status || 'available',
      current_location: vehicle.currentLocation || '',
      notes: vehicle.notes || ''
    });
    setEditDialog({ open: true, vehicle });
  };

  const handleUpdateVehicle = async () => {
    try {
      console.log('🟡 Save Edit Vehicle clicked', editDialog.vehicle, editVehicle);
      if (!editDialog.vehicle?.id) return;
      const vehicleId = editDialog.vehicle.id;
      const payload = {
        vehicleType: editVehicle.vehicle_type,
        capacity: editVehicle.capacity ? `${editVehicle.capacity} kg` : '',
        driverName: editVehicle.driver_name,
        driverContact: editVehicle.driver_phone,
        status: editVehicle.status,
        currentLocation: editVehicle.current_location,
        notes: editVehicle.notes
      };
      const response = await fetch(`/api/fleet/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('📡 Edit Vehicle response status:', response.status);
      const respJson = await response.json().catch(() => ({}));
      console.log('📦 Edit Vehicle response json:', respJson);
      if (response.ok) {
        toast({ title: "Updated", description: "Vehicle details updated" });
        setEditDialog({ open: false, vehicle: null });
        // Refresh all data to ensure consistency across tabs
        await Promise.all([
          fetchVehicles(),
          fetchDashboardData()
        ]);
      } else {
        toast({ title: "Error", description: respJson.error || `Failed to update vehicle (HTTP ${response.status})`, variant: 'destructive' });
      }
    } catch (e) {
      console.error('❌ Error updating vehicle:', e);
      toast({ title: "Error", description: 'Error updating vehicle', variant: 'destructive' });
    }
  };

  const handleTestApi = async () => {
    try {
      console.log('🔎 Testing API connectivity...');
      const [fleetResp, summaryResp] = await Promise.all([
        fetch(`${API_BASE}/fleet`),
        fetch(`${API_BASE}/transport/summary`)
      ]);
      const fleet = await fleetResp.json().catch(() => ([]));
      const summary = await summaryResp.json().catch(() => ({}));
      console.log('✅ Fleet status:', fleetResp.status, fleet);
      console.log('✅ Summary status:', summaryResp.status, summary);
      toast({ title: 'API OK', description: `Fleet: ${fleetResp.status}, Summary: ${summaryResp.status}` });
    } catch (e) {
      console.error('❌ API test failed:', e);
      toast({ title: 'API Error', description: 'Failed to reach backend', variant: 'destructive' });
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      const response = await fetch(`/api/fleet/${vehicleId}`, { method: 'DELETE' });
      const respJson = await response.json().catch(() => ({}));
      if (response.ok) {
        toast({ title: 'Deleted', description: 'Vehicle removed from fleet' });
        // Refresh all data to ensure consistency across tabs
        await Promise.all([
          fetchVehicles(),
          fetchDashboardData()
        ]);
      } else {
        toast({ title: 'Error', description: respJson.error || 'Failed to delete vehicle', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Error deleting vehicle', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { 
        className: 'bg-yellow-100 text-yellow-800 border border-yellow-300', 
        icon: Clock 
      },
      'assigned': { 
        className: 'bg-blue-100 text-blue-800 border border-blue-300', 
        icon: Truck 
      },
      'in_transit': { 
        className: 'bg-purple-100 text-purple-800 border border-purple-300', 
        icon: MapPin 
      },
      'delivered': { 
        className: 'bg-green-100 text-green-800 border border-green-300', 
        icon: CheckCircle 
      },
      'failed': { 
        className: 'bg-red-100 text-red-800 border border-red-300', 
        icon: AlertCircle 
      }
    };

    const config = statusConfig[status] || { 
      className: 'bg-gray-100 text-gray-800 border border-gray-300', 
      icon: Clock 
    };
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} flex items-center gap-1 font-medium`}>
        <Icon className="w-3 h-3" />
        {status?.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getVehicleStatusBadge = (status) => {
    const statusConfig = {
      'available': { 
        className: 'bg-green-100 text-green-800 border border-green-300' 
      },
      'assigned': { 
        className: 'bg-blue-100 text-blue-800 border border-blue-300' 
      },
      'maintenance': { 
        className: 'bg-red-100 text-red-800 border border-red-300' 
      }
    };

    const config = statusConfig[status] || { 
      className: 'bg-gray-100 text-gray-800 border border-gray-300' 
    };

    return (
      <Badge className={`${config.className} font-medium`}>
        {status?.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-800 text-lg font-medium">Loading Transport dashboard...</p>
          <p className="text-gray-600 text-sm mt-1">Please wait while we retrieve the data</p>
        </div>
      </div>
    );
  }

  return (

  <>
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
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Transport Department</h1>
                  <p className="text-gray-600 text-sm sm:text-base font-medium">
                    Fleet Management System
                  </p>
                </div>
              </div>
            </div>

            {/* User Info Panel */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-gray-600 text-xs font-medium">Transport Team</p>
                  <p className="text-blue-600 text-xs font-medium">Fleet Management</p>
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
          <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex md:grid md:grid-cols-6 w-full overflow-x-auto overflow-y-hidden md:overflow-x-hidden whitespace-nowrap bg-gray-100 border border-gray-300 pl-80 md:pl-0">
          <TabsTrigger value="dashboard" className="text-gray-800">Dashboard</TabsTrigger>
          <TabsTrigger value="approvals" className="text-gray-800 relative">
            Approvals
            {notificationCounts.pendingApprovals > 0 && (
              <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                {notificationCounts.pendingApprovals}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="part-load" className="text-gray-800 relative">
            Part Load Orders
            {notificationCounts.partLoadOrders > 0 && (
              <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                {notificationCounts.partLoadOrders}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="text-gray-800 relative">
            Deliveries
            {notificationCounts.activeOrders > 0 && (
              <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                {notificationCounts.activeOrders}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="text-gray-800">Fleet</TabsTrigger>
          <TabsTrigger value="cost-estimation" className="text-gray-800">Cost Estimation</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-800">Total Deliveries</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800">{dashboardStats.totalActive || 0}</div>
                <p className="text-xs text-gray-600">
                  Active deliveries in system
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-800">Available Vehicles</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800">{vehicles.filter(v => v.status === 'available').length}</div>
                <p className="text-xs text-gray-600">
                  Ready for assignment
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-800">In Transit</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800">{dashboardStats.inTransitJobs || 0}</div>
                <p className="text-xs text-gray-600">
                  Currently on delivery
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-800">Today's Deliveries</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800">{dashboardStats.todayDelivered || 0}</div>
                <p className="text-xs text-gray-600">
                  Completed today
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Transport Orders Section */}
          <Card className="bg-white border border-gray-300 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* CardHeader content goes here, e.g. title, description, actions */}
          </CardHeader>
          <CardContent>
            {/* Status Legend and Table go here */}
          </CardContent>
            <CardContent>
              {/* Status Legend */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Status Legend:</h4>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">Green: Pending payment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-700">Yellow: Partial payment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-700">Red: Payment completed OR in dispatch - ready for transport</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px] text-black">Order #</TableHead>
                      <TableHead className="min-w-[120px] text-black">Customer</TableHead>
                      <TableHead className="min-w-[100px] text-black">Amount</TableHead>
                      <TableHead className="min-w-[100px] text-black">Transport Cost</TableHead>
                      <TableHead className="min-w-[100px] text-black">Payment Status</TableHead>
                      <TableHead className="min-w-[100px] text-black">Order Status</TableHead>
                      <TableHead className="min-w-[120px] text-black">Sales Person</TableHead>
                      <TableHead className="min-w-[100px] text-black">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTransportOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-600">
                          No active transport orders found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeTransportOrders.map((order) => (
                        <TableRow 
                          key={order.orderId} 
                          className={`${
                            order.colorStatus === 'green' ? 'bg-green-100 hover:bg-green-200' :
                            order.colorStatus === 'yellow' ? 'bg-yellow-100 hover:bg-yellow-200' :
                            'bg-red-100 hover:bg-red-200'
                          }`}
                        >
                          <TableCell className={`font-medium text-xs sm:text-sm ${
                            order.colorStatus === 'green' ? 'text-green-900' :
                            order.colorStatus === 'yellow' ? 'text-yellow-900' :
                            'text-red-900'
                          }`}>
                            {order.orderNumber}
                          </TableCell>
                          <TableCell className={`text-xs sm:text-sm ${
                            order.colorStatus === 'green' ? 'text-green-900' :
                            order.colorStatus === 'yellow' ? 'text-yellow-900' :
                            'text-red-900'
                          }`}>
                            <div>
                              <div className="font-medium">{order.customerName}</div>
                              <div className={`text-xs truncate max-w-[150px] ${
                                order.colorStatus === 'green' ? 'text-green-700' :
                                order.colorStatus === 'yellow' ? 'text-yellow-700' :
                                'text-red-700'
                              }`}>
                                {order.customerContact}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={`text-xs sm:text-sm ${
                            order.colorStatus === 'green' ? 'text-green-900' :
                            order.colorStatus === 'yellow' ? 'text-yellow-900' :
                            'text-red-900'
                          }`}>
                            ₹{order.finalAmount?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className={`text-xs sm:text-sm ${
                            order.colorStatus === 'green' ? 'text-green-900' :
                            order.colorStatus === 'yellow' ? 'text-yellow-900' :
                            'text-red-900'
                          }`}>
                            ₹{order.transportCost?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <Badge 
                              variant={
                                order.paymentStatus === 'completed' ? 'default' :
                                order.paymentStatus === 'partial' ? 'secondary' :
                                'outline'
                              }
                              className={`capitalize ${
                                order.paymentStatus === 'pending' || !order.paymentStatus ? 
                                'bg-gray-200 text-gray-800 border-gray-400' : ''
                              }`}
                            >
                              {order.paymentStatus || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {order.orderStatus === 'pending_transport_approval' ? (
                              <Badge className="capitalize bg-orange-100 text-orange-800 border border-orange-300">
                                Pending Transport Approval
                              </Badge>
                            ) : (
                              <Badge 
                                variant={
                                  order.orderStatus === 'in_dispatch' ? 'default' :
                                  order.orderStatus === 'confirmed' ? 'secondary' :
                                  'outline'
                                }
                                className={`capitalize ${
                                  order.orderStatus === 'pending' || !order.orderStatus ? 
                                  'bg-gray-200 text-gray-800 border-gray-400' : ''
                                }`}
                              >
                                {order.orderStatus || 'pending'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={`text-xs sm:text-sm ${
                            order.colorStatus === 'green' ? 'text-green-900' :
                            order.colorStatus === 'yellow' ? 'text-yellow-900' :
                            'text-red-900'
                          }`}>
                            {order.salesPerson || 'N/A'}
                          </TableCell>
                          <TableCell className={`text-xs sm:text-sm ${
                            order.colorStatus === 'green' ? 'text-green-700' :
                            order.colorStatus === 'yellow' ? 'text-yellow-700' :
                            'text-red-700'
                          }`}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Completed Transport Orders Section */}
          <Card className="bg-white border border-gray-300 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-gray-800">Completed Transport Orders</CardTitle>
                <CardDescription className="text-gray-600">
                  Delivered company orders ({completedTransportOrders.length} orders)
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchCompletedTransportOrders}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px] text-black">Order #</TableHead>
                      <TableHead className="min-w-[120px] text-black">Customer</TableHead>
                      <TableHead className="min-w-[100px] text-black">Amount</TableHead>
                      <TableHead className="min-w-[100px] text-black">Transport Cost</TableHead>
                      {/* <TableHead className="min-w-[120px] text-black">Sales Person</TableHead> */}
                      <TableHead className="min-w-[100px] text-black">Delivered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedTransportOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-600">
                          No completed transport orders found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      completedTransportOrders.map((order) => (
                        <TableRow key={order.orderId} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-xs sm:text-sm text-gray-800">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                              {order.orderNumber}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-800">
                            <div>
                              <div className="font-medium">{order.customerName}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                {order.customerContact}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-800">
                            ₹{order.finalAmount?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-800">
                            ₹{order.transportCost?.toLocaleString() || 0}
                          </TableCell>
                          {/* <TableCell className="text-xs sm:text-sm text-gray-800">
                            {order.salesPerson || 'N/A'}
                          </TableCell> */}
                          <TableCell className="text-xs sm:text-sm text-gray-600">
                            {new Date(order.updatedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NEW: Transport Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          <Card className="bg-white border border-gray-300 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-gray-800">Pending Transport Approvals</CardTitle>
                <CardDescription className="text-gray-600">
                  Sales orders requiring transport approval ({pendingApprovals.length} orders)
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchPendingApprovals}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px] text-black">Order #</TableHead>
                      <TableHead className="min-w-[120px] text-black">Customer</TableHead>
                      <TableHead className="min-w-[100px] text-black">Product</TableHead>
                      <TableHead className="min-w-[100px] text-black">Delivery Type</TableHead>
                      <TableHead className="min-w-[100px] text-black">Transport Cost</TableHead>
                      <TableHead className="min-w-[120px] text-black">Sales Person</TableHead>
                      <TableHead className="min-w-[100px] text-black">Created</TableHead>
                      <TableHead className="min-w-[120px] text-black">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApprovals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-600">
                          No pending approvals found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingApprovals.map((approval) => (
                        <TableRow key={approval.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-xs sm:text-sm text-gray-800">
                            {approval.orderNumber}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-800">
                            <div>
                              <div className="font-medium">{approval.customerName}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                {approval.customerContact}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-800">
                            {approval.productName}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
                              {approval.deliveryType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-800">
                            ₹{approval.transportCost?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-800">
                            {approval.salesPerson || 'N/A'}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-600">
                            {new Date(approval.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setApprovalAction('approve');
                                  setApprovalForm({ demandAmount: '', notes: '' });
                                  setShowApprovalDialog(true);
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setApprovalAction('reject');
                                  // Explicitly reset form to ensure empty values
                                  setApprovalForm({ demandAmount: '', notes: '' });
                                  console.log('Setting rejection form with empty values:', { demandAmount: '', notes: '' });
                                  setShowApprovalDialog(true);
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

{/* NEW: Part Load Orders Tab */}
<TabsContent value="part-load" className="space-y-4">

  {/* Part Load Orders Section */}
  <Card className="bg-white border border-gray-300 shadow-sm">
    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <CardTitle className="text-gray-800">Part Load Orders</CardTitle>
        <CardDescription className="text-gray-600">
          Part Load orders needing driver details ({partLoadOrders.length} orders)
        </CardDescription>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={fetchPartLoadOrders}
        className="w-full sm:w-auto"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px] text-black">Order #</TableHead>
              <TableHead className="min-w-[120px] text-black">Customer</TableHead>
              <TableHead className="min-w-[100px] text-black">Product</TableHead>
              <TableHead className="min-w-[80px] text-black">Quantity</TableHead>
              <TableHead className="min-w-[100px] text-black">Transport Cost</TableHead>
              <TableHead className="min-w-[100px] text-black">Status</TableHead>
              <TableHead className="min-w-[100px] text-black">Created</TableHead>
              <TableHead className="min-w-[120px] text-black">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partLoadOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-600">
                  No Part Load orders needing driver details.
                </TableCell>
              </TableRow>
            ) : (
              partLoadOrders.map((order) => (
                <TableRow key={order.transportJobId} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-xs sm:text-sm text-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      {order.orderNumber}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm text-gray-800">
                    <div>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">
                        {order.customerContact}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm text-gray-800">
                    {order.productName}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm text-gray-800">
                    {order.quantity}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm text-gray-800">
                    ₹{order.transportCost?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-medium">
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      className={`${
                        order.driverName && order.driverNumber && order.vehicleNumber && order.companyName
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                      onClick={() => {
                        setSelectedPartLoadOrder(order);
                        // Pre-fill form if editing
                        setDriverDetailsForm({
                          driverName: order.driverName || '',
                          driverNumber: order.driverNumber || '',
                          vehicleNumber: order.vehicleNumber || '',
                          companyName: order.companyName || ''
                        });
                        setShowDriverDetailsDialog(true);
                      }}
                    >
                      {order.driverName && order.driverNumber && order.vehicleNumber && order.companyName
                        ? 'Edit Driver Details'
                        : 'Fill Driver Details'
                      }
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>

  {/* After Delivery Details Section */}
  <Card className="bg-white border border-gray-300 shadow-sm mt-6">
    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <CardTitle className="text-gray-800">After Delivery Details</CardTitle>
        <CardDescription className="text-gray-600">
          Completed part load orders requiring delivery details
        </CardDescription>
      </div>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px] text-black">Order #</TableHead>
              <TableHead className="min-w-[120px] text-black">Customer</TableHead>
              <TableHead className="min-w-[100px] text-black">Product</TableHead>
              <TableHead className="min-w-[80px] text-black">Quantity</TableHead>
              <TableHead className="min-w-[100px] text-black">Driver Details</TableHead>
              <TableHead className="min-w-[120px] text-black">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {afterDeliveryOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-600">
                  No completed part load orders requiring delivery details.
                </TableCell>
              </TableRow>
            ) : (
              afterDeliveryOrders.map((order) => (
                <TableRow key={order.transportJobId} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-xs sm:text-sm text-gray-800">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm text-gray-800">
                    {order.customerName}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm text-gray-800">
                    {order.productName}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm text-gray-800">
                    {order.quantity}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm text-gray-800">
                    {order.driverName ? 
                      `${order.driverName}${order.driverNumber ? ` (${order.driverNumber})` : ''}` : 
                      "No driver assigned"}
                  </TableCell>
                  <TableCell>
                    {order.hasDeliveryDetails ? (
                     <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="bg-blue-100 text-gray-900 border border-blue-300 font-semibold"
                          disabled
                        >
                          ✓ Filled
                        </Button>
                        <Button
                          size="sm"
                          className="bg-yellow-100 text-gray-900 border border-yellow-300 hover:bg-yellow-200 transition-colors duration-200 font-semibold"
                          onClick={() => {
                            // Pre-fill the form with existing data
                            setAfterDeliveryForm({
                              lrNumber: order.lrNo || '',
                              loadingDate: order.loadingDate ? new Date(order.loadingDate).toISOString().split('T')[0] : '',
                              unloadingDate: order.unloadingDate ? new Date(order.unloadingDate).toISOString().split('T')[0] : '',
                              deliveryDate: order.actualDeliveryDate ? new Date(order.actualDeliveryDate).toISOString().split('T')[0] : ''
                            });
                            
                            // Make sure we have a valid ID to use
                            const orderWithId = {
                              ...order,
                              transportJobId: order.transportJobId || order.id || order.dispatchId
                            };
                            
                            setSelectedPartLoadOrder(orderWithId);
                            setShowAfterDeliveryDialog(true);
                          }}
                        >
                          Edit Details
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors duration-200 font-medium"
                        onClick={() => {
                          // Set the form data first to ensure it's ready when dialog opens
                          setAfterDeliveryForm({
                            lrNumber: '',
                            loadingDate: '',
                            unloadingDate: '',
                            deliveryDate: ''
                          });
                          
                          // Make sure we have a valid ID to use
                          const orderWithId = {
                            ...order,
                            transportJobId: order.transportJobId || order.id || order.dispatchId
                          };
                          
                          // Then set the selected order and open dialog
                          console.log('Setting selected order with ID:', orderWithId.transportJobId);
                          setSelectedPartLoadOrder(orderWithId);
                          setTimeout(() => {
                            setShowAfterDeliveryDialog(true);
                          }, 100);
                        }}
                      >
                        Fill Delivery Details
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
	  </div>
    </CardContent>
  </Card>

</TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          <Card className="bg-white border border-gray-300 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-gray-800">Delivery Management</CardTitle>
                <CardDescription className="text-gray-600">
                  Manage delivery assignments and track status ({deliveries.length} orders)
                </CardDescription>
              </div>
              <Button
                variant="outline" 
                size="sm" 
                onClick={fetchDeliveries}
                className="w-full sm:w-auto"
              >
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px] text-black">Order ID</TableHead>
                      <TableHead className="min-w-[120px] text-black">Customer</TableHead>
                      <TableHead className="min-w-[150px] hidden sm:table-cell text-black">Address</TableHead>
                      <TableHead className="min-w-[100px] text-black">Vehicle</TableHead>
                        <TableHead className="min-w-[120px] hidden md:table-cell text-black">Driver</TableHead>
                        <TableHead className="min-w-[120px] text-black">Delivery Type</TableHead>
                      <TableHead className="min-w-[80px] text-black">Status</TableHead>
                      <TableHead className="min-w-[120px] text-black">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-600">
                          No deliveries found. Orders from dispatch will appear here.
                        </TableCell>
                      </TableRow>
                    ) : (
                      deliveries
                        .filter(delivery => ['company delivery', 'free delivery'].includes((delivery.deliveryType || '').toLowerCase()))
                        .map((delivery) => (
                        <TableRow key={delivery.transportJobId}>
                        <TableCell className="font-medium text-xs sm:text-sm text-gray-800">{delivery.orderNumber}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-gray-800">{delivery.customerName}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm max-w-[200px] truncate text-gray-800">{delivery.customerAddress}</TableCell>
                        <TableCell className="text-xs sm:text-sm text-gray-800">{delivery.vehicleNo || 'Not Assigned'}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs sm:text-sm text-gray-800">{delivery.transporterName || 'Not Assigned'}</TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <span
                              className={`font-bold px-2 py-1 rounded border inline-block
                                ${delivery.deliveryType?.toLowerCase() === 'company delivery' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}
                                ${delivery.deliveryType?.toLowerCase() === 'free delivery' ? 'bg-green-100 text-green-800 border-green-300' : ''}
                              `}
                            >
                              {delivery.deliveryType || '—'}
                            </span>
                          </TableCell>
                        <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                        <TableCell>
                        <div className="flex space-x-2">
                          {delivery.status === 'pending' && (
                            <Dialog 
                              open={openDialogs.assignVehicle === delivery.transportJobId} 
                              onOpenChange={(open) => {
                                if (open) {
                                  setOpenDialogs(prev => ({ ...prev, assignVehicle: delivery.transportJobId }));
                                  setSelectedDelivery(delivery);
                                  fetchAvailableVehicles();
                                } else {
                                  setOpenDialogs(prev => ({ ...prev, assignVehicle: null }));
                                  setSelectedDelivery(null);
                                  setVehicleAssignment({ transporterName: '', vehicleNo: '' });
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="text-xs sm:text-sm"
                                  onClick={() => {
                                    setOpenDialogs(prev => ({ ...prev, assignVehicle: delivery.transportJobId }));
                                    setSelectedDelivery(delivery);
                                    fetchAvailableVehicles();
                                  }}
                                >
                                  <span className="hidden sm:inline">Assign Vehicle</span>
                                  <span className="sm:hidden">Assign</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Assign Vehicle</DialogTitle>
                                  <DialogDescription>
                                    Assign a vehicle and driver for delivery
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="text-xs text-gray-200">Order qty: {delivery.quantity}</div>
                                  <div className="space-y-2">
                                    <Label htmlFor="available_vehicle">Available Vehicles</Label>
                                    <NativeSelect
                                      className="z-[9999]"
                                      value={vehicleAssignment.vehicleNo}
                                      onChange={(plate) => {
                                        const p = typeof plate === 'string' ? plate : plate?.target?.value;
                                        const v = availableVehicles.find(vh => vh.vehicleNumber === p);
                                        setVehicleAssignment({
                                          transporterName: v?.driverName || '',
                                          vehicleNo: p || ''
                                        });
                                      }}
                                    >
                                      <option value="">Select available vehicle</option>
                                      {availableVehicles.map(v => {
                                        const cap = parseInt((v.capacity || '').toString().replace(/[^0-9]/g, '')) || 0;
                                        return (
                                          <option key={v.id} value={v.vehicleNumber}>
                                            {v.vehicleNumber} · {v.vehicleType} · cap {cap || 'N/A'}
                                          </option>
                                        );
                                      })}
                                    </NativeSelect>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="transporter">
                                      Transporter Name
                                    </Label>
                                    <Input
                                      id="transporter"
                                      autoFocus
                                      value={vehicleAssignment.transporterName}
                                      onChange={(e) => 
                                        setVehicleAssignment({...vehicleAssignment, transporterName: e.target.value})
                                      }
                                      placeholder="Enter transporter name"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="vehicle">
                                      Vehicle Number
                                    </Label>
                                    <Input
                                      id="vehicle"
                                      value={vehicleAssignment.vehicleNo}
                                      onChange={(e) => 
                                        setVehicleAssignment({...vehicleAssignment, vehicleNo: e.target.value})
                                      }
                                      placeholder="Enter vehicle number"
                                    />
                                  </div>
                                </div>
                                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setOpenDialogs(prev => ({ ...prev, assignVehicle: null }));
                                      setSelectedDelivery(null);
                                      setVehicleAssignment({ transporterName: '', vehicleNo: '' });
                                    }}
                                    className="w-full sm:w-auto"
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={handleAssignVehicle}
                                    className="w-full sm:w-auto"
                                  >
                                    Assign Vehicle
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                          
                          {['assigned', 'in_transit'].includes(delivery.status) && (
                            <Dialog 
                              open={openDialogs.updateStatus === delivery.transportJobId} 
                              onOpenChange={(open) => {
                                if (open) {
                                  setOpenDialogs(prev => ({ ...prev, updateStatus: delivery.transportJobId }));
                                  setSelectedDelivery(delivery);
                                  // Prefill a sensible default so update can proceed without manual selection
                                  const next = delivery.status === 'assigned' ? 'in_transit' : (delivery.status === 'in_transit' ? 'delivered' : 'in_transit');
                                  setStatusUpdate({ status: next, location: '', remarks: '' });
                                } else {
                                  setOpenDialogs(prev => ({ ...prev, updateStatus: null }));
                                  setSelectedDelivery(null);
                                  setStatusUpdate({ status: '', location: '', remarks: '' });
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs sm:text-sm"
                                  onClick={() => {
                                    setOpenDialogs(prev => ({ ...prev, updateStatus: delivery.transportJobId }));
                                    setSelectedDelivery(delivery);
                                  }}
                                >
                                  <span className="hidden sm:inline">Update Status</span>
                                  <span className="sm:hidden">Update</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Update Delivery Status</DialogTitle>
                                  <DialogDescription>
                                    Update the current status and location
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="status">
                                      Status
                                    </Label>
                                    <NativeSelect
                                      className="z-[9999]"
                                      value={statusUpdate.status}
                                      onChange={(value) => {
                                        const v = typeof value === 'string' ? value : value?.target?.value;
                                        setStatusUpdate({ ...statusUpdate, status: v });
                                      }}
                                    >
                                      <option value="">Select status</option>
                                      <option value="assigned">Assigned</option>
                                      <option value="in_transit">In Transit</option>
                                      <option value="delivered">Delivered</option>
                                      <option value="failed">Delivery Failed</option>
                                    </NativeSelect>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="location">
                                      Location
                                    </Label>
                                    <Input
                                      id="location"
                                      autoFocus
                                      value={statusUpdate.location}
                                      onChange={(e) => 
                                        setStatusUpdate({...statusUpdate, location: e.target.value})
                                      }
                                      placeholder="Current location"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="remarks">
                                      Remarks
                                    </Label>
                                    <Textarea
                                      id="remarks"
                                      value={statusUpdate.remarks}
                                      onChange={(e) => 
                                        setStatusUpdate({...statusUpdate, remarks: e.target.value})
                                      }
                                      placeholder="Additional remarks"
                                    />
                                  </div>
                                </div>
                                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setOpenDialogs(prev => ({ ...prev, updateStatus: null }));
                                      setSelectedDelivery(null);
                                      setStatusUpdate({ status: '', location: '', remarks: '' });
                                    }}
                                    className="w-full sm:w-auto"
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={handleUpdateStatus}
                                    className="w-full sm:w-auto"
                                  >
                                    Update Status
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
       
       <TabsContent value="vehicles" className="space-y-4">
          <Card className="bg-white border border-gray-300 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl text-gray-800">Fleet Management</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Manage your vehicle fleet and drivers
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {/* <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    await Promise.all([
                      fetchVehicles(),
                      fetchDashboardData()
                    ]);
                    toast({ title: "Refreshed", description: "Fleet data updated" });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  🔄 Refresh
                </Button> */}
                <Dialog 
                open={openDialogs.addVehicle} 
                onOpenChange={(open) => {
                  setOpenDialogs(prev => ({ ...prev, addVehicle: open }));
                  if (!open) {
                    setNewVehicle({
                      license_plate: '',
                      vehicle_type: '',
                      capacity: '',
                      driver_name: '',
                      driver_phone: ''
                    });
                  }
                }}
              >
                <DialogTrigger>
                  <Button 
                    className="w-full sm:w-auto"
                    onClick={() => setOpenDialogs(prev => ({ ...prev, addVehicle: true }))}
                  >
                    Add Vehicle
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-md mx-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Vehicle</DialogTitle>
                    <DialogDescription>
                      Register a new vehicle in the fleet
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="plate">
                        License Plate
                      </Label>
                      <Input
                        id="plate"
                        name="license_plate"
                        autoFocus
                        value={newVehicle.license_plate}
                        onChange={(e) => 
                          setNewVehicle({...newVehicle, license_plate: e.target.value})
                        }
                        placeholder="Enter license plate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">
                        Vehicle Type
                      </Label>
                      <NativeSelect
                        id="type"
                        name="vehicle_type"
                        value={newVehicle.vehicle_type}
                        onChange={(value) => {
                          const v = typeof value === 'string' ? value : value?.target?.value;
                          setNewVehicle({ ...newVehicle, vehicle_type: v });
                        }}
                      >
                        <option value="">Select type</option>
                        <option value="truck">Truck</option>
                        <option value="van">Van</option>
                        <option value="motorcycle">Motorcycle</option>
                        <option value="pickup">Pickup</option>
                      </NativeSelect>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacity">
                        Capacity (kg)
                      </Label>
                      <Input
                        id="capacity"
                        type="number"
                        name="capacity"
                        value={newVehicle.capacity}
                        onChange={(e) => 
                          setNewVehicle({...newVehicle, capacity: e.target.value})
                        }
                        placeholder="Enter capacity"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driver_name">
                        Driver Name
                      </Label>
                      <Input
                        id="driver_name"
                        name="driver_name"
                        value={newVehicle.driver_name}
                        onChange={(e) => 
                          setNewVehicle({...newVehicle, driver_name: e.target.value})
                        }
                        placeholder="Enter driver name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driver_phone">
                        Driver Phone
                      </Label>
                      <Input
                        id="driver_phone"
                        type = "number"
                        name="driver_phone"
                        value={newVehicle.driver_phone}
                        onChange={(e) => 
                          setNewVehicle({...newVehicle, driver_phone: e.target.value})
                        }
                        placeholder="Enter driver phone"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenDialogs(prev => ({ ...prev, addVehicle: false }))}>Close</Button>
                    <Button onClick={handleAddVehicle} className="w-full sm:w-auto">Add Vehicle</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
              <div className="flex gap-0 w-full sm:w-auto">
                <Dialog
                  open={openDialogs.manageVehicles}
                  onOpenChange={(open) => setOpenDialogs(prev => ({ ...prev, manageVehicles: open }))}
                >
                  <DialogTrigger>
                    <Button
                      className="w-full sm:w-auto ml-1"
                      onClick={() => setOpenDialogs(prev => ({ ...prev, manageVehicles: true }))}
                    >
                      Manage Vehicles
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-full max-w-2xl mx-auto">
                    <DialogHeader>
                      <DialogTitle>Manage Vehicles</DialogTitle>
                      <DialogDescription>Edit, delete, or mark drivers as reached</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Plate</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Driver</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vehicles.map((v) => (
                            <TableRow key={v.id}>
                              <TableCell>{v.vehicleNumber}</TableCell>
                              <TableCell>{v.vehicleType}</TableCell>
                              <TableCell>{v.driverName}</TableCell>
                              <TableCell>{getVehicleStatusBadge(v.status)}</TableCell>
                              <TableCell className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => openEditVehicleDialog(v)}
                                >
                                  Edit
                                </Button>
                                {v.status === 'returning' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={async () => {
                                      const res = await fetch(`${API_BASE}/fleet/${v.id}/reached`, { method: 'POST' });
                                      if (res.ok) {
                                        toast({ title: 'Driver reached', description: `${v.vehicleNumber} is now available` });
                                        fetchVehicles();
                                      } else {
                                        const err = await res.json().catch(() => ({}));
                                        toast({ title: 'Failed', description: err.error || 'Try again', variant: 'destructive' });
                                      }
                                    }}
                                  >
                                    Mark Reached
                                  </Button>
                                )}
                                <Dialog
                                  open={editDialog.open && editDialog.vehicle?.id === v.id}
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setEditDialog({ open: false, vehicle: null });
                                    }
                                  }}
                                >
                                  <DialogContent className="w-full max-w-2xl mx-auto">
                                    <DialogHeader>
                                      <DialogTitle>Edit Vehicle</DialogTitle>
                                      <DialogDescription>
                                        Update vehicle details
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_vehicle_type">Vehicle Type</Label>
                                          <NativeSelect
                                            id="edit_vehicle_type"
                                            name="vehicle_type"
                                            value={editVehicle.vehicle_type}
                                            onChange={(value) => {
                                              const v = typeof value === 'string' ? value : value?.target?.value;
                                              setEditVehicle({...editVehicle, vehicle_type: v});
                                            }}
                                          >
                                            <option value="">Select vehicle type</option>
                                            <option value="truck">Truck</option>
                                            <option value="van">Van</option>
                                            <option value="motorcycle">Motorcycle</option>
                                            <option value="pickup">Pickup</option>
                                          </NativeSelect>
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_capacity">Capacity (kg)</Label>
                                          <Input
                                            id="edit_capacity"
                                            name="capacity"
                                            value={editVehicle.capacity}
                                            onChange={(e) => 
                                              setEditVehicle({...editVehicle, capacity: e.target.value})
                                            }
                                            placeholder="e.g. 1500"
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_driver_name">Driver Name</Label>
                                          <Input
                                            id="edit_driver_name"
                                            name="driver_name"
                                            value={editVehicle.driver_name}
                                            onChange={(e) => 
                                              setEditVehicle({...editVehicle, driver_name: e.target.value})
                                            }
                                            placeholder="Enter driver name"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_driver_phone">Driver Phone</Label>
                                          <Input
                                            id="edit_driver_phone"
                                            name="driver_phone"
                                            value={editVehicle.driver_phone}
                                            onChange={(e) => 
                                              setEditVehicle({...editVehicle, driver_phone: e.target.value})
                                            }
                                            placeholder="Enter phone number"
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_status">Status</Label>
                                          <NativeSelect
                                            id="edit_status"
                                            name="status"
                                            value={editVehicle.status}
                                            onChange={(value) => {
                                              const v = typeof value === 'string' ? value : value?.target?.value;
                                              setEditVehicle({...editVehicle, status: v});
                                            }}
                                          >
                                            <option value="available">Available</option>
                                            <option value="assigned">Assigned</option>
                                            <option value="maintenance">Maintenance</option>
                                            <option value="out_of_service">Out of Service</option>
                                          </NativeSelect>
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="edit_current_location">Current Location</Label>
                                          <Input
                                            id="edit_current_location"
                                            name="current_location"
                                            value={editVehicle.current_location}
                                            onChange={(e) => 
                                              setEditVehicle({...editVehicle, current_location: e.target.value})
                                            }
                                            placeholder="Enter current location"
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit_notes">Notes</Label>
                                        <Textarea
                                          id="edit_notes"
                                          name="notes"
                                          value={editVehicle.notes}
                                          onChange={(e) => 
                                            setEditVehicle({...editVehicle, notes: e.target.value})
                                          }
                                          className="min-h-[80px] resize-none"
                                          placeholder="Additional notes about the vehicle..."
                                        />
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button 
                                        variant="outline" 
                                        onClick={() => setEditDialog({ open: false, vehicle: null })}
                                      >
                                        Cancel
                                      </Button>
                                      <Button 
                                        onClick={handleUpdateVehicle}
                                      >
                                        Save Changes
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteVehicle(v.id)}>Delete</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpenDialogs(prev => ({ ...prev, manageVehicles: false }))}>Close</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px] text-black">License Plate</TableHead>
                      <TableHead className="min-w-[80px] text-black">Type</TableHead>
                      <TableHead className="min-w-[80px] hidden sm:table-cell text-black">Capacity</TableHead>
                      <TableHead className="min-w-[100px] text-black">Driver</TableHead>
                      <TableHead className="min-w-[120px] hidden md:table-cell text-black">Phone</TableHead>
                      <TableHead className="min-w-[80px] text-black">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-600">
                          No vehicles registered yet. Click "Add Vehicle" to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium text-xs sm:text-sm text-gray-800">{vehicle.vehicleNumber}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-800">{vehicle.vehicleType}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs sm:text-sm text-gray-800">{vehicle.capacity}</TableCell>
                          <TableCell className="text-xs sm:text-sm text-gray-800">{vehicle.driverName}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs sm:text-sm text-gray-800">{vehicle.driverContact}</TableCell>
                          <TableCell className="flex items-center gap-2">
                            {getVehicleStatusBadge(vehicle.status)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost-estimation" className="space-y-4">
          <Card className="bg-white border border-gray-300 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-800">Transport Cost Estimation</CardTitle>
              <CardDescription className="text-gray-600">
                Calculate transport costs for deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
  <Label htmlFor="transport-origin" className="text-sm text-gray-800">Origin</Label>
  <Input
    id="transport-origin"
    value={transportCostForm.origin}
    onChange={(e) =>
      setTransportCostForm((prev) => ({ ...prev, origin: e.target.value }))
    }
    placeholder="Pickup location"
    className="border border-gray-300 bg-white text-gray-800 text-sm placeholder-gray-500"
  />
</div>
                  <div className="space-y-1">
                    <Label htmlFor="transport-destination" className="text-sm text-gray-800">Destination</Label>
                    <Input
                      id="transport-destination"
                      value={transportCostForm.destination}
                      onChange={(e) => setTransportCostForm(prev => ({ ...prev, destination: e.target.value }))}
                      placeholder="Delivery location"
                      className="border border-gray-300 bg-white text-gray-800 text-sm placeholder-gray-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="transport-distance" className="text-sm text-gray-800">Distance (km)</Label>
                    <Input
                      id="transport-distance"
                      type="number"
                      value={transportCostForm.distance}
                      onChange={(e) => setTransportCostForm(prev => ({ ...prev, distance: e.target.value }))}
                      placeholder="km"
                      className="border border-gray-300 bg-white text-gray-800 text-sm placeholder-gray-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="transport-weight" className="text-sm text-gray-800">Weight (kg)</Label>
                    <Input
                      id="transport-weight"
                      type="number"
                      value={transportCostForm.weight}
                      onChange={(e) => setTransportCostForm(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="kg"
                      className="border border-gray-300 bg-white text-gray-800 text-sm placeholder-gray-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="transport-vehicle-type" className="text-sm text-gray-800">Vehicle Type</Label>
                    <NativeSelect
                      id="transport-vehicle-type"
                      value={transportCostForm.vehicleType}
                      onChange={(value) => {
                        const v = typeof value === 'string' ? value : value?.target?.value;
                        setTransportCostForm(prev => ({ ...prev, vehicleType: v }));
                      }}
                      className="border border-gray-300 bg-white text-gray-800 text-sm placeholder-gray-500"
                    >
                      <option value="">Select</option>
                      <option value="truck">Truck (₹20/km)</option>
                      <option value="van">Van (₹14/km)</option>
                      <option value="motorcycle">Motorcycle (₹10/km)</option>
                      <option value="pickup">Pickup (₹7/km)</option>
                    </NativeSelect>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => {
                      const vehicleRates = {
                        truck: 20,
                        van: 14,
                        motorcycle: 10,
                        pickup: 7
                      };
                      
                      const distance = parseFloat(transportCostForm.distance) || 0;
                      const weight = parseFloat(transportCostForm.weight) || 0;
                      const vehicleRate = vehicleRates[transportCostForm.vehicleType] || 0;
                      
                      const distanceCost = distance * vehicleRate;
                      const weightCost = weight * 5;
                      const subtotal = distanceCost + weightCost;
                      const fuelSurcharge = subtotal * 0.3;
                      const totalCost = subtotal + fuelSurcharge;
                      
                      setTransportCostForm(prev => ({
                        ...prev,
                        baseCost: 0,
                        distanceCost,
                        weightCost,
                        fuelSurcharge,
                        totalCost
                      }));
                    }}
                  >
                    Calculate Cost
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                    onClick={() => {
                      setTransportCostForm({
                        origin: '',
                        destination: '',
                        distance: '',
                        weight: '',
                        vehicleType: '',
                        baseCost: 0,
                        distanceCost: 0,
                        weightCost: 0,
                        fuelSurcharge: 0,
                        totalCost: 0
                      });
                    }}
                  >
                    Reset
                  </Button>
                </div>
                
                <Card className="bg-white border border-gray-300 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-gray-800">Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-2 text-gray-800 text-sm">
                      <div className="flex justify-between">
                        <span>Distance Cost:</span>
                        <span className="font-medium">₹{transportCostForm.distanceCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weight Cost:</span>
                        <span className="font-medium">₹{transportCostForm.weightCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fuel Surcharge:</span>
                        <span className="font-medium">₹{transportCostForm.fuelSurcharge.toFixed(2)}</span>
                      </div>
                      <hr className="my-2 border-white/20" />
                      <div className="flex justify-between text-base font-semibold">
                        <span>Total Cost:</span>
                        <span>₹{transportCostForm.totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Close Tabs here */}
      </div>
        <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="text-center text-gray-600">
            <p className="font-medium">
              © Transport Management System
            </p>
            <p className="text-sm mt-1">
              For technical support, contact IT Department
            </p>
          </div>
        </div>
      </div>
      
     {/* Dialogs and modals should be rendered here, outside the main content divs, if needed */}
    </div> {/* Close .min-h-screen */}
    {/* Dialogs and modals */}
    <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {approvalAction === 'approve' ? 'Approve Order' : 'Reject Order'}
          </DialogTitle>
          <DialogDescription>
            {approvalAction === 'approve' 
              ? `Approve transport order ${selectedApproval?.orderNumber}?`
              : `Reject transport order ${selectedApproval?.orderNumber} and specify demand amount`
            }
          </DialogDescription>
        </DialogHeader>
        {approvalAction === 'reject' && (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transport-demand-amount">Demand Amount (₹)</Label>
              <Input
                id="transport-demand-amount"
                type="number"
                value={approvalForm.demandAmount}
                onChange={(e) => setApprovalForm(prev => ({ ...prev, demandAmount: e.target.value }))}
                placeholder="Enter demand amount"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={approvalForm.notes}
                onChange={(e) => setApprovalForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Enter rejection reason and notes"
                className="w-full"
                rows={3}
              />
            </div>
          </div>
        )}
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowApprovalDialog(false);
              setSelectedApproval(null);
              setApprovalAction('approve');
              setApprovalForm({ demandAmount: '', notes: '' });
            }}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApprovalDecision}
            className={`w-full sm:w-auto ${approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {approvalAction === 'approve' ? 'Approve Order' : 'Reject Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={showDriverDetailsDialog} onOpenChange={setShowDriverDetailsDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fill Driver Details</DialogTitle>
          <DialogDescription>
            Enter driver and vehicle details for part load order #{selectedPartLoadOrder?.orderNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="transport-driver-name">Driver Name</Label>
            <Input
              id="transport-driver-name"
              name="driverName"
              value={driverDetailsForm.driverName}
              onChange={(e) => setDriverDetailsForm(prev => ({ ...prev, driverName: e.target.value }))}
              placeholder="Enter driver name"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transport-driver-number">Driver Number</Label>
            <Input
              id="transport-driver-number"
              name="driverNumber"
              value={driverDetailsForm.driverNumber}
              onChange={(e) => setDriverDetailsForm(prev => ({ ...prev, driverNumber: e.target.value }))}
              placeholder="Enter driver phone number"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transport-vehicle-number">Vehicle Number</Label>
            <Input
              id="transport-vehicle-number"
              name="vehicleNumber"
              value={driverDetailsForm.vehicleNumber}
              onChange={(e) => setDriverDetailsForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
              placeholder="Enter vehicle number"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transport-company-name">Company Name</Label>
            <Input
              id="transport-company-name"
              name="companyName"
              value={driverDetailsForm.companyName}
              onChange={(e) => setDriverDetailsForm(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="Enter company name"
              className="w-full"
            />
          </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="transport-expected-delivery">Expected Delivery Date</Label>
            <Input
              id="transport-expected-delivery"
              name="expectedDeliveryDate"
              type="date"
              value={driverDetailsForm.expectedDeliveryDate}
              onChange={(e) => setDriverDetailsForm(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
              className="w-full"
            />
          </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowDriverDetailsDialog(false);
              setSelectedPartLoadOrder(null);
              setDriverDetailsForm({ driverName: '', driverNumber: '', vehicleNumber: '', companyName: '' , expectedDeliveryDate: ''});
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleFillDriverDetails}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Submit to Watchman
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={showAfterDeliveryDialog} 
      onOpenChange={(open) => {
        if (!open) {
          setShowAfterDeliveryDialog(false);
          setAfterDeliveryForm({ 
            lrNumber: '', 
            loadingDate: '', 
            unloadingDate: '', 
            deliveryDate: '' 
          });
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">After Delivery Details</DialogTitle>
          <DialogDescription className="text-gray-600">
            Enter after delivery details for part load order #{selectedPartLoadOrder?.orderNumber}
          </DialogDescription>
        </DialogHeader>
        {selectedPartLoadOrder ? (
          <form onSubmit={handleAfterDeliverySubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="lr-number" className="text-sm font-medium text-white">LR Number</Label>
                <Input
                  id="lr-number"
                  value={afterDeliveryForm.lrNumber}
                  onChange={(e) => setAfterDeliveryForm(prev => ({ ...prev, lrNumber: e.target.value }))}
                  placeholder="Enter LR number"
                  className="w-full bg-white border border-gray-300 rounded-md text-gray-900"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loading-date" className="text-sm font-medium text-white">Loading Date</Label>
                <Input
                  id="loading-date"
                  type="date"
                  value={afterDeliveryForm.loadingDate}
                  onChange={(e) => setAfterDeliveryForm(prev => ({ ...prev, loadingDate: e.target.value }))}
                  className="w-full bg-white border border-gray-300 rounded-md text-gray-900 px-3 py-2 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:bg-white [&::-webkit-calendar-picker-indicator]:p-1 [&::-webkit-calendar-picker-indicator]:rounded"
                  required
                  max={afterDeliveryForm.unloadingDate || afterDeliveryForm.deliveryDate || "2025-12-31"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unloading-date" className="text-sm font-medium text-white">Unloading Date</Label>
                <Input
                  id="unloading-date"
                  type="date"
                  value={afterDeliveryForm.unloadingDate}
                  onChange={(e) => setAfterDeliveryForm(prev => ({ ...prev, unloadingDate: e.target.value }))}
                  className="w-full bg-white border border-gray-300 rounded-md text-gray-900 px-3 py-2 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:bg-white [&::-webkit-calendar-picker-indicator]:p-1 [&::-webkit-calendar-picker-indicator]:rounded"
                  required
                  min={afterDeliveryForm.loadingDate}
                  max={afterDeliveryForm.deliveryDate || "2025-12-31"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-date" className="text-sm font-medium text-white">Delivery Date</Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={afterDeliveryForm.deliveryDate}
                  onChange={(e) => setAfterDeliveryForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  className="w-full bg-white border border-gray-300 rounded-md text-gray-900 px-3 py-2 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:bg-white [&::-webkit-calendar-picker-indicator]:p-1 [&::-webkit-calendar-picker-indicator]:rounded"
                  required
                  min={afterDeliveryForm.unloadingDate || afterDeliveryForm.loadingDate}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAfterDeliveryDialog(false);
                  setAfterDeliveryForm({ 
                    lrNumber: '', 
                    loadingDate: '', 
                    unloadingDate: '', 
                    deliveryDate: '' 
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">Submit</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-4 text-center text-gray-600">
            No part load order selected. Please select an order first.
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default TransportDepartment;
