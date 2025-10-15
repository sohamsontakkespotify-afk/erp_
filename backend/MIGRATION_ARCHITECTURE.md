# Migration System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ERP Application Startup                      │
│                         (app.py)                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  initialize_database(app)                        │
│                                                                  │
│  Step 1: Run Custom Migrations                                  │
│  Step 2: Create SQLAlchemy Model Tables                         │
│  Step 3: Add Missing Columns                                    │
│  Step 4: Create Admin User                                      │
│  Step 5: Add Sample Data                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              init_migrations(app, db)                            │
│           (utils/migration_manager.py)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  MigrationManager                                │
│                                                                  │
│  • Connects to database                                         │
│  • Checks for existing tables                                   │
│  • Runs migrations in order                                     │
│  • Handles errors gracefully                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────┴──────────────┐
              │  run_all_migrations()       │
              └──────────────┬──────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Sales      │    │     HR       │    │   Fleet      │
│  Migration   │    │  Migration   │    │  Migration   │
│              │    │              │    │              │
│ • sales_     │    │ • employees  │    │ • vehicle    │
│   order      │    │ • attendance │    │ • transport_ │
│ • customer   │    │ • leaves     │    │   job        │
│ • sales_     │    │ • payrolls   │    │              │
│   transaction│    │ • job_*      │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌──────────────┐
                    │   Dispatch   │
                    │  Migration   │
                    │              │
                    │ • Updates    │
                    │   dispatch_  │
                    │   request    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Guest List   │
                    │  Migration   │
                    │              │
                    │ • guest_list │
                    └──────────────┘
```

## Migration Flow Sequence

```
1. Application Starts
   └─> python app.py

2. Create Flask App
   └─> create_app()
       ├─> Load configuration
       ├─> Initialize database (db.init_app)
       ├─> Initialize mail
       └─> Register blueprints

3. Initialize Database
   └─> initialize_database(app)
       │
       ├─> [STEP 1] Run Custom Migrations
       │   └─> init_migrations(app, db)
       │       └─> MigrationManager.run_all_migrations()
       │           ├─> Check database connection
       │           ├─> run_sales_migration()
       │           │   ├─> CREATE TABLE IF NOT EXISTS sales_order
       │           │   ├─> CREATE TABLE IF NOT EXISTS customer
       │           │   └─> CREATE TABLE IF NOT EXISTS sales_transaction
       │           │
       │           ├─> run_hr_migration()
       │           │   ├─> CREATE TABLE IF NOT EXISTS employees
       │           │   ├─> CREATE TABLE IF NOT EXISTS attendance
       │           │   ├─> CREATE TABLE IF NOT EXISTS leaves
       │           │   ├─> CREATE TABLE IF NOT EXISTS payrolls
       │           │   ├─> CREATE TABLE IF NOT EXISTS performance_reviews
       │           │   ├─> CREATE TABLE IF NOT EXISTS job_postings
       │           │   ├─> CREATE TABLE IF NOT EXISTS job_applications
       │           │   ├─> CREATE TABLE IF NOT EXISTS interviews
       │           │   └─> CREATE TABLE IF NOT EXISTS candidates
       │           │
       │           ├─> run_dispatch_migration()
       │           │   └─> ALTER TABLE dispatch_request (add columns)
       │           │
       │           ├─> run_fleet_migration()
       │           │   ├─> CREATE TABLE IF NOT EXISTS vehicle
       │           │   └─> CREATE TABLE IF NOT EXISTS transport_job
       │           │
       │           └─> run_guest_list_migration()
       │               └─> CREATE TABLE IF NOT EXISTS guest_list
       │
       ├─> [STEP 2] Create SQLAlchemy Model Tables
       │   └─> db.create_all()
       │       ├─> user
       │       ├─> gate_users
       │       ├─> gate_entry_logs
       │       ├─> going_out_logs
       │       ├─> purchase_order
       │       ├─> showroom_product
       │       └─> ... (all other models)
       │
       ├─> [STEP 3] Add Missing Columns
       │   └─> ALTER TABLE purchase_order ADD COLUMN original_requirements
       │
       ├─> [STEP 4] Create Admin User
       │   └─> User.create_admin_user()
       │       └─> INSERT INTO user (username='admin', ...)
       │
       └─> [STEP 5] Add Sample Data
           └─> INSERT INTO showroom_product (...)

4. Start Flask Server
   └─> app.run(host='0.0.0.0', port=5000)
```

## Key Components

### 1. MigrationManager Class

```python
class MigrationManager:
    - __init__(app, db)           # Initialize with Flask app
    - init_app(app, db)           # Set up database connection
    - column_exists()             # Check if column exists
    - table_exists()              # Check if table exists
    - run_sales_migration()       # Create sales tables
    - run_hr_migration()          # Create HR tables
    - run_dispatch_migration()    # Update dispatch tables
    - run_fleet_migration()       # Create fleet tables
    - run_guest_list_migration()  # Create guest list table
    - run_all_migrations()        # Execute all migrations
