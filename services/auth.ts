import { User } from '../types';

const AUTH_KEYS = {
  USERS: 'study_master_users', // Stores all registered users
  SESSION: 'study_master_session' // Stores currently logged in user
};

export const authService = {
  // Register a new user
  register: (name: string, email: string, password: string): { success: boolean; message?: string } => {
    try {
      // Normalize email to ensure case-insensitive storage and matching
      const normalizedEmail = email.toLowerCase().trim();
      const cleanName = name.trim();

      const usersStr = localStorage.getItem(AUTH_KEYS.USERS);
      const users = usersStr ? JSON.parse(usersStr) : {};

      if (users[normalizedEmail]) {
        return { success: false, message: 'User already exists with this email' };
      }

      // Create new user
      const newUser = {
        name: cleanName,
        email: normalizedEmail,
        password, // In a real app, this MUST be hashed
        joinedDate: new Date().toISOString()
      };

      // Save user
      users[normalizedEmail] = newUser;
      localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));

      // Auto login after register
      localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify({ name: newUser.name, email: newUser.email, joinedDate: newUser.joinedDate }));

      return { success: true };
    } catch (error) {
      console.error('Registration Error:', error);
      return { success: false, message: 'Registration failed. Please try clearing your browser cache.' };
    }
  },

  // Login existing user
  login: (email: string, password: string): { success: boolean; message?: string } => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      const usersStr = localStorage.getItem(AUTH_KEYS.USERS);
      const users = usersStr ? JSON.parse(usersStr) : {};
      const user = users[normalizedEmail];

      if (!user) {
        return { success: false, message: 'User not found. Please check email or Sign Up.' };
      }

      if (user.password !== password) {
        return { success: false, message: 'Invalid password' };
      }

      // Create Session
      localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify({ name: user.name, email: user.email, joinedDate: user.joinedDate }));
      return { success: true };
    } catch (error) {
      console.error('Login Error:', error);
      return { success: false, message: 'Login failed due to a storage error.' };
    }
  },

  // Update current user profile
  updateUser: (name: string): boolean => {
      try {
          const sessionStr = localStorage.getItem(AUTH_KEYS.SESSION);
          if (!sessionStr) return false;

          const session = JSON.parse(sessionStr);
          const oldEmail = session.email; 
          
          // Update Session
          const newSession = { ...session, name };
          localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(newSession));

          // Update Users DB
          const usersStr = localStorage.getItem(AUTH_KEYS.USERS);
          if (usersStr) {
              const users = JSON.parse(usersStr);
              if (users[oldEmail]) {
                  users[oldEmail] = { ...users[oldEmail], name };
                  localStorage.setItem(AUTH_KEYS.USERS, JSON.stringify(users));
              }
          }
          return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  },

  // Logout
  logout: () => {
    localStorage.removeItem(AUTH_KEYS.SESSION);
  },

  // Check if logged in
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(AUTH_KEYS.SESSION);
  },

  // Get current user info
  getUser: (): User | null => {
    const session = localStorage.getItem(AUTH_KEYS.SESSION);
    return session ? JSON.parse(session) : null;
  }
};