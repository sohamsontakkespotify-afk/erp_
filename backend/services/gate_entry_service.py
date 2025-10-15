import os
import pandas as pd
from datetime import datetime, timedelta
import json
from typing import Dict, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GateEntryService:
    def __init__(self):
        self.data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        self.gate_logs_file = os.path.join(self.data_dir, 'gate_entry_logs.xlsx')
        self.going_out_logs_file = os.path.join(self.data_dir, 'going_out_logs.xlsx')
        self.users_file = os.path.join(self.data_dir, 'gate_users.xlsx')

        # Ensure data directory exists
        os.makedirs(self.data_dir, exist_ok=True)

        # Initialize Excel files if they don't exist
        self._initialize_files()

    def _initialize_files(self):
        """Initialize Excel files with proper headers if they don't exist"""
        # Gate Entry Logs
        if not os.path.exists(self.gate_logs_file):
            df = pd.DataFrame(columns=[
                'timestamp', 'user_name', 'user_phone', 'action',
                'method', 'details', 'status'
            ])
            df.to_excel(self.gate_logs_file, index=False)

        # Going Out Logs
        if not os.path.exists(self.going_out_logs_file):
            df = pd.DataFrame(columns=[
                'timestamp', 'user_name', 'user_phone', 'reason',
                'details', 'status', 'return_time'
            ])
            df.to_excel(self.going_out_logs_file, index=False)

        # Users
        if not os.path.exists(self.users_file):
            df = pd.DataFrame(columns=[
                'user_id', 'name', 'phone', 'registered_at',
                'last_entry', 'last_exit', 'status', 'photo'
            ])
            df.to_excel(self.users_file, index=False)

    def register_user(self, name: str, phone: str, photo: str = None) -> Dict:
        """Register a new user for gate entry system"""
        try:
            # Read existing users
            df = pd.read_excel(self.users_file)

            # Check if user already exists
            if phone in df['phone'].values:
                return {
                    'success': False,
                    'message': 'User with this phone number already exists'
                }

            # Create new user entry
            user_id = len(df) + 1
            new_user = {
                'user_id': user_id,
                'name': name,
                'phone': phone,
                'registered_at': datetime.now(),
                'last_entry': None,
                'last_exit': None,
                'status': 'active',
                'photo': photo
            }

            # Add to dataframe
            df = pd.concat([df, pd.DataFrame([new_user])], ignore_index=True)
            df.to_excel(self.users_file, index=False)

            logger.info(f"New user registered: {name} ({phone})")
            return {
                'success': True,
                'message': f'User {name} registered successfully',
                'user_id': user_id
            }

        except Exception as e:
            logger.error(f"Error registering user: {e}")
            return {
                'success': False,
                'message': f'Error registering user: {str(e)}'
            }

    def get_users(self) -> List[Dict]:
        """Get all registered users"""
        try:
            df = pd.read_excel(self.users_file)
            users = df.to_dict('records')

            # Convert timestamps to string format and handle NaN values
            for user in users:
                if pd.notna(user.get('registered_at')):
                    user['registered_at'] = user['registered_at'].isoformat()
                else:
                    user['registered_at'] = None
                if pd.notna(user.get('last_entry')):
                    user['last_entry'] = user['last_entry'].isoformat()
                else:
                    user['last_entry'] = None
                if pd.notna(user.get('last_exit')):
                    user['last_exit'] = user['last_exit'].isoformat()
                else:
                    user['last_exit'] = None

                # Handle NaN values in other fields
                for key, value in user.items():
                    if pd.isna(value):
                        user[key] = None

            return users

        except Exception as e:
            logger.error(f"Error getting users: {e}")
            return []

    def delete_user(self, phone: str) -> Dict:
        """Delete a user from the system"""
        try:
            df = pd.read_excel(self.users_file)

            if phone not in df['phone'].values:
                return {
                    'success': False,
                    'message': 'User not found'
                }

            # Remove user
            df = df[df['phone'] != phone]
            df.to_excel(self.users_file, index=False)

            logger.info(f"User deleted: {phone}")
            return {
                'success': True,
                'message': 'User deleted successfully'
            }

        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return {
                'success': False,
                'message': f'Error deleting user: {str(e)}'
            }

    def manual_entry(self, user_phone: str, details: str = "") -> Dict:
        """Record manual entry for a user"""
        try:
            # Check if user exists
            df_users = pd.read_excel(self.users_file)
            user = df_users[df_users['phone'] == user_phone]

            if user.empty:
                return {
                    'success': False,
                    'message': 'User not found. Please register first.'
                }

            user_name = user.iloc[0]['name']

            # Record entry in gate logs
            entry_data = {
                'timestamp': datetime.now(),
                'user_name': user_name,
                'user_phone': user_phone,
                'action': 'entry',
                'method': 'manual',
                'details': details,
                'status': 'completed'
            }

            # Update user's last entry
            df_users.loc[df_users['phone'] == user_phone, 'last_entry'] = datetime.now()
            df_users.to_excel(self.users_file, index=False)

            # Add to gate logs
            df_logs = pd.read_excel(self.gate_logs_file)
            df_logs = pd.concat([df_logs, pd.DataFrame([entry_data])], ignore_index=True)
            df_logs.to_excel(self.gate_logs_file, index=False)

            logger.info(f"Manual entry recorded for {user_name}")
            return {
                'success': True,
                'message': f'Entry recorded for {user_name}',
                'user_name': user_name
            }

        except Exception as e:
            logger.error(f"Error recording manual entry: {e}")
            return {
                'success': False,
                'message': f'Error recording entry: {str(e)}'
            }

    def manual_exit(self, user_phone: str, details: str = "") -> Dict:
        """Record manual exit for a user"""
        try:
            # Check if user exists
            df_users = pd.read_excel(self.users_file)
            user = df_users[df_users['phone'] == user_phone]

            if user.empty:
                return {
                    'success': False,
                    'message': 'User not found. Please register first.'
                }

            user_name = user.iloc[0]['name']

            # Record exit in gate logs
            exit_data = {
                'timestamp': datetime.now(),
                'user_name': user_name,
                'user_phone': user_phone,
                'action': 'exit',
                'method': 'manual',
                'details': details,
                'status': 'completed'
            }

            # Update user's last exit
            df_users.loc[df_users['phone'] == user_phone, 'last_exit'] = datetime.now()
            df_users.to_excel(self.users_file, index=False)

            # Add to gate logs
            df_logs = pd.read_excel(self.gate_logs_file)
            df_logs = pd.concat([df_logs, pd.DataFrame([exit_data])], ignore_index=True)
            df_logs.to_excel(self.gate_logs_file, index=False)

            logger.info(f"Manual exit recorded for {user_name}")
            return {
                'success': True,
                'message': f'Exit recorded for {user_name}',
                'user_name': user_name
            }

        except Exception as e:
            logger.error(f"Error recording manual exit: {e}")
            return {
                'success': False,
                'message': f'Error recording exit: {str(e)}'
            }

    def going_out(self, user_phone: str, reason: str, details: str = "") -> Dict:
        """Record going out for a user"""
        try:
            # Check if user exists
            df_users = pd.read_excel(self.users_file)
            user = df_users[df_users['phone'] == user_phone]

            if user.empty:
                return {
                    'success': False,
                    'message': 'User not found. Please register first.'
                }

            user_name = user.iloc[0]['name']

            # Record going out in logs
            going_out_data = {
                'timestamp': datetime.now(),
                'user_name': user_name,
                'user_phone': user_phone,
                'reason': reason,
                'details': details,
                'status': 'out',
                'return_time': None
            }

            # Add to going out logs
            df_logs = pd.read_excel(self.going_out_logs_file)
            df_logs = pd.concat([df_logs, pd.DataFrame([going_out_data])], ignore_index=True)
            df_logs.to_excel(self.going_out_logs_file, index=False)

            logger.info(f"Going out recorded for {user_name} - {reason}")
            return {
                'success': True,
                'message': f'Going out recorded for {user_name}',
                'user_name': user_name
            }

        except Exception as e:
            logger.error(f"Error recording going out: {e}")
            return {
                'success': False,
                'message': f'Error recording going out: {str(e)}'
            }

    def coming_back(self, user_phone: str) -> Dict:
        """Record coming back for a user"""
        try:
            # Check if user exists
            df_users = pd.read_excel(self.users_file)
            user = df_users[df_users['phone'] == user_phone]

            if user.empty:
                return {
                    'success': False,
                    'message': 'User not found. Please register first.'
                }

            user_name = user.iloc[0]['name']

            # Find the latest going out record for this user
            df_logs = pd.read_excel(self.going_out_logs_file)
            user_logs = df_logs[df_logs['user_phone'] == user_phone]

            if user_logs.empty:
                return {
                    'success': False,
                    'message': 'No going out record found for this user'
                }

            # Get the latest going out record
            latest_log = user_logs.iloc[-1]

            if latest_log['status'] == 'returned':
                return {
                    'success': False,
                    'message': 'User has already returned'
                }

            # Update the going out record with return time
            df_logs.loc[df_logs.index[-1], 'return_time'] = datetime.now()
            df_logs.loc[df_logs.index[-1], 'status'] = 'returned'
            df_logs.to_excel(self.going_out_logs_file, index=False)

            logger.info(f"Coming back recorded for {user_name}")
            return {
                'success': True,
                'message': f'Welcome back, {user_name}',
                'user_name': user_name
            }

        except Exception as e:
            logger.error(f"Error recording coming back: {e}")
            return {
                'success': False,
                'message': f'Error recording return: {str(e)}'
            }

    def get_gate_logs(self, limit: int = 100) -> List[Dict]:
        """Get gate entry logs"""
        try:
            df = pd.read_excel(self.gate_logs_file)
            logs = df.tail(limit).to_dict('records')

            # Convert timestamps to string format and handle NaN values
            for log in logs:
                if pd.notna(log.get('timestamp')):
                    log['timestamp'] = log['timestamp'].isoformat()
                else:
                    log['timestamp'] = None

                # Handle NaN values in other fields
                for key, value in log.items():
                    if pd.isna(value):
                        log[key] = None

            return logs[::-1]  # Return in reverse chronological order

        except Exception as e:
            logger.error(f"Error getting gate logs: {e}")
            return []

    def get_going_out_logs(self, limit: int = 100) -> List[Dict]:
        """Get going out logs"""
        try:
            df = pd.read_excel(self.going_out_logs_file)
            logs = df.tail(limit).to_dict('records')

            # Convert timestamps to string format and handle NaN values
            for log in logs:
                if pd.notna(log.get('timestamp')):
                    log['timestamp'] = log['timestamp'].isoformat()
                else:
                    log['timestamp'] = None
                if pd.notna(log.get('return_time')):
                    log['return_time'] = log['return_time'].isoformat()
                else:
                    log['return_time'] = None

                # Handle NaN values in other fields
                for key, value in log.items():
                    if pd.isna(value):
                        log[key] = None

            return logs[::-1]  # Return in reverse chronological order

        except Exception as e:
            logger.error(f"Error getting going out logs: {e}")
            return []

    def get_today_logs(self) -> Dict:
        """Get today's logs summary"""
        try:
            today = datetime.now().date()

            # Gate logs
            df_gate = pd.read_excel(self.gate_logs_file)
            df_gate['timestamp'] = pd.to_datetime(df_gate['timestamp'])
            today_gate_logs = df_gate[df_gate['timestamp'].dt.date == today]

            # Going out logs
            df_going_out = pd.read_excel(self.going_out_logs_file)
            df_going_out['timestamp'] = pd.to_datetime(df_going_out['timestamp'])
            today_going_out_logs = df_going_out[df_going_out['timestamp'].dt.date == today]

            return {
                'gate_entries': len(today_gate_logs[today_gate_logs['action'] == 'entry']),
                'gate_exits': len(today_gate_logs[today_gate_logs['action'] == 'exit']),
                'going_out': len(today_going_out_logs),
                'returned': len(today_going_out_logs[today_going_out_logs['status'] == 'returned'])
            }

        except Exception as e:
            logger.error(f"Error getting today logs: {e}")
            return {
                'gate_entries': 0,
                'gate_exits': 0,
                'going_out': 0,
                'returned': 0
            }

# Global service instance
gate_entry_service = GateEntryService()
