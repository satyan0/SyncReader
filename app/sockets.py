# app/sockets.py
import os
# import fitz  # Temporarily commented out
from flask import request
from flask_socketio import join_room, leave_room, emit
from werkzeug.utils import secure_filename
from bson import ObjectId
from . import socketio
from .models import Room, User, Document
from .utils import get_room_state

@socketio.on('connect')
def on_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('join')
def on_join(data):
    try:
        print(f"Join event received: {data}")
        username = data.get('username')
        room_name = data.get('room')
        sid = request.sid

        if not username or not room_name:
            print("Error: Missing username or room name")
            return

        print(f"Processing join: username={username}, room={room_name}, sid={sid}")

        # Get or create room
        room = Room.get_by_name(room_name)
        if not room:
            room_id = Room.create(room_name)
            print(f"Created new room: {room_name} with ID: {room_id}")
        else:
            room_id = room['_id']
            print(f"Found existing room: {room_name} with ID: {room_id}")

        # Check if user already exists with this username in this room
        existing_user = User.get_by_username_and_room(username, room_id)
        
        if existing_user:
            # Update existing user with new SID (reconnection)
            print(f"User {username} reconnecting, updating SID from {existing_user.get('sid')} to {sid}")
            User.reconnect_user(existing_user['_id'], sid)
            user_id = existing_user['_id']
        else:
            # Remove any old user entries with the same SID
            User.delete_by_sid(sid)
            
            # Create new user
            user_id = User.create(sid=sid, username=username, room_id=room_id)
            print(f"Created new user: {username} in room: {room_name} with ID: {user_id}")

        join_room(room_name)
        print(f"User '{username}' joined room: {room_name}")
        
        room_state = get_room_state(room_name)
        print(f"Emitting room_update with state: {room_state}")
        emit('room_update', room_state, room=room_name)
        
    except Exception as e:
        print(f"Error in join handler: {e}")
        import traceback
        traceback.print_exc()

@socketio.on('disconnect')
def on_disconnect():
    try:
        sid = request.sid
        print(f"Client disconnected: {sid}")
        user = User.get_by_sid(sid)
        if user:
            # Get room info before marking user as disconnected
            room = Room.find_by_id(user['room_id'])
            room_name = room['name'] if room else 'unknown'
            print(f"User '{user['username']}' disconnected from room: {room_name}")
            
            # Mark user as disconnected instead of deleting immediately
            User.mark_disconnected(sid)
            
            leave_room(room_name)
            room_state = get_room_state(room_name)
            print(f"Emitting room_update after disconnect: {room_state}")
            emit('room_update', room_state, room=room_name)
        else:
            print(f"No user found for SID: {sid}")
    except Exception as e:
        print(f"Error in disconnect handler: {e}")
        import traceback
        traceback.print_exc()

@socketio.on('upload_file')
def on_upload(data):
    try:
        print(f"Upload event received: {data.keys() if isinstance(data, dict) else 'Not a dict'}")
        
        sid = request.sid
        user = User.get_by_sid(sid)
        if not user:
            print(f"No user found for SID: {sid}")
            return {'error': 'User not found'}

        # Get room info
        room = Room.find_by_id(user['room_id'])
        room_name = room['name'] if room else 'unknown'
        print(f"Processing upload for user {user['username']} in room {room_name}")
        
        if 'name' not in data or 'file' not in data:
            print(f"Missing required data: {list(data.keys()) if isinstance(data, dict) else 'Invalid data'}")
            return {'error': 'Missing file name or data'}
        
        filename = secure_filename(data['name'])
        print(f"Secured filename: {filename}")
        
        # This requires the app context to access app.config
        from flask import current_app
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        print(f"File will be saved to: {filepath}")
        
        # Ensure the upload folder exists
        os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
        
        # Write the file
        with open(filepath, 'wb') as f:
            f.write(data['file'])
        print(f"File written successfully: {filepath}")
        
        # Get PDF page count (temporarily hardcoded)
        try:
            # Temporarily hardcode pages for testing
            num_pages = 10  # Default to 10 pages for testing
            print(f"PDF has {num_pages} pages (hardcoded for testing)")
            # pdf_doc = fitz.open(filepath)
            # num_pages = pdf_doc.page_count
            # pdf_doc.close()
            # print(f"PDF has {num_pages} pages")
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return {'error': f'Invalid PDF file: {str(e)}'}

        # Check if document already exists
        existing_doc = Document.get_by_name_and_room(filename, user['room_id'])
        if existing_doc:
            print(f"Document already exists: {filename}")
            return {'error': 'Document already exists'}
        
        # Create new document
        doc_id = Document.create(
            name=filename, 
            pages=num_pages, 
            room_id=user['room_id'], 
            uploader_id=user['_id']
        )
        
        if doc_id:
            print(f"Document created: {doc_id}")
            
            # Emit room update
            room_state = get_room_state(room_name)
            print(f"Emitting room_update with {len(room_state.get('documents', []))} documents")
            emit('room_update', room_state, room=room_name)
            
            return {'success': True, 'document_id': str(doc_id)}
        else:
            return {'error': 'Failed to create document'}
        
    except Exception as e:
        print(f"Error in upload handler: {e}")
        import traceback
        traceback.print_exc()
        return {'error': f'Upload failed: {str(e)}'}

