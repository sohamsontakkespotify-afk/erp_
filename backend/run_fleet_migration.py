#!/usr/bin/env python3
"""
Create missing fleet-related tables to support Transport Department flows.

This script is idempotent and safe to run multiple times. It will create:
- vehicle
- transport_job

It assumes the sales/dispatch tables already exist (dispatch_request, sales_order).
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from config import config as app_config


def get_engine():
    load_dotenv()
    config_name = os.getenv('FLASK_CONFIG', 'default')
    FlaskConfig = app_config[config_name]
    uri = FlaskConfig.SQLALCHEMY_DATABASE_URI
    return create_engine(uri)


CREATE_VEHICLE_TABLE = """
CREATE TABLE IF NOT EXISTS vehicle (
  id INT NOT NULL AUTO_INCREMENT,
  vehicle_number VARCHAR(100) NOT NULL UNIQUE,
  vehicle_type VARCHAR(50) NOT NULL,
  driver_name VARCHAR(200) NOT NULL,
  driver_contact VARCHAR(100),
  capacity VARCHAR(100),
  status VARCHAR(50) DEFAULT 'available',
  current_location VARCHAR(200),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_vehicle_status (status),
  INDEX idx_vehicle_number (vehicle_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""


CREATE_TRANSPORT_JOB_TABLE = """
CREATE TABLE IF NOT EXISTS transport_job (
  id INT NOT NULL AUTO_INCREMENT,
  dispatch_request_id INT NOT NULL,
  transporter_name VARCHAR(200),
  vehicle_no VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_transport_status (status),
  INDEX idx_transport_dispatch (dispatch_request_id),
  CONSTRAINT fk_transport_dispatch_request
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_request(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""


def ensure_tables():
    engine = get_engine()
    with engine.connect() as conn:
        # Vehicle table
        conn.execute(text(CREATE_VEHICLE_TABLE))
        conn.commit()

        # Transport job table
        try:
            conn.execute(text(CREATE_TRANSPORT_JOB_TABLE))
            conn.commit()
        except Exception as e:
            # If dispatch_request FK fails due to missing table, log a friendly message
            msg = str(e)
            if 'dispatch_request' in msg or 'foreign key' in msg.lower():
                print('Warning: dispatch_request table missing. Run dispatch migration first, then rerun this script.')
            else:
                raise

        print('✅ Fleet tables ensured (vehicle, transport_job).')


if __name__ == '__main__':
    ensure_tables()






