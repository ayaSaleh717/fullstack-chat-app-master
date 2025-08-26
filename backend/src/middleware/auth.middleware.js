import jwt from "jsonwebtoken";
import User from "../models/user.model.js";


export const protectRoute = async (req, res, next) => {
  try {
    // Get the JWT token from the cookies
    const token = req.cookies.jwt;

    // If no token is provided, return an unauthorized error
    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    // Verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If the token is invalid, return an unauthorized error
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
      
    }

    // Find the user by the ID from the decoded token, excluding the password
    const user = await User.findById(decoded.userId).select("-password");

    // If the user is not found, return a not found error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Attach the user object to the request for further use
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Handle any errors that occur during the process
    console.log("Error in protectRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
