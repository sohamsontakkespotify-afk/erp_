"""
Migration script to update legacy face encodings to OpenCV format
"""

import json
import logging
from models import db
from models.gate_entry import GateUser
from utils.face_recognition_utils import generate_face_encoding
from app import create_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_face_encodings():
    users = GateUser.query.filter(GateUser.face_encoding.isnot(None)).all()
    updated = 0
    skipped = 0
    for user in users:
        try:
            # Check if encoding is legacy (128,)
            encoding = json.loads(user.face_encoding)
            if isinstance(encoding, list) and len(encoding) == 128:
                if not user.photo:
                    logger.warning(f"User {user.id} has no photo, skipping.")
                    skipped += 1
                    continue
                result = generate_face_encoding(user.photo)
                if result['success']:
                    user.face_encoding = result['encoding']
                    db.session.commit()
                    logger.info(f"Updated encoding for user {user.id} ({user.name})")
                    updated += 1
                else:
                    logger.warning(f"Failed to generate encoding for user {user.id}: {result['message']}")
                    skipped += 1
            else:
                logger.info(f"User {user.id} already has OpenCV encoding, skipping.")
                skipped += 1
        except Exception as e:
            logger.error(f"Error processing user {user.id}: {e}")
            skipped += 1
    logger.info(f"Migration complete. Updated: {updated}, Skipped: {skipped}")

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        migrate_face_encodings()
