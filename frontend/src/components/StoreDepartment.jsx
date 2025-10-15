import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import OrderStatusBar from '@/components/ui/OrderStatusBar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import * as XLSX from 'xlsx';
import {
  Package,
  Users,
  ArrowLeft,
  PlusCircle,
  ClipboardList,
  CheckCircle,
  Warehouse,
  WarehouseIcon,
  Upload,
  Search,
} from "lucide-react";

import { API_BASE as API_URL } from '@/lib/api'; // use unified API base

const StoreDepartment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", quantity: "" });
  const [excelFile, setExcelFile] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = Inventory, 1 = Stock Verification
  const [searchTerm, setSearchTerm] = useState("");

  // === Fetch inventory & purchase orders from backend ===
  const fetchInventory = async () => {
    try {
      const res = await fetch(`${API_URL}/store/inventory`);
      const data = await res.json();
      setInventory(data);
    } catch (err) {
      console.error("Error fetching inventory", err);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/store/orders/pending`);
      const data = await res.json();
      setPurchaseOrders(data);
    } catch (err) {
      console.error("Error fetching purchase orders", err);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchPurchaseOrders();
  }, []);

  // === Store Check (Stock Availability) ===
  const handleStoreCheck = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/store/orders/${orderId}/check-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (res.ok) {
        if (data.message.toLowerCase().includes("insufficient")) {
  toast({
    title: "Insufficient Stock ❌",
    description: data.message,
    variant: "destructive",
  });
} else {
  toast({
    title: "Stock Allocated ✅",
    description: data.message,
  });
}
        // toast({ title: "Stock Checked ✅", description: data.message });
        fetchInventory();
        fetchPurchaseOrders();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to check stock", variant: "destructive" });
    }
  };

  // === Verify Purchase (After Purchase Dept Approval) ===
  const verifyAndAddToInventory = async (orderId) => {
    try {
      const res = await fetch(
        `${API_URL}/store/orders/${orderId}/verify-purchase`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();

      if (res.ok) {
        toast({ title: "Purchase Verified ✅", description: data.message });
        fetchInventory();
        fetchPurchaseOrders();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to verify purchase", variant: "destructive" });
    }
  };

  // === Add New Inventory Item ===
  const handleAddItem = async () => {
    if (!newItem.name || !newItem.quantity) return;

    try {
      const res = await fetch(`${API_URL}/store/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      const data = await res.json();

      if (res.ok) {
        toast({ title: "Item Added ✅", description: data.message });
        setNewItem({ name: "", quantity: "" });
        fetchInventory();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
    }
  };

  // === Import Excel ===
  const handleImport = async () => {
    if (!excelFile) {
      toast({ title: "No file selected", description: "Please select an Excel file to import", variant: "destructive" });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Assume first row is headers, skip it
        const rows = jsonData.slice(1);

        // Map to items: assume columns: 0=Product Name, 1=Quantity, 2=Category (optional)
        const items = rows.map(row => ({
          name: row[0] ? String(row[0]).trim() : '',
          quantity: row[1] ? parseInt(row[1]) : 0,
          category: row[2] ? String(row[2]).trim() : 'Raw Material'
        })).filter(item => item.name && item.quantity > 0);

        if (items.length === 0) {
          toast({ title: "No valid data", description: "No valid items found in the Excel file", variant: "destructive" });
          return;
        }

        const res = await fetch(`${API_URL}/store/inventory/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(items),
        });
        const dataRes = await res.json();

        if (res.ok) {
          toast({ title: "Import Successful ✅", description: dataRes.message });
          setExcelFile(null);
          fetchInventory();
        } else {
          toast({ title: "Import Failed", description: dataRes.error, variant: "destructive" });
        }
      };
      reader.readAsArrayBuffer(excelFile);
    } catch (err) {
      console.error(err);
      toast({ title: "Import Error", description: "Failed to process the Excel file", variant: "destructive" });
    }
  };


  // Filter inventory based on search term
  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Notification count for purchase orders (pending store check or finance approved)
  const stockVerificationCount = purchaseOrders.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto bg-white shadow-md border-b-4 border-blue-800 rounded-b-lg">
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
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg">
                  <WarehouseIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Store Department</h1>
                  <p className="text-gray-600 text-sm sm:text-base font-medium">Inventory Management System</p>
                </div>
              </div>
            </div>
            {/* Right: User Panel */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-gray-600 text-xs font-medium">Store Team</p>
                  <p className="text-blue-600 text-xs font-medium">Inventory Management</p>
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
            Inventory
          </button>
          <button
            className={`relative px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 1 ? 'border-blue-700 text-blue-800 bg-white' : 'border-transparent text-gray-500 bg-blue-50 hover:text-blue-700'}`}
            onClick={() => setActiveTab(1)}
          >
            Stock Verification
            {stockVerificationCount > 0 && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {stockVerificationCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 0 ? (
          // Inventory Tab
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Add Inventory */}
            <div>
              <Card className="bg-white border border-gray-300 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-800 flex items-center">
                    <PlusCircle className="w-5 h-5 mr-2" /> Add Inventory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-800 font-medium">Item Name</Label>
                      <Input
                        value={newItem.name}
                        onChange={(e) =>
                          setNewItem({ ...newItem, name: e.target.value })
                        }
                        placeholder="e.g., Steel Rod"
                        className="w-full border-2 border-gray-300 bg-white text-gray-900 mt-1 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-500"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-800 font-medium">Quantity</Label>
                      <Input
                        type="number"
                        value={newItem.quantity}
                        onChange={(e) =>
                          setNewItem({ ...newItem, quantity: e.target.value })
                        }
                        placeholder="e.g., 100"
                        className="w-full border-2 border-gray-300 bg-white text-gray-900 mt-1 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-500"
                      />
                    </div>
                    <Button
                      onClick={handleAddItem}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>

                    {/* Import from Excel */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <Label className="text-gray-800 font-medium">Import from Excel</Label>
                      <Input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setExcelFile(e.target.files[0])}
                        className="w-full border-2 border-gray-300 bg-white text-gray-900 mt-1 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                      <Button
                        onClick={handleImport}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        disabled={!excelFile}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Import Excel
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        Excel should have columns: Product Name, Quantity, Category (optional)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Inventory List */}
            <div>
              <Card className="bg-white border border-gray-300 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-800 flex items-center">
                    <ClipboardList className="w-5 h-5 mr-2" /> Inventory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Search Box */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search inventory items..."
                        className="w-full pl-10 border-2 border-gray-300 bg-white text-gray-900 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-500"
                      />
                    </div>

                    {/* Inventory Items */}
                    <div className="space-y-3">
                      {filteredInventory.length > 0 ? (
                        filteredInventory.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center"
                          >
                            <span className="text-gray-800 font-medium">{item.name}</span>
                            <Badge className="bg-green-500/20 text-green-400 border-0">
                              Qty: {item.quantity}
                            </Badge>
                          </div>
                        ))
                      ) : searchTerm ? (
                        <p className="text-gray-400 text-center py-4">No items match your search</p>
                      ) : (
                        <p className="text-gray-400 text-center py-4">No items</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          // Stock Verification Tab
          <div>
            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800 flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2" /> Purchase Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {purchaseOrders.length > 0 ? (
                    purchaseOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-gray-800 font-semibold text-lg">Order #{order.id}</span>
                          <span className="text-xs text-gray-500">{order.createdAt ? `Created: ${order.createdAt}` : ''}</span>
                        </div>
                        <p className="text-gray-800 font-medium">
                          Product: {order.product_name || order.productName} (Qty: {order.quantity})
                        </p>
                        {order.materials && order.materials.length > 0 && (
                          <div className="mb-2">
                            <span className="text-gray-700 font-medium">Materials:</span>
                            <ul className="list-disc list-inside ml-4">
                              {order.materials.map((mat, idx) => (
                                <li key={idx} className="text-gray-600 text-sm">
                                  {typeof mat === 'string' ? mat : `${mat.name || mat} (Qty: ${mat.quantity || '-'}, Unit Cost: ₹${mat.unit_cost || 0})`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="text-sm text-gray-600">
                          Status: <span className="capitalize">{order.status}</span>
                        </p>
                        <div className="flex space-x-2">
                          {order.status === "pending_store_check" && (
                            <Button
                              size="sm"
                              onClick={() => handleStoreCheck(order.id)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white"
                            >
                              Check Stock
                            </Button>
                          )}
                          {order.status === "finance_approved" && (
                            <Button
                              size="sm"
                              onClick={() => verifyAndAddToInventory(order.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Verify & Send Stock
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-4">
                      No purchase orders
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm text-center text-gray-600">
          <p className="font-medium">© Inventory Management System</p>
          <p className="text-sm mt-1">For technical support, contact IT Department</p>
        </div>
      </div>
    </div>
  );

};


export default StoreDepartment;
