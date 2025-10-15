"""
Face Recognition Utilities using face_recognition library
Handles face encoding generation and comparison
"""
import base64
import io
import json
import logging
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


# Try to import OpenCV
try:
    import cv2
    FACE_RECOGNITION_AVAILABLE = True
    logger.info("OpenCV (cv2) library loaded successfully")
except ImportError as e:
    FACE_RECOGNITION_AVAILABLE = False
    logger.warning(f"OpenCV (cv2) library not available. Face recognition features will be disabled. Error: {e}")


def is_face_recognition_available():
    """Check if face recognition is available"""
    return FACE_RECOGNITION_AVAILABLE


def base64_to_image(base64_string):
    """Convert base64 string to PIL Image"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        return image
    except Exception as e:
        logger.error(f"Error converting base64 to image: {e}")
        return None


def image_to_numpy(image):
    """Convert PIL Image to numpy array"""
    try:
        return np.array(image)
    except Exception as e:
        logger.error(f"Error converting image to numpy: {e}")
        return None


def generate_face_encoding(photo_base64):
    """
    Generate face encoding from base64 photo using face_recognition library
    
    Args:
        photo_base64: Base64 encoded photo string
        
    Returns:
        dict: {
            'success': bool,
            'encoding': str (JSON serialized numpy array) or None,
            'message': str,
            'face_count': int
        }
    """
    if not FACE_RECOGNITION_AVAILABLE:
        return {
            'success': False,
            'encoding': None,
            'message': 'OpenCV (cv2) library not available. Please install: pip install opencv-python',
            'face_count': 0
        }
    if not photo_base64:
        return {
            'success': False,
            'encoding': None,
            'message': 'No photo provided',
            'face_count': 0
        }
    try:
        image = base64_to_image(photo_base64)
        if image is None:
            return {
                'success': False,
                'encoding': None,
                'message': 'Failed to decode image',
                'face_count': 0
            }
        image_array = image_to_numpy(image)
        if image_array is None:
            return {
                'success': False,
                'encoding': None,
                'message': 'Failed to convert image to array',
                'face_count': 0
            }
        # Convert to grayscale for OpenCV
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        # Use Haar Cascade for face detection
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        face_count = len(faces)
        if face_count == 0:
            return {
                'success': False,
                'encoding': None,
                'message': 'No face detected in the photo. Please ensure your face is clearly visible.',
                'face_count': 0
            }
        if face_count > 1:
            return {
                'success': False,
                'encoding': None,
                'message': f'Multiple faces detected ({face_count}). Please ensure only one face is in the photo.',
                'face_count': face_count
            }
        # Crop the face region
        (x, y, w, h) = faces[0]
        face_img = gray[y:y+h, x:x+w]
        # Resize to a standard size for encoding
        face_img = cv2.resize(face_img, (100, 100))
        # Serialize the face image as encoding
        encoding_json = json.dumps(face_img.tolist())
        logger.info(f"Successfully generated face encoding (OpenCV LBPH)")
        return {
            'success': True,
            'encoding': encoding_json,
            'message': 'Face encoding generated successfully',
            'face_count': 1
        }
    except Exception as e:
        logger.error(f"Error generating face encoding: {e}")
        return {
            'success': False,
            'encoding': None,
            'message': f'Error processing face: {str(e)}',
            'face_count': 0
        }


def compare_faces(known_encoding_json, unknown_photo_base64, tolerance=0.6):
    """
    Compare a known face encoding with an unknown photo
    
    Args:
        known_encoding_json: JSON string of known face encoding
        unknown_photo_base64: Base64 encoded photo to compare
        tolerance: Distance tolerance for matching (lower = more strict, default 0.6)
        
    Returns:
        dict: {
            'success': bool,
            'match': bool,
            'distance': float,
            'message': str
        }
    """
    if not FACE_RECOGNITION_AVAILABLE:
        return {
            'success': False,
            'match': False,
            'distance': None,
            'message': 'Face recognition library not available'
        }
    
    try:
        # Load known encoding (face image)
        known_face_img = np.array(json.loads(known_encoding_json), dtype=np.uint8)
        # Generate encoding for unknown photo
        result = generate_face_encoding(unknown_photo_base64)
        if not result['success']:
            return {
                'success': False,
                'match': False,
                'distance': None,
                'message': result['message']
            }
        unknown_face_img = np.array(json.loads(result['encoding']), dtype=np.uint8)
        # Use LBPHFaceRecognizer for comparison
        recognizer = cv2.face.LBPHFaceRecognizer_create()
        recognizer.train([known_face_img], np.array([0]))
        label, confidence = recognizer.predict(unknown_face_img)
        match = confidence < (tolerance * 100)  # Lower confidence means better match
        logger.info(f"Face comparison: match={match}, confidence={confidence:.2f}, tolerance={tolerance}")
        return {
            'success': True,
            'match': match,
            'distance': confidence,
            'message': 'Face matched!' if match else 'Face does not match'
        }
    except Exception as e:
        logger.error(f"Error comparing faces: {e}")
        return {
            'success': False,
            'match': False,
            'distance': None,
            'message': f'Error comparing faces: {str(e)}'
        }


def recognize_face_from_database(unknown_photo_base64, known_faces_dict, tolerance=0.6):
    """
    Recognize a face from a database of known faces
    
    Args:
        unknown_photo_base64: Base64 encoded photo to recognize
        known_faces_dict: Dict of {user_id: face_encoding_json}
        tolerance: Distance tolerance for matching (lower = more strict, default 0.6)
        
    Returns:
        dict: {
            'success': bool,
            'recognized': bool,
            'user_id': int or None,
            'distance': float or None,
            'message': str
        }
    """
    if not FACE_RECOGNITION_AVAILABLE:
        return {
            'success': False,
            'recognized': False,
            'user_id': None,
            'distance': None,
            'message': 'Face recognition library not available'
        }
    
    if not known_faces_dict:
        return {
            'success': False,
            'recognized': False,
            'user_id': None,
            'distance': None,
            'message': 'No registered faces in database'
        }
    
    try:
        result = generate_face_encoding(unknown_photo_base64)
        if not result['success']:
            return {
                'success': False,
                'recognized': False,
                'user_id': None,
                'distance': None,
                'message': result['message']
            }
        unknown_face_img = np.array(json.loads(result['encoding']), dtype=np.uint8)
        # Prepare training data for LBPH recognizer
        train_imgs = []
        train_labels = []
        user_ids = []
        for idx, (user_id, encoding_json) in enumerate(known_faces_dict.items()):
            if encoding_json:
                try:
                    known_face_img = np.array(json.loads(encoding_json), dtype=np.uint8)
                    # Validate shape
                    if known_face_img.shape != (100, 100):
                        logger.warning(f"Encoding for user {user_id} has invalid shape: {known_face_img.shape}")
                        continue
                    train_imgs.append(known_face_img)
                    train_labels.append(idx)
                    user_ids.append(user_id)
                except Exception as e:
                    logger.warning(f"Failed to load encoding for user {user_id}: {e}")
        logger.info(f"Loaded {len(train_imgs)} valid face encodings for recognition.")
        if not train_imgs:
            return {
                'success': False,
                'recognized': False,
                'user_id': None,
                'distance': None,
                'message': 'No valid face encodings in database'
            }
        recognizer = cv2.face.LBPHFaceRecognizer_create()
        recognizer.train(train_imgs, np.array(train_labels))
        label, confidence = recognizer.predict(unknown_face_img)
        match = confidence < (tolerance * 100)
        best_match_user_id = user_ids[label] if match else None
        logger.info(f"Face recognized: user_id={best_match_user_id}, confidence={confidence:.2f}")
        return {
            'success': True,
            'recognized': match,
            'user_id': best_match_user_id,
            'distance': confidence,
            'message': f'Face recognized (confidence: {100-confidence:.1f}%)' if match else 'Face not recognized. Please register first.'
        }
    except Exception as e:
        logger.error(f"Error recognizing face: {e}")
        return {
            'success': False,
            'recognized': False,
            'user_id': None,
            'distance': None,
            'message': f'Error recognizing face: {str(e)}'
        }


# Backward compatibility functions
def load_known_faces():
    """
    Load known faces from database
    This is a placeholder - actual implementation should query the database
    """
    logger.warning("load_known_faces() called but not implemented. Use recognize_face_from_database() instead.")
    return {}


def find_matching_face(face_encoding, known_faces, tolerance=0.6):
    """
    Find matching face from known faces
    This is a placeholder for backward compatibility
    """
    logger.warning("find_matching_face() called but deprecated. Use recognize_face_from_database() instead.")
    return None