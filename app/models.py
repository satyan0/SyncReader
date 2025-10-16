# app/models.py
from flask_pymongo import PyMongo
from bson import ObjectId
from datetime import datetime
from typing import Optional, List, Dict, Any

# Initialize PyMongo
mongo = PyMongo()

class BaseModel:
    """Base class for MongoDB models."""
    
    @classmethod
    def get_collection(cls):
        """Get the MongoDB collection for this model."""
        return getattr(mongo.db, cls.__collection_name__)
    
    @classmethod
    def find_by_id(cls, doc_id):
        """Find a document by its ObjectId."""
        if isinstance(doc_id, str):
            doc_id = ObjectId(doc_id)
        return cls.get_collection().find_one({"_id": doc_id})
    
    @classmethod
    def find_one(cls, query):
        """Find one document matching the query."""
        return cls.get_collection().find_one(query)
    
    @classmethod
    def find(cls, query, **kwargs):
        """Find documents matching the query."""
        return cls.get_collection().find(query, **kwargs)
    
    @classmethod
    def insert_one(cls, document):
        """Insert a single document."""
        document['created_at'] = datetime.utcnow()
        document['updated_at'] = datetime.utcnow()
        result = cls.get_collection().insert_one(document)
        return result.inserted_id
    
    @classmethod
    def update_one(cls, query, update, upsert=False):
        """Update a single document."""
        if '$set' not in update:
            update = {'$set': update}
        update['$set']['updated_at'] = datetime.utcnow()
        return cls.get_collection().update_one(query, update, upsert=upsert)
    
    @classmethod
    def delete_one(cls, query):
        """Delete a single document."""
        return cls.get_collection().delete_one(query)
    
    @classmethod
    def delete_many(cls, query):
        """Delete multiple documents."""
        return cls.get_collection().delete_many(query)

class Room(BaseModel):
    """Room model for MongoDB."""
    __collection_name__ = 'rooms'
    
    @classmethod
    def create(cls, name: str) -> Optional[ObjectId]:
        """Create a new room."""
        # Check if room already exists
        existing = cls.find_one({"name": name})
        if existing:
            return existing['_id']
        
        room_data = {
            "name": name,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        return cls.insert_one(room_data)
    
    @classmethod
    def get_by_name(cls, name: str) -> Optional[Dict]:
        """Get room by name."""
        return cls.find_one({"name": name})
    
    @classmethod
    def get_users(cls, room_id: ObjectId) -> List[Dict]:
        """Get all active users in a room (not disconnected)."""
        if isinstance(room_id, str):
            room_id = ObjectId(room_id)
        return list(User.find({"room_id": room_id, "disconnected": {"$ne": True}}))
    
    @classmethod
    def get_documents(cls, room_id: ObjectId) -> List[Dict]:
        """Get all documents in a room."""
        if isinstance(room_id, str):
            room_id = ObjectId(room_id)
        return list(Document.find({"room_id": room_id}))

class User(BaseModel):
    """User model for MongoDB."""
    __collection_name__ = 'users'
    
    @classmethod
    def create(cls, sid: str, username: str, room_id: ObjectId) -> ObjectId:
        """Create a new user."""
        if isinstance(room_id, str):
            room_id = ObjectId(room_id)
            
        user_data = {
            "sid": sid,
            "username": username,
            "room_id": room_id,
            "current_doc_id": None,
            "current_page": 0,
            "highlights": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        return cls.insert_one(user_data)
    
    @classmethod
    def get_by_sid(cls, sid: str) -> Optional[Dict]:
        """Get user by socket ID."""
        return cls.find_one({"sid": sid})
    
    @classmethod
    def delete_by_sid(cls, sid: str):
        """Delete user by socket ID."""
        return cls.delete_one({"sid": sid})
    
    @classmethod
    def update_view(cls, sid: str, doc_id: Optional[str] = None, page: Optional[int] = None):
        """Update user's current view."""
        update_data = {}
        if doc_id is not None:
            try:
                update_data["current_doc_id"] = ObjectId(doc_id) if doc_id else None
                print(f"Successfully converted doc_id {doc_id} to ObjectId")
            except Exception as e:
                print(f"Error converting doc_id {doc_id} to ObjectId: {e}")
                update_data["current_doc_id"] = None
        if page is not None:
            update_data["current_page"] = page
        
        if update_data:
            return cls.update_one({"sid": sid}, update_data)
    
    @classmethod
    def add_highlight(cls, sid: str, highlight: Dict):
        """Add a highlight to user's highlights."""
        return cls.get_collection().update_one(
            {"sid": sid},
            {"$push": {"highlights": highlight}}
        )
    
    @classmethod
    def get_by_username_and_room(cls, username: str, room_id) -> Optional[Dict]:
        """Get user by username and room ID (only active users)."""
        return cls.find_one({"username": username, "room_id": room_id, "disconnected": {"$ne": True}})
    
    @classmethod
    def get_by_username_and_room_including_disconnected(cls, username: str, room_id) -> Optional[Dict]:
        """Get user by username and room ID (including disconnected users)."""
        # First try to find an active user
        user = cls.find_one({"username": username, "room_id": room_id, "disconnected": {"$ne": True}})
        if user:
            return user
        # If no active user, find the most recent disconnected user using the collection directly
        return cls.get_collection().find_one(
            {"username": username, "room_id": room_id}, 
            sort=[("disconnected_at", -1)]  # Most recently disconnected first
        )
    
    @classmethod
    def mark_disconnected(cls, sid: str):
        """Mark user as disconnected instead of deleting."""
        return cls.update_one(
            {"sid": sid}, 
            {
                "disconnected": True,
                "disconnected_at": datetime.utcnow()
            }
        )
    
    @classmethod
    def reconnect_user(cls, user_id, new_sid: str):
        """Reconnect user with new socket ID."""
        return cls.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "sid": new_sid,
                    "disconnected": False,
                    "updated_at": datetime.utcnow()
                },
                "$unset": {"disconnected_at": ""}
            }
        )
    
    @classmethod
    def remove_highlight(cls, sid: str, highlight_id: str):
        """Remove a highlight from user's highlights."""
        return cls.get_collection().update_one(
            {"sid": sid},
            {"$pull": {"highlights": {"id": highlight_id}}}
        )
    
    @classmethod
    def update_highlights(cls, sid: str, highlights: List[Dict]):
        """Update user's highlights."""
        return cls.update_one({"sid": sid}, {"highlights": highlights})

class Document(BaseModel):
    """Document model for MongoDB."""
    __collection_name__ = 'documents'
    
    @classmethod
    def create(cls, name: str, pages: int, room_id: ObjectId, uploader_id: ObjectId) -> Optional[ObjectId]:
        """Create a new document."""
        if isinstance(room_id, str):
            room_id = ObjectId(room_id)
        if isinstance(uploader_id, str):
            uploader_id = ObjectId(uploader_id)
        
        # Check if document already exists in this room
        existing = cls.find_one({"name": name, "room_id": room_id})
        if existing:
            return None  # Document already exists
        
        doc_data = {
            "name": name,
            "pages": pages,
            "room_id": room_id,
            "uploader_id": uploader_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        return cls.insert_one(doc_data)
    
    @classmethod
    def get_by_name_and_room(cls, name: str, room_id: ObjectId) -> Optional[Dict]:
        """Get document by name and room."""
        if isinstance(room_id, str):
            room_id = ObjectId(room_id)
        return cls.find_one({"name": name, "room_id": room_id})
