#!/usr/bin/env python3
"""
Migration script to transfer data from SQLite to MongoDB Atlas.
Run this script after setting up your MongoDB connection.
"""

import os
import sys
import sqlite3
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId

def migrate_data():
    """Migrate data from SQLite to MongoDB."""
    
    # MongoDB connection
    mongo_uri = os.environ.get('MONGO_URI')
    if not mongo_uri:
        print("Error: MONGO_URI environment variable not set")
        return False
    
    try:
        client = MongoClient(mongo_uri)
        db = client.get_default_database()
        print(f"Connected to MongoDB: {db.name}")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        return False
    
    # SQLite connection
    sqlite_path = os.path.join(os.path.dirname(__file__), 'instance', 'court_sync_dev.db')
    if not os.path.exists(sqlite_path):
        print(f"SQLite database not found at: {sqlite_path}")
        return False
    
    try:
        sqlite_conn = sqlite3.connect(sqlite_path)
        sqlite_conn.row_factory = sqlite3.Row  # Enable column access by name
        print(f"Connected to SQLite: {sqlite_path}")
    except Exception as e:
        print(f"Failed to connect to SQLite: {e}")
        return False
    
    try:
        # Migrate Rooms
        print("Migrating rooms...")
        cursor = sqlite_conn.execute("SELECT * FROM room")
        rooms_map = {}  # SQLite ID -> MongoDB ObjectId mapping
        
        for row in cursor:
            room_doc = {
                "name": row["name"],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            result = db.rooms.insert_one(room_doc)
            rooms_map[row["id"]] = result.inserted_id
            print(f"Migrated room: {row['name']}")
        
        # Migrate Users (Note: Users are session-based, so we'll skip this for now)
        print("Skipping users migration (session-based data)")
        
        # Migrate Documents
        print("Migrating documents...")
        cursor = sqlite_conn.execute("SELECT * FROM document")
        
        for row in cursor:
            if row["room_id"] in rooms_map:
                doc_doc = {
                    "name": row["name"],
                    "pages": row["pages"],
                    "room_id": rooms_map[row["room_id"]],
                    "uploader_id": None,  # Will be set when user uploads again
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                result = db.documents.insert_one(doc_doc)
                print(f"Migrated document: {row['name']}")
        
        print("Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"Migration failed: {e}")
        return False
    
    finally:
        sqlite_conn.close()
        client.close()

if __name__ == "__main__":
    print("Starting migration from SQLite to MongoDB...")
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    success = migrate_data()
    sys.exit(0 if success else 1)
