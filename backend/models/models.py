from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='teacher')  # admin / teacher
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Student(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    roll_number = db.Column(db.String(20), unique=True, nullable=False)
    department = db.Column(db.String(50), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    attendance = db.Column(db.Float, default=0.0)
    email = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    marks = db.relationship('SubjectMark', backref='student', lazy=True, cascade='all, delete-orphan')


class SubjectMark(db.Model):
    __tablename__ = 'subject_marks'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    subject_name = db.Column(db.String(80), nullable=False)
    internal_marks = db.Column(db.Float, default=0.0)
    final_marks = db.Column(db.Float, default=0.0)
    max_internal = db.Column(db.Float, default=30.0)
    max_final = db.Column(db.Float, default=70.0)

    @property
    def total(self):
        return self.internal_marks + self.final_marks

    @property
    def max_total(self):
        return self.max_internal + self.max_final

    @property
    def percentage(self):
        if self.max_total == 0:
            return 0
        return round((self.total / self.max_total) * 100, 2)
