# app/routes.py
import os
import io
import fitz
from flask import current_app, render_template, request, send_file
from .models import Document

@current_app.route('/')
def index():
    return render_template('index.html')

@current_app.route('/document/<int:doc_id>')
def get_full_pdf(doc_id):
    """Serve the full PDF document."""
    doc = Document.query.get(doc_id)
    if not doc:
        return "Document not found", 404
        
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], doc.name)
    if not os.path.exists(filepath):
        return "File on disk not found", 404

    return send_file(filepath, as_attachment=False)

@current_app.route('/pdf/<int:doc_id>')
def get_pdf_page_by_id(doc_id):
    """Serve a page image from a document identified by its DB ID."""
    doc = Document.query.get(doc_id)
    page_num = request.args.get('page', 0, type=int)

    if not doc:
        return "Document not found", 404
        
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], doc.name)
    if not os.path.exists(filepath):
        return "File on disk not found", 404

    try:
        pdf_doc = fitz.open(filepath)
        if not (0 <= page_num < pdf_doc.page_count):
            return "Page not found", 404
        
        page = pdf_doc.load_page(page_num)
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("png")
        pdf_doc.close()
        
        return send_file(io.BytesIO(img_bytes), mimetype='image/png')
    except Exception as e:
        return str(e), 500
