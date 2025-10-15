"""
HR-related database models
"""
from datetime import datetime
from enum import Enum
from . import db


class LeaveType(Enum):
    CASUAL = "casual"
    SICK = "sick"
    EARNED = "earned"
    MATERNITY = "maternity"
    PATERNITY = "paternity"


class LeaveStatus(Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AttendanceStatus(Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    HALF_DAY = "HALF_DAY"



class JobStatus(Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    FILLED = "FILLED"


class ApplicationStatus(Enum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    SHORTLISTED = "SHORTLISTED"
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    INTERVIEWED = "INTERVIEWED"
    OFFERED = "OFFERED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class InterviewStatus(Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class SalaryType(Enum):
    DAILY = "daily"
    MONTHLY = "monthly"
    HOURLY = "hourly"


class Employee(db.Model):
    """Employee model for HR management"""

    __tablename__ = 'employees'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), unique=True, nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(20))
    address = db.Column(db.Text)
    department = db.Column(db.String(100), nullable=False)
    designation = db.Column(db.String(100), nullable=False)
    joining_date = db.Column(db.Date, nullable=False)
    salary = db.Column(db.Float, nullable=False)
    salary_type = db.Column(db.Enum('daily', 'monthly', 'hourly'), default='daily')
    status = db.Column(db.String(20), default='active')  # active, inactive, terminated
    manager_id = db.Column(db.Integer, db.ForeignKey('employees.id'))

    # Relationships
    manager = db.relationship('Employee', remote_side=[id], backref='subordinates')
    attendances = db.relationship('Attendance', backref='employee', lazy=True)
    leaves = db.relationship('Leave', foreign_keys='Leave.employee_id', backref='employee', lazy=True)
    payrolls = db.relationship('Payroll', backref='employee', lazy=True)
    @property
    def full_name(self):
        """Get full name of the employee"""
        return f"{self.first_name} {self.last_name}"

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert employee to dictionary"""
        return {
            'id': self.id,
            'employeeId': self.employee_id,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'fullName': f"{self.first_name} {self.last_name}",
            'email': self.email,
            'phone': self.phone,
            'dateOfBirth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'address': self.address,
            'department': self.department,
            'designation': self.designation,
            'joiningDate': self.joining_date.isoformat() if self.joining_date else None,
            'salary': self.salary,
            'salaryType': self.salary_type,
            'status': self.status,
            'managerId': self.manager_id,
            'managerName': self.manager.full_name if self.manager else None,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }


class Attendance(db.Model):
    """Attendance tracking model"""

    __tablename__ = 'attendance'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    name = db.Column(db.String(100))
    date = db.Column(db.Date, nullable=False)
    check_in_time = db.Column(db.Time)
    check_out_time = db.Column(db.Time)
    status = db.Column(db.Enum(AttendanceStatus), default=AttendanceStatus.PRESENT)
    hours_worked = db.Column(db.Float)
    notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert attendance to dictionary"""
        # Handle status - could be enum or string
        if isinstance(self.status, AttendanceStatus):
            status_value = self.status.value.lower()
        elif isinstance(self.status, str):
            status_value = self.status.lower()
        else:
            status_value = 'present'  # default fallback
            
        return {
            'id': self.id,
            'employeeId': self.employee_id,
            'employeeName': self.employee.full_name if self.employee else None,
            'date': self.date.isoformat(),
            'checkInTime': self.check_in_time.strftime('%H:%M') if self.check_in_time else None,
            'checkOutTime': self.check_out_time.strftime('%H:%M') if self.check_out_time else None,
            'status': status_value,
            'hoursWorked': self.hours_worked,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat()
        }


class JobApplication(db.Model):
    """Job application model for recruitment"""

    __tablename__ = 'job_applications'

    id = db.Column(db.Integer, primary_key=True)
    job_posting_id = db.Column(db.Integer, db.ForeignKey('job_postings.id'), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'))
    applicant_name = db.Column(db.String(200), nullable=False)
    applicant_email = db.Column(db.String(255), nullable=False)
    applicant_phone = db.Column(db.String(20))
    resume_path = db.Column(db.String(500))  # Path to uploaded resume file
    cover_letter = db.Column(db.Text)
    experience_years = db.Column(db.Float)
    current_salary = db.Column(db.Float)
    expected_salary = db.Column(db.Float)
    availability_date = db.Column(db.Date)
    status = db.Column(db.Enum(ApplicationStatus), default=ApplicationStatus.SUBMITTED)
    notes = db.Column(db.Text)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    reviewed_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    job_posting = db.relationship('JobPosting', backref='applications')
    candidate = db.relationship('Candidate', backref='applications')
    reviewer = db.relationship('Employee', foreign_keys=[reviewed_by])

    def to_dict(self):
        """Convert job application to dictionary"""
        return {
            'id': self.id,
            'jobPostingId': self.job_posting_id,
            'candidateId': self.candidate_id,
            'candidateName': self.candidate.name if self.candidate else None,
            'jobTitle': self.job_posting.title if self.job_posting else None,
            'applicantName': self.applicant_name,
            'applicantEmail': self.applicant_email,
            'applicantPhone': self.applicant_phone,
            'resumePath': self.resume_path,
            'coverLetter': self.cover_letter,
            'experienceYears': self.experience_years,
            'currentSalary': self.current_salary,
            'expectedSalary': self.expected_salary,
            'availabilityDate': self.availability_date.isoformat() if self.availability_date else None,
            'status': self.status.value.lower(),
            'notes': self.notes,
            'reviewedBy': self.reviewed_by,
            'reviewerName': self.reviewer.full_name if self.reviewer else None,
            'reviewedAt': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'createdAt': self.created_at.isoformat()
        }


class Interview(db.Model):
    """Interview scheduling and feedback model"""

    __tablename__ = 'interviews'

    id = db.Column(db.Integer, primary_key=True)
    job_application_id = db.Column(db.Integer, db.ForeignKey('job_applications.id'), nullable=False)
    interview_type = db.Column(db.String(50))  # phone, video, in-person
    scheduled_date = db.Column(db.Date, nullable=False)
    scheduled_time = db.Column(db.Time, nullable=False)
    duration_minutes = db.Column(db.Integer, default=60)
    interviewers = db.Column(db.String(500))  # Comma-separated list of interviewer names/IDs
    location = db.Column(db.String(200))  # Meeting room or virtual link
    status = db.Column(db.Enum(InterviewStatus), default=InterviewStatus.SCHEDULED)
    feedback = db.Column(db.Text)
    rating = db.Column(db.Float)  # 1-5 scale
    decision = db.Column(db.String(50))  # proceed, reject, hold
    conducted_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    conducted_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    job_application = db.relationship('JobApplication', backref='interviews')
    interviewer = db.relationship('Employee', foreign_keys=[conducted_by])

    def to_dict(self):
        """Convert interview to dictionary"""
        return {
            'id': self.id,
            'jobApplicationId': self.job_application_id,
            'applicantName': self.job_application.applicant_name if self.job_application else None,
            'candidateName': self.job_application.applicant_name if self.job_application else None,
            'jobTitle': self.job_application.job_posting.title if self.job_application and self.job_application.job_posting else None,
            'interviewType': self.interview_type,
            'scheduledDate': self.scheduled_date.isoformat(),
            'scheduledTime': self.scheduled_time.strftime('%H:%M') if self.scheduled_time else None,
            'durationMinutes': self.duration_minutes,
            'interviewers': self.interviewers,
            'location': self.location,
            'status': self.status.value.lower(),
            'feedback': self.feedback,
            'rating': self.rating,
            'decision': self.decision,
            'conductedBy': self.conducted_by,
            'interviewerName': self.interviewer.full_name if self.interviewer else None,
            'conductedAt': self.conducted_at.isoformat() if self.conducted_at else None,
            'createdAt': self.created_at.isoformat()
        }


class Candidate(db.Model):
    """Candidate pool for future opportunities"""

    __tablename__ = 'candidates'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    skills = db.Column(db.Text)
    experience_years = db.Column(db.Float)
    current_position = db.Column(db.String(200))
    current_company = db.Column(db.String(200))
    location = db.Column(db.String(100))
    resume_path = db.Column(db.String(500))
    source = db.Column(db.String(100))  # referral, website, linkedin, etc.
    status = db.Column(db.String(50), default='active')  # active, inactive, hired
    notes = db.Column(db.Text)
    added_by = db.Column(db.Integer, db.ForeignKey('employees.id'))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    adder = db.relationship('Employee', foreign_keys=[added_by])

    def to_dict(self):
        """Convert candidate to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'skills': self.skills,
            'experienceYears': self.experience_years,
            'currentPosition': self.current_position,
            'currentCompany': self.current_company,
            'location': self.location,
            'resumePath': self.resume_path,
            'source': self.source,
            'status': self.status,
            'notes': self.notes,
            'addedBy': self.added_by,
            'adderName': self.adder.full_name if self.adder else None,
            'createdAt': self.created_at.isoformat()
        }


class Leave(db.Model):
    """Leave management model"""

    __tablename__ = 'leaves'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    leave_type = db.Column(db.Enum(LeaveType), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    days_requested = db.Column(db.Float, nullable=False)
    reason = db.Column(db.Text)
    status = db.Column(db.Enum(LeaveStatus), default=LeaveStatus.PENDING)
    approved_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    approved_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    approver = db.relationship('Employee', foreign_keys=[approved_by])

    def to_dict(self):
        """Convert leave to dictionary"""
        # Handle leave_type - could be enum or string
        if isinstance(self.leave_type, LeaveType):
            leave_type_value = self.leave_type.value.lower()
        elif isinstance(self.leave_type, str):
            leave_type_value = self.leave_type.lower()
        else:
            leave_type_value = 'casual'  # default fallback
            
        # Handle status - could be enum or string
        if isinstance(self.status, LeaveStatus):
            status_value = self.status.value.lower()
        elif isinstance(self.status, str):
            status_value = self.status.lower()
        else:
            status_value = 'pending'  # default fallback
            
        return {
            'id': self.id,
            'employeeId': self.employee_id,
            'employeeName': self.name or (self.employee.full_name if self.employee else None),
            'leaveType': leave_type_value,
            'startDate': self.start_date.isoformat(),
            'endDate': self.end_date.isoformat(),
            'daysRequested': self.days_requested,
            'reason': self.reason,
            'status': status_value,
            'approvedBy': self.approved_by,
            'approverName': self.approver.full_name if self.approver else None,
            'approvedAt': self.approved_at.isoformat() if self.approved_at else None,
            'createdAt': self.created_at.isoformat()
        }


class Payroll(db.Model):
    """Payroll management model"""

    __tablename__ = 'payrolls'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    name = db.Column(db.String(100))
    pay_period_start = db.Column(db.Date, nullable=False)
    pay_period_end = db.Column(db.Date, nullable=False)
    monthly_salary = db.Column(db.Float, nullable=False)
    salary_type = db.Column(db.String(10), default='monthly')
    allowances = db.Column(db.Float, default=0)
    deductions = db.Column(db.Float, default=0)
    gross_salary = db.Column(db.Float, nullable=False)
    net_salary = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='pending')  # pending, processed, paid

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert payroll to dictionary"""
        # Format monthly salary display based on salary type
        if self.salary_type == 'hourly':
            # For hourly employees, monthly_salary stores the hourly rate directly
            hourly_rate = self.monthly_salary if self.monthly_salary else 0
            monthly_salary_display = f"{hourly_rate:.0f}/hr"
        else:
            monthly_salary_display = self.monthly_salary
            
        return {
            'id': self.id,
            'employeeId': self.employee_id,
            'employeeName': self.employee.full_name if self.employee else None,
            'payPeriodStart': self.pay_period_start.isoformat(),
            'payPeriodEnd': self.pay_period_end.isoformat(),
            'monthlySalary': self.monthly_salary,
            'monthlySalaryDisplay': monthly_salary_display,
            'salaryType': self.salary_type,
            'allowances': self.allowances,
            'deductions': self.deductions,
            'grossSalary': self.gross_salary,
            'netSalary': self.net_salary,
            'paymentDate': self.payment_date.isoformat() if self.payment_date else None,
            'status': self.status,
            'createdAt': self.created_at.isoformat()
        }


class JobPosting(db.Model):
    """Job posting model for recruitment"""

    __tablename__ = 'job_postings'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100))
    employment_type = db.Column(db.String(50))  # full-time, part-time, contract
    experience_level = db.Column(db.String(50))  # entry, mid, senior
    salary_range = db.Column(db.String(100))
    description = db.Column(db.Text, nullable=False)
    requirements = db.Column(db.Text)
    responsibilities = db.Column(db.Text)
    status = db.Column(db.Enum(JobStatus), default=JobStatus.OPEN)
    posted_by = db.Column(db.Integer, db.ForeignKey('employees.id'))
    application_deadline = db.Column(db.Date)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    poster = db.relationship('Employee', foreign_keys=[posted_by])

    def to_dict(self):
        """Convert job posting to dictionary"""
        # Count applications for this job posting
        applications_count = len(self.applications) if hasattr(self, 'applications') else 0
        
        return {
            'id': self.id,
            'title': self.title,
            'department': self.department,
            'location': self.location,
            'employmentType': self.employment_type,
            'experienceLevel': self.experience_level,
            'salaryRange': self.salary_range,
            'description': self.description,
            'requirements': self.requirements,
            'responsibilities': self.responsibilities,
            'status': self.status.value.lower(),
            'postedBy': self.posted_by,
            'posterName': self.poster.full_name if self.poster else None,
            'applicationDeadline': self.application_deadline.isoformat() if self.application_deadline else None,
            'createdAt': self.created_at.isoformat(),
            'applications': applications_count
        }
