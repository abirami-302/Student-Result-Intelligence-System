import random
from backend.models.models import db, Student, SubjectMark, User

DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Information Technology']

SUBJECTS_BY_DEPT = {
    'Computer Science': ['Data Structures', 'Algorithms', 'DBMS', 'Operating Systems', 'Computer Networks'],
    'Electronics': ['Circuit Theory', 'Digital Electronics', 'Signals & Systems', 'VLSI Design', 'Microprocessors'],
    'Mechanical': ['Thermodynamics', 'Fluid Mechanics', 'Machine Design', 'Manufacturing', 'Heat Transfer'],
    'Civil': ['Structural Analysis', 'Soil Mechanics', 'Hydraulics', 'Concrete Technology', 'Surveying'],
    'Information Technology': ['Web Technologies', 'Cloud Computing', 'Cybersecurity', 'AI & ML', 'Software Engineering'],
}

STUDENTS_DATA = [
    ("Arjun Sharma", "CS001", "Computer Science", 3, 88.5),
    ("Priya Patel", "CS002", "Computer Science", 3, 92.0),
    ("Rahul Verma", "CS003", "Computer Science", 3, 55.0),
    ("Sneha Iyer", "CS004", "Computer Science", 3, 78.5),
    ("Karthik Reddy", "CS005", "Computer Science", 3, 45.0),
    ("Divya Menon", "CS006", "Computer Science", 3, 95.0),
    ("Amit Kumar", "CS007", "Computer Science", 4, 62.0),
    ("Pooja Nair", "CS008", "Computer Science", 4, 80.0),
    ("Vikram Singh", "CS009", "Computer Science", 4, 38.0),
    ("Ananya Das", "CS010", "Computer Science", 4, 71.0),
    ("Rajesh Kumar", "EC001", "Electronics", 3, 74.0),
    ("Meera Krishnan", "EC002", "Electronics", 3, 89.0),
    ("Suresh Babu", "EC003", "Electronics", 3, 42.0),
    ("Lakshmi Priya", "EC004", "Electronics", 3, 91.0),
    ("Naveen Raj", "EC005", "Electronics", 4, 60.0),
    ("Gayathri S", "EC006", "Electronics", 4, 83.0),
    ("Harish M", "EC007", "Electronics", 4, 50.0),
    ("Deepika R", "EC008", "Electronics", 4, 77.0),
    ("Manoj T", "ME001", "Mechanical", 3, 66.0),
    ("Sathya P", "ME002", "Mechanical", 3, 79.0),
    ("Ravi Kumar", "ME003", "Mechanical", 3, 33.0),
    ("Preethi S", "ME004", "Mechanical", 3, 88.0),
    ("Arun Vel", "ME005", "Mechanical", 4, 57.0),
    ("Kavitha N", "ME006", "Mechanical", 4, 93.0),
    ("Bala M", "ME007", "Mechanical", 4, 44.0),
    ("Nithya R", "ME008", "Mechanical", 4, 70.0),
    ("Siva S", "CV001", "Civil", 3, 82.0),
    ("Asha K", "CV002", "Civil", 3, 96.0),
    ("Mani P", "CV003", "Civil", 3, 48.0),
    ("Revathi T", "CV004", "Civil", 3, 75.0),
    ("Vinoth B", "IT001", "Information Technology", 3, 85.0),
    ("Saranya M", "IT002", "Information Technology", 3, 90.0),
    ("Deepak R", "IT003", "Information Technology", 3, 52.0),
    ("Janani S", "IT004", "Information Technology", 3, 67.0),
    ("Kumaravel P", "IT005", "Information Technology", 4, 40.0),
    ("Pavithra A", "IT006", "Information Technology", 4, 87.0),
    ("Senthil K", "IT007", "Information Technology", 4, 61.0),
    ("Yamini D", "IT008", "Information Technology", 4, 94.0),
    ("Gopal V", "CS011", "Computer Science", 5, 73.0),
    ("Hema L", "CS012", "Computer Science", 5, 58.0),
]

def _gen_marks(avg_pct, subjects):
    marks = []
    for subj in subjects:
        base = avg_pct / 100
        noise = random.uniform(-0.15, 0.15)
        pct = max(0.1, min(0.99, base + noise))
        internal = round(pct * 30 + random.uniform(-2, 2), 1)
        internal = max(0, min(30, internal))
        final = round(pct * 70 + random.uniform(-4, 4), 1)
        final = max(0, min(70, final))
        marks.append((subj, internal, final))
    return marks

def seed_data():
    if Student.query.count() > 0:
        return

    # Create default users
    admin = User(username='admin', email='admin@school.edu', role='admin')
    admin.set_password('admin123')
    teacher = User(username='teacher', email='teacher@school.edu', role='teacher')
    teacher.set_password('teacher123')
    db.session.add_all([admin, teacher])

    for name, roll, dept, sem, avg in STUDENTS_DATA:
        student = Student(
            name=name,
            roll_number=roll,
            department=dept,
            semester=sem,
            attendance=round(random.uniform(60, 99), 1),
            email=f"{roll.lower()}@student.edu"
        )
        db.session.add(student)
        db.session.flush()

        subjects = SUBJECTS_BY_DEPT[dept]
        for subj, internal, final in _gen_marks(avg, subjects):
            mark = SubjectMark(
                student_id=student.id,
                subject_name=subj,
                internal_marks=internal,
                final_marks=final,
                max_internal=30.0,
                max_final=70.0
            )
            db.session.add(mark)

    db.session.commit()
    print("✅ Sample data seeded successfully.")
