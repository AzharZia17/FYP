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
        return "Look Straight at the Camera", (255, 255, 0) # Cyan
    elif count < 50:
        return "Turn your face slightly Left", (255, 128, 0) # Blue-ish
    elif count < 75:
        return "Turn your face slightly Right", (0, 165, 255) # Orange
    else:
        return "Tilt your head slightly (Up/Down)", (255, 0, 255) # Magenta

def main():
    print("--- Manual Dataset Capture Tool ---")
    student_id = input("Enter the Student ID (Numeric): ").strip()
    
    if not student_id.isdigit():
        print("Error: Student ID must be a numeric value.")
        return

    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(base_dir, "dataset", student_id)
    os.makedirs(dataset_dir, exist_ok=True)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open the webcam.")
        return

    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    if face_cascade.empty():
        print("Error: Could not load Haar cascade.")
        return

    print(f"\nTarget ID: {student_id}")
    print(f"Directory: {dataset_dir}")
    print("Starting capture in 3 seconds... Follow the on-screen instructions.")
    time.sleep(3)

    count = 0
    max_images = 100
    last_saved_time = time.time()

    while count < max_images:
        ret, frame = cap.read()
        if not ret:
            print("Failed to capture image. Exiting run.")
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.2, 
            minNeighbors=6, 
            minSize=(60, 60)
        )

        # Determine phase
        phase_instruction, phase_color = get_current_phase(count)
        status_text = "Searching for face..."
        status_color = (0, 165, 255) # Orange

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

            # Quality Controls
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
                
                # Capture frame if acceptable
                current_time = time.time()
                if current_time - last_saved_time >= 0.2:
                    count += 1
                    file_path = os.path.join(dataset_dir, f"id_{student_id}_{count}.jpg")
                    cv2.imwrite(file_path, face_crop)
                    last_saved_time = current_time
                    print(f"Captured {count}/{max_images} [Phase: {phase_instruction}]")

            # Draw bounded box with respective status color indicating success or failure
            cv2.rectangle(frame, (x, y), (x+w, y+h), status_color, 2)
            break
            
        # Draw HUD overlays
        # Main instruction from current phase
        cv2.putText(frame, phase_instruction, (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, phase_color, 3)
                    
        # Counters and status
        cv2.putText(frame, f"Captured: {count}/{max_images}", (20, 80), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, status_text, (20, 120), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)
                    
        cv2.imshow('Smart Attendance - Diverged Dataset Capture', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("\nManually interrupted by user.")
            break

    print(f"\nCapture complete! {count} images saved for Student ID: {student_id}.")
    print("\n[IMPORTANT] To update the database with these new faces, you MUST run:")
    print("python backend/train_encodings.py")

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
