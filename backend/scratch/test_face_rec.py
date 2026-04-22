import face_recognition
import cv2
import os
import numpy as np
from PIL import Image

def test_encoding():
    img_path = "backend/dataset/23/azhar_zia_1.jpg"
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return

    try:
        print(f"Processing: {img_path}")
        pil_img = Image.open(img_path).convert('RGB')
        image = np.array(pil_img, dtype=np.uint8)
        
        encodings = face_recognition.face_encodings(image)
        print(f"Found {len(encodings)} faces.")
        
        if len(encodings) > 0:
            print("Encoding vector sample (first 5 elements):")
            print(encodings[0][:5])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_encoding()
