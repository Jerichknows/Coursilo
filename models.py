from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from timezone_config import PH_TZ

db = SQLAlchemy()  # Initialize SQLAlchemy

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    user_type = db.Column(db.String(50), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('department.id'))
    programs = db.Column(db.String(255))  # Store comma-separated program codes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    def __init__(self, **kwargs):
        super(User, self).__init__(**kwargs)
        if 'password' in kwargs:
            self.set_password(kwargs['password'])

    def set_password(self, password):
        """Create hashed password."""
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check hashed password."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convert object to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "user_type": self.user_type,
            "department_id": self.department_id,
            "programs": self.programs.split(",") if self.programs else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_active": self.is_active
        }

    def __repr__(self):
        return f'<User {self.email}>'

class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    department_code = db.Column(db.String(50), nullable=False)
    department = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "department_code": self.department_code,
            "department": self.department
        }

class Program(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    program_code = db.Column(db.String(50), nullable=False)
    program_name = db.Column(db.String(100), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('department.id'), nullable=False)

    # ✅ Add this relationship
    department = db.relationship('Department', backref='programs')

    def to_dict(self):
        return {
            "id": self.id,
            "program_code": self.program_code,
            "program_name": self.program_name,
            "department_id": self.department_id,
            "department_name": self.department.department if self.department else None
        }



class YearSemester(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    school_year = db.Column(db.String(20), nullable=False)
    semester = db.Column(db.String(20), nullable=False)
    is_active = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'school_year': self.school_year,
            'semester': self.semester,
            'is_active': self.is_active
        }


class SubjectType(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_code = db.Column(db.String(20), nullable=False)
    subject_name = db.Column(db.String(200), nullable=False)
    year_level = db.Column(db.String(50), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('department.id'), nullable=False)
    lecture = db.Column(db.Integer, default=0)
    com_lab = db.Column(db.Integer, default=0)
    laboratory = db.Column(db.Integer, default=0)
    school_lecture = db.Column(db.Integer, default=0)
    clinic = db.Column(db.Integer, default=0)
    is_nstp = db.Column(db.Boolean, default=False)

    subject_type_id = db.Column(db.Integer, db.ForeignKey('subject_type.id'))
    subject_type = db.relationship('SubjectType', backref='subjects')  # ✅ ADD THIS

    def to_dict(self):
        return {
            "id": self.id,
            "subject_code": self.subject_code,
            "subject_name": self.subject_name,
            "year_level": self.year_level,
            "department_id": self.department_id,
            "department_name": Department.query.get(self.department_id).department if self.department_id else None,
            "lecture": self.lecture,
            "com_lab": self.com_lab,
            "laboratory": self.laboratory,
            "school_lecture": self.school_lecture,
            "clinic": self.clinic,
            "is_nstp": self.is_nstp,
            "subject_type_id": self.subject_type_id,
            "subject_type_name": self.subject_type.name if self.subject_type else None  # ✅ Optional
        }

class TeachingLoadSubject(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    teaching_load_id = db.Column(db.Integer, db.ForeignKey('teaching_load.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    lecture_hours = db.Column(db.Integer, default=0)
    com_lab_hours = db.Column(db.Integer, default=0)
    laboratory_hours = db.Column(db.Integer, default=0)
    school_lecture_hours = db.Column(db.Integer, default=0)
    clinic_hours = db.Column(db.Integer, default=0)
    total_units = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='pending')
    comment = db.Column(db.Text, nullable=True)

class TeachingLoad(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    year_semester_id = db.Column(db.Integer, db.ForeignKey('year_semester.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('program.id'), nullable=False)
    submitted_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    submission_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(20), default='pending')  # pending, approved, denied
    finance_status = db.Column(db.String(20), default='pending')
    comment = db.Column(db.Text, nullable=True)

    # Relationships
    year_semester = db.relationship('YearSemester', backref='teaching_loads')
    program = db.relationship('Program', backref='teaching_loads')
    submitted_by_user = db.relationship('User', foreign_keys=[submitted_by], backref='submitted_teaching_loads')
    subjects = db.relationship('TeachingLoadSubject', backref='teaching_load', cascade='all, delete-orphan')

class PaymentScheme(db.Model):

    __tablename__ = 'payment_schemes'

    id = db.Column(db.Integer, primary_key=True)
    payment_name = db.Column(db.String(100), nullable=False)
    regular_fees = db.Column(db.Integer, nullable=False)
    misc_fees = db.Column(db.Integer, nullable=False)
    lab_fees = db.Column(db.Integer, nullable=False)
    rle_fees = db.Column(db.Integer, nullable=False)
    aff_fee = db.Column(db.Integer, nullable=False)
    tuition_fee = db.Column(db.Integer, nullable=False)
    unit_fee = db.Column(db.Integer, nullable=False)
    com_lab_fee = db.Column(db.Integer, nullable=False)
    laboratory_fee = db.Column(db.Integer, nullable=False)
    school_lecture_fee = db.Column(db.Integer, nullable=False)
    clinic_fee = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PaymentAssignment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    teaching_load_id = db.Column(db.Integer, db.ForeignKey('teaching_load.id'), nullable=False)
    payment_scheme_id = db.Column(db.Integer, db.ForeignKey('payment_schemes.id'), nullable=False)
    payment_plan = db.Column(db.String(50), nullable=False)  # 'cash', 'planA', 'planB'
    total_amount = db.Column(db.Float, nullable=False)
    breakdown = db.Column(db.JSON)  # Stores detailed fee breakdown
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    assigned_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Add this line

    teaching_load = db.relationship('TeachingLoad', backref='payment_assignments')
    payment_scheme = db.relationship('PaymentScheme')
    assigned_by_user = db.relationship('User', foreign_keys=[assigned_by])  # Add this relationship

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(PH_TZ))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    target = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), nullable=False)
    log_metadata = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    user_agent = db.Column(db.String(200), nullable=True)

    user = db.relationship('User', backref='audit_logs')
    
    def to_dict(self):
        from timezone_config import PH_TZ  # Local import to avoid circular dependencies

        if self.timestamp.tzinfo is None:
            ph_timestamp = PH_TZ.localize(self.timestamp)
        else:
            ph_timestamp = self.timestamp.astimezone(PH_TZ)

        return {
            'id': self.id,
            'timestamp': ph_timestamp.isoformat(),
            'user': self.user.email if self.user else 'System',
            'action': self.action,
            'target': self.target,
            'status': self.status,
            'metadata': self.log_metadata,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent
        }
