from app import create_app
from models import db, Leave, Employee

app = create_app()

with app.app_context():
    # Add the column if not exists
    from sqlalchemy import text

    try:
        db.session.execute(text("ALTER TABLE leaves ADD COLUMN name VARCHAR(100)"))
        db.session.commit()
        print("Name column added to leaves table")
    except Exception as e:
        print(f"Column might already exist: {e}")

    # Populate existing leaves with employee names
    leaves = Leave.query.all()
    updated_count = 0
    for leave in leaves:
        if leave.employee and not leave.name:
            leave.name = leave.employee.full_name
            updated_count += 1

    if updated_count > 0:
        db.session.commit()
        print(f"Populated names for {updated_count} existing leaves")
    else:
        print("No existing leaves to populate or already populated")

    print("Migration completed")