```

### 2. Migration Methods

Each migration method follows this pattern:

```python
def run_xxx_migration(self, connection):
    """Create xxx tables"""
    print("🔄 Running xxx migration...")
    
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS table_name (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ...
    );
    """
    
    try:
        connection.execute(text(create_table_sql))
        connection.commit()
        print("✅ xxx tables created successfully!")
        return True
    except Exception as e:
        print(f"⚠️ xxx migration error: {e}")
        return False
```

### 3. Safety Features

#### Idempotent Operations
```sql
CREATE TABLE IF NOT EXISTS ...
```
- Won't fail if table already exists
- Safe to run multiple times

#### Column Existence Check
```python
if not self.column_exists(connection, 'table', 'column'):
    connection.execute(text("ALTER TABLE table ADD COLUMN column ..."))
```
- Checks before adding columns
- Prevents duplicate column errors

#### Error Handling
```python
try:
    # Migration code
except Exception as e:
    print(f"⚠️ Migration error: {e}")
    return False
```
- Catches and logs errors
- Continues with other migrations

## Database Schema

### Sales Module Tables

```
sales_order
├── id (PK)
├── order_number (UNIQUE)
├── customer_name
├── showroom_product_id (FK)
├── payment_status
└── ...

customer
├── id (PK)
├── name
├── email
├── customer_type
└── ...

sales_transaction
├── id (PK)
├── sales_order_id (FK)
├── amount
└── ...
```

### HR Module Tables

```
employees
├── id (PK)
├── employee_id (UNIQUE)
├── first_name
├── last_name
├── department
├── manager_id (FK → employees.id)
└── ...

attendance
├── id (PK)
├── employee_id (FK → employees.id)
├── date
├── check_in_time
└── ...

leaves
├── id (PK)
├── employee_id (FK → employees.id)
├── leave_type
├── status
└── ...

payrolls
├── id (PK)
├── employee_id (FK → employees.id)
├── basic_salary
├── net_salary
└── ...
```

### Fleet Module Tables

```
vehicle
├── id (PK)
├── vehicle_number (UNIQUE)
├── vehicle_type
├── driver_name
└── ...

transport_job
├── id (PK)
├── dispatch_request_id (FK)
├── vehicle_no
└── ...
```

## Deployment Scenarios

### Scenario 1: Fresh Installation

```
New Device
    ↓
Install Python & Dependencies
    ↓
Configure .env file
    ↓
Run: python app.py
    ↓
✅ All tables created automatically
✅ Admin user created
✅ Sample data added
✅ Server running
```

### Scenario 2: Existing Database

```
Device with Existing Database
    ↓
Run: python app.py
    ↓
Migration checks existing tables
    ↓
✅ Skips existing tables
✅ Creates only missing tables
✅ Updates columns if needed
✅ Server running
```

### Scenario 3: Partial Migration

```
Database with Some Tables
    ↓
Run: python app.py
    ↓
Migration checks each table
    ↓
✅ Skips: sales_order (exists)
✅ Creates: employees (missing)
✅ Updates: dispatch_request (new columns)
✅ Server running
```

## Testing Strategy

### 1. Unit Test Migrations
```bash
python test_migrations.py
```
- Tests each migration individually
- Verifies table creation
- Checks row counts

### 2. Check Database Status
```bash
python test_migrations.py --status
```
- Lists all tables
- Shows row counts
- No modifications

### 3. Full Application Test
```bash
python app.py
```
- Runs complete initialization
- Tests in real environment
- Starts server

## Advantages

✅ **Automatic** - No manual SQL scripts
✅ **Idempotent** - Safe to run multiple times
✅ **Centralized** - All migrations in one place
✅ **Versioned** - Part of codebase
✅ **Testable** - Can test before deployment
✅ **Logged** - Clear output of what's happening
✅ **Error-Tolerant** - Continues on non-critical errors
✅ **Fast** - Completes in seconds

## Maintenance

### Adding New Tables

1. Add migration method to `MigrationManager`
2. Add to `run_all_migrations()` in correct order
3. Test with `python test_migrations.py`
4. Deploy - tables created automatically

### Modifying Existing Tables

1. Add column check in migration method
2. Use `ALTER TABLE` with existence check
3. Test on development database
4. Deploy - columns added automatically

### Removing Tables

1. Remove from migration (if new deployment)
2. For existing: Add DROP TABLE in migration
3. Or manually drop in production

## Troubleshooting Guide

### Issue: Foreign Key Constraint Fails
**Solution:** Check migration order - parent tables must be created first

### Issue: Column Already Exists
**Solution:** Add column existence check before ALTER TABLE

### Issue: Permission Denied
**Solution:** Grant CREATE TABLE privileges to database user

### Issue: Connection Refused
**Solution:** Check database is running and .env configuration

---

**This architecture ensures reliable, automatic database setup on any device!**