@socketio.on('set_view')
def on_set_view(data):
    try:
        sid = request.sid
        print(f"set_view received: {data} from {sid}")
        user = User.get_by_sid(sid)
        if not user:
            print(f"No user found for SID: {sid}")
            return {'error': 'User not found'}

        # Update user's current view
        doc_id = data.get('doc_id')
        page = data.get('page')
        
        print(f"Updating view for user {user['username']}: doc_id={doc_id}, page={page}")
        result = User.update_view(sid, doc_id, page)
        print(f"Update result: {result}")
        
        # Get room info and emit update
        room = Room.find_by_id(user['room_id'])
        if room:
            room_state = get_room_state(room['name'])
            print(f"Emitting room_update after set_view: {room_state}")
            emit('room_update', room_state, room=room['name'])
            return {'success': True}
        else:
            print(f"Room not found for user")
            return {'error': 'Room not found'}
    except Exception as e:
        print(f"Error in set_view handler: {e}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

@socketio.on('add_highlight')
def on_add_highlight(highlight_data):
    try:
        sid = request.sid
        user = User.get_by_sid(sid)
        if not user:
            return

        # Get room info
        room = Room.find_by_id(user['room_id'])
        room_name = room['name'] if room else 'unknown'
        document_id = highlight_data.get('documentId')
        
        # Add document context to highlight
        highlight_with_doc = {
            **highlight_data,
            'documentId': document_id
        }
        
        # Add highlight to user's highlights
        User.add_highlight(sid, highlight_with_doc)
        
        # Broadcast the highlight to all users in the room
        emit('highlight_added', highlight_with_doc, room=room_name)
        
    except Exception as e:
        print(f"Error in add_highlight handler: {e}")
        import traceback
        traceback.print_exc()

@socketio.on('remove_highlight')
def on_remove_highlight(data):
    try:
        print(f"Remove highlight event received: {data}")
        
        sid = request.sid
        user = User.get_by_sid(sid)
        if not user:
            print(f"No user found for SID: {sid}")
            return

        # Get room info
        room = Room.find_by_id(user['room_id'])
        room_name = room['name'] if room else 'unknown'
        highlight_id = data.get('highlightId')
        document_id = data.get('documentId')
        
        print(f"Removing highlight {highlight_id} from document {document_id} for user {user['username']}")
        print(f"User has {len(user.get('highlights', []))} highlights before removal")
        
        if highlight_id:
            # Remove highlight from user's highlights
            User.remove_highlight(sid, highlight_id)
            print(f"Removed highlight {highlight_id}")
        else:
            print(f"No highlight_id provided: {highlight_id}")
        
        # Broadcast the removal to all users in the room
        removal_data = {
            'highlightId': highlight_id,
            'documentId': document_id
        }
        print(f"Broadcasting highlight_removed: {removal_data}")
        emit('highlight_removed', removal_data, room=room_name)
        
    except Exception as e:
        print(f"Error in remove_highlight handler: {e}")
        import traceback
        traceback.print_exc()

@socketio.on('update_highlight')
def on_highlight(data):
    sid = request.sid
    user = User.get_by_sid(sid)
    if not user:
        return

    # Update user's highlights
    highlights = data.get('highlights', [])
    User.update_highlights(sid, highlights)
    
    # Get room info and emit update
    room = Room.find_by_id(user['room_id'])
    if room:
        emit('room_update', get_room_state(room['name']), room=room['name'])
