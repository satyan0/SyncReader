# app/utils.py
from .models import Room

def get_room_state(room_name):
    """Constructs the full state payload for a room from the database."""
    print(f"Getting room state for: {room_name}")
    room = Room.query.filter_by(name=room_name).first()
    if not room:
        print(f"Room not found: {room_name}")
        return {
            'name': room_name,
            'users': [],
            'documents': []
        }
    
    print(f"Found room: {room.name} with {len(room.users)} users and {len(room.documents)} documents")
    
    # Convert users to the expected format
    users = []
    for user in room.users:
        user_data = {
            'id': user.id,
            'sid': user.sid,
            'username': user.username,
            'current_doc_id': user.current_doc_id,
            'current_page': user.current_page,
            'highlights': user.highlights or []
        }
        users.append(user_data)
        print(f"User: {user_data}")
    
    # Convert documents to the expected format
    documents = []
    for doc in room.documents:
        doc_data = {
            'id': doc.id,
            'name': doc.name,
            'pages': doc.pages,
            'room_id': doc.room_id,
            'uploader_id': doc.uploader_id
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
