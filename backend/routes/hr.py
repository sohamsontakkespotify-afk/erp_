from flask import Blueprint, request, jsonify
from services.hr_service import HRService
from datetime import datetime

hr_bp = Blueprint('hr', __name__)

@hr_bp.route('/api/health/hr', methods=['GET'])
def hr_health_check():
    return jsonify({
        'status': 'HR module is running',
        'timestamp': datetime.now().isoformat()
    }), 200

@hr_bp.route('/hr/dashboard', methods=['GET'])
def get_hr_dashboard():
    try:
        data = HRService.get_dashboard_data()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Employee endpoints
@hr_bp.route('/hr/employees', methods=['GET'])
def get_employees():
    department = request.args.get('department')
    status = request.args.get('status')
    try:
        employees = HRService.get_employees(department, status)
        return jsonify(employees), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/<int:employee_id>', methods=['GET'])
def get_employee(employee_id):
    try:
        employee = HRService.get_employee(employee_id)
        return jsonify(employee), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees', methods=['POST'])
def create_employee():
    data = request.get_json()
    try:
        employee = HRService.create_employee(data)
        return jsonify(employee), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/<int:employee_id>', methods=['PUT'])
def update_employee(employee_id):
    data = request.get_json()
    try:
        employee = HRService.update_employee(employee_id, data)
        return jsonify(employee), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/<int:employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    try:
        result = HRService.delete_employee(employee_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Attendance endpoints
@hr_bp.route('/hr/employees/<int:employee_id>/attendance', methods=['POST'])
def record_attendance(employee_id):
    data = request.get_json()
    try:
        result = HRService.record_attendance(employee_id, data)
        return jsonify(result), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/<int:employee_id>/attendance', methods=['GET'])
def get_employee_attendance(employee_id):
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    try:
        records = HRService.get_employee_attendance(employee_id, start_date, end_date)
        return jsonify(records), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/attendance', methods=['GET'])
def get_all_attendance():
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    try:
        records = HRService.get_all_attendance(start_date, end_date)
        return jsonify(records), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/attendance/summary', methods=['GET'])
def get_attendance_summary():
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    try:
        summary = HRService.get_attendance_summary(start_date, end_date)
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Leave endpoints
@hr_bp.route('/hr/employees/<int:employee_id>/leaves', methods=['POST'])
def create_leave_request(employee_id):
    data = request.get_json()
    try:
        leave = HRService.create_leave_request(employee_id, data)
        return jsonify(leave), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/leaves', methods=['GET'])
def get_leave_requests():
    employee_id = request.args.get('employeeId')
    status = request.args.get('status')
    try:
        leaves = HRService.get_leave_requests(employee_id, status)
        return jsonify(leaves), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/leaves/<int:leave_id>/approve', methods=['PUT'])
def approve_leave_request(leave_id):
    data = request.get_json()
    approved = data.get('approved', True)
    approver_id = data.get('approverId')
    try:
        leave = HRService.approve_leave_request(leave_id, approved, approver_id)
        return jsonify(leave), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/<int:employee_id>/leave-balance', methods=['GET'])
def get_leave_balance(employee_id):
    try:
        balance = HRService.get_employee_leave_balance(employee_id)
        return jsonify(balance), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Payroll endpoints
@hr_bp.route('/hr/employees/<int:employee_id>/payrolls', methods=['GET'])
def get_employee_payrolls(employee_id):
    try:
        payrolls = HRService.get_employee_payrolls(employee_id)
        return jsonify(payrolls), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/<int:employee_id>/payrolls', methods=['POST'])
def generate_payroll(employee_id):
    data = request.get_json()
    try:
        payroll = HRService.generate_payroll(employee_id, data)
        return jsonify(payroll), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/payrolls/<int:payroll_id>/process', methods=['PUT'])
def process_payroll(payroll_id):
    try:
        payroll = HRService.process_payroll(payroll_id)
        return jsonify(payroll), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/payrolls/<int:payroll_id>', methods=['PUT'])
def update_payroll(payroll_id):
    data = request.get_json()
    try:
        payroll = HRService.update_payroll(payroll_id, data)
        return jsonify(payroll), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/payrolls/<int:payroll_id>', methods=['DELETE'])
def delete_payroll(payroll_id):
    try:
        result = HRService.delete_payroll(payroll_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/payrolls', methods=['GET'])
def get_payrolls():
    try:
        payrolls = HRService.get_payrolls()
        return jsonify(payrolls), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/payrolls/<int:payroll_id>/payslip', methods=['GET'])
def download_payslip(payroll_id):
    try:
        from flask import Response, make_response

        # Generate HTML payslip
        payslip_html = HRService.generate_payslip(payroll_id)

        # Return HTML response that can be printed as PDF
        response = make_response(payslip_html)
        response.headers['Content-Type'] = 'text/html'
        response.headers['Content-Disposition'] = f'attachment; filename=payslip_{payroll_id}.html'
        return response

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/payrolls/export', methods=['GET'])
def export_payroll_report():
    try:
        from flask import make_response

        # Generate Excel report
        excel_buffer = HRService.export_payroll_report()

        # Return Excel response
        response = make_response(excel_buffer.getvalue())
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response.headers['Content-Disposition'] = 'attachment; filename=payroll_report.xlsx'
        return response

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Recruitment endpoints
@hr_bp.route('/hr/jobs', methods=['GET'])
def get_job_postings():
    status = request.args.get('status')
    try:
        jobs = HRService.get_job_postings(status)
        return jsonify(jobs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/jobs', methods=['POST'])
def create_job_posting():
    data = request.get_json()
    try:
        job = HRService.create_job_posting(data)
        return jsonify(job), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/jobs/<int:job_id>/status', methods=['PUT'])
def update_job_status(job_id):
    data = request.get_json()
    status = data.get('status')
    try:
        job = HRService.update_job_status(job_id, status)
        return jsonify(job), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/job-postings', methods=['GET'])
def get_job_postings_alias():
    status = request.args.get('status')
    try:
        jobs = HRService.get_job_postings(status)
        return jsonify(jobs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/job-postings', methods=['POST'])
def create_job_posting_alias():
    data = request.get_json()
    try:
        job = HRService.create_job_posting(data)
        return jsonify(job), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/job-postings/<int:job_id>', methods=['PUT'])
def update_job_posting_alias(job_id):
    data = request.get_json()
    try:
        job = HRService.update_job_posting(job_id, data)
        return jsonify(job), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/jobs/<int:job_id>', methods=['PUT'])
def update_job_posting(job_id):
    data = request.get_json()
    try:
        job = HRService.update_job_posting(job_id, data)
        return jsonify(job), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/jobs/<int:job_id>', methods=['DELETE'])
def delete_job_posting(job_id):
    try:
        result = HRService.delete_job_posting(job_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Job Application endpoints
@hr_bp.route('/hr/job-applications', methods=['GET'])
def get_job_applications():
    job_posting_id = request.args.get('jobPostingId')
    status = request.args.get('status')
    try:
        applications = HRService.get_job_applications(job_posting_id=job_posting_id, status=status)
        return jsonify(applications), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/job-applications', methods=['POST'])
def create_job_application():
    data = request.get_json()
    try:
        application = HRService.create_job_application(data)
        return jsonify(application), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/job-applications/<int:application_id>/status', methods=['PUT'])
def update_job_application_status(application_id):
    data = request.get_json()
    status = data.get('status')
    reviewer_id = data.get('reviewerId')
    try:
        application = HRService.update_job_application_status(application_id, status, reviewer_id)
        return jsonify(application), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/job-applications/<int:application_id>', methods=['DELETE'])
def delete_job_application(application_id):
    try:
        result = HRService.delete_job_application(application_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Interview endpoints
@hr_bp.route('/hr/interviews', methods=['GET'])
def get_interviews():
    job_application_id = request.args.get('jobApplicationId')
    status = request.args.get('status')
    try:
        interviews = HRService.get_interviews(job_application_id, status)
        return jsonify(interviews), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/interviews', methods=['POST'])
def schedule_interview():
    data = request.get_json()
    try:
        interview = HRService.schedule_interview(data)
        return jsonify(interview), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/interviews/<int:interview_id>/status', methods=['PUT'])
def update_interview_status(interview_id):
    data = request.get_json()
    status = data.get('status')
    feedback = data.get('feedback')
    rating = data.get('rating')
    decision = data.get('decision')
    interviewer_id = data.get('interviewerId')
    try:
        interview = HRService.update_interview_status(interview_id, status, feedback, rating, decision, interviewer_id)
        return jsonify(interview), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/interviews/<int:interview_id>', methods=['DELETE'])
def delete_interview(interview_id):
    try:
        result = HRService.delete_interview(interview_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Candidate endpoints
@hr_bp.route('/hr/candidates', methods=['GET'])
def get_candidates():
    search = request.args.get('search')
    status = request.args.get('status')
    try:
        candidates = HRService.get_candidates(search, status)
        return jsonify(candidates), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/candidates', methods=['POST'])
def create_candidate():
    data = request.get_json()
    try:
        candidate = HRService.create_candidate(data)
        return jsonify(candidate), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/candidates/<int:candidate_id>', methods=['PUT'])
def update_candidate(candidate_id):
    data = request.get_json()
    try:
        candidate = HRService.update_candidate(candidate_id, data)
        return jsonify(candidate), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/candidates/<int:candidate_id>', methods=['DELETE'])
def delete_candidate(candidate_id):
    try:
        result = HRService.delete_candidate(candidate_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
