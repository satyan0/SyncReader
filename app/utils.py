# app/utils.py
from .models import Room

def get_room_state(room_name):
    """Constructs the full state payload for a room from the database."""
    print(f"Getting room state for: {room_name}")
    room = Room.get_by_name(room_name)
    if not room:
        print(f"Room not found: {room_name}")
        return {
            'name': room_name,
            'users': [],
            'documents': []
        }
    
    # Get users and documents for this room
    users_data = Room.get_users(room['_id'])
    documents_data = Room.get_documents(room['_id'])
    
    print(f"Found room: {room['name']} with {len(users_data)} users and {len(documents_data)} documents")
    
    # Debug: Print all document uploader IDs and current users
    if documents_data:
        print("Documents in room:")
        for doc in documents_data:
            print(f"  - {doc['name']} uploaded by user_id: {doc.get('uploader_id')}")
        
        print("Current active users:")
        for user in users_data:
            print(f"  - {user['username']} (user_id: {user['_id']}, sid: {user['sid']})")
    
    # Convert users to the expected format
    users = []
    for user in users_data:
        user_data = {
            'id': str(user['_id']),
            'sid': user['sid'],
            'username': user['username'],
            'current_doc_id': str(user['current_doc_id']) if user.get('current_doc_id') else None,
            'current_page': user.get('current_page', 0),
            'highlights': user.get('highlights', [])
        }
        users.append(user_data)
        print(f"User: {user_data}")
    
    # Convert documents to the expected format
    documents = []
    for doc in documents_data:
        doc_data = {
            'id': str(doc['_id']),
            'name': doc['name'],
            'pages': doc['pages'],
            'room_id': str(doc['room_id']),
            'uploader_id': str(doc['uploader_id']) if doc.get('uploader_id') else None
        }
        documents.append(doc_data)
        print(f"Document: {doc_data}")
    
    result = {
        'name': room_name,
        'users': users,
        'documents': documents
    }
    print(f"Returning room state: {result}")
    return result
