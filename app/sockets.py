# app/sockets.py
import os
import fitz
from flask import request
from flask_socketio import join_room, leave_room, emit
from werkzeug.utils import secure_filename
from . import socketio
from .models import db, Room, User, Document
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

        room = Room.query.filter_by(name=room_name).first()
        if not room:
            room = Room(name=room_name)
            db.session.add(room)
            db.session.commit()
            print(f"Created new room: {room_name}")

        # Remove any old user entries with the same SID
        User.query.filter_by(sid=sid).delete()
        db.session.commit()

        user = User(sid=sid, username=username, room_id=room.id)
        db.session.add(user)
        db.session.commit()
        print(f"Created user: {username} in room: {room_name}")

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
        user = User.query.filter_by(sid=sid).first()
        if user:
            room_name = user.room.name
            print(f"User '{user.username}' left room: {room_name}")
            
            db.session.delete(user)
            db.session.commit()
            
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
        user = User.query.filter_by(sid=sid).first()
        if not user:
            print(f"No user found for SID: {sid}")
            return {'error': 'User not found'}

        room_name = user.room.name
        print(f"Processing upload for user {user.username} in room {room_name}")
        
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
        
        # Get PDF page count
        try:
            pdf_doc = fitz.open(filepath)
            num_pages = pdf_doc.page_count
            pdf_doc.close()
            print(f"PDF has {num_pages} pages")
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return {'error': f'Invalid PDF file: {str(e)}'}

        # Check if document already exists
        existing_doc = Document.query.filter_by(name=filename, room_id=user.room.id).first()
        if existing_doc:
            print(f"Document already exists: {filename}")
            return {'error': 'Document already exists'}
        
        # Create new document
        new_doc = Document(name=filename, pages=num_pages, room_id=user.room.id, uploader_id=user.id)
        db.session.add(new_doc)
        db.session.commit()
        print(f"Document created: {new_doc.id}")
        
        # Emit room update
        room_state = get_room_state(room_name)
        print(f"Emitting room_update with {len(room_state.get('documents', []))} documents")
        emit('room_update', room_state, room=room_name)
        
        return {'success': True, 'document_id': new_doc.id}
        
    except Exception as e:
        print(f"Error in upload handler: {e}")
        import traceback
        traceback.print_exc()
        return {'error': f'Upload failed: {str(e)}'}

@socketio.on('set_view')
def on_set_view(data):
    sid = request.sid
    user = User.query.filter_by(sid=sid).first()
    if not user:
        return

    user.current_doc_id = data.get('doc_id', user.current_doc_id)
    user.current_page = data.get('page', user.current_page)
    # Don't clear highlights when switching documents - they should persist per document
    db.session.commit()
    
    emit('room_update', get_room_state(user.room.name), room=user.room.name)

@socketio.on('add_highlight')
def on_add_highlight(highlight_data):
    try:
        sid = request.sid
        user = User.query.filter_by(sid=sid).first()
        if not user:
            return

        room_name = user.room.name
        document_id = highlight_data.get('documentId')
        
        # Add highlight to user's highlights with document context
        if not user.highlights:
            user.highlights = []
        
        # Add document context to highlight
        highlight_with_doc = {
            **highlight_data,
            'documentId': document_id
        }
        
        user.highlights.append(highlight_with_doc)
        db.session.commit()
        
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
        user = User.query.filter_by(sid=sid).first()
        if not user:
            print(f"No user found for SID: {sid}")
            return

        room_name = user.room.name
        highlight_id = data.get('highlightId')
        document_id = data.get('documentId')
        
        print(f"Removing highlight {highlight_id} from document {document_id} for user {user.username}")
        print(f"User has {len(user.highlights or [])} highlights before removal")
        
        if highlight_id and user.highlights:
            # Remove highlight from user's highlights
            original_count = len(user.highlights)
            user.highlights = [h for h in user.highlights if h.get('id') != highlight_id]
            removed_count = original_count - len(user.highlights)
            print(f"Removed {removed_count} highlight(s)")
            db.session.commit()
        else:
            print(f"No highlights to remove or missing highlight_id: {highlight_id}")
        
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
    user = User.query.filter_by(sid=sid).first()
    if not user:
        return

    user.highlights = data.get('highlights', [])
    db.session.commit()
    
    emit('room_update', get_room_state(user.room.name), room=user.room.name)
