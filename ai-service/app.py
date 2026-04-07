from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cv2
import numpy as np
import base64
from PIL import Image
import io
import face_recognition
import json
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import tempfile

app = Flask(__name__)
CORS(app, origins=['http://localhost:5173', 'http://localhost:5000'])

# Store known face encodings and student data
known_faces = {}
student_data = {}  # studentId -> {name, encoding, image_path}
attendance_records = {}  # sessionId -> {studentId -> {timestamp, status}}

# Ensure data directory exists
DATA_DIR = 'data'
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

@app.route('/upload-multiple', methods=['POST'])
def upload_multiple_faces():
    """Upload multiple student images for face recognition"""
    if 'images' not in request.files:
        return jsonify({'success': False, 'error': 'No images provided'}), 400

    files = request.files.getlist('images')
    student_names = request.form.getlist('studentNames') if 'studentNames' in request.form else []

    if len(files) == 0:
        return jsonify({'success': False, 'error': 'No images provided'}), 400

    uploaded_students = []
    failed_uploads = []

    for i, file in enumerate(files):
        try:
            # Get student name (use filename if not provided)
            student_name = student_names[i] if i < len(student_names) and student_names[i] else file.filename.split('.')[0]

            # Generate unique student ID
            student_id = f"student_{len(student_data) + i + 1}"

            # Process image
            image = Image.open(file.stream).convert('RGB')
            image_np = np.array(image)

            # Detect faces
            face_locations = face_recognition.face_locations(image_np)
            if not face_locations:
                failed_uploads.append({'filename': file.filename, 'error': 'No face detected'})
                continue

            # Get face encoding
            face_encodings = face_recognition.face_encodings(image_np, face_locations)
            if not face_encodings:
                failed_uploads.append({'filename': file.filename, 'error': 'Could not encode face'})
                continue

            # Save image
            image_path = os.path.join(DATA_DIR, f"{student_id}.jpg")
            image.save(image_path)

            # Store data
            encoding = face_encodings[0].tolist()
            known_faces[student_id] = encoding
            student_data[student_id] = {
                'name': student_name,
                'encoding': encoding,
                'image_path': image_path
            }

            uploaded_students.append({
                'studentId': student_id,
                'name': student_name,
                'imagePath': f'/image/{student_id}.jpg'
            })

        except Exception as e:
            failed_uploads.append({'filename': file.filename, 'error': str(e)})

    return jsonify({
        'success': True,
        'uploaded': uploaded_students,
        'failed': failed_uploads,
        'total_uploaded': len(uploaded_students),
        'total_failed': len(failed_uploads)
    })

@app.route('/image/<student_id>.jpg', methods=['GET'])
def get_student_image(student_id):
    """Serve student image files"""
    try:
        student_id_with_ext = student_id + '.jpg'
        if student_id_with_ext.replace('.jpg', '') in student_data:
            image_path = student_data[student_id_with_ext.replace('.jpg', '')]['image_path']
            return send_file(image_path, mimetype='image/jpeg')
        return jsonify({'error': 'Image not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get-students', methods=['GET'])
def get_students():
    """Get list of enrolled students"""
    students = []
    for student_id, data in student_data.items():
        students.append({
            'studentId': student_id,
            'name': data['name'],
            'imagePath': f'/image/{student_id}.jpg'
        })

    return jsonify({'success': True, 'students': students})

@app.route('/recognize', methods=['POST'])
def recognize_face():
    """Recognize faces in image and return recognized user IDs"""
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'Image file is required'}), 400

    file = request.files['image']
    try:
        image = Image.open(file.stream).convert('RGB')
        image_np = np.array(image)
    except Exception as exc:
        return jsonify({'success': False, 'error': f'Invalid image data: {exc}'}), 400

    face_locations = face_recognition.face_locations(image_np)
    if not face_locations:
        return jsonify({'success': True, 'recognized_users': [], 'message': 'No face detected'}), 200

    face_encodings = face_recognition.face_encodings(image_np, face_locations)
    if not face_encodings:
        return jsonify({'success': True, 'recognized_users': [], 'message': 'No face encoding could be extracted'}), 200

    if not known_faces:
        return jsonify({'success': True, 'recognized_users': [], 'message': 'No enrolled faces available'}), 200

    recognized_users = []
    for face_encoding in face_encodings:
        matches = face_recognition.compare_faces(list(known_faces.values()), face_encoding, tolerance=0.6)
        if True in matches:
            user_id = list(known_faces.keys())[matches.index(True)]
            if user_id not in recognized_users:
                recognized_users.append(user_id)

    return jsonify({
        'success': True,
        'recognized_users': recognized_users,
        'message': f'Recognized {len(recognized_users)} user(s)'
    })

