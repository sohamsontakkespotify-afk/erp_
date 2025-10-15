import mysql.connector
from mysql.connector import Error

def fix_payroll_column_order():
    connection = None
    try:
        # Connect to MySQL database
        connection = mysql.connector.connect(
            host='localhost',
            database='production_management',
            user='root',
            password='admin',
            auth_plugin='mysql_native_password'
        )

        if connection.is_connected():
            cursor = connection.cursor()

            # First, backup the name data
            print("Backing up name data...")
            cursor.execute("""
                CREATE TEMPORARY TABLE temp_payroll_names AS
                SELECT id, name FROM payrolls WHERE name IS NOT NULL
            """)

            # Drop the name column
            print("Dropping name column...")
            cursor.execute("ALTER TABLE payrolls DROP COLUMN name")

            # Add the name column in the correct position (after employee_id)
            print("Adding name column in correct position...")
            cursor.execute("ALTER TABLE payrolls ADD COLUMN name VARCHAR(100) AFTER employee_id")

            # Restore the name data
            print("Restoring name data...")
            cursor.execute("""
                UPDATE payrolls p
                JOIN temp_payroll_names t ON p.id = t.id
                SET p.name = t.name
            """)

            # Drop the temporary table
            cursor.execute("DROP TEMPORARY TABLE temp_payroll_names")

            connection.commit()
            print("Payroll column order fixed successfully!")

    except Error as e:
        print(f"Error: {e}")
        if connection.is_connected():
            connection.rollback()

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    fix_payroll_column_order()
