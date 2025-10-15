from datetime import datetime, timedelta
from . import db
import secrets

class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    used = db.Column(db.Boolean, default=False)

    user = db.relationship('User', backref=db.backref('reset_tokens', lazy=True))

    @staticmethod
    def generate_token():
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)

    @classmethod
    def create_token(cls, user_id):
        """Create a new password reset token for a user"""
        # Clean up expired tokens for this user
        cls.cleanup_expired_tokens(user_id)

        # Generate new token
        token = cls.generate_token()
        expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour

        reset_token = cls(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )

        db.session.add(reset_token)
        db.session.commit()

        return reset_token

    @classmethod
    def validate_token(cls, token):
        """Validate a token and return the associated user if valid"""
        reset_token = cls.query.filter_by(token=token, used=False).first()

        if not reset_token:
            return None

        if reset_token.expires_at < datetime.utcnow():
            # Token expired, mark as used to prevent reuse
            reset_token.used = True
            db.session.commit()
            return None

        return reset_token.user

    @classmethod
    def mark_token_used(cls, token):
        """Mark a token as used after successful password reset"""
        reset_token = cls.query.filter_by(token=token).first()
        if reset_token:
            reset_token.used = True
            db.session.commit()

    @classmethod
    def cleanup_expired_tokens(cls, user_id=None):
        """Clean up expired tokens"""
        query = cls.query.filter(
            cls.expires_at < datetime.utcnow(),
            cls.used == False
        )

        if user_id:
            query = query.filter_by(user_id=user_id)

        expired_tokens = query.all()
        for token in expired_tokens:
            db.session.delete(token)

        if expired_tokens:
            db.session.commit()

    def __repr__(self):
        return f'<PasswordResetToken user_id={self.user_id} token={self.token[:10]}...>'
