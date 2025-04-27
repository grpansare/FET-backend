const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

const userController=require('../controllers/userController');
const { sendEmail, resetPassword } = require("../controllers/EmailController");

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
      const { email, username, password, firstName, lastName } = req.body;
  
      // Check if email exists
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "Email already registered" });
      }
  
      // Check if username exists
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return res.status(400).json({ message: "Username already taken" });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create new user
      const newUser = new User({
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
      });
  
      await newUser.save();
  
      // Create JWT token
      const token = jwt.sign(
        { userId: newUser._id, username: newUser.username },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
  
      res.status(201).json({ message: "User created", token });
    } catch (err) {
      console.error("Error in register:", err);
      res.status(500).json({ message: "Server error" });
    }
  });
  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body; // identifier = email or username
  
      // Find user by email or username
      const user = await User.findOne({
        $or: [{ email: email }, { username: password }],
      });
  
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
  
      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
  
      // Optional: Update last login time
      user.lastLogin = new Date();
      await user.save();
  
      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
  
      res.status(200).json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          verified: user.verified,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });
  
router.get('/verify-email', userController.verifyEmail);

router.post("/sendemail",sendEmail)
router.post("/resetpassword/:token",resetPassword)

module.exports = router;


