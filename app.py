import os
from flask import Flask, send_from_directory, redirect, url_for
from flask_login import LoginManager
from flask_cors import CORS
from backend.models.models import db, User
from backend.api.routes import api
from backend.database.seed import seed_data

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def create_app():
    app = Flask(
        __name__,
        template_folder=os.path.join(BASE_DIR, 'frontend', 'templates'),
        static_folder=os.path.join(BASE_DIR, 'frontend', 'static')
    )
    app.config['SECRET_KEY'] = 'sris-secret-2024-ultra-secure'
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(BASE_DIR, 'database', 'sris.db')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    CORS(app, supports_credentials=True)
    db.init_app(app)

    login_manager = LoginManager(app)
    login_manager.login_view = 'serve_login'

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        from flask import request, jsonify
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Unauthorized'}), 401
        return redirect('/login')

    app.register_blueprint(api, url_prefix='/api')

    # Serve frontend pages
    @app.route('/')
    @app.route('/dashboard')
    @app.route('/students')
    @app.route('/analytics')
    @app.route('/prediction')
    @app.route('/leaderboard')
    @app.route('/settings')
    def serve_app():
        return send_from_directory(app.template_folder, 'index.html')

    @app.route('/login')
    def serve_login():
        return send_from_directory(app.template_folder, 'login.html')

    with app.app_context():
        os.makedirs(os.path.join(BASE_DIR, 'database'), exist_ok=True)
        db.create_all()
        seed_data()

return app

app = create_app()

if __name__ == '__main__':
    print("🚀 Student Result Intelligence System running at http://127.0.0.1:5000")
    print("👤 Admin login: admin / admin123")
    print("👤 Teacher login: teacher / teacher123")
    app.run(debug=True, port=5000)
