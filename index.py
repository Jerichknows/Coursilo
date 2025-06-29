from flask import Flask, request, jsonify, render_template, session, url_for, redirect, g
from models import db, Subject, PaymentScheme, PaymentAssignment, Department, Program, YearSemester, SubjectType, User, TeachingLoad, TeachingLoadSubject, AuditLog
from flask_sqlalchemy import SQLAlchemy
from collections import defaultdict
from sqlalchemy import or_
import os
from pytz import timezone
from datetime import datetime, UTC
from timezone_config import PH_TZ, get_current_ph_time

app = Flask(__name__)

# Configure the database URI (using SQLite)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///MainDatabase.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = "6iwFfSCUT6eoaNCLo01v7V+kq32h3ohSkAfZdFjy3TM="

# Initialize database with the app
db.init_app(app)

saved_batches = {}

PH_TZ = timezone('Asia/Manila')

def log_audit(action, status, message=None, metadata=None):
    """Log an audit event with proper timezone handling"""
    try:
        audit_log = AuditLog(
            user_id=g.get('user_id'),
            route=g.get('route', request.endpoint),
            action=action,
            status=status,
            message=message,
            log_metadata=metadata or {},
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string,
            response_time=(datetime.now(UTC_TZ) - g.request_start_time).total_seconds(),
            timestamp=get_current_ph_time()
        )

        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        app.logger.error(f"Failed to log audit: {str(e)}")
        db.session.rollback()

def log_important_action(action, target=None, status='success', metadata=None):
    """Log important actions with optional metadata"""
    try:
        audit_log = AuditLog(
            timestamp=get_current_ph_time(),
            user_id=session.get('user_id'),
            action=str(action)[:100],
            target=str(target)[:100] if target else None,
            status=str(status)[:20],
            log_metadata=json.dumps(metadata) if metadata else None,
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string
        )

        db.session.add(audit_log)
        db.session.commit()
    except Exception as e:
        app.logger.error(f"Failed to log audit: {str(e)}")
        db.session.rollback()

