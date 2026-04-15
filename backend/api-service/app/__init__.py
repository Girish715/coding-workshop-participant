from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.employees import employees_bp
    from app.routes.reviews import reviews_bp
    from app.routes.development_plans import dev_plans_bp
    from app.routes.competencies import competencies_bp
    from app.routes.training import training_bp
    from app.routes.dashboard import dashboard_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(employees_bp, url_prefix="/api/employees")
    app.register_blueprint(reviews_bp, url_prefix="/api/reviews")
    app.register_blueprint(dev_plans_bp, url_prefix="/api/development-plans")
    app.register_blueprint(competencies_bp, url_prefix="/api/competencies")
    app.register_blueprint(training_bp, url_prefix="/api/training")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

    return app
