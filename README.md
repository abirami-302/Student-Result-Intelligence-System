# 🎓 SRIS — Student Result Intelligence System

A full-stack AI-powered student academic analytics platform.

## Features
- 📊 Interactive dashboard with live class health scores
- 👤 Student CRUD management with subject marks
- ⚠️ Academic Risk Early-Warning System
- 🔮 What-If simulation for grade prediction
- 👥 Smart peer comparison and ranking
- 🏆 Multi-category leaderboard
- 🤖 AI study strategy generator
- 💎 Hidden talent detection
- 📈 Attendance vs performance correlation

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the app
python app.py

# 3. Open browser
http://127.0.0.1:5000/login
```

## Default Login Credentials

| Role    | Username | Password   |
|---------|----------|------------|
| Admin   | admin    | admin123   |
| Teacher | teacher  | teacher123 |

## Project Structure

```
student_ris/
├── app.py                    # Entry point
├── requirements.txt
├── backend/
│   ├── models/models.py      # SQLAlchemy models
│   ├── api/routes.py         # REST API endpoints
│   ├── api/analytics.py      # AI analytics engine
│   └── database/seed.py      # Sample data seeder
└── frontend/
    ├── templates/
    │   ├── index.html        # Main SPA shell
    │   └── login.html        # Login page
    └── static/
        ├── css/app.css       # Styles
        └── js/app.js         # Frontend logic
```

## Tech Stack
- **Backend**: Python Flask, SQLAlchemy
- **Database**: SQLite
- **AI/Analytics**: NumPy, Scikit-learn, Pandas
- **Frontend**: Vanilla JS SPA, Chart.js 4
- **Auth**: Flask-Login session-based
