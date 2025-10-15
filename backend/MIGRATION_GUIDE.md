# Database Migration Guide

## Overview

This ERP system now includes an **automatic migration system** that runs all database table creation queries automatically when the application starts. You no longer need to manually run migration files separately!

## How It Works

### Automatic Migration on Startup

When you start the Flask application (`python app.py`), the system will:

1. ✅ **Automatically detect** which tables need to be created
2. ✅ **Run all migrations** in the correct order
3. ✅ **Create all required tables** for the ERP system
4. ✅ **Skip existing tables** (idempotent - safe to run multiple times)
5. ✅ **Create admin user** and sample data

### What Gets Created Automatically

The migration system creates tables for all major modules:

#### 📊 Sales Module
- `sales_order` - Sales orders and transactions
- `customer` - Customer information
- `sales_transaction` - Payment transactions

#### 👥 HR Module
- `employees` - Employee records
- `attendance` - Attendance tracking
- `leaves` - Leave requests and approvals
- `payrolls` - Payroll processing
- `performance_reviews` - Performance evaluations
- `job_postings` - Job openings
- `job_applications` - Job applications
- `interviews` - Interview scheduling
- `candidates` - Candidate database

#### 🚚 Dispatch & Fleet Module
- `dispatch_request` - Dispatch requests (updated with new columns)
- `vehicle` - Fleet vehicle management
- `transport_job` - Transport job tracking

#### 🏢 Guest Management Module
- `guest_list` - Visitor and guest tracking

#### 🚪 Gate Entry Module
- Tables created via SQLAlchemy models (db.create_all())

## Deployment to New Device

### Step 1: Clone/Copy the Project
```bash
# Copy the entire project to the new device
# Or clone from your repository
git clone <your-repo-url>
cd erp_working_2/backend
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Configure Database
Create or update `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
FLASK_CONFIG=default
```

### Step 4: Run the Application
```bash
python app.py
```

**That's it!** 🎉 

The application will automatically:
- Connect to your database
- Run all migrations
- Create all required tables
- Set up admin user
- Start the server

## Migration System Architecture

### Core Files

1. **`utils/migration_manager.py`** - Central migration manager
   - Contains all table creation SQL
   - Manages migration execution order
   - Handles errors gracefully
   - Provides detailed logging

2. **`app.py`** - Application entry point
   - Calls `init_migrations()` on startup
   - Runs migrations before starting the server

### Migration Flow

```
app.py starts
    ↓
initialize_database() called
    ↓
init_migrations(app, db) executed
    ↓
MigrationManager.run_all_migrations()
    ↓
├── run_sales_migration()
├── run_hr_migration()
├── run_dispatch_migration()
├── run_fleet_migration()
└── run_guest_list_migration()
    ↓
db.create_all() (for SQLAlchemy models)
    ↓
Create admin user
    ↓
Add sample data
    ↓
Server starts
```

## Adding New Migrations

If you need to add new tables or modify existing ones:

### Option 1: Add to Migration Manager (Recommended)

Edit `utils/migration_manager.py` and add a new migration method:

```python
def run_your_module_migration(self, connection):
    """Create your module tables"""
    print("🔄 Running your module migration...")
    
    create_your_table = """
    CREATE TABLE IF NOT EXISTS your_table (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """
    
    try:
        connection.execute(text(create_your_table))
        connection.commit()
        print("✅ Your module tables created successfully!")
        return True
    except Exception as e:
        print(f"⚠️ Your module migration error: {e}")
        return False
```

Then add it to `run_all_migrations()`:

```python
def run_all_migrations(self):
    # ... existing code ...
    with self.engine.connect() as connection:
        self.run_sales_migration(connection)
        self.run_hr_migration(connection)
        self.run_your_module_migration(connection)  # Add here
        # ... rest of migrations ...
```

### Option 2: Use SQLAlchemy Models

Create your model in `models/` directory and it will be automatically created by `db.create_all()`.

## Troubleshooting

### Migration Fails

If a migration fails:

1. **Check the error message** - The system provides detailed error logs
2. **Verify database credentials** - Ensure `.env` file is correct
3. **Check database permissions** - User needs CREATE TABLE privileges
4. **Review dependencies** - Some tables depend on others (foreign keys)

### Table Already Exists

Don't worry! The system uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

### Foreign Key Errors

If you see foreign key constraint errors:
- The migration system runs in order to handle dependencies
- Ensure parent tables are created before child tables
- Check the order in `run_all_migrations()`

### Manual Migration (If Needed)

If you need to run migrations manually for debugging:

```bash
# Individual migration files (old method - not needed anymore)
python run_migration.py          # Sales tables
python run_hr_migration.py       # HR tables
python run_dispatch_migration.py # Dispatch updates
python run_fleet_migration.py    # Fleet tables
python run_guest_list_migration.py # Guest list
```

## Benefits of Automatic Migration

✅ **No Manual Steps** - Just run the app, everything is set up
✅ **Consistent Deployment** - Same setup on every device
✅ **Error Handling** - Graceful handling of existing tables
✅ **Idempotent** - Safe to run multiple times
✅ **Centralized** - All migrations in one place
✅ **Logged** - Clear output showing what's happening
✅ **Fast Deployment** - Set up new environments in seconds

## Database Backup Recommendation

Before deploying to production:

```bash
# Backup your database
mysqldump -u username -p database_name > backup.sql

# Restore if needed
mysql -u username -p database_name < backup.sql
```

## Support

If you encounter any issues:

1. Check the console output for detailed error messages
2. Verify your database connection settings
3. Ensure all dependencies are installed
4. Check database user permissions

## Version History

- **v2.0** - Automatic migration system implemented
- **v1.0** - Manual migration files

---

**Note**: The old migration files (`run_*_migration.py`) are still available for manual execution if needed, but they are no longer required for normal operation.