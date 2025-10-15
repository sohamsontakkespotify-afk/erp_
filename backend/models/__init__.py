"""
Database models package initialization
"""
from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy instance
db = SQLAlchemy()

# Import all models to ensure they're registered with SQLAlchemy
from .user import User, UserStatus
from .production import ProductionOrder, AssemblyOrder, AssemblyTestResult
from .purchase import PurchaseOrder
from .inventory import StoreInventory
from .showroom import ShowroomProduct, DispatchRequest, TransportJob, GatePass, Vehicle
from .finance import FinanceTransaction
from .sales import SalesOrder, Customer, SalesTransaction
from .transport import PartLoadDetail
from .approval import ApprovalRequest
from .password_reset_token import PasswordResetToken
from .hr import Employee, Attendance, Leave, Payroll, JobPosting, LeaveType, LeaveStatus, AttendanceStatus, JobStatus, SalaryType, JobApplication, Interview, Candidate, ApplicationStatus, InterviewStatus
from .gate_entry import GateUser, GateEntryLog, GoingOutLog, GateEntrySession
from .guest_list import GuestList, GuestStatus

# Export commonly used models
__all__ = [
    'db',
    'User',
    'UserStatus',
    'ProductionOrder',
    'AssemblyOrder',
    'PurchaseOrder',
    'StoreInventory',
    'ShowroomProduct',
    'DispatchRequest',
    'TransportJob',
    'GatePass',
    'Vehicle',
    'FinanceTransaction',
    'SalesOrder',
    'Customer',
    'SalesTransaction',
    'ApprovalRequest',
    'PartLoadDetail',
    'PasswordResetToken',
    'Employee',
    'Attendance',
    'Leave',
    'Payroll',
    'JobPosting',
    'LeaveType',
    'LeaveStatus',
    'AttendanceStatus',
    'JobStatus',
    'SalaryType',
    'JobApplication',
    'Interview',
    'Candidate',
    'ApplicationStatus',
    'InterviewStatus',
    'GateUser',
    'GateEntryLog',
    'GoingOutLog',
    'GateEntrySession',
    'GuestList',
    'GuestStatus'
]
