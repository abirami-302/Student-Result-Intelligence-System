"""
AI Analytics Engine — Student Result Intelligence System
"""
from backend.models.models import Student, SubjectMark, db
import numpy as np

PASS_THRESHOLD = 40.0   # % to pass a subject
RISK_THRESHOLD = 50.0   # % overall to flag at-risk
ATTENDANCE_MIN = 75.0   # minimum attendance %


def _student_stats(student):
    marks = student.marks
    if not marks:
        return None
    percentages = [m.percentage for m in marks]
    avg = np.mean(percentages)
    lowest_subj = min(marks, key=lambda m: m.percentage)
    highest_subj = max(marks, key=lambda m: m.percentage)
    failed = [m.subject_name for m in marks if m.percentage < PASS_THRESHOLD]
    return {
        'id': student.id,
        'name': student.name,
        'roll': student.roll_number,
        'dept': student.department,
        'semester': student.semester,
        'attendance': student.attendance,
        'avg_percentage': round(avg, 2),
        'subject_percentages': {m.subject_name: m.percentage for m in marks},
        'lowest_subject': lowest_subj.subject_name,
        'highest_subject': highest_subj.subject_name,
        'failed_subjects': failed,
        'total_subjects': len(marks),
        'subjects': [{'name': m.subject_name, 'internal': m.internal_marks,
                      'final': m.final_marks, 'total': m.total,
                      'percentage': m.percentage} for m in marks]
    }


def get_all_stats():
    students = Student.query.all()
    stats = [_student_stats(s) for s in students if _student_stats(s)]
    return stats


def academic_risk_warning():
    stats = get_all_stats()
    at_risk = []
    for s in stats:
        risk_score = 0
        reasons = []
        if s['avg_percentage'] < RISK_THRESHOLD:
            risk_score += 40
            reasons.append(f"Low overall avg ({s['avg_percentage']}%)")
        if s['attendance'] < ATTENDANCE_MIN:
            risk_score += 30
            reasons.append(f"Low attendance ({s['attendance']}%)")
        if len(s['failed_subjects']) > 0:
            risk_score += 30 * len(s['failed_subjects'])
            reasons.append(f"Failed: {', '.join(s['failed_subjects'])}")
        if risk_score > 0:
            level = 'HIGH' if risk_score >= 70 else 'MEDIUM' if risk_score >= 40 else 'LOW'
            at_risk.append({**s, 'risk_score': min(risk_score, 100),
                            'risk_level': level, 'reasons': reasons})
    return sorted(at_risk, key=lambda x: -x['risk_score'])


def hidden_talent_detection():
    stats = get_all_stats()
    if not stats:
        return {}

    # Most consistent: lowest std dev of subject percentages
    for s in stats:
        percs = list(s['subject_percentages'].values())
        s['std_dev'] = np.std(percs)

    consistent = sorted(stats, key=lambda x: x['std_dev'])[:3]

    # Top performer
    top = sorted(stats, key=lambda x: -x['avg_percentage'])[:3]

    # Hidden gem: high avg but low attendance (underachiever potential)
    hidden = sorted(
        [s for s in stats if s['attendance'] < 80 and s['avg_percentage'] >= 65],
        key=lambda x: -x['avg_percentage']
    )[:3]

    # Fast learner heuristic: high final marks vs internal (improved during semester)
    fast_learners = []
    for s in stats:
        improvements = []
        for subj in s['subjects']:
            int_pct = (subj['internal'] / 30) * 100 if subj['internal'] else 0
            fin_pct = (subj['final'] / 70) * 100 if subj['final'] else 0
            improvements.append(fin_pct - int_pct)
        s['avg_improvement'] = round(np.mean(improvements), 2)
        fast_learners.append(s)
    fast = sorted(fast_learners, key=lambda x: -x['avg_improvement'])[:3]

    return {
        'consistent_performers': consistent,
        'top_performers': top,
        'hidden_gems': hidden,
        'fast_learners': fast
    }


def ai_study_strategy(student_id):
    student = Student.query.get(student_id)
    if not student:
        return None
    s = _student_stats(student)
    strategies = []
    weak_subjects = sorted(s['subjects'], key=lambda x: x['percentage'])
    for subj in weak_subjects[:3]:
        pct = subj['percentage']
        if pct < PASS_THRESHOLD:
            strategies.append({
                'subject': subj['name'],
                'status': 'CRITICAL',
                'message': f"Immediate attention needed. Focus 4+ hours/week on {subj['name']}.",
                'priority': 'HIGH'
            })
        elif pct < 60:
            strategies.append({
                'subject': subj['name'],
                'status': 'NEEDS IMPROVEMENT',
                'message': f"Dedicate 2-3 hours/week to {subj['name']}. Practice past papers.",
                'priority': 'MEDIUM'
            })
        else:
            strategies.append({
                'subject': subj['name'],
                'status': 'GOOD',
                'message': f"Maintain current pace for {subj['name']}.",
                'priority': 'LOW'
            })
    overall = s['avg_percentage']
    if overall >= 80:
        summary = "Excellent performance! Focus on maintaining consistency and exploring advanced topics."
    elif overall >= 65:
        summary = "Good performance. Work on weaker subjects and aim for distinction."
    elif overall >= 50:
        summary = "Average performance. Create a structured study schedule and seek help for weak areas."
    else:
        summary = "Below average. Consider consulting teachers, study groups, and dedicating extra time daily."

    return {'student': s, 'strategies': strategies, 'overall_summary': summary}


