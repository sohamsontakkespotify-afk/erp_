from app import create_app
from models import db

app = create_app()
with app.app_context():
    # For gate_entry_logs
    db.engine.execute('ALTER TABLE gate_entry_logs DROP FOREIGN KEY gate_entry_logs_ibfk_1')
    db.engine.execute('ALTER TABLE gate_entry_logs ADD CONSTRAINT gate_entry_logs_ibfk_1 FOREIGN KEY (user_id) REFERENCES gate_users (id) ON DELETE CASCADE')

    # For going_out_logs
    db.engine.execute('ALTER TABLE going_out_logs DROP FOREIGN KEY going_out_logs_ibfk_1')
    db.engine.execute('ALTER TABLE going_out_logs ADD CONSTRAINT going_out_logs_ibfk_1 FOREIGN KEY (user_id) REFERENCES gate_users (id) ON DELETE CASCADE')

    # For gate_entry_sessions
    db.engine.execute('ALTER TABLE gate_entry_sessions DROP FOREIGN KEY gate_entry_sessions_ibfk_1')
    db.engine.execute('ALTER TABLE gate_entry_sessions ADD CONSTRAINT gate_entry_sessions_ibfk_1 FOREIGN KEY (user_id) REFERENCES gate_users (id) ON DELETE CASCADE')

    print("Cascade delete added to all foreign keys.")
