# app/__init__.py
import os
from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from .models import db
from .config import config_by_name

# Initialize SocketIO without initial app
socketio = SocketIO(
    logger=True,
    engineio_logger=True,
    cors_allowed_origins="*",  # More permissive for development
    async_mode='eventlet'
)

def create_app(config_name='default'):
    """Create and configure an instance of the Flask application."""
    app = Flask(__name__, 
                instance_relative_config=True,
                static_folder='../static',
                template_folder='../templates')
    
    # Load configuration
    app.config.from_object(config_by_name[config_name])
    app.config.from_pyfile('config.py', silent=True)
    
    # Configure CORS
    CORS(app, 
         resources={r"/*": {"origins": "*"}},  # More permissive for development
         supports_credentials=True)

    # Initialize extensions
    db.init_app(app)
    
    # Initialize SocketIO with the app
    socketio.init_app(
        app,
        cors_allowed_origins="*",  # More permissive for development
        async_mode='eventlet',
        ping_timeout=60000,
        ping_interval=25000,
        transports=['websocket', 'polling']
    )

    # Create the upload folder if it doesn't exist
    upload_folder = app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)

    # Add CORS headers to all responses
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({"status": "healthy"}), 200
        
    # Import and register blueprints and socket events
    with app.app_context():
        from . import routes, sockets
        db.create_all()

    return app