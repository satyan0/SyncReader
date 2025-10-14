# app/cleanup.py
from datetime import datetime, timedelta
from .models import User

def cleanup_old_disconnected_users():
    """Remove users that have been disconnected for more than 1 hour."""
    cutoff_time = datetime.utcnow() - timedelta(hours=1)
    
    # Find users disconnected more than 1 hour ago
    old_users = User.find({
        "disconnected": True,
        "disconnected_at": {"$lt": cutoff_time}
    })
    
    count = 0
    for user in old_users:
        User.delete_one({"_id": user["_id"]})
        count += 1
    
    if count > 0:
        print(f"Cleaned up {count} old disconnected users")
    
    return count
