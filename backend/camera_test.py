import cv2

def main():
    # Attempt to open the default camera (index 0)
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open the webcam.")
        return

    # Load the pre-trained Haar cascades for face detection
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    if face_cascade.empty():
        print("Error: Could not load the face cascade classifier.")
        cap.release()
        return

    print("Live Feed Active! Press 'q' to quit.")

    while True:
        # Read the current frame from the camera
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab a frame")
            break

        # Resize the frame (optional parameter for better performance on slow devices)
        # Using interpolation INTER_AREA for downsizing if needed, but modern CPUs handle 720p fine
        # frame = cv2.resize(frame, (640, 480))

        # Convert to grayscale as Haar cascades require it
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detect faces in the image
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(30, 30)
        )

        # Draw a bounding box around all detected faces
        for (x, y, w, h) in faces:
            # Color is BGR (Blue, Green, Red)
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 255), 2)
            cv2.putText(frame, "Face", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 255), 2)

        # Show the processed live feed
        cv2.imshow('Smart Attendance - Face Detection', frame)

        # Listen for the 'q' key to quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Cleanup operations
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
