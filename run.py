# run.py
import os
from app import create_app, socketio

config_name = os.getenv('FLASK_CONFIG') or 'default'
app = create_app(config_name)

if __name__ == '__main__':
    # Get configuration
    config = app.config
    host = config.get('HOST', '127.0.0.1')
    port = config.get('PORT', 5000)
    
    print(f"Starting server on {host}:{port}")
    socketio.run(app, host=host, port=port)
