from flask import Blueprint, request, jsonify, session
from flask_login import login_required, current_user
from backend.models.models import db, Student, SubjectMark, User
from backend.api.analytics import (
    get_all_stats, academic_risk_warning, hidden_talent_detection,
    ai_study_strategy, class_health_score, what_if_simulation,
    peer_comparison, attendance_performance_analysis, leaderboard,
    ai_performance_summary, _student_stats
)

api = Blueprint('api', __name__)


# ── Students CRUD ──────────────────────────────────────────────────────────────

@api.route('/students', methods=['GET'])
@login_required
def list_students():
    dept = request.args.get('dept')
    sem = request.args.get('semester')
    search = request.args.get('search', '').strip()
    q = Student.query
    if dept:
        q = q.filter_by(department=dept)
    if sem:
        q = q.filter_by(semester=int(sem))
    if search:
        q = q.filter(Student.name.ilike(f'%{search}%') | Student.roll_number.ilike(f'%{search}%'))
    students = q.all()
    result = []
    for s in students:
        st = _student_stats(s)
        result.append(st)
    return jsonify(result)


@api.route('/students/<int:sid>', methods=['GET'])
@login_required
def get_student(sid):
    s = Student.query.get_or_404(sid)
    return jsonify(_student_stats(s))


@api.route('/students', methods=['POST'])
@login_required
def add_student():
    data = request.json
    # Check duplicate roll
    if Student.query.filter_by(roll_number=data['roll_number']).first():
        return jsonify({'error': 'Roll number already exists'}), 400
    student = Student(
        name=data['name'],
        roll_number=data['roll_number'],
        department=data['department'],
        semester=int(data['semester']),
        attendance=float(data.get('attendance', 0)),
        email=data.get('email', '')
    )
    db.session.add(student)
    db.session.flush()
    for subj in data.get('subjects', []):
        mark = SubjectMark(
            student_id=student.id,
            subject_name=subj['subject_name'],
            internal_marks=float(subj.get('internal_marks', 0)),
            final_marks=float(subj.get('final_marks', 0)),
            max_internal=30.0,
            max_final=70.0
        )
        db.session.add(mark)
    db.session.commit()
    return jsonify({'message': 'Student added', 'id': student.id}), 201


@api.route('/students/<int:sid>', methods=['PUT'])
@login_required
def update_student(sid):
    student = Student.query.get_or_404(sid)
    data = request.json
    student.name = data.get('name', student.name)
    student.department = data.get('department', student.department)
    student.semester = int(data.get('semester', student.semester))
    student.attendance = float(data.get('attendance', student.attendance))
    student.email = data.get('email', student.email)

    if 'subjects' in data:
        SubjectMark.query.filter_by(student_id=sid).delete()
        for subj in data['subjects']:
            mark = SubjectMark(
                student_id=sid,
                subject_name=subj['subject_name'],
                internal_marks=float(subj.get('internal_marks', 0)),
                final_marks=float(subj.get('final_marks', 0)),
                max_internal=30.0,
                max_final=70.0
            )
            db.session.add(mark)
    db.session.commit()
    return jsonify({'message': 'Student updated'})


@api.route('/students/<int:sid>', methods=['DELETE'])
@login_required
def delete_student(sid):
    student = Student.query.get_or_404(sid)
    db.session.delete(student)
    db.session.commit()
    return jsonify({'message': 'Student deleted'})


# ── Analytics Endpoints ────────────────────────────────────────────────────────

@api.route('/analytics/dashboard', methods=['GET'])
@login_required
def dashboard_data():
    health = class_health_score()
    risk = academic_risk_warning()
    return jsonify({'health': health, 'at_risk_count': len([r for r in risk if r['risk_level'] == 'HIGH'])})


@api.route('/analytics/risk', methods=['GET'])
@login_required
def risk_data():
    return jsonify(academic_risk_warning())


@api.route('/analytics/talents', methods=['GET'])
@login_required
def talents_data():
    return jsonify(hidden_talent_detection())


@api.route('/analytics/class-health', methods=['GET'])
@login_required
def class_health():
    return jsonify(class_health_score())


@api.route('/analytics/attendance', methods=['GET'])
@login_required
def attendance_data():
    return jsonify(attendance_performance_analysis())


@api.route('/analytics/leaderboard', methods=['GET'])
@login_required
def leaderboard_data():
    return jsonify(leaderboard())


@api.route('/analytics/study-strategy/<int:sid>', methods=['GET'])
@login_required
def study_strategy(sid):
    result = ai_study_strategy(sid)
    if not result:
        return jsonify({'error': 'Student not found'}), 404
    return jsonify(result)


@api.route('/analytics/peer-comparison/<int:sid>', methods=['GET'])
@login_required
def peer_comp(sid):
    result = peer_comparison(sid)
    if not result:
        return jsonify({'error': 'Student not found'}), 404
    return jsonify(result)


@api.route('/analytics/what-if/<int:sid>', methods=['POST'])
@login_required
def what_if(sid):
    changes = request.json.get('changes', {})
    result = what_if_simulation(sid, changes)
    if not result:
        return jsonify({'error': 'Student not found'}), 404
    return jsonify(result)


@api.route('/analytics/summary/<int:sid>', methods=['GET'])
@login_required
def performance_summary(sid):
    result = ai_performance_summary(sid)
    if not result:
        return jsonify({'error': 'Student not found'}), 404
    return jsonify(result)


@api.route('/analytics/all-stats', methods=['GET'])
@login_required
def all_stats():
    return jsonify(get_all_stats())


# ── Auth ────────────────────────────────────────────────────────────────────────

@api.route('/auth/login', methods=['POST'])
def login_api():
    from flask_login import login_user
    data = request.json
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password', '')):
        login_user(user)
        return jsonify({'message': 'Login successful', 'role': user.role, 'username': user.username})
    return jsonify({'error': 'Invalid credentials'}), 401


@api.route('/auth/logout', methods=['POST'])
@login_required
def logout_api():
    from flask_login import logout_user
    logout_user()
    return jsonify({'message': 'Logged out'})


@api.route('/auth/me', methods=['GET'])
@login_required
def me():
    return jsonify({'username': current_user.username, 'role': current_user.role})


@api.route('/meta/departments', methods=['GET'])
@login_required
def departments():
    depts = db.session.query(Student.department).distinct().all()
    return jsonify([d[0] for d in depts])


@api.route('/meta/semesters', methods=['GET'])
@login_required
def semesters():
    sems = db.session.query(Student.semester).distinct().order_by(Student.semester).all()
    return jsonify([s[0] for s in sems])