def class_health_score():
    stats = get_all_stats()
    if not stats:
        return {}
    avgs = [s['avg_percentage'] for s in stats]
    pass_count = sum(1 for s in stats if s['avg_percentage'] >= PASS_THRESHOLD)
    health = round(np.mean(avgs), 2)

    dept_health = {}
    for s in stats:
        dept = s['dept']
        if dept not in dept_health:
            dept_health[dept] = []
        dept_health[dept].append(s['avg_percentage'])
    dept_summary = {d: round(np.mean(v), 2) for d, v in dept_health.items()}

    return {
        'overall_health': health,
        'total_students': len(stats),
        'pass_count': pass_count,
        'pass_rate': round((pass_count / len(stats)) * 100, 2),
        'highest_avg': round(max(avgs), 2),
        'lowest_avg': round(min(avgs), 2),
        'dept_health': dept_summary,
        'grade_distribution': {
            'O (90-100)': sum(1 for a in avgs if a >= 90),
            'A+ (80-89)': sum(1 for a in avgs if 80 <= a < 90),
            'A (70-79)': sum(1 for a in avgs if 70 <= a < 80),
            'B+ (60-69)': sum(1 for a in avgs if 60 <= a < 70),
            'B (50-59)': sum(1 for a in avgs if 50 <= a < 60),
            'F (<50)': sum(1 for a in avgs if a < 50),
        }
    }


def what_if_simulation(student_id, subject_changes):
    """subject_changes: {subject_name: {internal: x, final: y}}"""
    student = Student.query.get(student_id)
    if not student:
        return None
    s = _student_stats(student)
    new_subjects = []
    for subj in s['subjects']:
        if subj['name'] in subject_changes:
            ch = subject_changes[subj['name']]
            new_internal = ch.get('internal', subj['internal'])
            new_final = ch.get('final', subj['final'])
            new_total = new_internal + new_final
            new_pct = round((new_total / 100) * 100, 2)
            new_subjects.append({**subj, 'internal': new_internal, 'final': new_final,
                                  'total': new_total, 'percentage': new_pct, 'changed': True})
        else:
            new_subjects.append({**subj, 'changed': False})
    new_avg = round(np.mean([sub['percentage'] for sub in new_subjects]), 2)
    original_avg = s['avg_percentage']
    return {
        'original_avg': original_avg,
        'predicted_avg': new_avg,
        'improvement': round(new_avg - original_avg, 2),
        'subjects': new_subjects,
        'student': s
    }


def peer_comparison(student_id):
    student = Student.query.get(student_id)
    if not student:
        return None
    s = _student_stats(student)
    dept_students = [_student_stats(st) for st in
                     Student.query.filter_by(department=student.department).all()
                     if _student_stats(st)]
    if not dept_students:
        return None
    dept_avgs = [d['avg_percentage'] for d in dept_students]
    topper = max(dept_students, key=lambda x: x['avg_percentage'])
    class_avg = round(np.mean(dept_avgs), 2)
    rank = sorted(dept_students, key=lambda x: -x['avg_percentage'])
    student_rank = next((i + 1 for i, r in enumerate(rank) if r['id'] == student_id), None)
    return {
        'student': s,
        'class_average': class_avg,
        'topper': topper,
        'rank': student_rank,
        'total_in_dept': len(dept_students),
        'percentile': round(((len(dept_students) - student_rank) / len(dept_students)) * 100, 1)
    }


def attendance_performance_analysis():
    stats = get_all_stats()
    data = [{'name': s['name'], 'attendance': s['attendance'],
             'avg_percentage': s['avg_percentage'], 'dept': s['dept']} for s in stats]
    # Correlation
    att = np.array([d['attendance'] for d in data])
    perf = np.array([d['avg_percentage'] for d in data])
    corr = round(float(np.corrcoef(att, perf)[0, 1]), 3)
    return {'data': data, 'correlation': corr}


def leaderboard():
    talents = hidden_talent_detection()
    stats = get_all_stats()
    top10 = sorted(stats, key=lambda x: -x['avg_percentage'])[:10]
    return {
        'top_performers': top10,
        'most_consistent': talents.get('consistent_performers', [])[:5],
        'fast_learners': talents.get('fast_learners', [])[:5],
        'hidden_gems': talents.get('hidden_gems', [])[:5]
    }


def ai_performance_summary(student_id):
    strategy = ai_study_strategy(student_id)
    peer = peer_comparison(student_id)
    if not strategy or not peer:
        return None
    s = strategy['student']
    lines = [
        f"{s['name']} is in {s['dept']}, Semester {s['semester']}.",
        f"Overall average: {s['avg_percentage']}% — Rank {peer['rank']} of {peer['total_in_dept']} in department.",
        f"Attendance: {s['attendance']}%" + (" ⚠️ Below minimum" if s['attendance'] < 75 else " ✅"),
        f"Best subject: {s['highest_subject']}. Needs focus: {s['lowest_subject']}.",
    ]
    if s['failed_subjects']:
        lines.append(f"⚠️ Failed subjects: {', '.join(s['failed_subjects'])}.")
    lines.append(strategy['overall_summary'])
    return {'summary': ' '.join(lines), 'student': s, 'peer': peer, 'strategy': strategy}
