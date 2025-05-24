from flask import Flask, request, jsonify, render_template, session
from models import db, Subject, SubmittedSubject, Notification, PaymentScheme
from flask_sqlalchemy import SQLAlchemy
from collections import defaultdict
from sqlalchemy import or_
app = Flask(__name__)

# Configure the database URI (using SQLite)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///MainDatabase.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = "6iwFfSCUT6eoaNCLo01v7V+kq32h3ohSkAfZdFjy3TM="

# Initialize database with the app
db.init_app(app)

saved_batches = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/add_subject', methods=['POST'])
def add_subject():
    data = request.json
    new_subject = Subject(
        subject_code=data.get('subject_code'),
        subject_name=data.get('subject_name'),
        year_level=data.get('year_level'),
        department=data.get('department'),
        lecture=data.get('lecture', 0),
        com_lab=data.get('com_lab', 0),
        laboratory=data.get('laboratory', 0),
        school_lecture=data.get('school_lecture', 0),
        clinic=data.get('clinic', 0),
        subject_type=data.get('subject_type'),
        subject_nstp=data.get('subject_nstp')
    )
    db.session.add(new_subject)
    db.session.commit()
    return jsonify({"message": "Subject added successfully"})

approved_subject_list = []


@app.route('/registrar', methods=['GET', 'POST'])
def registrar():
    return render_template('Registrar.html')

@app.route('/finance', methods=['GET', 'POST'])
def finance():
    # sample_data = session.get('approved_subjects', [])
    global approved_subject_list
    subject_codes = approved_subject_list

    # subject_codes = ['lemao', 'flemao', 'NET101']

    # Query for all subjects with subject_code in the provided list
    subjects = SubmittedSubject.query.filter(SubmittedSubject.subject_code.in_(subject_codes)).all()

    # Prepare the data to be passed to the template
    subjects_data = []
    for subject in subjects:
        subjects_data.append({
            "id": subject.id,
            "professor_id": subject.professor_id,
            "subject_code": subject.subject_code,
            "subject_name": subject.subject_name,
            "department": subject.department,
            "year_level": subject.year_level,
            "lecture": subject.lecture,
            "com_lab": subject.com_lab,
            "laboratory": subject.laboratory,
            "school_lecture": subject.school_lecture,
            "clinic": subject.clinic,
            "subject_type": subject.subject_type,
            "subject_nstp": subject.subject_nstp
        })
    # approved_subject_list.clear()

    return render_template('Finance.html', subjects_data=subjects_data)

@app.route('/paymentscheme')
def paymentscheme():
    return render_template('paymentscheme.html')

@app.route('/get_subjects', methods=['GET'])
def get_subjects():
    subjects = Subject.query.all()
    return jsonify([{
        'id': subject.id,
        'subject_code': subject.subject_code,
        'subject_name': subject.subject_name,
        'year_level': subject.year_level,
        'department': subject.department,
        'lecture': subject.lecture,
        'com_lab': subject.com_lab,
        'laboratory': subject.laboratory,
        'school_lecture': subject.school_lecture,
        'clinic': subject.clinic,
        'subject_type': subject.subject_type,
        'subject_nstp': subject.subject_nstp
    } for subject in subjects])

