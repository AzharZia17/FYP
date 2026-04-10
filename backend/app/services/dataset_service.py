import cv2
import os
import time
import numpy as np

def is_blurry(image, threshold=85.0):
    return cv2.Laplacian(image, cv2.CV_64F).var() < threshold

def is_dark(image, threshold=40.0):
    return np.mean(image) < threshold

def get_current_phase(count):
    if count < 25:
        return "Look Straight at the Camera", (255, 255, 0)
    elif count < 50:
        return "Turn your face slightly Left", (255, 128, 0)
    elif count < 75:
        return "Turn your face slightly Right", (0, 165, 255)
    else:
        return "Tilt your head slightly (Up/Down)", (255, 0, 255)

def run_face_capture(student_name: str) -> int:
    """
    Programmatically runs the dataset capture UI using OpenCV.
    Intended for local hardware usage only.
    Returns: The total number of valid images successfully captured.
    """
    if not student_name:
        raise ValueError("Student name is required.")

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    dataset_dir = os.path.join(base_dir, "dataset", student_name)
    os.makedirs(dataset_dir, exist_ok=True)

    # Attempt to open standard webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Could not open the webcam.")

    face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    face_cascade = cv2.CascadeClassifier(face_cascade_path)
    
    if face_cascade.empty():
        cap.release()
        raise RuntimeError("Could not load Haar cascade. Cannot proceed.")

    count = 0
    max_images = 100
    last_saved_time = time.time()
    
    # Wait time offset for user to get ready
    time.sleep(1)

    while count < max_images:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.2, 
            minNeighbors=6, 
            minSize=(60, 60)
        )

        phase_instruction, phase_color = get_current_phase(count)
        status_text = "Searching for face..."
        status_color = (0, 165, 255)

        for (x, y, w, h) in faces:
            pad_y = int(h * 0.1)
            pad_x = int(w * 0.1)
            
            start_y = max(0, y - pad_y)
            end_y = min(frame.shape[0], y + h + pad_y)
            start_x = max(0, x - pad_x)
            end_x = min(frame.shape[1], x + w + pad_x)

            face_crop = frame[start_y:end_y, start_x:end_x]
            face_crop_gray = gray[start_y:end_y, start_x:end_x]
            
            if face_crop.size == 0:
                continue

            # Quality tests
            if w < 100 or h < 100:
                status_text = "Move Closer! (Face too small)"
                status_color = (0, 0, 255)
            elif is_dark(face_crop_gray, threshold=40.0):
                status_text = "Too Dark! (Improve lighting)"
                status_color = (0, 0, 255)
            elif is_blurry(face_crop_gray, threshold=85.0):
                status_text = "Blurry! (Hold still)"
                status_color = (0, 0, 255)
            else:
                status_text = "Perfect!"
                status_color = (0, 255, 0)
                
                current_time = time.time()
                if current_time - last_saved_time >= 0.2:
                    count += 1
                    file_path = os.path.join(dataset_dir, f"{student_name}_{count}.jpg")
                    cv2.imwrite(file_path, face_crop)
                    last_saved_time = current_time

            cv2.rectangle(frame, (x, y), (x+w, y+h), status_color, 2)
            break
            
        cv2.putText(frame, phase_instruction, (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, phase_color, 3)
                    
        cv2.putText(frame, f"Captured: {count}/{max_images}", (20, 80), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, status_text, (20, 120), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)
                    
        cv2.imshow('Smart Attendance - Dataset API Pipeline', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    
    return count