@app.route('/api/audit-logs', methods=['GET'])
def get_audit_logs():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = AuditLog.query.order_by(AuditLog.timestamp.desc())
        paginated_logs = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'logs': [log.to_dict() for log in paginated_logs.items],
            'total': paginated_logs.total,
            'pages': paginated_logs.pages,
            'current_page': paginated_logs.page
        })
    except Exception as e:
        app.logger.error(f"Error fetching audit logs: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ------------------- DEPARTMENTS -------------------
@app.route('/add_department', methods=['POST'])
def add_department():
    data = request.get_json()
    department_code = data.get('department_code')
    department_name = data.get('department')

    if not department_code or not department_name:
        return jsonify({'success': False, 'message': 'Missing fields'}), 400

    existing = Department.query.filter_by(department_code=department_code).first()
    if existing:
        return jsonify({'success': False, 'message': 'Department code already exists'}), 400

    new_dept = Department(department_code=department_code, department=department_name)
    db.session.add(new_dept)
    db.session.commit()

    log_important_action("Department added", f"{department_code} - {department_name}")
    return jsonify({'success': True, 'message': 'Department added successfully'})

@app.route('/get_departments', methods=['GET'])  # for program dropdown
def get_departments():
    departments = Department.query.all()
    return jsonify([dept.to_dict() for dept in departments])

@app.route('/get_departments_subject', methods=['GET'])
def get_departments_for_subject():
    departments = Department.query.all()
    return jsonify([{'id': dept.id, 'department': dept.department} for dept in departments])


@app.route('/update_department/<int:id>', methods=['PUT'])
def update_department(id):
    data = request.get_json()
    department_code = data.get('department_code')
    department_name = data.get('department')

    dept = Department.query.get(id)
    if not dept:
        return jsonify({'success': False, 'message': 'Department not found'}), 404

    dept.department_code = department_code
    dept.department = department_name
    db.session.commit()
    return jsonify({'success': True, 'message': 'Department updated'})

@app.route('/delete_department/<int:id>', methods=['DELETE'])
def delete_department(id):
    dept = Department.query.get(id)
    if not dept:
        return jsonify({'success': False, 'message': 'Department not found'}), 404

    # Log first before deleting
    log_important_action("Department deleted", f"ID: {id} - {dept.department}")

    db.session.delete(dept)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Department deleted'})

# ------------------- PROGRAMS -------------------
@app.route('/add_program', methods=['POST'])
def add_program():
    data = request.get_json()
    program_code = data.get('program_code')
    program_name = data.get('program_name')
    department_id = data.get('department_id')

    if not program_code or not program_name or not department_id:
        return jsonify({'success': False, 'message': 'Missing fields'}), 400

    new_program = Program(program_code=program_code, program_name=program_name, department_id=department_id)
    db.session.add(new_program)
    db.session.commit()

    log_important_action("Program added", f"{program_code} - {program_name}")
    return jsonify({'success': True})

@app.route('/get_programs', methods=['GET'])
def get_programs():
    programs = Program.query.all()
    return jsonify([p.to_dict() for p in programs])

@app.route('/update_program/<int:id>', methods=['PUT'])
def update_program(id):
    data = request.get_json()
    program = Program.query.get(id)

    if not program:
        return jsonify({'success': False, 'message': 'Program not found'}), 404

    program.program_code = data.get('program_code')
    program.program_name = data.get('program_name')
    program.department_id = data.get('department_id')
    db.session.commit()
    return jsonify({'success': True})

@app.route('/delete_program/<int:id>', methods=['DELETE'])
def delete_program(id):
    program = Program.query.get(id)
    if not program:
        return jsonify({'success': False, 'message': 'Program not found'}), 404

    # Log before deletion
    log_important_action("Program deleted", f"ID: {id} - {program.program_code} - {program.program_name}")

    db.session.delete(program)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Program deleted successfully'})


# ------------------- YEAR/SEMESTERS -------------------
@app.route('/year-semester', methods=['GET'])
def fetch_year_semesters():
    entries = YearSemester.query.order_by(YearSemester.id.desc()).all()
    return jsonify([e.to_dict() for e in entries]), 200

@app.route('/year-semester', methods=['POST'])
def add_year_semester():
    data = request.get_json()
    new_entry = YearSemester(
        school_year=data['school_year'],
        semester=data['semester'],
        is_active=data['is_active']
    )

    if new_entry.is_active:
        YearSemester.query.update({YearSemester.is_active: False})

    db.session.add(new_entry)
    db.session.commit()
    log_important_action("Year/Semester added", f"{data['school_year']} - {data['semester']}")
    return jsonify(new_entry.to_dict()), 201

@app.route('/year-semester/<int:id>/toggle', methods=['PUT'])
def toggle_year_semester(id):
    entry = YearSemester.query.get_or_404(id)

    if not entry.is_active:
        YearSemester.query.update({YearSemester.is_active: False})
        entry.is_active = True
    else:
        entry.is_active = False

    db.session.commit()
    return jsonify(entry.to_dict()), 200

@app.route('/year-semester/<int:id>', methods=['DELETE'])
def delete_year_semester(id):
    entry = YearSemester.query.get_or_404(id)

    if entry.is_active:
        return jsonify({'error': 'Cannot delete an active semester'}), 400

    # Check for dependent records
    from models import TeachingLoad  # Import your model if needed
    dependent_loads = TeachingLoad.query.filter_by(year_semester_id=id).all()

    if dependent_loads:
        return jsonify({'error': 'Cannot delete this year/semester because it is still assigned to teaching loads.'}), 400

    log_important_action("Year/Semester deleted", f"ID: {id} - {entry.school_year} {entry.semester}")

    db.session.delete(entry)
    db.session.commit()
    return jsonify({'message': 'Deleted successfully'}), 200




# ------------------- SUBJECT TYPES -------------------
@app.route('/subject-types', methods=['GET'])
def fetch_subject_types():
    types = SubjectType.query.all()
    return jsonify([t.to_dict() for t in types])

@app.route('/subject-types', methods=['POST'])
def add_subject_type():
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Subject type name is required'}), 400

    new_type = SubjectType(name=name)
    db.session.add(new_type)
    db.session.commit()
    log_important_action("Subject type added", name)
    return jsonify(new_type.to_dict()), 201

@app.route('/subject-types/<int:type_id>', methods=['DELETE'])
def delete_subject_type(type_id):
    subject_type = SubjectType.query.get_or_404(type_id)

    log_important_action("Subject Type deleted", f"ID: {type_id} - {subject_type.name}")

    db.session.delete(subject_type)
    db.session.commit()
    return jsonify({'message': 'Deleted successfully'})


# ------------------- SUBJECTS -------------------
@app.route('/get_subject_types', methods=['GET'])
def get_subject_types():
    types = SubjectType.query.all()
    return jsonify([t.to_dict() for t in types])

@app.route('/add_subject', methods=['POST'])
def add_subject():
    data = request.get_json()
    try:
        subject = Subject(
            subject_code=data['subject_code'],
            subject_name=data['subject_name'],
            year_level=data['year_level'],
            department_id=data['department_id'],
            lecture=data.get('lecture', 0),
            com_lab=data.get('com_lab', 0),
            laboratory=data.get('laboratory', 0),
            school_lecture=data.get('school_lecture', 0),
            clinic=data.get('clinic', 0),
            subject_type_id=data['subject_type_id'],
            is_nstp=data.get('is_nstp', False)
        )
        db.session.add(subject)
        db.session.commit()
        log_important_action("Subject added", f"{data['subject_code']} - {data['subject_name']}")
        return jsonify({'success': True, 'message': 'Subject added successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/subjects_by_department')
def subjects_by_department():
    departments = Department.query.all()
    result = []

    for dept in departments:
        subjects = Subject.query.filter_by(department_id=dept.id).all()
        dept_data = {
            'id': dept.id,
            'name': dept.department,
            'subjects': []
        }

        for s in subjects:
            dept_data['subjects'].append({
                'subject_code': s.subject_code,
                'subject_name': s.subject_name,
                'year_level': s.year_level,
                'lecture': s.lecture,
                'comb_lab': s.com_lab,
                'laboratory': s.laboratory,
                'school_lecture': s.school_lecture,
                'clinic': s.clinic,
                'subject_type': s.subject_type.name if s.subject_type else 'N/A',
                'is_nstp': s.is_nstp
            })

        result.append(dept_data)

    return jsonify({'departments': result})

@app.route('/delete_subject/<string:subject_code>', methods=['DELETE'])
def delete_subject(subject_code):
    subject = Subject.query.filter_by(subject_code=subject_code).first()
    if not subject:
        return jsonify({'success': False, 'message': 'Subject not found'}), 404

    log_important_action("Subject deleted", f"{subject.subject_code} - {subject.subject_name}")
    db.session.delete(subject)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Subject deleted successfully'}), 200


@app.route('/login', methods=['GET', 'POST'])
def show_login_page():
    if request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        email = data.get('email')
        password = data.get('password')

        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):  # Secure password check
            session['user_id'] = user.id
            session['role'] = user.user_type  # Assuming your model uses `user_type`

            # Role-based redirection
            if user.user_type in ['program-head']:
                redirect_url = url_for('index')
            elif user.user_type == 'admin':
                redirect_url = url_for('admin')
            elif user.user_type == 'dean':
                redirect_url = url_for('dean')
            else:
                return jsonify({"success": False, "message": "Unknown role"}), 400

            log_important_action("User login", status="success")
            return jsonify({
                "success": True,
                "message": "Login successful",
                "redirect": redirect_url
            })

        log_important_action("Failed login attempt", status="failed")
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

    return render_template('login.html')

@app.route('/current_user')
def get_current_user():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})

    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'success': False, 'message': 'User not found'})

    # Get department info
    department_info = None
    if user.department_id and user.user_type.lower() in ['dean', 'program-head']:
        department = db.session.get(Department, user.department_id)
        if department:
            department_info = {
                'id': department.id,
                'code': department.department_code,
                'name': department.department
            }

    # Get program details for program-head
    program_details = []
    if user.user_type.lower() == 'program-head' and user.programs:
        try:
            program_ids = [int(id) for id in user.programs.split(',') if id.strip()]
            programs = Program.query.filter(Program.id.in_(program_ids)).all()

            program_details = [{
                'id': program.id,
                'code': program.program_code,
                'name': program.program_name
            } for program in programs]
        except Exception as e:
            print(f"Error fetching programs: {str(e)}")

    return jsonify({
        'success': True,
        'user': {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'user_type': user.user_type,
            'department': department_info if user.user_type.lower() in ['dean', 'program-head'] else None,
            'programs': program_details if user.user_type.lower() == 'program-head' else None
        }
    })

@app.route("/users", methods=["GET"])
def get_users():
    try:
        # Fetch all users from the database
        users = User.query.all()
        return jsonify({
            "success": True,
            "users": [user.to_dict() for user in users]
        })

    except Exception as e:
        app.logger.error(f"Error fetching users: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Error fetching users",
            "error": str(e)
        }), 500