@app.route('/get-attendance/<session_id>', methods=['GET'])
def get_attendance(session_id):
    """Get attendance records for a session"""
    if session_id not in attendance_records:
        return jsonify({'success': True, 'attendance': []})

    attendance_list = []
    for student_id, record in attendance_records[session_id].items():
        if student_id in student_data:
            attendance_list.append({
                'studentId': student_id,
                'studentName': student_data[student_id]['name'],
                'timestamp': record['timestamp'],
                'status': record['status']
            })

    return jsonify({'success': True, 'attendance': attendance_list})

@app.route('/generate-report/<session_id>', methods=['GET'])
def generate_report(session_id):
    """Generate PDF attendance report"""
    try:
        if session_id not in attendance_records:
            return jsonify({'success': False, 'error': 'No attendance records found for this session'}), 404

        # Create PDF
        pdf_path = os.path.join(tempfile.gettempdir(), f'attendance_report_{session_id}.pdf')

        doc = SimpleDocTemplate(pdf_path, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        # Title
        title = Paragraph("Attendance Report", styles['Title'])
        elements.append(title)
        elements.append(Spacer(1, 12))

        # Session info
        session_info = Paragraph(f"Session ID: {session_id}", styles['Normal'])
        elements.append(session_info)
        elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        elements.append(Spacer(1, 12))

        # Attendance data
        attendance_data = [['Student ID', 'Student Name', 'Time', 'Status']]

        for student_id, record in attendance_records[session_id].items():
            if student_id in student_data:
                attendance_data.append([
                    student_id,
                    student_data[student_id]['name'],
                    record['timestamp'],
                    record['status']
                ])

        # Create table
        table = Table(attendance_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))

        elements.append(table)

        # Build PDF
        doc.build(elements)

        return send_file(pdf_path, mimetype='application/pdf', as_attachment=True, download_name=f'attendance_report_{session_id}.pdf')
    
    except Exception as e:
        print(f"PDF generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Failed to generate PDF: {str(e)}'}), 500

@app.route('/enroll', methods=['POST'])
def enroll_face():
    data = request.json
    image_data = base64.b64decode(data['image'])
    image = Image.open(io.BytesIO(image_data))
    image_np = np.array(image)

    face_locations = face_recognition.face_locations(image_np)
    if len(face_locations) == 0:
        return jsonify({'error': 'No face detected'})

    face_encoding = face_recognition.face_encodings(image_np, face_locations)[0]
    known_faces[data['userId']] = face_encoding.tolist()

    return jsonify({'success': True})

@app.route('/detect', methods=['POST'])
def detect_face():
    data = request.json
    image_data = base64.b64decode(data['image'])
    image = Image.open(io.BytesIO(image_data))
    image_np = np.array(image)

    face_locations = face_recognition.face_locations(image_np)
    face_encodings = face_recognition.face_encodings(image_np, face_locations)

    detected_users = []
    for face_encoding in face_encodings:
        if known_faces:  # Check if we have any known faces
            matches = face_recognition.compare_faces(
                list(known_faces.values()),
                face_encoding,
                tolerance=0.6
            )
            if True in matches:
                user_id = list(known_faces.keys())[matches.index(True)]
                detected_users.append(user_id)

    return jsonify({
        'detected': len(detected_users) > 0,
        'faces': len(face_locations),
        'recognized_users': detected_users
    })

@app.route('/upload-face', methods=['POST'])
def upload_face():
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'Image file is required'}), 400

    user_id = request.form.get('userId')
    if not user_id:
        return jsonify({'success': False, 'error': 'UserId is required'}), 400

    file = request.files['image']
    try:
        image = Image.open(file.stream).convert('RGB')
        image_np = np.array(image)
    except Exception as exc:
        return jsonify({'success': False, 'error': f'Invalid image data: {exc}'}), 400

    face_locations = face_recognition.face_locations(image_np)
    if not face_locations:
        return jsonify({'success': False, 'error': 'No face detected'}), 422

    face_encodings = face_recognition.face_encodings(image_np, face_locations)
    if not face_encodings:
        return jsonify({'success': False, 'error': 'No face encoding could be extracted'}), 422

    known_faces[user_id] = face_encodings[0].tolist()

    return jsonify({'success': True, 'userId': user_id})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)