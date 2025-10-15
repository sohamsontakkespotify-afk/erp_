import React, { useMemo, useState, useEffect } from 'react';
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
import {
  Users, Calendar, DollarSign, UserPlus, TrendingUp, Award,
  Plus, Edit, Trash2, X, Search, Filter, Download,
  Clock, CheckCircle, XCircle, Eye, FileText,Building2,
  Building, Phone, Mail, MapPin, User, Briefcase,
  ArrowLeft, RefreshCw, AlertCircle, Save, Calendar as CalendarIcon
} from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const HRDepartment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [jobPostings, setJobPostings] = useState([]);
  const [jobApplications, setJobApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalFormData, setModalFormData] = useState({});
  const { toast } = useToast();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'attendance', label: 'Attendance & Leave', icon: Calendar },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'recruitment', label: 'Recruitment', icon: UserPlus }
  ];

  const normalizeEmployee = (employee = {}) => {
    const firstName = employee.firstName ?? employee.first_name ?? '';
    const lastName = employee.lastName ?? employee.last_name ?? '';
    const employeeId = employee.employeeId ?? employee.employee_id ?? '';
    const joiningDate = employee.joiningDate ?? employee.joining_date ?? '';
    const managerId = employee.managerId ?? employee.manager_id ?? null;
    const salary = employee.monthlySalary ?? employee.salary ?? '';
    const salaryType = employee.salaryType ?? employee.salary_type ?? 'monthly';
    const status = employee.status ?? 'active';

    return {
      ...employee,
      firstName,
      lastName,
      employeeId,
      joiningDate,
      managerId,
      salary,
      salaryType,
      status,
      fullName: (employee.fullName || employee.name || `${firstName} ${lastName}`).trim()
    };
  };

  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    department: '',
    designation: '',
    joiningDate: '',
    salary: '',
    salaryType: 'monthly',
    status: 'active'
  });

  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    date: '',
    checkInTime: '',
    checkOutTime: '',
    status: 'present',
    notes: ''
  });

  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [payrollForm, setPayrollForm] = useState({
    employeeId: '',
    payPeriodStart: '',
    payPeriodEnd: '',
    basicSalary: '',
    salaryType: 'monthly',
    allowances: '0',
    deductions: ''
  });

  // Payroll-specific states
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [generatePayrollMode, setGeneratePayrollMode] = useState('single'); // 'single' or 'bulk'
  const [selectedEmployeesForPayroll, setSelectedEmployeesForPayroll] = useState([]);
  const [attendanceData, setAttendanceData] = useState({
    totalWorkingDays: 0,
    attendedDays: 0,
    absentDays: 0,
    totalHours: 0,
    loading: false
  });

  const [jobForm, setJobForm] = useState({
    title: '',
    department: '',
    location: '',
    employmentType: '',
    experienceLevel: '',
    salaryRange: '',
    description: '',
    applicationUrl: '',
    requirements: '',
    responsibilities: ''
  });

  const [applicationForm, setApplicationForm] = useState({
    jobPostingId: '',
    candidateName: '',
    email: '',
    phone: '',
    experience: '',
    currentCompany: '',
    currentPosition: '',
    expectedSalary: '',
    noticePeriod: '',
    resumeUrl: '',
    coverLetter: '',
    skills: ''
  });

  const [interviewForm, setInterviewForm] = useState({
    applicationId: '',
    candidateName: '',
    jobTitle: '',
    scheduledDate: '',
    scheduledTime: '',
    interviewType: '',
    interviewers: '',
    interviewerId: '',
    location: '',
    notes: '',
    decision: '',
    rating: '',
    feedback: '',
    durationMinutes: 60
  });

  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);

  // Modal functions
  const openModal = (type, employee = null) => {
    setModalType(type);
    setSelectedEmployee(employee);

    if ((type === 'editEmployee' || type === 'viewEmployee') && employee) {
      const normalized = normalizeEmployee(employee);
      const formData = {
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        email: normalized.email || '',
        phone: normalized.phone || '',
        designation: normalized.designation || '',
        department: normalized.department || '',
        joiningDate: normalized.joiningDate || '',
        address: normalized.address || '',
        salary: normalized.salary || '',
        salaryType: normalized.salaryType || 'monthly',
        employeeId: normalized.employeeId || '',
        status: normalized.status || 'active',
        dateOfBirth: normalized.dateOfBirth || normalized.date_of_birth || '',
        gender: normalized.gender || '',
        managerId: normalized.managerId ? normalized.managerId.toString() : null
      };
      setModalFormData(formData);
    } else if (type === 'jobPosting' || type === 'editJobPosting' || type === 'viewJobPosting') {
      if (employee) {
        setJobForm({
          id: employee.id,
          title: employee.title || '',
          department: employee.department || '',
          location: employee.location || '',
          employmentType: employee.employmentType || '',
          experienceLevel: employee.experienceLevel || '',
          salaryRange: employee.salaryRange || '',
          description: employee.description || '',
          applicationUrl: employee.applicationUrl || '',
          requirements: employee.requirements || '',
          responsibilities: employee.responsibilities || '',
          postedDate: employee.postedDate || '',
          status: employee.status || 'open'
        });
      } else {
        setJobForm({
          id: '',
          title: '',
          department: '',
          location: '',
          employmentType: '',
          experienceLevel: '',
          salaryRange: '',
          description: '',
          applicationUrl: '',
          requirements: '',
          responsibilities: '',
          postedDate: new Date().toISOString().split('T')[0],
          status: 'open'
        });
      }
    } else {
      setModalFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        designation: '',
        department: '',
        joiningDate: '',
        address: '',
        salary: '',
        salaryType: 'monthly',
        employeeId: '',
        status: 'active',
        dateOfBirth: '',
        gender: '',
        managerId: null
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedEmployee(null);
    setModalFormData({});
  };

  const handleSubmit = async () => {
    switch (modalType) {
      case 'addEmployee':
      case 'editEmployee':
        if (!modalFormData.firstName || !modalFormData.lastName || !modalFormData.email || !modalFormData.department || !modalFormData.designation || !modalFormData.joiningDate) {
          toast({ title: "Missing Information", description: "First name, last name, email, department, designation, and joining date are required.", variant: "destructive" });
          return;
        }

        try {
          const payload = {
            firstName: modalFormData.firstName,
            lastName: modalFormData.lastName,
            email: modalFormData.email,
            phone: modalFormData.phone,
            designation: modalFormData.designation,
            department: modalFormData.department,
            joiningDate: modalFormData.joiningDate,
            address: modalFormData.address,
            salary: modalFormData.salary,
            salaryType: modalFormData.salaryType,
            status: modalFormData.status,
            dateOfBirth: modalFormData.dateOfBirth,
            gender: modalFormData.gender
          };

          if (modalFormData.managerId !== null && modalFormData.managerId !== '') {
            payload.managerId = modalFormData.managerId;
          }

          const url = modalType === 'addEmployee' ? `${API_BASE}/hr/employees` : `${API_BASE}/hr/employees/${selectedEmployee.id}`;
          const method = modalType === 'addEmployee' ? 'POST' : 'PUT';
          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error('Failed to save employee');

          if (method === 'PUT') {
            const updatedEmployee = normalizeEmployee({ ...selectedEmployee, ...payload, id: selectedEmployee.id });
            setEmployees((prev) => prev.map((emp) => (emp.id === updatedEmployee.id ? updatedEmployee : emp)));
          }

          toast({ title: "Success", description: `Employee ${modalType === 'addEmployee' ? 'added' : 'updated'} successfully` });
          closeModal();
          fetchEmployees();
        } catch (err) {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
        break;

      case 'jobPosting':
        if (!jobForm.title || !jobForm.department || !jobForm.employmentType || !jobForm.description) {
          toast({ title: "Missing Information", description: "Title, department, employment type, and description are required.", variant: "destructive" });
          return;
        }

        try {
          const payload = {
            title: jobForm.title,
            department: jobForm.department,
            location: jobForm.location,
            employmentType: jobForm.employmentType,
            experienceLevel: jobForm.experienceLevel,
            salaryRange: jobForm.salaryRange,
            description: jobForm.description,
            applicationUrl: jobForm.applicationUrl || null,
            requirements: jobForm.requirements,
            responsibilities: jobForm.responsibilities,
            postedDate: new Date().toISOString().split('T')[0]
          };

          const response = await fetch(`${API_BASE}/hr/job-postings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error('Failed to create job posting');

          toast({ title: "Success", description: "Job posting created successfully" });
          closeModal();
          fetchJobPostings();
          setJobForm({
            title: '',
            department: '',
            location: '',
            employmentType: '',
            experienceLevel: '',
            salaryRange: '',
            description: '',
            applicationUrl: '',
            requirements: '',
            responsibilities: ''
          });
        } catch (err) {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
        break;

      case 'addApplication':
        if (!applicationForm.jobPostingId || !applicationForm.candidateName || !applicationForm.email || !applicationForm.phone) {
          toast({ title: "Missing Information", description: "Job posting, name, email, and phone are required.", variant: "destructive" });
          return;
        }

        try {
          const payload = {
            jobPostingId: applicationForm.jobPostingId,
            candidateName: applicationForm.candidateName,
            email: applicationForm.email,
            phone: applicationForm.phone,
            experience: applicationForm.experience,
            currentCompany: applicationForm.currentCompany,
            currentPosition: applicationForm.currentPosition,
            expectedSalary: applicationForm.expectedSalary,
            noticePeriod: applicationForm.noticePeriod,
            resumeUrl: applicationForm.resumeUrl,
            coverLetter: applicationForm.coverLetter,
            skills: applicationForm.skills,
            status: 'pending'
          };

          const response = await fetch(`${API_BASE}/hr/job-applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error('Failed to submit application');

          toast({ title: "Success", description: "Application submitted successfully" });
          closeModal();
          fetchJobApplications();
          setApplicationForm({
            jobPostingId: '',
            candidateName: '',
            email: '',
            phone: '',
            experience: '',
            currentCompany: '',
            currentPosition: '',
            expectedSalary: '',
            noticePeriod: '',
            resumeUrl: '',
            coverLetter: '',
            skills: ''
          });
        } catch (err) {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
        break;

      default:
        break;
    }
  };


  // Payroll Functions
  const handleGeneratePayroll = async () => {
    try {
      if (generatePayrollMode === 'single' && !payrollForm.employeeId) {
        toast({ title: "Error", description: "Please select an employee", variant: "destructive" });
        return;
      }

      if (!payrollForm.payPeriodStart || !payrollForm.payPeriodEnd) {
        toast({ title: "Error", description: "Please select pay period dates", variant: "destructive" });
        return;
      }

      if (!payrollForm.allowances || parseFloat(payrollForm.allowances) < 0) {
        toast({ title: "Error", description: "Please enter a valid allowances amount", variant: "destructive" });
        return;
      }

      if (generatePayrollMode === 'bulk') {
        // Generate payroll for all active employees
        const activeEmployees = employees.filter(emp => emp.status === 'active');
        let successCount = 0;
        let errorCount = 0;

        for (const employee of activeEmployees) {
          try {
            const emp = employees.find(e => e.id === employee.id);
            const response = await fetch(`${API_BASE}/hr/employees/${employee.id}/payrolls`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                startDate: payrollForm.payPeriodStart,
                endDate: payrollForm.payPeriodEnd,
                allowances: parseFloat(payrollForm.allowances),
                totalWorkingDays: 22, // Assume full month working days
                attendedDays: 22,
                salaryType: emp?.salaryType || 'monthly',
                totalHours: 0
              })
            });

            if (response.ok) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (err) {
            errorCount++;
          }
        }

        toast({
          title: "Bulk Payroll Generated",
          description: `Successfully generated: ${successCount}, Failed: ${errorCount}`
        });
        fetchPayrolls();
        closeModal();
      } else {
        // Single employee payroll
        const response = await fetch(`${API_BASE}/hr/employees/${payrollForm.employeeId}/payrolls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: payrollForm.payPeriodStart,
            endDate: payrollForm.payPeriodEnd,
            allowances: parseFloat(payrollForm.allowances),
            totalWorkingDays: attendanceData.totalWorkingDays,
            attendedDays: attendanceData.attendedDays,
            salaryType: payrollForm.salaryType,
            totalHours: attendanceData.totalHours
          })
        });

        if (!response.ok) throw new Error('Failed to generate payroll');

        toast({ title: "Success", description: "Payroll generated successfully" });
        fetchPayrolls();
        closeModal();
      }
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleProcessPayroll = async (payrollId) => {
    try {
      const response = await fetch(`${API_BASE}/hr/payrolls/${payrollId}/process`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to process payroll');

      toast({ title: "Success", description: "Payroll marked as processed" });
      fetchPayrolls();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadPayslip = async (payrollId) => {
    try {
      const response = await fetch(`${API_BASE}/hr/payrolls/${payrollId}/payslip`, {
        method: 'GET'
      });

      if (!response.ok) throw new Error('Failed to download payslip');

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `payslip_${payrollId}.html`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Get the HTML content as text
      const htmlContent = await response.text();

      // Create a blob from the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' });

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Payslip downloaded successfully. Open the HTML file in your browser and use Ctrl+P to print/save as PDF."
      });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeletePayroll = async (payrollId) => {
    if (!window.confirm('Are you sure you want to delete this payroll? This action cannot be undone.')) return;

    try {
      const response = await fetch(`${API_BASE}/hr/payrolls/${payrollId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete payroll');

      toast({ title: "Success", description: "Payroll deleted successfully" });
      fetchPayrolls();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEditPayroll = (payroll) => {
    const employee = employees.find(e => e.id === payroll.employeeId);
    setSelectedPayroll(payroll);
  setPayrollForm({
    employeeId: payroll.employeeId,
    payPeriodStart: payroll.payPeriodStart,
    payPeriodEnd: payroll.payPeriodEnd,
    basicSalary: payroll.monthlySalary || '',
    salaryType: employee?.salaryType || 'monthly',
    allowances: payroll.allowances || '0',
    deductions: payroll.deductions || ''
  });
    fetchAttendanceForPayroll(payroll.employeeId, payroll.payPeriodStart, payroll.payPeriodEnd);
    setModalType('editPayroll');
    setShowModal(true);
  };

  const handleUpdatePayroll = async () => {
    if (!payrollForm.allowances || parseFloat(payrollForm.allowances) < 0) {
      toast({ title: "Error", description: "Please enter a valid allowances amount", variant: "destructive" });
      return;
    }

    const payrollId = selectedPayroll.id;

    try {
      const response = await fetch(`${API_BASE}/hr/payrolls/${payrollId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: payrollForm.payPeriodStart,
          endDate: payrollForm.payPeriodEnd,
          allowances: parseFloat(payrollForm.allowances),
          totalWorkingDays: attendanceData.totalWorkingDays,
          attendedDays: attendanceData.attendedDays,
          salaryType: payrollForm.salaryType,
          totalHours: attendanceData.totalHours
        })
      });

      if (!response.ok) throw new Error('Failed to update payroll');

      toast({ title: "Success", description: "Payroll updated successfully" });
      closeModal();
      fetchPayrolls();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleExportPayrollReport = async () => {
    try {
      const response = await fetch(`${API_BASE}/hr/payrolls/export`, {
        method: 'GET'
      });

      if (!response.ok) throw new Error('Failed to export payroll report');

      // Get the Excel file as blob
      const blob = await response.blob();

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payroll_report.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Payroll report exported successfully."
      });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };



  const openPayrollDetailsModal = (payroll) => {
    setSelectedPayroll(payroll);
    setModalType('viewPayroll');
    setShowModal(true);
  };

  const openGeneratePayrollModal = () => {
    setModalType('generatePayroll');
    setGeneratePayrollMode('single');
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setPayrollForm({
      employeeId: '',
      payPeriodStart: firstDay.toISOString().split('T')[0],
      payPeriodEnd: lastDay.toISOString().split('T')[0],
      basicSalary: '',
      salaryType: 'monthly',
      allowances: '0',
      deductions: ''
    });
    setShowModal(true);
  };

  // Attendance Management Functions
  const handleMarkAttendance = async () => {
    try {
      if (!attendanceForm.employeeId) {
        toast({ title: "Error", description: "Please select an employee", variant: "destructive" });
        return;
      }

      if (!attendanceForm.date) {
        toast({ title: "Error", description: "Please select a date", variant: "destructive" });
        return;
      }

      const response = await fetch(`${API_BASE}/hr/employees/${attendanceForm.employeeId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: attendanceForm.date,
          checkInTime: attendanceForm.checkInTime || null,
          checkOutTime: attendanceForm.checkOutTime || null,
          status: attendanceForm.status,
          notes: attendanceForm.notes || ''
        })
      });

      if (!response.ok) throw new Error('Failed to mark attendance');
      
      toast({ title: "Success", description: "Attendance marked successfully" });
      closeModal();
      fetchAttendanceData();
      setAttendanceForm({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        checkInTime: '',
        checkOutTime: '',
        status: 'present',
        notes: ''
      });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkAttendance = async (status) => {
    try {
      const activeEmployees = employees.filter(emp => emp.status === 'active');
      const today = new Date().toISOString().split('T')[0];
      let successCount = 0;
      let errorCount = 0;

      for (const employee of activeEmployees) {
        try {
          const response = await fetch(`${API_BASE}/hr/employees/${employee.id}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: today,
              status: status,
              notes: `Bulk marked as ${status}`
            })
          });
          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      toast({
        title: "Bulk Attendance Marked",
        description: `Successfully marked: ${successCount}, Failed: ${errorCount}`
      });
      fetchAttendanceData();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Leave Request Functions
  const handleSubmitLeaveRequest = async () => {
    try {
      if (!leaveForm.employeeId || !leaveForm.leaveType || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
        toast({ title: "Missing Information", description: "All fields are required.", variant: "destructive" });
        return;
      }

      const response = await fetch(`${API_BASE}/hr/employees/${leaveForm.employeeId}/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveType: leaveForm.leaveType,
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          reason: leaveForm.reason
        })
      });

      if (!response.ok) throw new Error('Failed to submit leave request');

      toast({ title: "Success", description: "Leave request submitted successfully" });
      closeModal();
      fetchAttendanceData(); // Refresh leave requests
      setLeaveForm({ employeeId: '', leaveType: '', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleApproveLeaveRequest = async (leaveId, approved) => {
    try {
      const response = await fetch(`${API_BASE}/hr/leaves/${leaveId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: approved,
          approverId: user?.id || 1 // Assuming user ID, adjust as needed
        })
      });

      if (!response.ok) throw new Error('Failed to process leave request');

      toast({
        title: "Success",
        description: `Leave request ${approved ? 'approved' : 'rejected'} successfully`
      });
      fetchAttendanceData(); // Refresh leave requests
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openMarkAttendanceModal = () => {
    setModalType('markAttendance');
    setAttendanceForm({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      checkInTime: '',
      checkOutTime: '',
      status: 'present',
      notes: ''
    });
    setShowModal(true);
  };

  // Recruitment Functions
  const handleSubmitApplication = async () => {
    if (!applicationForm.jobPostingId || !applicationForm.candidateName || !applicationForm.email || !applicationForm.phone) {
        toast({ title: "Missing Information", description: "Job posting, name, email, and phone are required.", variant: "destructive" });
        return;
      }

    try {
      const payload = {
        jobPostingId: applicationForm.jobPostingId,
          candidateName: applicationForm.candidateName,
          email: applicationForm.email,
          phone: applicationForm.phone,
          experience: applicationForm.experience,
          currentCompany: applicationForm.currentCompany,
          currentPosition: applicationForm.currentPosition,
          expectedSalary: applicationForm.expectedSalary,
          noticePeriod: applicationForm.noticePeriod,
          resumeUrl: applicationForm.resumeUrl,
          coverLetter: applicationForm.coverLetter,
          skills: applicationForm.skills,
          status: 'pending'
      };
      
      const response = await fetch(`${API_BASE}/hr/job-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to submit application');

      toast({ title: "Success", description: "Application submitted successfully" });
      closeModal();
      fetchJobApplications();
      setApplicationForm({
        jobPostingId: '',
        candidateName: '',
        email: '',
        phone: '',
        experience: '',
        currentCompany: '',
        currentPosition: '',
        expectedSalary: '',
        noticePeriod: '',
        resumeUrl: '',
        coverLetter: '',
        skills: ''
      });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleScreenApplication = async (applicationId, status, reviewerNotes = '') => {
    try {
      const response = await fetch(`${API_BASE}/hr/job-applications/${applicationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: status, // 'screening_passed', 'screening_failed', 'shortlisted', 'rejected'
          reviewerId: user?.id || 1,
          reviewerNotes: reviewerNotes
        })
      });

      if (!response.ok) throw new Error('Failed to update application status');

      toast({
        title: "Success",
        description: `Application ${status === 'screening_passed' ? 'passed screening' : status === 'screening_failed' ? 'failed screening' : 'updated'} successfully`
      });
      fetchJobApplications();
      closeModal();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleScheduleInterview = async () => {
    try {
      if (!interviewForm.applicationId || !interviewForm.interviewerId || !interviewForm.scheduledDate || !interviewForm.scheduledTime || !interviewForm.interviewType) {
        toast({ title: "Missing Information", description: "Application, interviewer, date, time, and interview type are required.", variant: "destructive" });
        return;
      }

      const response = await fetch(`${API_BASE}/hr/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: Number(interviewForm.applicationId),
          interviewerId: Number(interviewForm.interviewerId),
          scheduledDate: interviewForm.scheduledDate,
          scheduledTime: interviewForm.scheduledTime,
          interviewType: interviewForm.interviewType,
          interviewers: interviewForm.interviewers,
          location: interviewForm.location,
          notes: interviewForm.notes,
          scheduledBy: user?.id || 1
        })
      });

      if (!response.ok) throw new Error('Failed to schedule interview');

      toast({ title: "Success", description: "Interview scheduled successfully" });
      closeModal();
      fetchInterviews();
      fetchJobApplications(); // Refresh to update application status
      setInterviewForm({
        applicationId: '',
        candidateName: '',
        jobTitle: '',
        scheduledDate: '',
        scheduledTime: '',
        interviewType: '',
        interviewers: '',
        interviewerId: '',
        location: '',
        notes: ''
      });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateInterviewResult = async (interviewId, status, feedback, rating, decision) => {
    try {
      const response = await fetch(`${API_BASE}/hr/interviews/${interviewId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          feedback,
          rating,
          decision,
          interviewerId: Number(interviewForm.interviewerId || user?.id || 1)
        })
      });

      if (!response.ok) throw new Error('Failed to update interview result');

      toast({
        title: "Success",
        description: `Interview result updated successfully`
      });
      fetchInterviews();
      fetchJobApplications(); // Refresh to update application status
      closeModal();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSetJoiningDetails = async (applicationId, joiningDate, documents) => {
    try {
      const response = await fetch(`${API_BASE}/hr/job-applications/${applicationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'hired',
          joiningDate: joiningDate,
          documentsSubmitted: documents,
          reviewerId: user?.id || 1
        })
      });

      if (!response.ok) throw new Error('Failed to set joining details');

      toast({
        title: "Success",
        description: "Joining details set successfully"
      });
      fetchJobApplications();
      closeModal();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Fetch data based on active tab
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      switch (activeTab) {
        case 'dashboard':
          await fetchDashboardData();
          break;
        case 'employees':
          await fetchEmployees();
          break;
        case 'attendance':
          await fetchAttendanceData();
          break;
        case 'payroll':
          await fetchEmployees(); // Fetch employees for dropdown
          await fetchPayrolls();
          break;
        case 'recruitment':
          await fetchJobPostings();
          await fetchJobApplications();
          await fetchInterviews();
          await fetchCandidates();
          break;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    const response = await fetch(`${API_BASE}/hr/dashboard`);
    if (!response.ok) throw new Error('Failed to fetch dashboard data');
    const data = await response.json();
    setDashboardData(data);
    // Also fetch employees for department distribution
    await fetchEmployees();
  };

  const fetchEmployees = async () => {
    const response = await fetch(`${API_BASE}/hr/employees`);
    if (!response.ok) throw new Error('Failed to fetch employees');
    const data = await response.json();
    const normalizedEmployees = data.map((employee) => normalizeEmployee(employee));
    setEmployees(normalizedEmployees);
  };

  const fetchAttendanceData = async () => {
    const [attendanceRes, leavesRes, employeesRes] = await Promise.all([
      fetch(`${API_BASE}/hr/attendance`),
      fetch(`${API_BASE}/hr/leaves`),
      fetch(`${API_BASE}/hr/employees`)
    ]);

    if (!attendanceRes.ok || !leavesRes.ok || !employeesRes.ok) throw new Error('Failed to fetch attendance data');
    const attendanceData = await attendanceRes.json();
    const leavesData = await leavesRes.json();
    const employeesData = await employeesRes.json();
    setAttendanceRecords(attendanceData);
    setLeaveRequests(leavesData);
    setEmployees(employeesData.map((employee) => normalizeEmployee(employee)));

    // Fetch leave balances for all employees
    const leaveBalancesPromises = employeesData.map(emp => fetch(`${API_BASE}/hr/employees/${emp.id}/leave-balance`));
    const leaveBalancesRes = await Promise.all(leaveBalancesPromises);
    const leaveBalancesData = await Promise.all(leaveBalancesRes.map(res => res.ok ? res.json() : Promise.resolve(null)));
    setLeaveBalances(leaveBalancesData.filter(balance => balance !== null));
  };

  const fetchPayrolls = async () => {
    const response = await fetch(`${API_BASE}/hr/payrolls`);
    if (!response.ok) throw new Error('Failed to fetch payrolls');
    const data = await response.json();
    setPayrolls(data);
  };

  const fetchJobPostings = async () => {
    const response = await fetch(`${API_BASE}/hr/job-postings`);
    if (!response.ok) throw new Error('Failed to fetch job postings');
    const data = await response.json();
    setJobPostings(data);
  };

  const fetchJobApplications = async () => {
    const response = await fetch(`${API_BASE}/hr/job-applications`);
    if (!response.ok) throw new Error('Failed to fetch job applications');
    const data = await response.json();
    setJobApplications(data);
  };

  const fetchInterviews = async () => {
    const response = await fetch(`${API_BASE}/hr/interviews`);
    if (!response.ok) throw new Error('Failed to fetch interviews');
    const data = await response.json();
    setInterviews(data);
  };

  const fetchCandidates = async () => {
    const response = await fetch(`${API_BASE}/hr/candidates`);
    if (!response.ok) throw new Error('Failed to fetch candidates');
    const data = await response.json();
    setCandidates(data);
  };



  const fetchAttendanceForPayroll = async (employeeId, startDate, endDate) => {
    if (!employeeId || !startDate || !endDate) return;

    setAttendanceData(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch(`${API_BASE}/hr/employees/${employeeId}/attendance?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Failed to fetch attendance data');

      const attendanceRecords = await response.json();
      
      // Debug logging
      console.log('Attendance Records:', attendanceRecords);
      console.log('Hours worked per record:', attendanceRecords.map(r => ({ date: r.date, hoursWorked: r.hoursWorked })));

      // Convert employeeId to number for comparison since it might be a string from the form
      const employee = employees.find(e => e.id === parseInt(employeeId));
      const salaryType = employee?.salaryType || 'monthly';
      
      console.log('Employee found:', employee);
      console.log('Employee salary type:', salaryType);

      if (salaryType === 'hourly') {
        const totalHours = attendanceRecords.reduce((sum, r) => {
          console.log(`Adding hours: ${r.hoursWorked || 0} from date ${r.date}`);
          return sum + (r.hoursWorked || 0);
        }, 0);
        console.log('Total hours calculated:', totalHours);
        setAttendanceData({
          totalWorkingDays: 0,
          attendedDays: 0,
          absentDays: 0,
          totalHours,
          loading: false
        });
      } else {
        // Calculate working days (excluding Sundays)
        const start = new Date(startDate);
        const end = new Date(endDate);
        let totalWorkingDays = 0;
        let attendedDays = 0;

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const dayOfWeek = date.getDay();
          if (dayOfWeek !== 0) { // 0 = Sunday
            totalWorkingDays++;
            const record = attendanceRecords.find(r => r.date === date.toISOString().split('T')[0]);
            if (record && (record.status === 'present' || record.status === 'half_day')) {
              attendedDays += record.status === 'half_day' ? 0.5 : 1;
            }
          }
        }

        const absentDays = totalWorkingDays - attendedDays;

        setAttendanceData({
          totalWorkingDays,
          attendedDays,
          absentDays,
          totalHours: 0,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error fetching attendance for payroll:', error);
      setAttendanceData(prev => ({ ...prev, loading: false }));
      toast({ title: "Error", description: "Failed to fetch attendance data", variant: "destructive" });
    }
  };

  const EmployeesView = () => {
    return (
      <div className="space-y-6">
      <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
      <button
        onClick={() => openModal('addEmployee')}
        className="bg-blue-100 text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-200"
      >
          <Plus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-black font-semibold">Employees</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">All Departments</option>
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>
        </div>


        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                const filteredEmployees = employees.filter(emp => {
                  const name = emp.fullName || `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
                  return (
                    name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase())
                  );
                });
                return filteredEmployees.length > 0 ? filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.employeeId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.fullName || `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.designation}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{employee.salaryType || 'monthly'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            openModal('viewEmployee', employee);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Employee"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            openModal('editEmployee', employee);
                          }}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this employee?')) {
                              try {
                                const response = await fetch(`${API_BASE}/hr/employees/${employee.id}`, {
                                  method: 'DELETE'
                                });
                                if (!response.ok) throw new Error('Failed to delete employee');
                                toast({ title: 'Success', description: 'Employee deleted successfully' });
                                fetchEmployees();
                              } catch (err) {
                                toast({ title: 'Error', description: err.message, variant: 'destructive' });
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                      {searchQuery ? 'No employees matching the search' : 'No employees available'}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ employees = [] }) => {  // âœ… Accept employees as prop (default to empty array)
  const departmentCounts = useMemo(() => {
    const counts = {};
    employees.forEach(emp => {
      if (emp.department) {
        counts[emp.department] = (counts[emp.department] || 0) + 1;
      }
    });
    return counts;
  }, [employees]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">HR Dashboard</h2>
        <button className="bg-blue-100 text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-200">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Payroll</p>
              <p className="text-2xl font-bold text-gray-900">â‚¹0</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <UserPlus className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Hires</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>  

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-black font-semibold mb-4">Department Distribution</h3>
          <div className="space-y-3">
            {Object.entries(departmentCounts).map(([dept, count]) => (
              <div key={dept} className="flex justify-between">
                <span className="text-gray-600">{dept}</span>
                <span className="text-gray-600 font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-black font-semibold mb-4">Recent Activities</h3>
          {/* <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">New employee onboarded</p>
                <p className="text-xs text-gray-500">John Doe joined IT department</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Payroll processed</p>
                <p className="text-xs text-gray-500">March 2024 payroll completed</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">Leave request approved</p>
                <p className="text-xs text-gray-500">John Doe - 5 days annual leave</p>
              </div>
            </div> 
          </div> */}
        </div>
      </div>
    </div> 
  );
};

  const AttendanceView = () => {
    // Calculate attendance summary from records
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(record => record.date === today);
    const presentCount = todayRecords.filter(r => r.status === 'present').length;
    const absentCount = todayRecords.filter(r => r.status === 'absent').length;
    const lateCount = todayRecords.filter(r => r.status === 'late').length;
    const halfDayCount = todayRecords.filter(r => r.status === 'half_day').length;

    // Calculate leave summary
    const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;
    const approvedLeaves = leaveRequests.filter(l => l.status === 'approved').length;
    const rejectedLeaves = leaveRequests.filter(l => l.status === 'rejected').length;

    return (
      <div className="space-y-6">
      <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-gray-900">Attendance & Leave Management</h2>
      <div className="flex gap-2">
        <button
          onClick={openMarkAttendanceModal}
          className="bg-green-100 text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-200"
        >
          <Clock className="h-4 w-4" />
          Mark Attendance
        </button>
        <button
          onClick={() => openModal('leaveRequest')}
          className="bg-blue-100 text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-200"
        >
          <Plus className="h-4 w-4" />
          New Leave Request
        </button>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-black font-semibold mb-4">Today's Attendance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Present:</span>
              <span className="font-medium text-green-600">{presentCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Absent:</span>
              <span className="font-medium text-red-600">{absentCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Late:</span>
              <span className="font-medium text-yellow-600">{lateCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Half Day:</span>
              <span className="font-medium text-orange-600">{halfDayCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-black font-semibold mb-4">Leave Requests</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Pending:</span>
              <span className="font-medium text-yellow-600">{pendingLeaves}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Approved:</span>
              <span className="font-medium text-green-600">{approvedLeaves}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rejected:</span>
              <span className="font-medium text-red-600">{rejectedLeaves}</span>
            </div>
          </div>
        </div>

        {/* <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-black font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleBulkAttendance('present')}
              className="w-full text-left px-3 py-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
            >
              Mark All Present
            </button>
            <button
              onClick={() => handleBulkAttendance('absent')}
              className="w-full text-left px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
            >
              Mark All Absent
            </button>
          </div>
        </div> */}

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-black font-semibold mb-4">Total Records</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Attendance:</span>
              <span className="font-medium text-green-600">{attendanceRecords.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Employees:</span>
              <span className="font-medium text-green-600">{employees.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active:</span>
              <span className="font-medium text-green-600">{employees.filter(e => e.status === 'active').length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-black font-semibold">Recent Leave Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveRequests.length > 0 ? leaveRequests.map((leave) => {
                return (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{leave.employeeName || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.leaveType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1} days</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                        leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {leave.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveLeaveRequest(leave.id, true)}
                          className="text-green-600 hover:text-green-900"
                          title="Approve Leave"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleApproveLeaveRequest(leave.id, false)}
                          className="text-red-600 hover:text-red-900"
                          title="Reject Leave"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No leave requests available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-black font-semibold">Employee Leave Balances</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Casual Leave</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sick Leave</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earned Leave</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Used</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveBalances.length > 0 ? leaveBalances.map((balance) => {
                const employee = employees.find(e => e.id === balance.employeeId);
                return (
                  <tr key={balance.employeeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee ? employee.name || `${employee.firstName} ${employee.lastName}` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {balance.casualLeave?.used || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {balance.sickLeave?.used || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {balance.earnedLeave?.used || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(balance.casualLeave?.used || 0) + (balance.sickLeave?.used || 0) + (balance.earnedLeave?.used || 0)}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No leave balance data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

  const PayrollView = () => {
    const totalSalary = payrolls.reduce((sum, p) => sum + (p.monthlySalary || 0), 0);
    const totalDeductions = payrolls.reduce((sum, p) => sum + (p.deductions || 0), 0);
    const totalNetSalary = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const processedCount = payrolls.filter(p => p.status === 'processed' || p.status === 'paid').length;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Payroll Management</h2>
        <div className="flex gap-2">
          <button 
            onClick={openGeneratePayrollModal}
            className="bg-green-100 text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-200"
          >
            <Plus className="h-4 w-4" />
            Generate Payroll
          </button>
          <button
            onClick={handleExportPayrollReport}
            className="bg-blue-100 text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-200"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Monthly Salary</h3>
            <p className="text-2xl font-bold text-gray-900">â‚¹{totalSalary.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Deductions</h3>
            <p className="text-2xl font-bold text-red-600">â‚¹{totalDeductions.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Net Salary</h3>
            <p className="text-2xl font-bold text-green-600">â‚¹{totalNetSalary.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Processed</h3>
            <p className="text-2xl font-bold text-blue-600">{processedCount}/{employees.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-black font-semibold mb-4">Employee Salary Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allowances</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrolls.length > 0 ? payrolls.map((payroll) => {
                  const employee = employees.find(e => e.id === payroll.employeeId);
                  // Format salary display based on salary type
                  const salaryDisplay = payroll.salaryType === 'hourly' 
                    ? (payroll.monthlySalaryDisplay || `${(payroll.monthlySalary || 0).toFixed(0)}/hr`)
                    : `â‚¹${(payroll.monthlySalary || 0).toLocaleString()}`;
                  
                  return (
                    <tr key={payroll.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payroll.employeeName || (employee ? employee.name : 'Unknown')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payroll.payPeriodStart && payroll.payPeriodEnd 
                          ? `${new Date(payroll.payPeriodStart).toLocaleDateString()} - ${new Date(payroll.payPeriodEnd).toLocaleDateString()}`
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                          {payroll.salaryType || 'monthly'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{salaryDisplay}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">â‚¹{(payroll.allowances || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">â‚¹{(payroll.deductions || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">â‚¹{(payroll.grossSalary || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">â‚¹{(payroll.netSalary || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payroll.status === 'processed' || payroll.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payroll.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openPayrollDetailsModal(payroll)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {payroll.status === 'pending' && (
                            <button 
                              onClick={() => handleProcessPayroll(payroll.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Mark as Processed"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
    <button
      onClick={() => handleDownloadPayslip(payroll.id)}
      className="text-purple-600 hover:text-purple-900"
      title="Download Payslip"
    >
      <Download className="h-4 w-4" />
    </button>
    {payroll.status === 'pending' && (
    <button
      onClick={() => handleEditPayroll(payroll)}
      className="text-yellow-600 hover:text-yellow-900"
      title="Edit Payroll"
    >
      <Edit className="h-4 w-4" />
    </button>
    )}
    <button
      onClick={() => handleDeletePayroll(payroll.id)}
      className="text-red-600 hover:text-red-900"
      title="Delete Payroll"
    >
      <X className="h-4 w-4" />
    </button>
                        </div>
                    </td>
                  </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="10" className="px-6 py-4 text-center text-gray-500">No payroll data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const RecruitmentView = () => {
    const jobOpenings = jobPostings.length;
    const totalApplications = jobApplications.length;
    const totalInterviews = interviews.length;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Recruitment Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setModalType('addApplication');
              setApplicationForm({
                jobPostingId: '',
                candidateName: '',
                email: '',
                phone: '',
                experience: '',
                currentCompany: '',
                currentPosition: '',
                expectedSalary: '',
                noticePeriod: '',
                resumeUrl: '',
                coverLetter: '',
                skills: ''
              });
              setShowModal(true);
            }}
            className="bg-green-100 text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-200"
          >
            <UserPlus className="h-4 w-4" />
            Add Application
          </button>
          <button
            onClick={() => openModal('jobPosting')}
            className="bg-blue-100 text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-200"
          >
            <Plus className="h-4 w-4" />
            New Job Posting
          </button>
        </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-black font-semibold mb-4">Job Openings</h3>
            <p className="text-3xl font-bold text-blue-600">{jobOpenings}</p>
            <p className="text-sm text-gray-600 mt-2">Active positions</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-black font-semibold mb-4">Applications</h3>
            <p className="text-3xl font-bold text-green-600">{totalApplications}</p>
            <p className="text-sm text-gray-600 mt-2">Total received</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-black font-semibold mb-4">Interviews</h3>
            <p className="text-3xl font-bold text-yellow-600">{totalInterviews}</p>
            <p className="text-sm text-gray-600 mt-2">Scheduled</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Active Job Postings</h3>
          </div>
          <div className="p-6 space-y-4">
            {jobPostings.length > 0 ? jobPostings.map((job) => (
              <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{job.title}</h4>
                    <p className="text-gray-600">Department: {job.department}</p>
                    <p className="text-sm text-gray-500 mt-1">Posted: {new Date(job.postedDate).toLocaleDateString()} â€¢ Applications: {job.applications || 0}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedEmployee(job);
                        openModal('viewJobPosting', job);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Job Posting"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEmployee(job);
                        openModal('editJobPosting', job);
                      }}
                      className="text-yellow-600 hover:text-yellow-900"
                      title="Edit Job Posting"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-center">No active job postings</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Applications Management</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobApplications.length > 0 ? jobApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.candidateName || app.applicantName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.jobTitle}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(app.appliedDate || app.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        app.status === 'screening_passed' ? 'bg-blue-100 text-blue-800' :
                        app.status === 'screening_failed' ? 'bg-red-100 text-red-800' :
                        app.status === 'interview_scheduled' ? 'bg-purple-100 text-purple-800' :
                        app.status === 'selected' ? 'bg-green-100 text-green-800' :
                        app.status === 'hired' ? 'bg-green-200 text-green-900' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {app.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedApplication(app);
                            setModalType('viewApplication');
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {app.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => {
                                setSelectedApplication(app);
                                setModalType('screenApplication');
                                setShowModal(true);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="Screen Application"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleScreenApplication(app.id, 'screening_failed', 'Did not meet requirements')}
                              className="text-red-600 hover:text-red-900"
                              title="Reject Application"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {app.status === 'screening_passed' && (
                          <button 
                            onClick={() => {
                              setSelectedApplication(app);
                              setInterviewForm({
                                applicationId: app.id,
                                candidateName: app.candidateName || app.applicantName,
                                jobTitle: app.jobTitle,
                                scheduledDate: '',
                                scheduledTime: '',
                                interviewType: '',
                                interviewers: '',
                                interviewerId: '',
                                location: '',
                                notes: ''
                              });
                              setModalType('scheduleInterview');
                              setShowModal(true);
                            }}
                            className="text-purple-600 hover:text-purple-900"
                            title="Schedule Interview"
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </button>
                        )}
                        {app.status === 'selected' && (
                          <button 
                            onClick={() => {
                              setSelectedApplication(app);
                              setModalType('setJoining');
                              setShowModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Set Joining Details"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No applications available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Interview Management</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interview Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {interviews.length > 0 ? interviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{interview.candidateName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{interview.jobTitle}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(interview.scheduledDate).toLocaleDateString()}
                      {interview.scheduledTime && ` ${interview.scheduledTime}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{interview.interviewType || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        interview.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        interview.status === 'completed' ? 'bg-green-100 text-green-800' :
                        interview.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {interview.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedInterview(interview);
                            setModalType('viewInterview');
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {interview.status === 'scheduled' && (
                          <button 
                            onClick={() => {
                              setSelectedInterview(interview);
                              setModalType('updateInterviewResult');
                              setShowModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Update Interview Result"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No interviews scheduled</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView employees={employees} />;
      case 'employees':
        return <EmployeesView />;
      case 'attendance':
        return <AttendanceView />;
      case 'payroll':
        return <PayrollView />;
      case 'recruitment':
        return <RecruitmentView />;
      default:
        return <DashboardView employees={employees} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
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
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Human Resource Management System</h1>
                  <p className="text-gray-600 text-sm sm:text-base font-medium">Complete employee lifecycle management</p>
                </div>
              </div>
            </div>
            {/* Right: User Panel */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-gray-600 text-xs font-medium">HR Team</p>
                  <p className="text-blue-600 text-xs font-medium">Employees Management</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer Section */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Empty spacer to match other departments */}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="overflow-x-auto">
        <TabsList className="flex md:grid md:grid-cols-5 w-full overflow-x-auto overflow-y-hidden md:overflow-x-hidden whitespace-nowrap bg-gray-100 border border-gray-300 pl-0">
          <TabsTrigger value="dashboard" className="text-gray-800">Dashboard</TabsTrigger>
          <TabsTrigger value="employees" className="text-gray-800">Employees</TabsTrigger>
          <TabsTrigger value="attendance" className="text-gray-800">Attendance & Leave</TabsTrigger>
          <TabsTrigger value="payroll" className="text-gray-800">Payroll</TabsTrigger>
          <TabsTrigger value="recruitment" className="text-gray-800">Recruitment</TabsTrigger>
        </TabsList>

        {/* Main Content */}
        <div className="p-6">
          {renderActiveView()}
        </div>
      </Tabs>

      {/* Modal */}
      {showModal && (
        <Dialog open={showModal} onOpenChange={closeModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-white border-gray-200 text-gray-900">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-gray-900">
                {modalType === 'addEmployee' && 'Add New Employee'}
                {modalType === 'editEmployee' && 'Edit Employee'}
                {modalType === 'viewEmployee' && 'Employee Details'}
                {modalType === 'markAttendance' && 'Mark Attendance'}
                {modalType === 'leaveRequest' && 'Request Leave'}
                {modalType === 'viewJobPosting' && 'Job Posting Details'}
                {modalType === 'editJobPosting' && 'Edit Job Posting'}
                {modalType === 'generatePayroll' && 'Generate Payroll'}
                {modalType === 'viewPayroll' && 'Payroll Details'}
                {modalType === 'addApplication' && 'Submit Job Application'}
                {modalType === 'viewApplication' && 'Application Details'}
                {modalType === 'screenApplication' && 'Screen Application'}
                {modalType === 'scheduleInterview' && (selectedApplication ? `Schedule Interview â€“ ${selectedApplication.candidateName || selectedApplication.applicantName}` : 'Schedule Interview')}
                {modalType === 'viewInterview' && 'Interview Details'}
                {modalType === 'updateInterviewResult' && (selectedInterview ? `Update Interview Result â€“ ${selectedInterview.candidateName}` : 'Update Interview Result')}
                {modalType === 'setJoining' && 'Set Joining Details'}
              </DialogTitle>
            </DialogHeader>
            
            {/* Scrollable Content Area */}
            <div className="overflow-y-auto flex-1 px-4 py-2">

            {modalType === 'viewEmployee' && selectedEmployee && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Employee ID</Label>
                    <p className="text-sm text-gray-600">{modalFormData.employeeId || 'â€”'}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <p className="text-sm text-gray-600 capitalize">{modalFormData.status || 'active'}</p>
                  </div>
                  <div>
                    <Label>Name</Label>
                    <p className="text-sm text-gray-600">{`${modalFormData.firstName ?? ''} ${modalFormData.lastName ?? ''}`.trim() || 'â€”'}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm text-gray-600">{modalFormData.email || 'â€”'}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm text-gray-600">{modalFormData.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <p className="text-sm text-gray-600">{modalFormData.department || 'â€”'}</p>
                  </div>
                  <div>
                    <Label>Designation</Label>
                    <p className="text-sm text-gray-600">{modalFormData.designation || 'â€”'}</p>
                  </div>
                  <div>
                    <Label>Joining Date</Label>
                    <p className="text-sm text-gray-600">{modalFormData.joiningDate || 'â€”'}</p>
                  </div>
                  <div>
                    <Label>Salary</Label>
                    <p className="text-sm text-gray-600">
                      {modalFormData.salary !== undefined && modalFormData.salary !== ''
                        ? `â‚¹${Number(modalFormData.salary).toLocaleString()}`
                        : 'â€”'}
                    </p>
                  </div>
                  <div>
                    <Label>Salary Type</Label>
                    <p className="text-sm text-gray-600 capitalize">{modalFormData.salaryType || 'monthly'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{modalFormData.address || 'â€”'}</p>
                  </div>
                </div>
              </div>
            )}

            {(modalType === 'addEmployee' || modalType === 'editEmployee') && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={modalFormData.firstName || ''}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setModalFormData({...modalFormData, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={modalFormData.lastName || ''}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setModalFormData({...modalFormData, lastName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={modalFormData.email || ''}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setModalFormData({...modalFormData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={modalFormData.phone || ''}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setModalFormData({...modalFormData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select value={modalFormData.department || ''} onValueChange={(value) => setModalFormData({...modalFormData, department: value})}>
                      <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={modalFormData.designation || ''}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setModalFormData({...modalFormData, designation: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="joiningDate">Joining Date</Label>
                    <Input
                      id="joiningDate"
                      type="date"
                      value={modalFormData.joiningDate || ''}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setModalFormData({...modalFormData, joiningDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary">Salary</Label>
                    <Input
                      id="salary"
                      type="number"
                      value={modalFormData.salary || ''}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setModalFormData({...modalFormData, salary: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="salaryType">Salary Type</Label>
                    <Select value={modalFormData.salaryType || 'monthly'} onValueChange={(value) => setModalFormData({...modalFormData, salaryType: value})}>
                      <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                        <SelectValue placeholder="Select salary type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={modalFormData.status || 'active'} onValueChange={(value) => setModalFormData({...modalFormData, status: value})}>
                      <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={modalFormData.dateOfBirth || ''}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setModalFormData({...modalFormData, dateOfBirth: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={modalFormData.gender || ''} onValueChange={(value) => setModalFormData({...modalFormData, gender: value})}>
                      <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non_binary">Non-binary</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="managerId">Manager</Label>
                    <Select value={modalFormData.managerId || ''} onValueChange={(value) => setModalFormData({...modalFormData, managerId: value === '' ? null : value})}>
                      <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Manager</SelectItem>
                        {employees
                          .filter((emp) => emp.id !== selectedEmployee?.id)
                          .map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.fullName || emp.name || `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={modalFormData.address || ''}
                    className="bg-white text-gray-900 border-gray-300"
                    onChange={(e) => setModalFormData({...modalFormData, address: e.target.value})}
                  />
                </div>
              </div>
            )}

            {/* Leave Request Modal */}
            {modalType === 'leaveRequest' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="leaveEmployee">Select Employee *</Label>
                  <Select 
                    value={leaveForm.employeeId} 
                    onValueChange={(value) => setLeaveForm({...leaveForm, employeeId: value})}
                  >
                    <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                      <SelectValue placeholder="Choose an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(emp => emp.status === 'active').map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name || `${emp.firstName} ${emp.lastName}`} - {emp.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="leaveType">Leave Type *</Label>
                  <Select 
                    value={leaveForm.leaveType} 
                    onValueChange={(value) => setLeaveForm({...leaveForm, leaveType: value})}
                  >
                    <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASUAL">Casual Leave</SelectItem>
                      <SelectItem value="SICK">Sick Leave</SelectItem>
                      <SelectItem value="EARNED">Earned Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={leaveForm.startDate}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={leaveForm.endDate}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reason">Reason *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter the reason for leave..."
                    value={leaveForm.reason}
                    className="bg-white text-gray-900 border-gray-300"
                    onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    <strong>Note:</strong> Leave requests will be reviewed and approved by HR. 
                    Please ensure the dates are accurate and provide a valid reason.
                  </p>
                </div>
              </div>
            )}

            {/* Mark Attendance Modal */}
            {modalType === 'markAttendance' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="attendanceEmployee">Select Employee *</Label>
                  <Select 
                    value={attendanceForm.employeeId} 
                    onValueChange={(value) => setAttendanceForm({...attendanceForm, employeeId: value})}
                  >
                    <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                      <SelectValue placeholder="Choose an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(emp => emp.status === 'active').map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name || `${emp.firstName} ${emp.lastName}`} - {emp.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="attendanceDate">Date *</Label>
                  <Input
                    id="attendanceDate"
                    type="date"
                    value={attendanceForm.date}
                    className="bg-white text-gray-900 border-gray-300"
                    onChange={(e) => setAttendanceForm({...attendanceForm, date: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="attendanceStatus">Status *</Label>
                  <Select 
                    value={attendanceForm.status} 
                    onValueChange={(value) => setAttendanceForm({...attendanceForm, status: value})}
                  >
                    <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="half_day">Half Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkInTime">Check In Time</Label>
                    <Input
                      id="checkInTime"
                      type="time"
                      value={attendanceForm.checkInTime}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setAttendanceForm({...attendanceForm, checkInTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkOutTime">Check Out Time</Label>
                    <Input
                      id="checkOutTime"
                      type="time"
                      value={attendanceForm.checkOutTime}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setAttendanceForm({...attendanceForm, checkOutTime: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="attendanceNotes">Notes (Optional)</Label>
                  <Textarea
                    id="attendanceNotes"
                    placeholder="Add any notes about this attendance record..."
                    value={attendanceForm.notes}
                    className="bg-white text-gray-900 border-gray-300"
                    onChange={(e) => setAttendanceForm({...attendanceForm, notes: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    <strong>Note:</strong> Attendance records are used for payroll calculation. 
                    Present/Late = 1 day, Half Day = 0.5 days, Absent = 0 days.
                  </p>
                </div>
              </div>
            )}

            {/* Job Posting Modal */}
{modalType === 'jobPosting' && (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="jobTitle">Job Title *</Label>
        <Input
          id="jobTitle"
          value={jobForm.title}
          className="bg-white text-gray-900 border-gray-300"
          onChange={(e) => setJobForm({...jobForm, title: e.target.value})}
          placeholder="e.g., Senior Software Engineer"
        />
      </div>
      <div>
        <Label htmlFor="jobDepartment">Department *</Label>
        <Select value={jobForm.department} onValueChange={(value) => setJobForm({...jobForm, department: value})}>
          <SelectTrigger className="bg-white text-gray-900 border-gray-300">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IT">IT</SelectItem>
            <SelectItem value="HR">HR</SelectItem>
            <SelectItem value="Sales">Sales</SelectItem>
            <SelectItem value="Marketing">Marketing</SelectItem>
            <SelectItem value="Finance">Finance</SelectItem>
            <SelectItem value="Operations">Operations</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="jobLocation">Location</Label>
        <Input
          id="jobLocation"
          value={jobForm.location}
          className="bg-white text-gray-900 border-gray-300"
          onChange={(e) => setJobForm({...jobForm, location: e.target.value})}
          placeholder="e.g., Mumbai, India"
        />
      </div>
      <div>
        <Label htmlFor="employmentType">Employment Type *</Label>
        <Select value={jobForm.employmentType} onValueChange={(value) => setJobForm({...jobForm, employmentType: value})}>
          <SelectTrigger className="bg-white text-gray-900 border-gray-300">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full-time">Full-time</SelectItem>
            <SelectItem value="part-time">Part-time</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="internship">Internship</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="experienceLevel">Experience Level</Label>
        <Select value={jobForm.experienceLevel} onValueChange={(value) => setJobForm({...jobForm, experienceLevel: value})}>
          <SelectTrigger className="bg-white text-gray-900 border-gray-300">
            <SelectValue placeholder="Select level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entry">Entry Level</SelectItem>
            <SelectItem value="mid">Mid Level</SelectItem>
            <SelectItem value="senior">Senior Level</SelectItem>
            <SelectItem value="lead">Lead/Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="salaryRange">Salary Range</Label>
        <Input
          id="salaryRange"
          value={jobForm.salaryRange}
          className="bg-white text-gray-900 border-gray-300"
          onChange={(e) => setJobForm({...jobForm, salaryRange: e.target.value})}
          placeholder="e.g., â‚¹8-12 LPA"
        />
      </div>
    </div>
    <div>
      <Label htmlFor="jobDescription">Job Description *</Label>
      <Textarea
        id="jobDescription"
        value={jobForm.description}
        className="bg-white text-gray-900 border-gray-300"
        onChange={(e) => setJobForm({...jobForm, description: e.target.value})}
        placeholder="Describe the role and responsibilities..."
        rows={4}
      />
    </div>
    <div>
      <Label htmlFor="requirements">Requirements</Label>
      <Textarea
        id="requirements"
        value={jobForm.requirements}
        className="bg-white text-gray-900 border-gray-300"
        onChange={(e) => setJobForm({...jobForm, requirements: e.target.value})}
        placeholder="List the required skills and qualifications..."
        rows={3}
      />
    </div>
    <div>
      <Label htmlFor="responsibilities">Responsibilities</Label>
      <Textarea
        id="responsibilities"
        value={jobForm.responsibilities}
        className="bg-white text-gray-900 border-gray-300"
        onChange={(e) => setJobForm({...jobForm, responsibilities: e.target.value})}
        placeholder="List the key responsibilities..."
        rows={3}
      />
    </div>
    <div>
      <Label htmlFor="applicationUrl">Application URL (Optional)</Label>
      <Input
        id="applicationUrl"
        value={jobForm.applicationUrl}
        className="bg-white text-gray-900 border-gray-300"
        onChange={(e) => setJobForm({...jobForm, applicationUrl: e.target.value})}
        placeholder="https://careers.company.com/apply"
      />
    </div>
  </div>
)}

            {/* Add Application Modal */}
            {modalType === 'addApplication' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="jobPostingId">Job Posting</Label>
                    <Select
                      value={applicationForm.jobPostingId}
                      onValueChange={(value) => {
                        const job = jobPostings.find(j => j.id === parseInt(value));
                        setApplicationForm({
                          ...applicationForm,
                          jobPostingId: value,
                          jobTitle: job?.title || ''
                        });
                      }}
                    >
                      <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                        <SelectValue placeholder="Select job posting" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobPostings.filter(job => job.status === 'open').map(job => (
                          <SelectItem key={job.id} value={job.id.toString()}>
                            {job.title} - {job.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="candidateName">Candidate Name</Label>
                    <Input
                      id="candidateName"
                      value={applicationForm.candidateName}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setApplicationForm({...applicationForm, candidateName: e.target.value})}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={applicationForm.email}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setApplicationForm({...applicationForm, email: e.target.value})}
                      placeholder="candidate@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={applicationForm.phone}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setApplicationForm({...applicationForm, phone: e.target.value})}
                      placeholder="+91 1234567890"
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience">Experience (Years)</Label>
                    <Input
                      id="experience"
                      type="number"
                      value={applicationForm.experience}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setApplicationForm({...applicationForm, experience: e.target.value})}
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentCompany">Current Company</Label>
                    <Input
                      id="currentCompany"
                      value={applicationForm.currentCompany}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setApplicationForm({...applicationForm, currentCompany: e.target.value})}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentPosition">Current Position</Label>
                    <Input
                      id="currentPosition"
                      value={applicationForm.currentPosition}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setApplicationForm({...applicationForm, currentPosition: e.target.value})}
                      placeholder="Current role"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expectedSalary">Expected Salary</Label>
                    <Input
                      id="expectedSalary"
                      type="number"
                      value={applicationForm.expectedSalary}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setApplicationForm({...applicationForm, expectedSalary: e.target.value})}
                      placeholder="500000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="noticePeriod">Notice Period (Days)</Label>
                    <Input
                      id="noticePeriod"
                      type="number"
                      value={applicationForm.noticePeriod}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setApplicationForm({...applicationForm, noticePeriod: e.target.value})}
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="resumeUrl">Resume URL</Label>
                    <Input
                      id="resumeUrl"
                      value={applicationForm.resumeUrl}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setApplicationForm({...applicationForm, resumeUrl: e.target.value})}
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="skills">Skills (comma separated)</Label>
                    <Input
                      id="skills"
                      value={applicationForm.skills}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setApplicationForm({...applicationForm, skills: e.target.value})}
                      placeholder="React, Node.js, Python"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="coverLetter">Cover Letter</Label>
                    <Textarea
                      id="coverLetter"
                      value={applicationForm.coverLetter}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setApplicationForm({...applicationForm, coverLetter: e.target.value})}
                      placeholder="Why are you interested in this position?"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            )}

          {/* View Application Modal */}
            {modalType === 'viewApplication' && selectedApplication && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div> 
                    <Label>Candidate Name</Label>
                    <p className="text-sm text-gray-600">{selectedApplication.candidateName || selectedApplication.applicantName}</p>
                  </div>
                  <div>
                    <Label>Job Title</Label>
                    <p className="text-sm text-gray-600">{selectedApplication.jobTitle}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm text-gray-600">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm text-gray-600">{selectedApplication.phone}</p>
                  </div>
                  <div>
                    <Label>Experience</Label>
                    <p className="text-sm text-gray-600">{selectedApplication.experience} years</p>
                  </div>
                  <div>
                    <Label>Current Company</Label>
                    <p className="text-sm text-gray-600">{selectedApplication.currentCompany || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>Current Position</Label>
                    <p className="text-sm text-gray-600">{selectedApplication.currentPosition || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>Expected Salary</Label>
                    <p className="text-sm text-gray-600">â‚¹{Number(selectedApplication.expectedSalary || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Notice Period</Label>
                    <p className="text-sm text-gray-600">{selectedApplication.noticePeriod} days</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <p className="text-sm text-gray-600 capitalize">{selectedApplication.status?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="col-span-2">
                    <Label>Skills</Label>
                    <p className="text-sm text-gray-600">{selectedApplication.skills || 'N/A'}</p>
                  </div>
                  {selectedApplication.resumeUrl && (
                    <div className="col-span-2">
                      <Label>Resume</Label>
                      <a href={selectedApplication.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                        View Resume
                      </a>
                    </div>
                  )}
                  {selectedApplication.coverLetter && (
                    <div className="col-span-2">
                      <Label>Cover Letter</Label>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{selectedApplication.coverLetter}</p>
                    </div>
                  )}
                </div>
              </div>
              )}

            {/* Screen Application Modal */}
            {modalType === 'screenApplication' && selectedApplication && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Candidate: {selectedApplication.candidateName || selectedApplication.applicantName}</h4>
                  <p className="text-xs text-blue-700">Job: {selectedApplication.jobTitle}</p>
                </div>
                <div>
                  <Label htmlFor="screeningDecision">Screening Decision</Label>
                  <Select
                    value={applicationForm.screeningDecision || ''}
                    onValueChange={(value) => setApplicationForm({...applicationForm, screeningDecision: value})}
                  >
                    <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                      <SelectValue placeholder="Select decision" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="screening_passed">Pass - Move to Interview</SelectItem>
                      <SelectItem value="screening_failed">Fail - Reject</SelectItem>
                      <SelectItem value="shortlisted">Shortlist for Later</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reviewerNotes">Reviewer Notes</Label>
                  <Textarea
                    id="reviewerNotes"
                    value={applicationForm.reviewerNotes || ''}
                    className="bg-white text-gray-900 border-gray-300"
                    onChange={(e) => setApplicationForm({...applicationForm, reviewerNotes: e.target.value})}
                    placeholder="Add your screening notes..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Schedule Interview Modal */}
            {modalType === 'scheduleInterview' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Candidate: {interviewForm.candidateName}</h4>
                  <p className="text-xs text-blue-700">Job: {interviewForm.jobTitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="interviewDate">Interview Date</Label>
                    <Input
                      id="interviewDate"
                      type="date"
                      value={interviewForm.interviewDate}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setInterviewForm({...interviewForm, interviewDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="interviewTime">Interview Time</Label>
                    <Input
                      id="interviewTime"
                      type="time"
                      value={interviewForm.interviewTime}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setInterviewForm({...interviewForm, interviewTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="interviewType">Interview Type</Label>
                    <Select
                      value={interviewForm.interviewType}
                      onValueChange={(value) => setInterviewForm({...interviewForm, interviewType: value})}
                    >
                      <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="hr">HR Round</SelectItem>
                        <SelectItem value="managerial">Managerial</SelectItem>
                        <SelectItem value="final">Final Round</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="location">Location/Platform</Label>
                    <Input
                      id="location"
                      value={interviewForm.location}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setInterviewForm({...interviewForm, location: e.target.value})}
                      placeholder="Office/Zoom/Teams"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="interviewers">Interviewers (comma separated)</Label>
                    <Input
                      id="interviewers"
                      value={interviewForm.interviewers}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setInterviewForm({...interviewForm, interviewers: e.target.value})}
                      placeholder="John Doe, Jane Smith"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={interviewForm.notes}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setInterviewForm({...interviewForm, notes: e.target.value})}
                      placeholder="Additional notes for the interview..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* View Interview Modal */}
            {modalType === 'viewInterview' && selectedInterview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Candidate Name</Label>
                    <p className="text-sm text-gray-600">{selectedInterview.candidateName}</p>
                  </div>
                  <div>
                    <Label>Job Title</Label>
                    <p className="text-sm text-gray-600">{selectedInterview.jobTitle}</p>
                  </div>
                  <div>
                    <Label>Interview Date</Label>
                    <p className="text-sm text-gray-600">{new Date(selectedInterview.interviewDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label>Interview Time</Label>
                    <p className="text-sm text-gray-600">{selectedInterview.interviewTime || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>Interview Type</Label>
                    <p className="text-sm text-gray-600 capitalize">{selectedInterview.interviewType}</p>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <p className="text-sm text-gray-600">{selectedInterview.location || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <p className="text-sm text-gray-600 capitalize">{selectedInterview.status}</p>
                  </div>
                  <div>
                    <Label>Interviewers</Label>
                    <p className="text-sm text-gray-600">{selectedInterview.interviewers || 'N/A'}</p>
                  </div>
                  {selectedInterview.notes && (
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{selectedInterview.notes}</p>
                    </div>
                  )}
                  {selectedInterview.feedback && (
                    <div className="col-span-2">
                      <Label>Feedback</Label>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{selectedInterview.feedback}</p>
                    </div>
                  )}
                  {selectedInterview.rating && (
                    <div>
                      <Label>Rating</Label>
                      <p className="text-sm text-gray-600">{selectedInterview.rating}/10</p>
                    </div>
                  )}
                  {selectedInterview.decision && (
                    <div>
                      <Label>Decision</Label>
                      <p className="text-sm text-gray-600 capitalize">{selectedInterview.decision}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Update Interview Result Modal */}
            {modalType === 'updateInterviewResult' && selectedInterview && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Candidate: {selectedInterview.candidateName}</h4>
                  <p className="text-xs text-blue-700">Job: {selectedInterview.jobTitle}</p>
                  <p className="text-xs text-blue-700">Interview Date: {new Date(selectedInterview.interviewDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label htmlFor="decision">Interview Decision</Label>
                  <Select
                    value={interviewForm.decision || ''}
                    onValueChange={(value) => setInterviewForm({...interviewForm, decision: value})}
                  >
                    <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                      <SelectValue placeholder="Select decision" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="selected">Selected - Move to Offer</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rating">Rating (1-10)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="10"
                    value={interviewForm.rating || ''}
                    className="bg-white text-gray-900 border-gray-300"
                    onChange={(e) => setInterviewForm({...interviewForm, rating: e.target.value})}
                    placeholder="8"
                  />
                </div>
                <div>
                  <Label htmlFor="feedback">Interview Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={interviewForm.feedback || ''}
                    className="bg-white text-gray-900 border-gray-300"
                    onChange={(e) => setInterviewForm({...interviewForm, feedback: e.target.value})}
                    placeholder="Provide detailed feedback about the candidate's performance..."
                    rows={5}
                  />
                </div>
              </div>
            )}

            {/* Set Joining Details Modal */}
            {modalType === 'setJoining' && selectedApplication && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-green-900 mb-2">Candidate: {selectedApplication.candidateName || selectedApplication.applicantName}</h4>
                  <p className="text-xs text-green-700">Job: {selectedApplication.jobTitle}</p>
                  <p className="text-xs text-green-700">Status: Selected for Hiring</p>
                </div>
                <div>
                  <Label htmlFor="joiningDate">Joining Date</Label>
                  <Input
                    id="joiningDate"
                    type="date"
                    value={applicationForm.joiningDate || ''}
                    className="bg-white text-gray-900 border-gray-300"
                    onChange={(e) => setApplicationForm({...applicationForm, joiningDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="documentsSubmitted">Documents Submitted</Label>
                  <Textarea
                    id="documentsSubmitted"
                    value={applicationForm.documentsSubmitted || ''}
                    className="bg-white text-gray-900 border-gray-300"
                    onChange={(e) => setApplicationForm({...applicationForm, documentsSubmitted: e.target.value})}
                    placeholder="List documents submitted (e.g., Aadhar, PAN, Educational Certificates, Experience Letters, etc.)"
                    rows={4}
                  />
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> Once joining details are set, the application status will be updated to "Hired".
                  </p>
                </div>
              </div>
            )}


            {/* Generate Payroll Modal */}
            {modalType === 'generatePayroll' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900">Attendance-Based Payroll</h4>
                      <p className="text-xs text-blue-700 mt-1">
                        <strong>Monthly Employees:</strong> Salary = (Monthly Salary Ã· Working Days) Ã— Attended Days. Working days exclude Sundays.<br/>
                        <strong>Hourly Employees:</strong> Salary = Hourly Rate Ã— Total Hours Worked. Deduction: 5% of gross salary.<br/>
                        <strong>Monthly Deductions:</strong> PF (12% of min(base, â‚¹15,000)), ESI (0.75% if gross &lt; â‚¹21,000), PT (â‚¹200 fixed), IT (5% if gross &gt; â‚¹50,000).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Generation Mode</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="payrollMode"
                          value="single"
                          checked={generatePayrollMode === 'single'}
                          onChange={(e) => setGeneratePayrollMode(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm">Single Employee</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="payrollMode"
                          value="bulk"
                          checked={generatePayrollMode === 'bulk'}
                          onChange={(e) => setGeneratePayrollMode(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm">All Active Employees</span>
                      </label>
                    </div>
                  </div>

                  {generatePayrollMode === 'single' && (
                    <div>
                      <Label htmlFor="employeeSelect">Select Employee</Label>
                      <Select
                        value={payrollForm.employeeId}
                        onValueChange={(value) => {
                          const selectedEmp = employees.find(emp => emp.id.toString() === value);
                          const newForm = {
                            ...payrollForm,
                            employeeId: value,
                            basicSalary: selectedEmp?.salary || 0,
                            salaryType: selectedEmp?.salaryType || 'monthly'
                          };
                          setPayrollForm(newForm);
                          // Removed automatic fetchAttendanceForPayroll call to allow manual input
                        }}
                      >
                        <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                          <SelectValue placeholder="Choose an employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.filter(emp => emp.status === 'active').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.name || `${emp.firstName} ${emp.lastName}`} - {emp.department} (â‚¹{emp.salary?.toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="payPeriodStart">Pay Period Start</Label>
                      <Input
                        id="payPeriodStart"
                        type="date"
                        value={payrollForm.payPeriodStart}
                        className="bg-white text-gray-900 border-gray-300"
                        onChange={(e) => {
                          const newForm = {...payrollForm, payPeriodStart: e.target.value};
                          setPayrollForm(newForm);
                          // Removed automatic fetchAttendanceForPayroll call to allow manual input
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="payPeriodEnd">Pay Period End</Label>
                      <Input
                        id="payPeriodEnd"
                        type="date"
                        value={payrollForm.payPeriodEnd}
                        className="bg-white text-gray-900 border-gray-300"
                        onChange={(e) => {
                          const newForm = {...payrollForm, payPeriodEnd: e.target.value};
                          setPayrollForm(newForm);
                          // Removed automatic fetchAttendanceForPayroll call to allow manual input
                        }}
                      />
                    </div>
                  </div>

                {generatePayrollMode === 'single' && (
                  <div>
                    <Label htmlFor="allowances">Allowances (â‚¹)</Label>
                    <Input
                      id="allowances"
                      type="number"
                      placeholder="Enter allowances amount"
                      value={payrollForm.allowances}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => setPayrollForm({...payrollForm, allowances: e.target.value})}
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the total allowances for this pay period</p>
                  </div>
                )}

                {generatePayrollMode === 'bulk' && (
                  <>
                    <div>
                      <Label htmlFor="bulkAllowances">Default Allowances for All (â‚¹)</Label>
                      <Input
                        id="bulkAllowances"
                        type="number"
                        placeholder="Enter default allowances"
                        value={payrollForm.allowances}
                        className="bg-white text-gray-900 border-gray-300"
                        onChange={(e) => setPayrollForm({...payrollForm, allowances: e.target.value})}
                      />
                      <p className="text-xs text-gray-500 mt-1">This amount will be applied to all employees</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> This will generate payroll for {employees.filter(emp => emp.status === 'active').length} active employees.
                      </p>
                    </div>
                  </>
                )}

                {/* Calculation Preview for Single Mode */}
                {generatePayrollMode === 'single' && payrollForm.employeeId && payrollForm.payPeriodStart && payrollForm.payPeriodEnd && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      {attendanceData.loading ? 'Loading Attendance...' : 'Salary Calculation Preview'}
                    </h4>

                    {!attendanceData.loading && (
                      <>
                {/* Attendance Summary Inputs */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-xs font-semibold text-blue-900">Attendance Summary</h5>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fetchAttendanceForPayroll(payrollForm.employeeId, payrollForm.payPeriodStart, payrollForm.payPeriodEnd)}
                      disabled={!payrollForm.employeeId || !payrollForm.payPeriodStart || !payrollForm.payPeriodEnd || attendanceData.loading}
                      className="text-xs h-6 px-2 bg-white text-gray-900 border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                    >
                      {attendanceData.loading ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3 mr-1" />
                          Fetch Attendance
                        </>
                      )}
                    </Button>
                  </div>
                  {payrollForm.salaryType === 'hourly' ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label htmlFor="workingDays" className="text-blue-600 block mb-1">Working Days:</label>
                        <input
                          id="workingDays"
                          type="number"
                          min="0"
                          className="w-full rounded border border-blue-300 px-2 py-1 bg-white text-blue-900 font-bold"
                          value={attendanceData.totalWorkingDays}
                          onChange={(e) => setAttendanceData(prev => ({ ...prev, totalWorkingDays: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <label htmlFor="totalHours" className="text-green-600 block mb-1">Total Hours Worked:</label>
                        <input
                          id="totalHours"
                           type="number"
                          min="0"
                          className="w-full rounded border border-green-300 px-2 py-1 bg-white text-green-700 font-bold"
                          value={attendanceData.totalHours}
                          onChange={(e) => setAttendanceData(prev => ({ ...prev, totalHours: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label htmlFor="workingDays" className="text-blue-600 block mb-1">Working Days:</label>
                        <input
                          id="workingDays"
                          type="number"
                          min="0"
                          className="w-full rounded border border-blue-300 px-2 py-1 bg-white text-blue-900 font-bold"
                          value={attendanceData.totalWorkingDays}
                          onChange={(e) => setAttendanceData(prev => ({ ...prev, totalWorkingDays: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <label htmlFor="attendedDays" className="text-green-600 block mb-1">Attended:</label>
                        <input
                          id="attendedDays"
                          type="number"
                          min="0"
                          className="w-full rounded border border-green-300 px-2 py-1 bg-white text-green-700 font-bold"
                          value={attendanceData.attendedDays}
                          onChange={(e) => {
                            const attended = Number(e.target.value);
                            setAttendanceData(prev => ({
                              ...prev,
                              attendedDays: attended,
                              absentDays: prev.totalWorkingDays - attended
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <label htmlFor="absentDays" className="text-red-600 block mb-1">Absent:</label>
                        <input
                          id="absentDays"
                          type="number"
                          min="0"
                          className="w-full rounded border border-red-300 px-2 py-1 bg-white text-red-700 font-bold"
                          value={attendanceData.absentDays}
                          onChange={(e) => setAttendanceData(prev => ({ ...prev, absentDays: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                        {/* Salary Calculation */}
                        {payrollForm.salaryType === 'hourly' ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-500 pb-2 border-b">
                              <span>Hourly Rate: â‚¹{parseFloat(payrollForm.basicSalary || 0).toLocaleString()}</span>
                              <span>Total Hours: {attendanceData.totalHours}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t pt-2">
                              <span className="text-gray-600">Gross Salary (Rate Ã— Hours):</span>
                              <span className="font-medium text-purple-600">
                                â‚¹{(attendanceData.totalHours * parseFloat(payrollForm.basicSalary || 0)).toLocaleString(undefined, {maximumFractionDigits: 2})}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Deductions (5%):</span>
                              <span className="font-medium text-red-600">
                                - â‚¹{(() => { 
                                  const gross = attendanceData.totalHours * parseFloat(payrollForm.basicSalary || 0); 
                                  const deductions = gross * 0.05; 
                                  return deductions.toLocaleString(undefined, {maximumFractionDigits: 2}); 
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between text-base font-bold border-t pt-2 bg-green-50 px-2 py-1 rounded">
                              <span className="text-gray-900">Net Salary:</span>
                              <span className="text-green-600">
                                â‚¹{(() => {
                                  const gross = attendanceData.totalHours * parseFloat(payrollForm.basicSalary || 0);
                                  const deductions = gross * 0.05;
                                  return (gross - deductions).toLocaleString(undefined, {maximumFractionDigits: 2});
                                })()}
                              </span>
                            </div>
                            {payrollForm.allowances && parseFloat(payrollForm.allowances) > 0 && (
                              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                                <span>Note: Allowances (â‚¹{parseFloat(payrollForm.allowances || 0).toLocaleString()}) are tracked separately for hourly employees</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-500 pb-2 border-b">
                              <span>Monthly Salary: â‚¹{parseFloat(payrollForm.basicSalary || 0).toLocaleString()}</span>
                              <span>Daily Rate: â‚¹{attendanceData.totalWorkingDays > 0 ? (parseFloat(payrollForm.basicSalary || 0) / attendanceData.totalWorkingDays).toFixed(2) : '0'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Base Salary (Attendance-based):</span>
                              <span className="font-medium text-blue-600">
                                â‚¹{attendanceData.totalWorkingDays > 0
                                  ? ((parseFloat(payrollForm.basicSalary || 0) / attendanceData.totalWorkingDays) * attendanceData.attendedDays).toLocaleString(undefined, {maximumFractionDigits: 2})
                                  : '0'}
                              </span>
                            </div>
                            {payrollForm.allowances && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Allowances:</span>
                                <span className="font-medium text-green-600">+ â‚¹{parseFloat(payrollForm.allowances || 0).toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm border-t pt-2">
                              <span className="text-gray-600">Gross Salary:</span>
                              <span className="font-medium text-purple-600">
                                â‚¹{attendanceData.totalWorkingDays > 0
                                  ? (((parseFloat(payrollForm.basicSalary || 0) / attendanceData.totalWorkingDays) * attendanceData.attendedDays) + parseFloat(payrollForm.allowances || 0)).toLocaleString(undefined, {maximumFractionDigits: 2})
                                  : '0'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Deductions:</span>
                              <span className="font-medium text-red-600">
                                - â‚¹{attendanceData.totalWorkingDays > 0 ? (() => { const baseSalary = (parseFloat(payrollForm.basicSalary || 0) / attendanceData.totalWorkingDays) * attendanceData.attendedDays; const gross = baseSalary + parseFloat(payrollForm.allowances || 0); const pf = Math.min(baseSalary, 15000) * 0.12; const esi = gross < 21000 ? gross * 0.0075 : 0; const pt = 200; const it = gross > 50000 ? gross * 0.05 : 0; return (pf + esi + pt + it).toLocaleString(undefined, {maximumFractionDigits: 2}); })() : '0'}
                              </span>
                            </div>
                            <div className="flex justify-between text-base font-bold border-t pt-2 bg-green-50 px-2 py-1 rounded">
                              <span className="text-gray-900">Net Salary:</span>
                              <span className="text-green-600">
                                â‚¹{attendanceData.totalWorkingDays > 0
                                  ? (() => {
                                      const baseSalary = (parseFloat(payrollForm.basicSalary || 0) / attendanceData.totalWorkingDays) * attendanceData.attendedDays;
                                      const gross = baseSalary + parseFloat(payrollForm.allowances || 0);
                                      const deductions = baseSalary * 0.05;
                                      return (gross - deductions).toLocaleString(undefined, {maximumFractionDigits: 2});
                                    })()
                                  : '0'}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                </div>
              </div>
            )}
{/* Edit Payroll Modal */}
            {modalType === 'editPayroll' && selectedPayroll && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900">Edit Payroll</h4>
                      <p className="text-xs text-blue-700 mt-1">
                        Update allowances or pay period dates. Salary is calculated based on attendance: (Monthly Salary Ã· Working Days) Ã— Attended Days.
                        Working days exclude Sundays. Deductions include PF (12% of min(base, 15000)), ESI (0.75% if gross &lt; 21000), PT (200), IT (5% if gross &gt; 50000).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    <p className="text-sm text-gray-900 font-medium">
                      {employees.find(e => e.id === selectedPayroll.employeeId)?.name || selectedPayroll.employeeName || 'Unknown'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editPayPeriodStart">Pay Period Start</Label>
                    <Input
                      id="editPayPeriodStart"
                      type="date"
                      value={payrollForm.payPeriodStart}
                      className="bg-white text-gray-900 border-gray-300"
                      onChange={(e) => {
                        const newForm = {...payrollForm, payPeriodStart: e.target.value};
                        setPayrollForm(newForm);
                        // Fetch attendance if dates change
                        if (payrollForm.payPeriodEnd) {
                          fetchAttendanceForPayroll(selectedPayroll.employeeId, e.target.value, payrollForm.payPeriodEnd);
                        }
                      }}
                    />
                    </div>
                    <div>
                      <Label htmlFor="editPayPeriodEnd">Pay Period End</Label>
                      <Input
                        id="editPayPeriodEnd"
                        type="date"
                        value={payrollForm.payPeriodEnd}
                        className="bg-white text-gray-900 border-gray-300"
                        onChange={(e) => {
                          const newForm = {...payrollForm, payPeriodEnd: e.target.value};
                          setPayrollForm(newForm);
                          // Fetch attendance if dates change
                          if (payrollForm.payPeriodStart) {
                            fetchAttendanceForPayroll(selectedPayroll.employeeId, payrollForm.payPeriodStart, e.target.value);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="editAllowances">Allowances (â‚¹)</Label>
                  <Input
                    id="editAllowances"
                    type="number"
                    placeholder="Enter allowances amount"
                    value={payrollForm.allowances}
                    className="bg-white text-gray-900 border-gray-300"
                    onChange={(e) => setPayrollForm({...payrollForm, allowances: e.target.value})}
                  />
                    <p className="text-xs text-gray-500 mt-1">Enter the total allowances for this pay period</p>
                  </div>

                  {/* Attendance Summary Inputs */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="text-xs font-semibold text-blue-900">Attendance Summary</h5>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fetchAttendanceForPayroll(selectedPayroll.employeeId, payrollForm.payPeriodStart, payrollForm.payPeriodEnd)}
                        disabled={!selectedPayroll.employeeId || !payrollForm.payPeriodStart || !payrollForm.payPeriodEnd || attendanceData.loading}
                        className="text-xs h-6 px-2 bg-white text-gray-900 border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                      >
                        {attendanceData.loading ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Download className="h-3 w-3 mr-1" />
                            Fetch Attendance
                          </>
                        )}
                      </Button>
                    </div>
                    {payrollForm.salaryType === 'hourly' ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label htmlFor="editWorkingDays" className="text-blue-600 block mb-1">Working Days:</label>
                          <input
                            id="editWorkingDays"
                            type="number"
                            min="0"
                            className="w-full rounded border border-blue-300 px-2 py-1 bg-white text-blue-900 font-bold"
                            value={attendanceData.totalWorkingDays}
                            onChange={(e) => setAttendanceData(prev => ({ ...prev, totalWorkingDays: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <label htmlFor="editTotalHours" className="text-green-600 block mb-1">Total Hours Worked:</label>
                          <input
                            id="editTotalHours"
                            type="number"
                            min="0"
                            className="w-full rounded border border-green-300 px-2 py-1 bg-white text-green-700 font-bold"
                            value={attendanceData.totalHours}
                            onChange={(e) => setAttendanceData(prev => ({ ...prev, totalHours: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label htmlFor="editWorkingDays" className="text-blue-600 block mb-1">Working Days:</label>
                          <input
                            id="editWorkingDays"
                            type="number"
                            min="0"
                            className="w-full rounded border border-blue-300 px-2 py-1 bg-white text-blue-900 font-bold"
                            value={attendanceData.totalWorkingDays}
                            onChange={(e) => setAttendanceData(prev => ({ ...prev, totalWorkingDays: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <label htmlFor="editAttendedDays" className="text-green-600 block mb-1">Attended:</label>
                          <input
                            id="editAttendedDays"
                            type="number"
                            min="0"
                            className="w-full rounded border border-green-300 px-2 py-1 bg-white text-green-700 font-bold"
                            value={attendanceData.attendedDays}
                            onChange={(e) => {
                              const attended = Number(e.target.value);
                              setAttendanceData(prev => ({
                                ...prev,
                                attendedDays: attended,
                                absentDays: prev.totalWorkingDays - attended
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <label htmlFor="editAbsentDays" className="text-red-600 block mb-1">Absent:</label>
                          <input
                            id="editAbsentDays"
                            type="number"
                            min="0"
                            className="w-full rounded border border-red-300 px-2 py-1 bg-white text-red-700 font-bold"
                            value={attendanceData.absentDays}
                            onChange={(e) => setAttendanceData(prev => ({ ...prev, absentDays: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                     {/* Salary Calculation Preview */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      {attendanceData.loading ? 'Loading Salary Preview...' : 'Salary Calculation Preview'}
                    </h4>

                    {!attendanceData.loading && (
                      <>
                        {payrollForm.salaryType === 'hourly' ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-500 pb-2 border-b">
                              <span>Hourly Rate: â‚¹{parseFloat(payrollForm.basicSalary || 0).toLocaleString()}</span>
                              <span>Total Hours: {attendanceData.totalHours}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t pt-2">
                              <span className="text-gray-600">Gross Salary (Rate Ã— Hours):</span>
                              <span className="font-medium text-purple-600">
                                â‚¹{(attendanceData.totalHours * parseFloat(payrollForm.basicSalary || 0)).toLocaleString(undefined, {maximumFractionDigits: 2})}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Deductions (5%):</span>
                              <span className="font-medium text-red-600">
                                - â‚¹{(() => { 
                                  const gross = attendanceData.totalHours * parseFloat(payrollForm.basicSalary || 0); 
                                  const deductions = gross * 0.05; 
                                  return deductions.toLocaleString(undefined, {maximumFractionDigits: 2}); 
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between text-base font-bold border-t pt-2 bg-green-50 px-2 py-1 rounded">
                              <span className="text-gray-900">Net Salary:</span>
                              <span className="text-green-600">
                                â‚¹{(() => {
                                  const gross = attendanceData.totalHours * parseFloat(payrollForm.basicSalary || 0);
                                  const deductions = gross * 0.05;
                                  return (gross - deductions).toLocaleString(undefined, {maximumFractionDigits: 2});
                                })()}
                              </span>
                            </div>
                            {payrollForm.allowances && parseFloat(payrollForm.allowances) > 0 && (
                              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                                <span>Note: Allowances (â‚¹{parseFloat(payrollForm.allowances || 0).toLocaleString()}) are tracked separately for hourly employees</span>
                              </div>
                            )}
                          </div>
                        ) : (
                         <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-500 pb-2 border-b">
                              <span>Monthly Salary: â‚¹{parseFloat(payrollForm.basicSalary || 0).toLocaleString()}</span>
                              <span>Daily Rate: â‚¹{attendanceData.totalWorkingDays > 0 ? (parseFloat(payrollForm.basicSalary || 0) / attendanceData.totalWorkingDays).toFixed(2) : '0'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Base Salary (Attendance-based):</span>
                              <span className="font-medium text-blue-600">
                                â‚¹{attendanceData.totalWorkingDays > 0
                                  ? ((parseFloat(payrollForm.basicSalary || 0) / attendanceData.totalWorkingDays) * attendanceData.attendedDays).toLocaleString(undefined, {maximumFractionDigits: 2})
                                  : '0'}
                              </span>
                            </div>
                            {payrollForm.allowances && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Allowances:</span>
                                <span className="font-medium text-green-600">+ â‚¹{parseFloat(payrollForm.allowances || 0).toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm border-t pt-2">
                              <span className="text-gray-600">Gross Salary:</span>
                              <span className="font-medium text-purple-600">
                                â‚¹{attendanceData.totalWorkingDays > 0
                                  ? (((parseFloat(payrollForm.basicSalary || 0) / attendanceData.totalWorkingDays) * attendanceData.attendedDays) + parseFloat(payrollForm.allowances || 0)).toLocaleString(undefined, {maximumFractionDigits: 2})
                                  : '0'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Deductions:</span>
                              <span className="font-medium text-red-600">
                                - â‚¹{attendanceData.totalWorkingDays > 0 ? (() => { const baseSalary = (parseFloat(payrollForm.basicSalary || 0) / attendanceData.totalWorkingDays) * attendanceData.attendedDays; const gross = baseSalary + parseFloat(payrollForm.allowances || 0); const pf = Math.min(baseSalary, 15000) * 0.12; const esi = gross < 21000 ? gross * 0.0075 : 0; const pt = 200; const it = gross > 50000 ? gross * 0.05 : 0; return (pf + esi + pt + it).toLocaleString(undefined, {maximumFractionDigits: 2}); })() : '0'}
                              </span>
                            </div>
                            <div className="flex justify-between text-base font-bold border-t pt-2 bg-green-50 px-2 py-1 rounded">
                              <span className="text-gray-900">Net Salary:</span>
                              <span className="text-green-600">
                                â‚¹{attendanceData.totalWorkingDays > 0
                                  ? (() => {
                                      const baseSalary = (parseFloat(payrollForm.basicSalary || 0) / attendanceData.totalWorkingDays) * attendanceData.attendedDays;
                                      const gross = baseSalary + parseFloat(payrollForm.allowances || 0);
                                      const deductions = baseSalary * 0.05;
                                      return (gross - deductions).toLocaleString(undefined, {maximumFractionDigits: 2});
                                    })()
                                  : '0'}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* View Payroll Details Modal */}
            {modalType === 'viewPayroll' && selectedPayroll && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700">Employee Name</Label>
                    <p className="text-sm text-gray-900 font-medium">{selectedPayroll.employeeName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700">Status</Label>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedPayroll.status === 'processed' || selectedPayroll.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedPayroll.status || 'pending'}
                    </span>
                  </div>
                  <div>
                    <Label className="text-gray-700">Pay Period Start</Label>
                    <p className="text-sm text-gray-600">
                      {selectedPayroll.payPeriodStart ? new Date(selectedPayroll.payPeriodStart).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-700">Pay Period End</Label>
                    <p className="text-sm text-gray-600">
                      {selectedPayroll.payPeriodEnd ? new Date(selectedPayroll.payPeriodEnd).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Salary Breakdown</h4>
                  <div className="space-y-2 bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-700">Monthly Salary</span>
                      <span className="text-sm font-medium text-gray-900">â‚¹{(selectedPayroll.monthlySalary || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-700">Allowances</span>
                      <span className="text-sm font-medium text-green-600">+ â‚¹{(selectedPayroll.allowances || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-900">Gross Salary</span>
                      <span className="text-sm font-semibold text-gray-900">â‚¹{(selectedPayroll.grossSalary || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-700">Deductions</span>
                      <span className="text-sm font-medium text-red-600">- â‚¹{(selectedPayroll.deductions || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-3 bg-green-50 border border-green-200 px-3 rounded-lg mt-2">
                      <span className="text-base font-bold text-gray-900">Net Salary</span>
                      <span className="text-base font-bold text-green-600">â‚¹{(selectedPayroll.netSalary || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {selectedPayroll.paymentDate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Payment Date:</strong> {new Date(selectedPayroll.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            )}
            </div>
            {/* End Scrollable Content Area */}

            <DialogFooter className="flex-shrink-0 border-t border-gray-200 pt-4 mt-2 bg-gray-50">
              <Button variant="outline" onClick={closeModal} className="text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900">
                {modalType === 'viewPayroll' ? 'Close' : 'Cancel'}
              </Button>
              {modalType === 'generatePayroll' && (
                <Button onClick={handleGeneratePayroll} >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Payroll
                </Button>
              )}
              {modalType === 'markAttendance' && (
                <Button onClick={handleMarkAttendance}>
                  <Clock className="h-4 w-4 mr-2" />
                  Mark Attendance
                </Button>
              )}
              {modalType === 'leaveRequest' && (
                <Button onClick={handleSubmitLeaveRequest}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Leave Request
                </Button>
              )}
              {modalType === 'editPayroll' && (
                <Button onClick={handleUpdatePayroll}>
                  <Save className="h-4 w-4 mr-2" /> 
                  Update Payroll
                </Button>
              )}
              {modalType !== 'viewEmployee' && modalType !== 'viewPayroll' && modalType !== 'generatePayroll' && modalType !== 'markAttendance' && modalType !== 'editPayroll' && (
                <Button onClick={handleSubmit}>
                  {modalType === 'addEmployee' ? 'Add' : 'Save'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm text-center text-gray-600">
            <p className="font-medium">Â© Human Resource Management System</p>
            <p className="text-sm mt-1">For technical support, contact IT Department</p>
      </div>
    </div>
  );
};

export default HRDepartment;
