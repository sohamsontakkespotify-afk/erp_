from app import create_app
from models import db, Leave

app = create_app()

with app.app_context():
    # Drop and recreate the leaves table to match the model order
    try:
        Leave.__table__.drop(db.engine)
        print("Dropped leaves table")
    except Exception as e:
        print(f"Error dropping table: {e}")

    try:
        Leave.__table__.create(db.engine)
        print("Recreated leaves table with correct column order")
    except Exception as e:
        print(f"Error creating table: {e}")

    print("Table recreation completed")
