# app/models.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Room(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    users = db.relationship('User', backref='room', lazy=True, cascade="all, delete-orphan")
    documents = db.relationship('Document', backref='room', lazy=True, cascade="all, delete-orphan")

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sid = db.Column(db.String(100), unique=True, nullable=False)
    username = db.Column(db.String(100), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('room.id'), nullable=False)
    
    # User's current state
    current_doc_id = db.Column(db.Integer, db.ForeignKey('document.id'), nullable=True)
    current_page = db.Column(db.Integer, default=0)
    highlights = db.Column(db.JSON, default=[])

class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    pages = db.Column(db.Integer, nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('room.id'), nullable=False)
    uploader_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # Can be nullable if uploader leaves
    
    # Relationships
    uploader = db.relationship('User', backref=db.backref('uploaded_documents', lazy=True), foreign_keys=[uploader_id])
    
    # A document is unique per room
    __table_args__ = (db.UniqueConstraint('name', 'room_id', name='_room_document_uc'),)