@app.route('/delete_subject/<int:subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    subject = Subject.query.get(subject_id)
    if subject:
        db.session.delete(subject)
        db.session.commit()
        return jsonify({"message": "Subject deleted successfully"})
    return jsonify({"error": "Subject not found"}), 404

@app.route('/admin')
def professor():
    return render_template('admin.html')

@app.route('/get_departments', methods=['GET'])
def get_departments():
    """Get all unique departments"""
    departments = db.session.query(Subject.department).distinct().all()
    return jsonify([department[0] for department in departments])

@app.route('/get_years_by_department/<department>', methods=['GET'])
def get_years_by_department(department):
    """Get year levels for a specific department"""
    years = db.session.query(Subject.year_level).filter_by(department=department).distinct().all()
    return jsonify([year[0] for year in sorted(years)])

@app.route('/get_subjects_by_department_and_year/<department>/<year>', methods=['GET'])
def get_subjects_by_department_and_year(department, year):
    """Get subjects for a specific department and year level"""
    subjects = Subject.query.filter_by(department=department, year_level=year).all()
    return jsonify([{
        'id': subject.id,
        'subject_code': subject.subject_code,
        'subject_name': subject.subject_name,
        'department': subject.department,
        'year_level': subject.year_level,
        'lecture': subject.lecture,
        'com_lab': subject.com_lab,
        'laboratory': subject.laboratory,
        'school_lecture': subject.school_lecture,
        'clinic': subject.clinic,
        'subject_type': subject.subject_type,
        'subject_nstp': subject.subject_nstp
    } for subject in subjects])

@app.route('/save_batch', methods=['POST'])
def save_batch():
    data = request.json
    professor_id = data['professorId']
    subjects = data['subjects']

    # Remove existing subjects for this professor (if any)
    try:
        SubmittedSubject.query.filter_by(professor_id=professor_id).delete()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete existing subjects."}), 500

    # Save new subjects
    for subj in subjects:
        new_subject = SubmittedSubject(
            subject_code=subj['code'],
            subject_name=subj['name'],
            department=subj['department'],
            year_level=subj['year'],
            professor_id=professor_id,
            lecture=subj['lecture'],
            com_lab=subj['com_lab'],
            laboratory=subj['laboratory'],
            school_lecture=subj['school_lecture'],
            clinic=subj['clinic'],
            subject_type=subj['subject_type'],
            subject_nstp=subj['subject_nstp'],
            approved_denied="False",
            assigned="False",
            status="Saved" # Initial status
        )
        db.session.add(new_subject)

    db.session.commit()
    return jsonify({"message": "Batch saved successfully"})

@app.route('/get_submitted_batches')
def get_submitted_batches():
    # Fetch all submitted subjects
    subjects = SubmittedSubject.query.all()

    # Group subjects by professor_id
    batches_dict = defaultdict(list)
    for subj in subjects:
        batches_dict[subj.professor_id].append(subj)

    # Build list of batches
    batches = []
    for professor_id, subjects_list in batches_dict.items():
        total_subjects = len(subjects_list)
        total_units = sum(subject.units for subject in subjects_list)

        subjects_data = []
        for s in subjects_list:
            subjects_data.append({
                'code': s.subject_code,
                'name': s.subject_name,
                'department': s.department,
                'year': s.year_level,
                'lecture': s.lecture,
                'com_lab': s.com_lab,
                'laboratory': s.laboratory,
                'school_lecture': s.school_lecture,
                'clinic': s.clinic,
                'subject_type': s.subject_type,
                'subject_nstp': s.subject_nstp,
                'approved_denied': s.approved_denied,
                'assigned': s.assigned,
                'status': s.status,
                'comment': s.comment

            })

        batches.append({
            'professorId': professor_id,
            'totalSubjects': total_subjects,
            'subjects': subjects_data
        })

    return jsonify(batches)  # Fixed indentation


@app.route("/submit_subjects", methods=["POST"])
def submit_subjects():
    data = request.json

    # Validate the incoming data
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid data format."}), 400

    professor_id = data.get("professor_id")
    if not professor_id:
        return jsonify({"error": "Professor ID not provided."}), 400

    subjects = data.get("subjects")
    if not isinstance(subjects, list) or not subjects:
        return jsonify({"error": "Subjects list is either missing or empty."}), 400

    # Begin a transaction
    try:
        for subject in subjects:
            # Each subject needs to have its required fields
            new_submission = SubmittedSubject(
                professor_id=professor_id,
                subject_code=subject.get("subject_code"),
                subject_name=subject.get("subject_name"),
                department=subject.get("department", "Unknown"),
                year_level=subject.get("year_level"),
                lecture=subject.get('lecture', 0),
                com_lab=subject.get('com_lab', 0),
                laboratory=subject.get('laboratory', 0),
                school_lecture=subject.get('school_lecture', 0),
                clinic=subject.get('clinic', 0),
                subject_type=subject.get('subject_type'),
                subject_nstp=subject.get('subject_nstp'),
                approved_denied="False",
                assigned="False",
                status="Saved",
                reg_fee=subject.get("reg_fee", 0.0),
                misc_fee=subject.get("misc_fee", 0.0),
                affi_fee=subject.get("affi_fee", 0.0)
            )
            db.session.add(new_submission)

        db.session.commit()  # Commit all submissions at once
        return jsonify({"message": "Subjects submitted successfully."}), 200  # 200 Created status
    except Exception as e:
        db.session.rollback()  # Rollback the session on error
        print(f"Database error: {e}")  # Log the error
        return jsonify({"error": "An error occurred during submission."}), 500  # Internal Server Error

@app.route('/delete_subjects_by_professor/<int:professor_id>', methods=['DELETE'])
def delete_subjects_by_professor(professor_id):
    try:
        num_deleted = db.session.query(SubmittedSubject).filter_by(professor_id=professor_id).delete()
        db.session.commit()
        return jsonify({"message": f"Deleted {num_deleted} subjects for Professor ID {professor_id}"}), 200
    except:
        db.session.rollback()
        return jsonify({"error": "Failed to delete subjects"}), 500

@app.route('/get_submitted_subjects', methods=['GET'])
def get_submitted_subjects():
    try:
        # Query only subjects where approved_denied is False
        subjects = SubmittedSubject.query.filter_by(approved_denied="False").all()
        subjects_list = []

        for subject in subjects:
            subjects_list.append({
                "id": subject.id,
                "professor_id": subject.professor_id,
                "subject_code": subject.subject_code,
                "subject_name": subject.subject_name,
                "department": subject.department,
                "year_level": subject.year_level,
                'lecture': subject.lecture,
                'com_lab': subject.com_lab,
                'laboratory': subject.laboratory,
                'school_lecture': subject.school_lecture,
                'clinic': subject.clinic,
                'subject_type': subject.subject_type,
                'subject_nstp': subject.subject_nstp,
                "approved_denied": subject.approved_denied,
                "assigned": subject.assigned,
                "status": subject.status,
                "comment": subject.comment
            })

        if not subjects_list:
            return jsonify([]), 200  # Return an empty list if no subjects found

        return jsonify(subjects_list), 200
    except Exception as e:
        print(f"Error fetching subjects: {e}")
        return jsonify({"error": "An error occurred while fetching subjects."}), 500

@app.route('/get_approved_subjects', methods=['POST', 'GET'])
def get_approved_subjects():
    try:
        # Query only subjects where approved_denied is "True" and assigned is False
        subjects = SubmittedSubject.query.filter_by(approved_denied="True", assigned="False").all()
        subjects_list = []

        for subject in subjects:
            subjects_list.append({
                "id": subject.id,
                "professor_id": subject.professor_id,
                "subject_code": subject.subject_code,
                "subject_name": subject.subject_name,
                "department": subject.department,
                "year_level": subject.year_level,
                'lecture': subject.lecture,
                'com_lab': subject.com_lab,
                'laboratory': subject.laboratory,
                'school_lecture': subject.school_lecture,
                'clinic': subject.clinic,
                'subject_type': subject.subject_type,
                'subject_nstp': subject.subject_nstp
            })

        return jsonify(subjects_list), 200
    except Exception as e:
        print(f"Error fetching subjects: {e}")
        return jsonify({"error": "An error occurred while fetching subjects."}), 500


@app.route('/get_denied_subjects', methods=['GET'])
def get_denied_subjects():
    try:
        # Fetch all denied notifications
        notifications = Notification.query.filter(Notification.status == "Denied").all()
        denied_subjects = []

        for notification in notifications:
            denied_subjects.append({
                "id": notification.id,
                "professor_id": notification.professor_id,
                "subject_code": notification.subject_code,
                "subject_name": notification.subject_name,
                "department": notification.department,
                "year_level": notification.year_level,
                "comment": notification.comment,
                "lecture": notification.lecture,
                "com_lab": notification.com_lab,
                "laboratory": notification.laboratory,
                "school_lecture": notification.school_lecture,
                "clinic": notification.clinic,
                "subject_type": notification.subject_type,
                "subject_nstp": notification.subject_nstp
            })

        return jsonify(denied_subjects), 200
    except Exception as e:
        print("Failed to fetch denied subjects", e)
        return jsonify({"error": "Failed to fetch denied subjects"}), 500

@app.route('/approve_subject', methods=['POST'])
def approve_subject():
    data = request.json

    # Ensure that the required fields are present in the incoming data
    if not all(key in data for key in ['professor_id', 'subject_code', 'subject_name', 'department', 'year_level', 'lecture','com_lab', 'laboratory', 'school_lecture','clinic','subject_type','subject_nstp']):
        return jsonify({"error": "Missing required fields"}), 400

    # Find the submitted subject by subject_code
    subject_code = data.get('subject_code')
    subject = SubmittedSubject.query.filter_by(subject_code=subject_code).first()

    if not subject:
        return jsonify({"error": "Subject not found"}), 404  # Return 404 if subject does not exist

    # Set approved_denied to True
    subject.approved_denied = "True"
    subject.assigned = "False"

    # Create a new notification
    new_notification = Notification(
        professor_id=data.get('professor_id'),
        subject_code=data.get('subject_code'),
        subject_name=data.get('subject_name'),
        department=data.get('department'),
        year_level=data.get('year_level'),
        lecture=data.get('lecture', 0),
        com_lab=data.get('com_lab', 0),
        laboratory=data.get('laboratory', 0),
        school_lecture=data.get('school_lecture', 0),
        clinic=data.get('clinic', 0),
        subject_type=data.get('subject_type'),
        subject_nstp=data.get('subject_nstp'),
        status=data.get('status'),  # Set a default status or get it from the data if needed
        approved_by=data.get('approved_by')
    )

    try:
        db.session.add(new_notification)
        db.session.commit()
        return jsonify({"message": "Subject added successfully"}), 200  # Return 201 Created status
    except Exception as e:
        db.session.rollback()  # Rollback the session in case of error
        print("Error adding subject:", e)
        return jsonify({"error": "Failed to add subject"}), 500  # Return 500 Internal Server Error

@app.route('/approve_all_subjects', methods=['POST'])
def approve_all_subjects():
    data = request.json

    # Check if professor_id is provided
    if 'professor_id' not in data:
        return jsonify({"error": "professor_id is required"}), 400

    professor_id = data['professor_id']
    approved_by = data.get('approved_by', 'Registrar')
    subject_ids = data.get('subject_ids', [])

    try:
        # Base query for this professor's subjects
        query = SubmittedSubject.query.filter_by(professor_id=professor_id)

        # Filter for specific subjects if IDs are provided
        if subject_ids:
            query = query.filter(SubmittedSubject.id.in_(subject_ids))

        # Get only pending subjects (not approved and not assigned)
        submitted_subjects = query.filter(
            or_(
                SubmittedSubject.approved_denied == "False",
                SubmittedSubject.approved_denied == None
            ),
            or_(
                SubmittedSubject.assigned == "False",
                SubmittedSubject.assigned == None
            )
        ).all()

        if not submitted_subjects:
            return jsonify({
                "message": "No pending subjects found for approval",
                "count": 0
            }), 200

        approved_count = 0
        for subject in submitted_subjects:
            try:
                subject.approved_denied = "True"
                approved_count += 1

                new_notification = Notification(
                    professor_id=subject.professor_id,
                    subject_code=subject.subject_code,
                    subject_name=subject.subject_name,
                    department=subject.department,
                    year_level=subject.year_level,
                    lecture=subject.lecture,
                    com_lab=subject.com_lab,
                    laboratory=subject.laboratory,
                    school_lecture=subject.school_lecture,
                    clinic=subject.clinic,
                    subject_type=subject.subject_type,
                    subject_nstp=subject.subject_nstp,
                    status="Approved",
                    approved_by=approved_by,
                    comment="Bulk approved",
                    reg_fee=subject.reg_fee if subject.reg_fee is not None else 0.0,
                    misc_fee=subject.misc_fee if subject.misc_fee is not None else 0.0,
                    affi_fee=subject.affi_fee if subject.affi_fee is not None else 0.0
                )

                db.session.add(new_notification)
            except Exception as e:
                db.session.rollback()
                print(f"Error approving subject {subject.id}: {str(e)}")
                continue

        db.session.commit()
        return jsonify({
            "message": f"Successfully approved {approved_count} subjects",
            "count": approved_count,
            "professor_id": professor_id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in approve_all_subjects: {str(e)}")
        return jsonify({
            "error": "Failed to approve subjects",
            "details": str(e)
        }), 500

@app.route('/deny_subject', methods=['POST'])
def deny_subject():
    data = request.json

    # Required fields validation
    required_fields = ['id', 'professor_id', 'subject_code', 'comment']
    if not all(key in data for key in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    # Find the subject to deny
    subject = SubmittedSubject.query.get(data['id'])
    if not subject:
        return jsonify({"error": "Subject not found"}), 404

    try:
        # Update the subject status directly in SubmittedSubjects table
        subject.status = "Denied"
        subject.comment = data['comment']
        subject.approved_denied = True
        subject.assigned = False

        # Create notification record
        new_notification = Notification(
            professor_id=data['professor_id'],
            subject_code=subject.subject_code,
            subject_name=subject.subject_name,
            department=subject.department,
            year_level=subject.year_level,
            lecture=subject.lecture,
            com_lab=subject.com_lab,
            laboratory=subject.laboratory,
            school_lecture=subject.school_lecture,
            clinic=subject.clinic,
            subject_type=subject.subject_type,
            subject_nstp=subject.subject_nstp,
            status="Denied",
            approved_by="Registrar",
            comment=data['comment'],
            reg_fee=subject.reg_fee if subject.reg_fee is not None else 0,
            misc_fee=subject.misc_fee if subject.misc_fee is not None else 0,
            affi_fee=subject.affi_fee if subject.affi_fee is not None else 0,
        )

        db.session.add(new_notification)
        db.session.commit()

        # Return minimal success response
        return jsonify({
            "success": True,
            "message": "Subject denied successfully",
            "subject_id": subject.id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error denying subject {data['id']}: {str(e)}")
        return jsonify({
            "error": "Failed to deny subject",
            "details": str(e)
        }), 500


@app.route('/get_notifications', methods=['GET'])
def get_notifications():
    try:
        # Fetch notifications that are approved by Registrar
        notifications = Notification.query.filter(Notification.approved_by == "Registrar").all()
        notification_list = []


        # Create a list of dictionaries representing each notification
        for notification in notifications:
            notification_list.append({
                "id": notification.id,
                "professor_id": notification.professor_id,
                "subject_code": notification.subject_code,
                "subject_name": notification.subject_name,
                "department": notification.department,
                "year_level": notification.year_level,
                "status": notification.status,
                "comment": notification.comment,
                "lecture": notification.lecture,
                "com_lab": notification.com_lab,
                "laboratory": notification.laboratory,
                "school_lecture": notification.school_lecture,
                "clinic": notification.clinic,
                "subject_type": notification.subject_type,
                "subject_nstp": notification.subject_nstp
            })

        return jsonify(notification_list), 200  # Return the list of notifications with 200 OK status
    except Exception as e:
        print("Failed to fetch notifications", e)
        return jsonify({"error": "Failed to fetch notification data"}), 500  # Return 500 Internal Server Error

@app.route('/get_notifications_dean', methods=['GET'])
def get_notifications_dean():
    try:
        notifications = Notification.query.filter(Notification.approved_by == "Finance").all()
        notification_list = []

        for notification in notifications:
            notification_list.append({
                "id": notification.id,
                "professor_id": notification.professor_id,
                "subject_code": notification.subject_code,
                "subject_name": notification.subject_name,
                "department": notification.department,
                "year_level": notification.year_level,
                "status": notification.status,
                "lecture": notification.lecture,
                "com_lab": notification.com_lab,
                "laboratory": notification.laboratory,
                "school_lecture": notification.school_lecture,
                "clinic": notification.clinic,
                "subject_type": notification.subject_type,
                "subject_nstp": notification.subject_nstp
            })


        return jsonify(notification_list), 200
    except Exception as e:
        print("Failed to fetch notification", e)
        return jsonify({"error": "Failed to fetch notification data"}), 500

@app.route("/assign_payments", methods=['POST'])
def assign_payments():
    data = request.json

    # Validate incoming payload
    if not data or 'professor_id' not in data or 'scheme_id' not in data or 'payment_plan' not in data or 'subjects' not in data:
        return jsonify({"error": "Missing required fields: professor_id, scheme_id, payment_plan, or subjects"}), 400

    professor_id = data['professor_id']
    scheme_id = data['scheme_id']
    payment_plan = data['payment_plan']
    subject_codes = data['subjects']

    try:
        # Get the payment scheme details - using session.get() instead of query.get()
        scheme = db.session.get(PaymentScheme, scheme_id)
        if not scheme:
            return jsonify({"error": "Payment scheme not found"}), 404

        results = []
        for subject_code in subject_codes:
            if not subject_code:
                results.append({
                    "subject_code": "unknown",
                    "status": "failed",
                    "error": "Subject code not provided"
                })
                continue

            subject = SubmittedSubject.query.filter_by(subject_code=subject_code).first()
            if not subject:
                results.append({
                    "subject_code": subject_code,
                    "status": "failed",
                    "error": "Subject not found"
                })
                continue

            # Update the subject with payment information
            subject.payment_scheme = scheme_id
            subject.payment_plan = payment_plan
            subject.assigned = True
            subject.status = "Payment Assigned"

            # Create notification with only the fields that exist in the model
            new_notification = Notification(
                professor_id=professor_id,
                subject_code=subject.subject_code,
                subject_name=subject.subject_name,
                department=subject.department,
                year_level=subject.year_level,
                status="Payment Assigned",
                approved_by="Finance",
                payment_scheme=scheme_id,
                payment_plan=payment_plan,
                lecture=subject.lecture,
                com_lab=subject.com_lab,
                laboratory=subject.laboratory,
                school_lecture=subject.school_lecture,
                clinic=subject.clinic,
                subject_type=subject.subject_type,
                subject_nstp=subject.subject_nstp,
                reg_fee=scheme.regular_fees or 0,
                misc_fee=scheme.misc_fees or 0,
                affi_fee=scheme.aff_fee or 0
                # Removed lecture_fee, com_lab_fee, etc. as they were causing errors
            )

            db.session.add(new_notification)
            results.append({
                "subject_code": subject_code,
                "status": "success"
            })

        db.session.commit()

        return jsonify({
            "message": "Payments successfully assigned",
            "results": results,
            "professor_id": professor_id
        }), 200

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error assigning payments: {str(e)}")
        return jsonify({"error": "Failed to assign payments", "details": str(e)}), 500

@app.route("/get_assigned_payments", methods=['GET'])  # Changed to plural to match frontend
def get_assigned_payments():  # Renamed function to match route
    professor_id = request.args.get('professor_id')

    if not professor_id:
        return jsonify({"error": "professor_id parameter is required"}), 400

    try:
        # Get all notifications for this professor with payment assignments
        notifications = db.session.query(Notification).filter(
            Notification.professor_id == professor_id,
            Notification.payment_scheme.isnot(None)
        ).all()

        if not notifications:
            return jsonify({"error": "No payment assignments found for this professor"}), 404

        # Group notifications by payment scheme and plan
        assignments = {}
        for notification in notifications:
            key = f"{notification.payment_scheme}-{notification.payment_plan}"
            if key not in assignments:
                assignments[key] = {
                    "scheme_id": notification.payment_scheme,
                    "plan": notification.payment_plan,
                    "subjects": []
                }

            assignments[key]["subjects"].append({
                "subject_code": notification.subject_code,
                "subject_name": notification.subject_name,
                "lecture": notification.lecture,
                "com_lab": notification.com_lab,
                "laboratory": notification.laboratory,
                "school_lecture": notification.school_lecture,
                "clinic": notification.clinic,
                "subject_nstp": notification.subject_nstp,
                "status": notification.status
            })

        # Get scheme details for each assignment
        results = []
        for assignment in assignments.values():
            scheme = db.session.get(PaymentScheme, assignment["scheme_id"])
            if not scheme:
                continue  # Skip if scheme not found

            results.append({
                "scheme": {
                    "id": scheme.id,
                    "payment_name": scheme.payment_name,
                    "regular_fees": scheme.regular_fees,
                    "misc_fees": scheme.misc_fees,
                    "com_lab_fee": scheme.com_lab_fee,
                    "laboratory_fee": scheme.laboratory_fee,
                    "school_lecture_fee": scheme.school_lecture_fee,
                    "clinic_fee": scheme.clinic_fee,
                    "aff_fee": scheme.aff_fee,
                    "tuition_fee": scheme.tuition_fee,
                    "unit_fee": scheme.unit_fee
                },
                "plan": assignment["plan"],
                "subjects": assignment["subjects"]
            })

        if not results:
            return jsonify({"error": "No valid payment assignments found"}), 404

        return jsonify(results), 200

    except Exception as e:
        app.logger.error(f"Error fetching assigned payments: {str(e)}")
        return jsonify({"error": "Failed to fetch assigned payments", "details": str(e)}), 500
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


if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Ensure all database tables are created
    app.run(debug=True)