@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        # Get current user from session (assuming you're using Flask-Login or similar)
        current_user_email = None
        if 'user_id' in session:
            current_user = User.query.get(session['user_id'])
            if current_user:
                current_user_email = current_user.email

        # Only allow default admin to create users
        DEFAULT_ADMIN_EMAIL = "admin.admin@gmail.com"
        if current_user_email != DEFAULT_ADMIN_EMAIL:
            return jsonify({
                "success": False,
                "message": "Only the default admin can create new users"
            }), 403

        # Check if email already exists
        existing_user = User.query.filter_by(email=data["email"]).first()
        if existing_user:
            return jsonify({
                "success": False,
                "message": "Email already exists"
            }), 400

        # Validate required fields
        required_fields = ["first_name", "last_name", "email", "password", "user_type"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    "success": False,
                    "message": f"Missing required field: {field}"
                }), 400

        # Create new user
        new_user = User(
            first_name=data["first_name"],
            last_name=data["last_name"],
            email=data["email"],
            user_type=data["user_type"],
            department_id=data.get("department_id"),
            programs=",".join(data.get("programs", [])) if data.get("programs") else None
        )
        new_user.set_password(data["password"])

        db.session.add(new_user)
        db.session.commit()

        log_important_action("User registered", f"{data['email']}", status="success")

        return jsonify({
            "success": True,
            "message": "Registered successfully",
            "user": new_user.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        log_important_action("Registration failed",
                           f"{data.get('email', 'unknown')}",
                           status="failed",
                           metadata={"error": str(e)})
        return jsonify({
            "success": False,
            "message": "Registration failed",
            "error": str(e)
        }), 500

@app.route('/admin')
def admin():
    if 'user_id' not in session:
        return redirect(url_for('show_login_page'))
    return render_template('admin.html')


@app.route('/logout')
def logout():
    if 'user_id' in session:
        log_important_action("User logout", status="success")
    session.clear()  # Clear all session data
    return redirect(url_for('show_login_page'))


@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('show_login_page'))
    return render_template('index.html')

@app.route('/dean')
def dean():
    if 'user_id' not in session:
        return redirect(url_for('show_login_page'))
    return render_template('dean.html')

@app.route('/year-semester-sorted', methods=['GET'])
def get_sorted_year_semesters():
    entries = YearSemester.query.order_by(YearSemester.is_active.desc(), YearSemester.id.desc()).all()
    return jsonify([e.to_dict() for e in entries]), 200

@app.route('/assigned-programs', methods=['GET'])
def get_assigned_programs():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401

    user = db.session.get(User, session['user_id'])
    if not user or user.user_type.lower() != 'program-head':
        return jsonify({'success': False, 'message': 'Only program-head can access programs'}), 403

    try:
        program_ids = [int(id) for id in user.programs.split(',') if id.strip()]
        programs = Program.query.filter(Program.id.in_(program_ids)).all()
        return jsonify({
            'success': True,
            'programs': [p.to_dict() for p in programs]
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/year_levels_by_department/<int:department_id>', methods=['GET'])
def year_levels_by_department(department_id):
    try:
        year_levels = (
            db.session.query(Subject.year_level)
            .filter(Subject.department_id == department_id)
            .distinct()
            .order_by(Subject.year_level)
            .all()
        )
        levels = [yl[0] for yl in year_levels]
        return jsonify({'success': True, 'year_levels': levels}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/departments_year', methods=['GET'])
def get_departments_year():
    try:
        departments = Department.query.all()
        return jsonify({
            'success': True,
            'departments': [d.to_dict() for d in departments]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/subjects_by_program_year')
def subjects_by_program_year():
    year_semester_id = request.args.get('year_semester_id')
    program_id = request.args.get('program_id')
    year_level = request.args.get('year_level')

    try:
        # Get the program using modern SQLAlchemy 2.0 pattern
        program = db.session.get(Program, program_id)
        if not program:
            return jsonify({'success': False, 'message': 'Program not found'}), 404

        # Get subjects for this department and year level
        subjects = db.session.execute(
            db.select(Subject)
            .filter_by(
                department_id=program.department_id,
                year_level=year_level
            )
        ).scalars().all()

        # Convert to dictionary format
        subjects_data = [s.to_dict() for s in subjects]

        return jsonify({
            'success': True,
            'subjects': subjects_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

@app.route('/year_levels_by_department/<int:department_id>')
def get_year_levels_by_department(department_id):
    try:
        # Get all subjects for this department
        subjects = Subject.query.filter_by(department_id=department_id).all()

        # Extract unique year levels
        year_levels = list(set([s.year_level for s in subjects]))

        return jsonify({
            'success': True,
            'year_levels': year_levels
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

@app.route('/get_subject_details/<int:subject_id>')
def get_subject_details(subject_id):
    try:
        # Use modern SQLAlchemy 2.0 pattern
        subject = db.session.get(Subject, subject_id)
        if not subject:
            return jsonify({'success': False, 'message': 'Subject not found'}), 404

        # Calculate total units (sum of all hours)
        total_units = (subject.lecture or 0) + (subject.com_lab or 0) + \
                     (subject.laboratory or 0) + (subject.school_lecture or 0) + \
                     (subject.clinic or 0)

        return jsonify({
            'success': True,
            'subject': {
                'id': subject.id,
                'subject_code': subject.subject_code,
                'subject_name': subject.subject_name,
                'total_units': total_units,
                'lecture': subject.lecture,
                'com_lab': subject.com_lab,
                'laboratory': subject.laboratory,
                'school_lecture': subject.school_lecture,
                'clinic': subject.clinic,
                'subject_type': subject.subject_type.name if subject.subject_type else 'N/A',
                'is_nstp': subject.is_nstp
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/subjects_by_department_year')
def subjects_by_department_year():
    year_semester_id = request.args.get('year_semester_id')
    department_id = request.args.get('department_id')
    year_level = request.args.get('year_level')

    try:
        # Get subjects for this department and year level
        subjects = db.session.execute(
            db.select(Subject)
            .filter_by(
                department_id=department_id,
                year_level=year_level
            )
        ).scalars().all()

        # Convert to dictionary format
        subjects_data = [s.to_dict() for s in subjects]

        return jsonify({
            'success': True,
            'subjects': subjects_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

@app.route('/get_program_details/<int:program_id>')
def get_program_details(program_id):
    try:
        program = db.session.get(Program, program_id)
        if not program:
            return jsonify({'success': False, 'message': 'Program not found'}), 404

        return jsonify({
            'success': True,
            'program': {
                'id': program.id,
                'department_id': program.department_id,
                'name': program.name,
                'code': program.code
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/save_teaching_load', methods=['POST'])
def save_teaching_load():
    data = request.get_json()

    try:
        # Get current user
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'User not authenticated'}), 401

        user = db.session.get(User, session['user_id'])
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # Validate based on user role
        user_role = user.user_type.lower()
        is_dean = user_role == 'dean'
        is_program_head = user_role == 'program-head'

        if not is_dean and not is_program_head:
            return jsonify({'success': False, 'message': 'Unauthorized user role'}), 403

        # Validate required fields
        if 'year_semester_id' not in data or 'subjects' not in data:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        if is_dean and 'department_id' not in data:
            return jsonify({'success': False, 'message': 'Department selection required for deans'}), 400
        elif is_program_head and 'program_id' not in data:
            return jsonify({'success': False, 'message': 'Program selection required for program heads'}), 400

        # Create teaching load
        teaching_load = TeachingLoad(
            year_semester_id=data['year_semester_id'],
            submitted_by=user.id,
            status='pending'
        )

        # Set department or program based on role
        if is_dean:
            teaching_load.department_id = data['department_id']
        else:
            teaching_load.program_id = data['program_id']

        db.session.add(teaching_load)
        db.session.flush()  # Get the ID

        # Add subjects
        for subject_data in data['subjects']:
            # Calculate total units if not provided
            total_units = subject_data.get('total_units', 0)
            if not total_units:
                total_units = (
                    subject_data.get('lecture_hours', 0) +
                    subject_data.get('com_lab_hours', 0) +
                    subject_data.get('laboratory_hours', 0) +
                    subject_data.get('school_lecture_hours', 0) +
                    subject_data.get('clinic_hours', 0)
                )

            load_subject = TeachingLoadSubject(
                teaching_load_id=teaching_load.id,
                subject_id=subject_data['id'],
                lecture_hours=subject_data.get('lecture_hours', 0),
                com_lab_hours=subject_data.get('com_lab_hours', 0),
                laboratory_hours=subject_data.get('laboratory_hours', 0),
                school_lecture_hours=subject_data.get('school_lecture_hours', 0),
                clinic_hours=subject_data.get('clinic_hours', 0),
                total_units=total_units
            )
            db.session.add(load_subject)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Teaching load saved successfully',
            'teaching_load_id': teaching_load.id
        })

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error saving teaching load: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to save teaching load: {str(e)}"
        }), 500

@app.route('/get_saved_batches_program')
def get_saved_batches_program():
    try:
        # Only get unsubmitted teaching loads (e.g., status is 'draft' or 'saved')
        batches = db.session.query(
            TeachingLoad,
            User,
            Program
        ).join(
            User, TeachingLoad.submitted_by == User.id
        ).join(
            Program, TeachingLoad.program_id == Program.id
        ).filter(
            TeachingLoad.status.in_(['pending','submitted'])
        ).order_by(
            TeachingLoad.submission_date.desc()
        ).all()

        result = []
        for load, user, program in batches:
            result.append({
                'id': load.id,
                'program_name': program.program_name,
                'program_code': program.program_code,
                'year_semester': f"{load.year_semester.school_year} - {load.year_semester.semester}",
                'submitted_by': f"{user.first_name} {user.last_name}",
                'user_role': user.user_type,
                'submission_date': load.submission_date.strftime('%Y-%m-%d %H:%M'),
                'status': load.status,
                'is_submitted': load.status == 'submitted'
            })

        return jsonify({'success': True, 'batches': result})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/get_saved_batches')
def get_saved_batches():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'User not authenticated'}), 401

        user = db.session.get(User, session['user_id'])
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        user_role = user.user_type.lower()
        is_dean = user_role == 'dean'
        is_program_head = user_role == 'program-head'

        # Base query
        query = db.session.query(
            TeachingLoad,
            User,
            Program,
            Department
        ).join(
            User, TeachingLoad.submitted_by == User.id
        ).outerjoin(
            Program, TeachingLoad.program_id == Program.id
        ).outerjoin(
            Department, TeachingLoad.department_id == Department.id
        ).join(
            YearSemester, TeachingLoad.year_semester_id == YearSemester.id
        ).filter(
            TeachingLoad.status.in_(['pending', 'submitted'])
        )

        # Filter by user role
        if is_dean:
            query = query.filter(
                (TeachingLoad.department_id == user.department_id) |
                (TeachingLoad.submitted_by == user.id)
            )
        elif is_program_head:
            # Get the program IDs this program-head is assigned to
            program_ids = [int(id) for id in user.programs.split(',')] if user.programs else []
            query = query.filter(
                (TeachingLoad.program_id.in_(program_ids)) |
                (TeachingLoad.submitted_by == user.id)
            )

        batches = query.order_by(
            TeachingLoad.submission_date.desc()
        ).all()

        result = []
        for load, user, program, department in batches:
            batch_info = {
                'id': load.id,
                'year_semester': f"{load.year_semester.school_year} - {load.year_semester.semester}",
                'submitted_by': f"{user.first_name} {user.last_name}",
                'user_role': user.user_type,
                'submission_date': load.submission_date.strftime('%Y-%m-%d %H:%M'),
                'status': load.status,
                'is_submitted': load.status == 'submitted'
            }

            # Add program or department info based on what's available
            if program:
                batch_info.update({
                    'program_name': program.program_name,
                    'program_code': program.program_code,
                    'department': program.department.department if program.department else None
                })
            elif department:
                batch_info.update({
                    'department': department.department,
                    'department_code': department.department_code,
                    'program_name': None,
                    'program_code': None
                })

            result.append(batch_info)

        return jsonify({'success': True, 'batches': result})
    except Exception as e:
        app.logger.error(f"Error fetching saved batches: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400


@app.route('/get_batch_subjects/<int:batch_id>')
def get_batch_subjects(batch_id):
    try:
        subjects = db.session.query(
            TeachingLoadSubject,
            Subject
        ).join(
            Subject, TeachingLoadSubject.subject_id == Subject.id
        ).filter(
            TeachingLoadSubject.teaching_load_id == batch_id
        ).all()

        result = []
        for load_subject, subject in subjects:
            result.append({
                'subject_code': subject.subject_code,
                'subject_name': subject.subject_name,
                'total_units': load_subject.total_units,
                'lecture': load_subject.lecture_hours,
                'com_lab': load_subject.com_lab_hours,
                'laboratory': load_subject.laboratory_hours,
                'school_lecture': load_subject.school_lecture_hours,
                'clinic': load_subject.clinic_hours,
                'subject_type': subject.subject_type.name if subject.subject_type else 'N/A',
                'is_nstp' : subject.is_nstp
            })

        return jsonify({'success': True, 'subjects': result})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/delete_batch/<int:batch_id>', methods=['DELETE'])
def delete_batch(batch_id):
    try:
        load = db.session.get(TeachingLoad, batch_id)
        if not load:
            return jsonify({'success': False, 'message': 'Batch not found'}), 404

        # Optional: Also delete associated subjects if needed
        TeachingLoadSubject.query.filter_by(teaching_load_id=batch_id).delete()
        db.session.delete(load)
        db.session.commit()

        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/submit_batch/<int:batch_id>', methods=['POST'])
def submit_batch(batch_id):
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'User not authenticated'}), 401

        # Updated to use db.session.get()
        teaching_load = db.session.get(TeachingLoad, batch_id)
        if not teaching_load:
            return jsonify({'success': False, 'message': 'Batch not found'}), 404

        if teaching_load.status == 'submitted':
            return jsonify({'success': False, 'message': 'Batch has already been submitted'}), 400

        teaching_load.status = 'submitted'
        db.session.commit()

        log_important_action("Batch submitted", f"Batch ID: {batch_id}")
        return jsonify({'success': True, 'message': 'Batch submitted successfully'})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error submitting batch: {str(e)}")
        return jsonify({'success': False, 'message': f'Failed to submit batch: {str(e)}'}), 500


@app.route('/approve_batch/<int:batch_id>', methods=['POST'])
def approve_batch(batch_id):
    try:
        batch_subjects = db.session.query(TeachingLoadSubject).filter_by(teaching_load_id=batch_id).all()
        teaching_load = db.session.get(TeachingLoad, batch_id)

        if not batch_subjects or not teaching_load:
            return jsonify({'success': False, 'message': 'Batch not found or has no subjects'}), 404

        for subj in batch_subjects:
            subj.status = 'approved'
        teaching_load.status = 'approved'
        teaching_load.finance_status = 'pending'  # Set finance status to pending
        db.session.commit()

        log_important_action("Batch approved", f"Batch ID: {batch_id}")
        return jsonify({'success': True, 'message': 'Batch approved successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/deny_batch/<int:batch_id>', methods=['POST'])
def deny_batch(batch_id):
    try:
        data = request.get_json()
        comment = data.get('comment', '')

        batch_subjects = db.session.query(TeachingLoadSubject).filter_by(teaching_load_id=batch_id).all()
        teaching_load = db.session.get(TeachingLoad, batch_id)

        if not batch_subjects or not teaching_load:
            return jsonify({'success': False, 'message': 'Batch not found or has no subjects'}), 404

        for subj in batch_subjects:
            subj.status = 'denied'
            subj.comment = comment  # Store the comment with each subject

        teaching_load.status = 'denied'
        teaching_load.comment = comment  # Store the comment at the batch level

        db.session.commit()

        log_important_action("Batch denied", f"Batch ID: {batch_id} with comment: {comment[:50]}")
        return jsonify({'success': True, 'message': 'Batch denied successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/get_submitted_batches')
def get_submitted_batches():
    try:
        # Query with outer joins for both program and department
        batches = db.session.query(
            TeachingLoad,
            User,
            Program,
            Department,
            YearSemester
        ).join(
            User, TeachingLoad.submitted_by == User.id
        ).outerjoin(
            Program, TeachingLoad.program_id == Program.id
        ).outerjoin(
            Department,
            (TeachingLoad.department_id == Department.id) |
            (Program.department_id == Department.id)
        ).join(
            YearSemester, TeachingLoad.year_semester_id == YearSemester.id
        ).filter(
            TeachingLoad.status == 'submitted'
        ).order_by(
            TeachingLoad.submission_date.desc()
        ).all()

        result = []
        for load, user, program, department, year_semester in batches:
            batch_data = {
                'id': load.id,
                'year_semester': f"{year_semester.school_year} - {year_semester.semester}",
                'submitted_by': f"{user.first_name} {user.last_name}",
                'user_role': user.user_type,
                'submission_date': load.submission_date.strftime('%Y-%m-%d %H:%M'),
                'status': load.status,
                'is_submitted': load.status == 'submitted'
            }

            # Add program info if available
            if program:
                batch_data.update({
                    'program_name': program.program_name,
                    'program_code': program.program_code,
                    'department': department.department if department else None
                })
            # Fall back to department info if no program
            elif department:
                batch_data.update({
                    'department': department.department,
                    'department_code': department.department_code,
                    'program_name': None,
                    'program_code': None
                })

            result.append(batch_data)

        return jsonify({'success': True, 'batches': result})

    except Exception as e:
        app.logger.error(f"Error fetching submitted batches: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/get_approval_status')
def get_approval_status():
    try:
        # Use outer joins for both program and department
        loads = db.session.query(
            TeachingLoad.id,
            User.first_name,
            User.last_name,
            TeachingLoad.status,
            TeachingLoad.comment,
            Program.program_name,
            Department.department,
            YearSemester.school_year,
            YearSemester.semester
        ).join(
            User, TeachingLoad.submitted_by == User.id
        ).outerjoin(
            Program, TeachingLoad.program_id == Program.id
        ).outerjoin(
            Department,
            (TeachingLoad.department_id == Department.id) |
            (Program.department_id == Department.id)
        ).join(
            YearSemester, TeachingLoad.year_semester_id == YearSemester.id
        ).filter(
            TeachingLoad.status.in_(['approved', 'denied'])
        ).order_by(
            TeachingLoad.id.desc()
        ).all()

        status_list = []
        for load in loads:
            status_list.append({
                'id': load.id,
                'submitted_by': f"{load.first_name} {load.last_name}",
                'status': load.status,
                'comment': load.comment,
                'program_name': load.program_name or "NONE",  # Ensure "NONE" if null
                'department': load.department or "NONE",      # Ensure "NONE" if null
                'year_semester': f"{load.semester} Sem {load.school_year}"
            })

        return jsonify({'success': True, 'statuses': status_list})
    except Exception as e:
        app.logger.error(f"Error fetching approval status: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/get_pending_approvals')
def get_pending_approvals():
    try:
        pending_loads = db.session.query(
            TeachingLoad.id,
            User.first_name,
            User.last_name,
            Program.program_name,
            Department.department,
            YearSemester.school_year,
            YearSemester.semester,
            db.func.count(TeachingLoadSubject.id).label('subject_count')
        ).join(
            User, TeachingLoad.submitted_by == User.id
        ).outerjoin(
            Program, TeachingLoad.program_id == Program.id
        ).outerjoin(
            Department,
            (TeachingLoad.department_id == Department.id) |
            (Program.department_id == Department.id)
        ).join(
            YearSemester, TeachingLoad.year_semester_id == YearSemester.id
        ).join(
            TeachingLoadSubject, TeachingLoadSubject.teaching_load_id == TeachingLoad.id
        ).filter(
            TeachingLoad.status == 'approved',
            TeachingLoad.finance_status == 'pending'
        ).group_by(
            TeachingLoad.id,
            User.first_name,
            User.last_name,
            Program.program_name,
            Department.department,
            YearSemester.school_year,
            YearSemester.semester
        ).order_by(
            TeachingLoad.submission_date.desc()
        ).all()

        result = [{
            'id': load.id,
            'submitted_by': f"{load.first_name} {load.last_name}",
            'program_name': load.program_name or "NONE",  # Ensure "NONE" if null
            'department': load.department or "NONE",      # Ensure "NONE" if null
            'subject_count': load.subject_count,
            'year_semester': f"{load.semester} Sem {load.school_year}"
        } for load in pending_loads]

        return jsonify({
            'success': True,
            'batches': result
        })
    except Exception as e:
        app.logger.error(f"Error fetching pending approvals: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/get_denied_batches')
def get_denied_batches():
    try:
        denied_batches = db.session.query(
            TeachingLoad.id,
            User.first_name,
            User.last_name,
            TeachingLoad.comment,
            Program.program_name,
            Department.department,
            YearSemester.school_year,
            YearSemester.semester
        ).join(
            User, TeachingLoad.submitted_by == User.id
        ).outerjoin(  # Changed to outerjoin for Program
            Program, TeachingLoad.program_id == Program.id
        ).outerjoin(  # Changed to outerjoin for Department
            Department,
            (TeachingLoad.department_id == Department.id) |
            (Program.department_id == Department.id)
        ).join(
            YearSemester, TeachingLoad.year_semester_id == YearSemester.id
        ).filter(
            TeachingLoad.status == 'denied'
        ).order_by(
            TeachingLoad.submission_date.desc()
        ).all()

        result = []
        for batch in denied_batches:
            result.append({
                'id': batch.id,
                'submitted_by': f"{batch.first_name or ''} {batch.last_name or ''}".strip(),
                'department': batch.department or "NONE",
                'program_name': batch.program_name or "NONE",
                'year_semester': f"{batch.semester or ''} Sem {batch.school_year or ''}",
                'reason': batch.comment or "No reason provided"
            })

        return jsonify({'success': True, 'batches': result})
    except Exception as e:
        app.logger.error(f"Error fetching denied batches: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/registrar', methods=['GET', 'POST'])
def registrar():
    return render_template('Registrar.html')

@app.route('/finance', methods=['GET', 'POST'])
def finance():
    return render_template('finance.html')

@app.route('/get_assigned_payments')
def get_assigned_payments():
    try:
        assigned_payments = db.session.query(
            TeachingLoad.id,
            User.first_name,
            User.last_name,
            Program.program_name,
            Department.department,
            YearSemester.school_year,
            YearSemester.semester,
            db.func.count(TeachingLoadSubject.id).label('subject_count'),
            PaymentScheme.payment_name,
            PaymentAssignment.payment_plan,
            PaymentAssignment.total_amount
        ).join(
            User, TeachingLoad.submitted_by == User.id
        ).outerjoin(  # Changed to outerjoin for Program
            Program, TeachingLoad.program_id == Program.id
        ).outerjoin(  # Changed to outerjoin for Department
            Department,
            (TeachingLoad.department_id == Department.id) |
            (Program.department_id == Department.id)
        ).join(
            YearSemester, TeachingLoad.year_semester_id == YearSemester.id
        ).join(
            TeachingLoadSubject, TeachingLoadSubject.teaching_load_id == TeachingLoad.id
        ).join(
            PaymentAssignment, PaymentAssignment.teaching_load_id == TeachingLoad.id
        ).join(
            PaymentScheme, PaymentAssignment.payment_scheme_id == PaymentScheme.id
        ).filter(
            TeachingLoad.finance_status == 'approved'
        ).group_by(
            TeachingLoad.id,
            User.first_name,
            User.last_name,
            Program.program_name,
            Department.department,
            YearSemester.school_year,
            YearSemester.semester,
            PaymentScheme.payment_name,
            PaymentAssignment.payment_plan,
            PaymentAssignment.total_amount
        ).order_by(
            PaymentAssignment.assigned_at.desc()
        ).all()

        result = [{
            'id': payment.id,
            'submitted_by': f"{payment.first_name} {payment.last_name}",
            'program_name': payment.program_name or "NONE",  # Added null handling
            'department': payment.department or "NONE",      # Added null handling
            'subject_count': payment.subject_count,
            'year_semester': f"{payment.semester} Sem {payment.school_year}",
            'scheme_name': payment.payment_name,
            'payment_plan': payment.payment_plan,
            'total_amount': payment.total_amount
        } for payment in assigned_payments]

        return jsonify({'success': True, 'assigned_payments': result})

    except Exception as e:
        app.logger.error(f"Error fetching assigned payments: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/assign-payment', methods=['POST'])
def assign_payment():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Not logged in'}), 401

        data = request.json
        batch_id = data['batch_id']
        scheme_id = data['payment_scheme_id']
        plan = data['payment_plan']

        teaching_load = db.session.get(TeachingLoad, batch_id)
        scheme = db.session.get(PaymentScheme, scheme_id)

        if not teaching_load or not scheme:
            return jsonify({'success': False, 'error': 'Invalid batch or scheme'}), 400

        subjects = teaching_load.subjects

        # Fee calculations
        tuition_fee = nstp_fee = com_lab_fee = laboratory_fee = school_lecture_fee = clinic_fee = 0

        for subj in subjects:
            subject_obj = db.session.get(Subject, subj.subject_id)
            if not subject_obj:
                continue

            if subject_obj.is_nstp:
                nstp_fee += subj.total_units * scheme.unit_fee
            else:
                tuition_fee += subj.total_units * scheme.tuition_fee

            com_lab_fee += subj.com_lab_hours * scheme.com_lab_fee
            laboratory_fee += subj.laboratory_hours * scheme.laboratory_fee  # Fixed typo here
            school_lecture_fee += subj.school_lecture_hours * scheme.school_lecture_fee  # Fixed typo here
            clinic_fee += subj.clinic_hours * scheme.clinic_fee

        total = (
            scheme.regular_fees +
            scheme.misc_fees +
            scheme.lab_fees +
            scheme.rle_fees +
            scheme.aff_fee +
            tuition_fee + nstp_fee +
            com_lab_fee + laboratory_fee +
            school_lecture_fee + clinic_fee
        )

        breakdown = {
            'regular_fees': scheme.regular_fees,
            'misc_fees': scheme.misc_fees,
            'lab_fees': scheme.lab_fees,
            'rle_fees': scheme.rle_fees,
            'aff_fee': scheme.aff_fee,
            'tuition_fee': tuition_fee,
            'nstp_fee': nstp_fee,
            'com_lab_fee': com_lab_fee,
            'laboratory_fee': laboratory_fee,
            'school_lecture_fee': school_lecture_fee,
            'clinic_fee': clinic_fee
        }

        assignment = PaymentAssignment(
            teaching_load_id=batch_id,
            payment_scheme_id=scheme_id,
            payment_plan=plan,
            total_amount=total,
            breakdown=breakdown,
            assigned_at=datetime.now(UTC),
            assigned_by=session['user_id']
        )

        db.session.add(assignment)
        teaching_load.finance_status = 'approved'
        db.session.commit()

        log_important_action("Payment assigned", f"Batch ID: {batch_id} with scheme: {scheme.payment_name}")
        return jsonify({'success': True, 'message': 'Payment successfully assigned!'})

    except Exception as e:
        app.logger.error(f"Error assigning payment: {str(e)}")
        return jsonify({'success': False, 'error': 'Error assigning payment'}), 400

@app.route('/get_assigned_payment_details/<int:batch_id>', methods=['GET'])
def get_assigned_payment_details(batch_id):
    try:
        # Get the payment assignment details with outer joins
        payment_assignment = db.session.query(
            PaymentAssignment,
            PaymentScheme,
            User,
            TeachingLoad,
            Program,
            Department,
            YearSemester
        ).join(
            PaymentScheme, PaymentAssignment.payment_scheme_id == PaymentScheme.id
        ).join(
            User, PaymentAssignment.assigned_by == User.id
        ).join(
            TeachingLoad, PaymentAssignment.teaching_load_id == TeachingLoad.id
        ).outerjoin(  # Changed to outerjoin for Program
            Program, TeachingLoad.program_id == Program.id
        ).outerjoin(  # Changed to outerjoin for Department
            Department,
            (TeachingLoad.department_id == Department.id) |
            (Program.department_id == Department.id)
        ).join(
            YearSemester, TeachingLoad.year_semester_id == YearSemester.id
        ).filter(
            PaymentAssignment.teaching_load_id == batch_id
        ).first()

        if not payment_assignment:
            return jsonify({'success': False, 'message': 'Payment assignment not found'}), 404

        # Unpack the query result
        assignment, scheme, user, teaching_load, program, department, year_semester = payment_assignment

        # Get all subjects in this batch
        subjects = db.session.query(
            TeachingLoadSubject,
            Subject
        ).join(
            Subject, TeachingLoadSubject.subject_id == Subject.id
        ).filter(
            TeachingLoadSubject.teaching_load_id == batch_id
        ).all()

        # Prepare subjects data with null handling
        subjects_data = []
        for load_subject, subject in subjects:
            subjects_data.append({
                'subject_code': subject.subject_code or "NONE",
                'subject_name': subject.subject_name or "NONE",
                'total_units': load_subject.total_units or 0,
                'lecture': load_subject.lecture_hours or 0,
                'com_lab': load_subject.com_lab_hours or 0,
                'laboratory': load_subject.laboratory_hours or 0,
                'school_lecture': load_subject.school_lecture_hours or 0,
                'clinic': load_subject.clinic_hours or 0,
                'subject_type': subject.subject_type.name if subject.subject_type else 'N/A',
                'is_nstp': subject.is_nstp if subject.is_nstp is not None else False
            })

        # Calculate totals from subjects with null safety
        total_com_lab_units = sum(subj.get('com_lab', 0) for subj in subjects_data)
        total_lab_units = sum(subj.get('laboratory', 0) for subj in subjects_data)
        total_cl_units = sum(subj.get('school_lecture', 0) for subj in subjects_data)
        total_c_units = sum(subj.get('clinic', 0) for subj in subjects_data)

        # Calculate tuition and NSTP units with null safety
        tuition_units = 0
        nstp_units = 0
        for subj in subjects_data:
            if subj.get('is_nstp', False):
                nstp_units += subj.get('total_units', 0)
            else:
                tuition_units += subj.get('total_units', 0)

        # Calculate fees with null safety
        total_com_lab_fee = total_com_lab_units * (scheme.com_lab_fee or 0)
        total_lab_fee = total_lab_units * (scheme.laboratory_fee or 0)
        total_cl_fee = total_cl_units * (scheme.school_lecture_fee or 0)
        total_c_fee = total_c_units * (scheme.clinic_fee or 0)
        total_tuition_fee = tuition_units * (scheme.tuition_fee or 0)
        total_nstp_fee = nstp_units * (scheme.unit_fee or 0)

        regular_total = scheme.regular_fees or 0
        misc_total = scheme.misc_fees or 0
        aff_total = scheme.aff_fee or 0

        subtotal = (
            regular_total +
            misc_total +
            total_com_lab_fee +
            total_lab_fee +
            total_cl_fee +
            total_c_fee +
            aff_total +
            total_tuition_fee +
            total_nstp_fee
        )

        # Calculate payment plan breakdown with null safety
        breakdown = {
            'plan': assignment.payment_plan or "NONE",
            'subtotal': subtotal,
            'total': assignment.total_amount or 0
        }

        if assignment.payment_plan == 'cash':
            discount = subtotal * 0.05
            breakdown['discount'] = discount
            breakdown['total_to_pay'] = subtotal - discount
        elif assignment.payment_plan == 'planA':
            downpayment = 500
            breakdown['downpayment'] = downpayment
            breakdown['remaining'] = subtotal - downpayment
        elif assignment.payment_plan == 'planB':
            downpayment = regular_total + misc_total
            breakdown['downpayment'] = downpayment
            breakdown['remaining'] = subtotal - downpayment
            breakdown['monthly_payment'] = breakdown['remaining'] / 4 if breakdown['remaining'] > 0 else 0

        # Prepare the response with consistent null handling
        response = {
            'success': True,
            'payment_details': {
                'id': assignment.id,
                'batch_id': assignment.teaching_load_id,
                'payment_scheme': {
                    'id': scheme.id,
                    'payment_name': scheme.payment_name or "NONE",
                    'regular_fees': regular_total,
                    'misc_fees': misc_total,
                    'com_lab_fee': scheme.com_lab_fee or 0,
                    'laboratory_fee': scheme.laboratory_fee or 0,
                    'school_lecture_fee': scheme.school_lecture_fee or 0,
                    'clinic_fee': scheme.clinic_fee or 0,
                    'aff_fee': aff_total,
                    'tuition_fee': scheme.tuition_fee or 0,
                    'unit_fee': scheme.unit_fee or 0
                },
                'payment_plan': assignment.payment_plan or "NONE",
                'assigned_at': assignment.assigned_at.isoformat() if assignment.assigned_at else None,
                'assigned_by': f"{user.first_name or ''} {user.last_name or ''}".strip() or "NONE",
                'department': department.department if department else "NONE",
                'program_name': program.program_name if program else "NONE",
                'submitted_by': (
                    f"{teaching_load.submitted_by_user.first_name or ''} "
                    f"{teaching_load.submitted_by_user.last_name or ''}"
                ).strip() or "NONE",
                'year_semester': (
                    f"{year_semester.semester or ''} Sem "
                    f"{year_semester.school_year or ''}"
                ).strip(),
                'subject_count': len(subjects_data),
                'subjects': subjects_data,
                'breakdown': breakdown,
                'totals': {
                    'regular_fees': regular_total,
                    'misc_fees': misc_total,
                    'com_lab_fee': total_com_lab_fee,
                    'laboratory_fee': total_lab_fee,
                    'school_lecture_fee': total_cl_fee,
                    'clinic_fee': total_c_fee,
                    'aff_fee': aff_total,
                    'tuition_fee': total_tuition_fee,
                    'nstp_fee': total_nstp_fee,
                    'subtotal': subtotal,
                    'total': assignment.total_amount or 0
                },
                'units': {
                    'com_lab': total_com_lab_units,
                    'laboratory': total_lab_units,
                    'school_lecture': total_cl_units,
                    'clinic': total_c_units,
                    'tuition': tuition_units,
                    'nstp': nstp_units
                }
            }
        }

        return jsonify(response)

    except Exception as e:
        app.logger.error(f"Error fetching payment details: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# =============================================
# Payment Scheme Routes
# =============================================

@app.route('/payment-schemes', methods=['GET'])
def get_payment_schemes():
    try:
        # Query all payment schemes from the database
        schemes = PaymentScheme.query.all()

        # Convert the schemes to a list of dictionaries
        schemes_list = []
        for scheme in schemes:
            schemes_list.append({
                'id': scheme.id,
                'payment_name': scheme.payment_name,
                'regular_fees': scheme.regular_fees,
                'misc_fees': scheme.misc_fees,
                'lab_fees': scheme.lab_fees,
                'rle_fees': scheme.rle_fees,
                'aff_fee': scheme.aff_fee,
                'tuition_fee': scheme.tuition_fee,
                'unit_fee': scheme.unit_fee,
                'com_lab_fee': scheme.com_lab_fee,
                'laboratory_fee': scheme.laboratory_fee,
                'school_lecture_fee': scheme.school_lecture_fee,
                'clinic_fee': scheme.clinic_fee
            })

        return jsonify(schemes_list), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/payment-schemes/<int:scheme_id>', methods=['GET'])
def get_payment_scheme(scheme_id):
    try:
        scheme = PaymentScheme.query.get_or_404(scheme_id)

        return jsonify({
            'id': scheme.id,
            'payment_name': scheme.payment_name,
            'regular_fees': scheme.regular_fees,
            'misc_fees': scheme.misc_fees,
            'lab_fees': scheme.lab_fees,
            'rle_fees': scheme.rle_fees,
            'aff_fee': scheme.aff_fee,
            'tuition_fee': scheme.tuition_fee,
            'unit_fee': scheme.unit_fee,
            'com_lab_fee': scheme.com_lab_fee,
            'laboratory_fee': scheme.laboratory_fee,
            'school_lecture_fee': scheme.school_lecture_fee,
            'clinic_fee': scheme.clinic_fee
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/payment-schemes', methods=['POST'])
def create_payment_scheme():
    try:
        data = request.get_json()

        # Calculate totals for regular and misc fees
        regular_total = sum(float(item['amount']) for item in data.get('regular_fees', []))
        misc_total = sum(float(item['amount']) for item in data.get('misc_fees', []))

        # Calculate lab fees (assuming these are per-unit fees)
        # You might want to adjust these calculations based on your business logic
        lab_fees = float(data.get('com_lab_fee', 0)) + float(data.get('laboratory_fee', 0))

        # Calculate RLE fees
        rle_fees = float(data.get('school_lecture_fee', 0)) + float(data.get('clinic_fee', 0))

        # Create new payment scheme
        new_scheme = PaymentScheme(
            payment_name=data['payment_name'],
            regular_fees=regular_total,
            misc_fees=misc_total,
            lab_fees=lab_fees,
            rle_fees=rle_fees,
            aff_fee=float(data.get('aff_fee', 0)),
            tuition_fee=float(data.get('tuition_fee', 0)),
            unit_fee=float(data.get('unit_fee', 0)),
            com_lab_fee=float(data.get('com_lab_fee', 0)),
            laboratory_fee=float(data.get('laboratory_fee', 0)),
            school_lecture_fee=float(data.get('school_lecture_fee', 0)),
            clinic_fee=float(data.get('clinic_fee', 0))
        )

        db.session.add(new_scheme)
        db.session.commit()

        log_important_action("Payment scheme created", f"{data['payment_name']}")
        return jsonify({'message': 'Payment scheme created successfully', 'id': new_scheme.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/payment-schemes/<int:scheme_id>', methods=['DELETE'])
def delete_payment_scheme(scheme_id):
    try:
        scheme = PaymentScheme.query.get_or_404(scheme_id)

        db.session.delete(scheme)
        db.session.commit()

        return jsonify({'message': 'Payment scheme deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def create_default_admin():
    # Check if admin already exists
    admin = User.query.filter_by(email='admin.admin@gmail.com').first()
    if not admin:
        # Create new admin user
        admin_user = User(
            first_name='Admin',
            last_name='User',
            email='admin.admin@gmail.com',
            user_type='admin',
            department_id=None,
            programs=None
        )
        admin_user.set_password('admin112233')  # Set the password
        db.session.add(admin_user)
        db.session.commit()
        print("Default admin user created successfully")

@app.route('/users/<int:id>', methods=['DELETE'])
def delete_user(id):
    user = User.query.get_or_404(id)

    # Prevent deletion of default admin
    if user.email == 'admin.admin@gmail.com':
        return jsonify({
            'success': False,
            'message': 'Cannot delete default admin account'
        }), 403

    try:
        log_important_action("User deleted", f"ID: {id} - {user.email}")
        db.session.delete(user)
        db.session.commit()
        return jsonify({'success': True, 'message': 'User deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

with app.app_context():
    db.create_all()
    create_default_admin()  # Add this line to create default admin

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 3000)))
