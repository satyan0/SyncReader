# MongoDB Atlas Migration Guide

This guide will help you migrate your Flask application from SQLAlchemy to MongoDB Atlas.

## Prerequisites

1. **MongoDB Atlas Account**: Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. **Create Cluster**: Follow MongoDB Atlas documentation to create a free tier cluster
3. **Database User**: Create a database user with read/write permissions
4. **Network Access**: Configure network access (allow your IP or 0.0.0.0/0 for development)

## Step 1: MongoDB Atlas Setup

### 1.1 Create Database and Collection
1. In MongoDB Atlas, create a new database (e.g., `syncreader`)
2. Collections will be created automatically when first documents are inserted

### 1.2 Get Connection String
1. Go to "Connect" → "Connect your application"
2. Select "Python" driver
3. Copy the connection string (looks like):
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
   ```

## Step 2: Environment Configuration

### 2.1 Create .env file
Copy `.env.example` to `.env` and update with your MongoDB Atlas details:

```bash
cp .env.example .env
```

### 2.2 Update .env file
```env
# MongoDB Atlas Configuration
MONGO_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/syncreader?retryWrites=true&w=majority

# Flask Configuration
SECRET_KEY=your_secret_key_here
FLASK_ENV=development

# Server Configuration
HOST=0.0.0.0
PORT=8080

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## Step 3: Dependencies Installation

The MongoDB dependencies are already installed:
- `pymongo==4.6.0` - Official MongoDB Python driver
- `Flask-PyMongo==2.3.0` - Flask integration for PyMongo
- `dnspython==2.4.2` - DNS toolkit (required for MongoDB Atlas SRV records)

## Step 4: Data Migration (Optional)

If you have existing SQLite data to migrate:

```bash
python migrate_to_mongodb.py
```

This script will:
- Connect to your existing SQLite database
- Migrate rooms and documents to MongoDB
- Map relationships appropriately

## Step 5: Key Changes Made

### 5.1 Configuration Changes
- Removed SQLAlchemy configuration
- Added MongoDB URI configuration
- Updated both development and production configs

### 5.2 Models Restructure
- **BaseModel class**: Common MongoDB operations
- **Room, User, Document classes**: Methods for CRUD operations
- **ObjectId handling**: Proper MongoDB document ID management
- **Relationship handling**: Manual relationship management (no automatic joins)

### 5.3 Query Changes
The query syntax has changed from SQLAlchemy to MongoDB:

**Before (SQLAlchemy):**
```python
user = User.query.filter_by(sid=sid).first()
room = Room.query.filter_by(name=room_name).first()
```

**After (MongoDB):**
```python
user = User.get_by_sid(sid)
room = Room.get_by_name(room_name)
```

### 5.4 Data Structure Differences
- **Primary Keys**: Changed from integer IDs to MongoDB ObjectIds
- **Foreign Keys**: Manual reference management using ObjectIds
- **JSON Fields**: Native support in MongoDB (no special handling needed)
- **Relationships**: Manual fetching instead of automatic joins

## Step 6: Testing the Migration

### 6.1 Start the Application
```bash
python run.py
```

### 6.2 Test Basic Functionality
1. **Room Creation**: Join a room - should create room in MongoDB
2. **User Management**: Multiple users joining/leaving rooms
3. **Document Upload**: Upload PDF files
4. **Real-time Features**: Highlights, page sync between users

### 6.3 MongoDB Atlas Monitoring
1. Check MongoDB Atlas dashboard for:
   - Connection activity
   - Database operations
   - Collection statistics

## Step 7: Database Schema in MongoDB

### Collections Structure:

**rooms:**
```json
{
  "_id": ObjectId("..."),
  "name": "room_name",
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

**users:**
```json
{
  "_id": ObjectId("..."),
  "sid": "socket_id",
  "username": "user_name",
  "room_id": ObjectId("..."),
  "current_doc_id": ObjectId("...") || null,
  "current_page": 0,
  "highlights": [],
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

**documents:**
```json
{
  "_id": ObjectId("..."),
  "name": "document.pdf",
  "pages": 10,
  "room_id": ObjectId("..."),
  "uploader_id": ObjectId("..."),
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

## Step 8: Production Deployment

### 8.1 Environment Variables
Set the following environment variables in your production environment:
- `MONGO_URI`: Your MongoDB Atlas connection string
- `SECRET_KEY`: A secure random key
- `FLASK_ENV`: Set to "production"

### 8.2 Connection Pooling
MongoDB driver automatically handles connection pooling. For high-traffic applications, you can tune:
- `maxPoolSize`: Maximum connections in pool
- `minPoolSize`: Minimum connections in pool
- `maxIdleTimeMS`: Connection idle timeout

### 8.3 Indexing for Performance
Consider adding indexes for frequently queried fields:

```python
# In your MongoDB Atlas interface or via script:
db.rooms.createIndex({"name": 1})
db.users.createIndex({"sid": 1})
db.users.createIndex({"room_id": 1})
db.documents.createIndex({"room_id": 1})
db.documents.createIndex({"name": 1, "room_id": 1})
```

## Troubleshooting

### Common Issues:

1. **Connection Timeout**: Check network access settings in MongoDB Atlas
2. **Authentication Failed**: Verify username/password in connection string
3. **DNS Resolution**: Ensure `dnspython` is installed for SRV record resolution
4. **ObjectId Conversion**: Always convert string IDs to ObjectId when querying

### Debug Mode:
Set `DEBUG=True` in your configuration to see detailed MongoDB operation logs.

## Benefits of MongoDB Migration

1. **Flexible Schema**: Easy to add new fields without migrations
2. **JSON-Native**: Perfect for storing highlights and user preferences
3. **Horizontal Scaling**: MongoDB Atlas handles scaling automatically
4. **Real-time**: Better support for real-time applications
5. **Cloud-Native**: Fully managed service with automatic backups
6. **Global Distribution**: Can deploy across multiple regions

Your application is now successfully migrated to MongoDB Atlas!
