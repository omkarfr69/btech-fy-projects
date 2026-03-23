import cv2
import numpy as np
import winsound  # built-in beep sound

# --- CONSTANTS ---
FRAME_CHECK = 15   # how many frames eyes must be closed before alert
FLAG = 0

# --- LOAD OPENCV HAAR CASCADES (BUILT-IN, NO DOWNLOADS) ---
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")

print("[INFO] Starting Drowsiness Detector (no dlib, no mediapipe, no audio files)...")

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    faces = face_cascade.detectMultiScale(gray, 1.2, 5)

    for (x, y, w, h) in faces:
        face_gray = gray[y:y+h, x:x+w]
        face_color = frame[y:y+h, x:x+w]

        # Detect eyes in the face region
        eyes = eye_cascade.detectMultiScale(face_gray, 1.1, 4)

        # If 2 eyes detected → open
        if len(eyes) >= 2:
            FLAG = 0
            cv2.putText(frame, "Eyes: OPEN", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        else:
            FLAG += 1
            cv2.putText(frame, "Eyes: CLOSED", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

            # Trigger alert after enough closed frames
            if FLAG >= FRAME_CHECK:
                cv2.putText(frame, "***** ALERT! *****", (20, 80),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)

                # Windows built-in beep
                winsound.Beep(1000, 800)  # (frequency Hz, duration ms)

        # Draw face box
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

    cv2.imshow("Drowsiness Detector (Built-in Beep)", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
