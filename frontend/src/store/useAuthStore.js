import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

// Base URL for API and WebSocket connections
const BASE_URL = "http://localhost:3500/";

/**
 * Authentication and WebSocket store using Zustand
 * Manages user authentication state and real-time communication
 */
export const useAuthStore = create((set, get) => ({
  // Authentication state
  authUser: null,             // Currently logged-in user data
  isSigningUp: false,         // Loading state during signup
  isLoggingIn: false,         // Loading state during login
  isUpdatingProfile: false,   // Loading state during profile updates
  isCheckingAuth: true,       // Initial auth check state
  onlineUsers: [],            // Array of currently online user IDs
  socket: null,               // WebSocket connection instance

  /**
   * Verifies if user is authenticated by checking session
   * Runs on app load to maintain login state
   */
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();  // Initialize WebSocket if authenticated
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  /**
   * Handles user registration
   * @param {Object} data - User registration data (email, password, etc.)
   */
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();  // Initialize WebSocket after signup
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  /**
   * Handles user login
   * @param {Object} data - User credentials (email/username, password)
   */
  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();  // Initialize WebSocket after login
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  /**
   * Handles user logout
   * Clears auth state and closes WebSocket connection
   */
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();  // Clean up WebSocket on logout
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  /**
   * Updates user profile information
   * @param {Object} data - Updated user data
   */
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  /**
   * Establishes WebSocket connection for real-time features
   * Only connects if user is authenticated and not already connected
   */
  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,  // Send user ID for socket identification
      },
    });
    socket.connect();

    set({ socket });

    // Listen for online users updates from server
    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  /**
   * Closes WebSocket connection
   * Used during logout or when connection is no longer needed
   */
  disconnectSocket: () => {
    if (get().socket?.connected) {
      get().socket.disconnect();
    }
  },
}));
