from app import create_app
from models import db, Leave

app = create_app()
with app.app_context():
    # Delete all leaves first
    Leave.query.delete()
    db.session.commit()
    # Drop the leaves table
    Leave.__table__.drop(db.engine, checkfirst=True)
    # Recreate the table
    Leave.__table__.create(db.engine)
    print("Leaves table recreated with new enum values")
