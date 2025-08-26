import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    // Validate input fields
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check for password length
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already exists" });

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = await User.create({
      fullName: fullName,
      email: email,
      password: hashedPassword,
    });

    if (newUser) {
      // Generate JWT token and set it as a cookie
      generateToken(newUser._id, res);
      await newUser.save(); // Save user to the database

      // Return user information
      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * @description Login an existing user
 * @route POST /api/auth/login
 */
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    // Check if user exists and password is correct
    const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");
    if (!user || !isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token and set it as a cookie
    generateToken(user._id, res);

    // Return user information
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * @description Logout a user
 * @route POST /api/auth/logout
 */
export const logout = (req, res) => {
  try {
    // Clear the JWT cookie
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * @description Update user profile picture
 * @route PUT /api/auth/update-profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    // Validate that profile picture is provided
    if (!profilePic) {
      return res.status(400).json({ message: "Profile picture is required" });
    }

    // Validate base64 image format
    const base64Data = profilePic.split(';base64,').pop();
    if (!base64Data) {
      return res.status(400).json({ message: "Invalid image format" });
    }

    // Calculate image size in MB
    const imageSizeInMB = (base64Data.length * (3/4)) / (1024 * 1024);
    const MAX_IMAGE_SIZE_MB = 5; // 5MB limit
    
    if (imageSizeInMB > MAX_IMAGE_SIZE_MB) {
      return res.status(400).json({ 
        message: `Image size should be less than ${MAX_IMAGE_SIZE_MB}MB` 
      });
    }

    // Upload the profile picture to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(profilePic, {
      folder: 'profile_pictures',
      resource_type: 'auto',
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    if (!uploadResponse || !uploadResponse.secure_url) {
      throw new Error('Failed to upload image to Cloudinary');
    }

    // Update the user's profile picture URL in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { 
        new: true,
        select: '-password' // Don't return the password
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      profilePic: updatedUser.profilePic,
      createdAt: updatedUser.createdAt
    });
  } catch (error) {
    console.error('Error in updateProfile controller:', error);
    
    // Handle specific Cloudinary errors
    if (error.http_code) {
      return res.status(400).json({ 
        message: error.message || 'Failed to process image' 
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Internal server error' 
    });
  }
};

/**
 * @description Check authentication status
 * @route GET /api/auth/check
 */
export const checkAuth = (req, res) => {
  try {
    // If middleware succeeds, user is attached to req. Return it.
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
