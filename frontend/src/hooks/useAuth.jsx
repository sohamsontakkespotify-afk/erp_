import React, { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use sessionStorage so the session ends when the browser/tab is closed
    const savedUser = sessionStorage.getItem('erpUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      // Check if the input is an email
      const isEmail = credentials.username.includes('@');
      
      // Create the request body based on input type
      const requestBody = isEmail 
        ? { email: credentials.username, password: credentials.password }
        : { username: credentials.username, password: credentials.password };
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      // Persist only for the current session
      sessionStorage.setItem('erpUser', JSON.stringify(data.user));
      return { user: data.user };
    } catch (error) {
      throw new Error(error.message || 'Network error during login');
    }
  };

  // New OAuth login function
  const loginWithGoogle = async () => {
    try {
      // Redirect user to backend Google OAuth login endpoint
      window.location.href = `${API_BASE_URL}/auth/google/login`;
    } catch (error) {
      throw new Error(error.message || 'Network error during Google OAuth login');
    }
  };

  const register = async (registerData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      return {
        message: data.message || 'Registration successful! Your account is pending admin approval.',
        user: data.user
      };
    } catch (error) {
      throw new Error(error.message || 'Network error during registration');
    }
  };

  const getPendingUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/pending-users`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pending users');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error while fetching pending users');
    }
  };

  const approveUser = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/approve-user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve user');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error while approving user');
    }
  };

  const rejectUser = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reject-user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject user');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error while rejecting user');
    }
  };

  const getAllUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error while fetching users');
    }
  };

  const updateUserDepartment = async (userId, department) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/department`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ department }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user department');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error while updating user department');
    }
  };

  const deleteUser = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error while deleting user');
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error while sending reset email');
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error while resetting password');
    }
  };

  const logout = () => {
    setUser(null);
    // Clear session on logout
    sessionStorage.removeItem('erpUser');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginWithGoogle,
      register,
      logout,
      getPendingUsers,
      approveUser,
      rejectUser,
      getAllUsers,
      updateUserDepartment,
      deleteUser,
      forgotPassword,
      resetPassword,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};
