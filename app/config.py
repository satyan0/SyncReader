# config.py
import os
from dotenv import load_dotenv

# Load environment variables from a .env file
load_dotenv()

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'a_default_very_secret_key')
    
    # Define the absolute path for the project root
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, '..', 'documents')
    
    # Server configuration
    HOST = os.environ.get('HOST', '0.0.0.0')  # Allow external connections
    # Use 8080 as default, only use PORT env var for production deployment
    PORT = int(os.environ.get('PORT') if os.environ.get('FLASK_ENV') == 'production' else 8080)
    
    # CORS configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173,https://*.herokuapp.com').split(',')
    
    # MongoDB configuration
    MONGO_URI = os.environ.get('MONGODB', '')
    
class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    # Use the same MongoDB Atlas URI as base config for development
    pass  # Inherits MONGO_URI from Config class

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    # Inherits MONGO_URI from Config class

# Dictionary to access configs by name
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
