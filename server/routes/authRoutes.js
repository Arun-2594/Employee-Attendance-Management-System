// server/routes/authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Input validation middleware
const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
  
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }
  
  next();
};

const validateGoogleInput = (req, res, next) => {
  const { uid, email, name, idToken } = req.body;
  
  if (!uid || !email || !idToken) {
    return res.status(400).json({
      success: false,
      message: 'Missing required Google authentication data'
    });
  }
  
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format from Google'
    });
  }
  
  next();
};

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { 
      userId, 
      role,
      timestamp: Date.now()
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

// Regular login
router.post('/login', validateLoginInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for:', email);

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is a Google user trying to use password
    if (user.googleId && user.password === 'google-auth') {
      console.log('Google user attempted password login:', email);
      return res.status(400).json({
        success: false,
        message: 'Please use Google Sign-In for this account'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Invalid password for:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    console.log('Login successful for:', email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoURL: user.photoURL
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Google OAuth login
router.post('/google', validateGoogleInput, async (req, res) => {
  try {
    const { uid, email, name, photoURL, idToken } = req.body;

    console.log('Google login attempt:', { email, name, uid });

    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { googleId: uid }
      ]
    });

    if (!user) {
      console.log('Creating new user for Google login:', email);
      
      // Check if there's already a non-Google user with this email
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        googleId: { $exists: false }
      });
      
      if (existingUser) {
        console.log('Non-Google user exists with same email:', email);
        // Convert existing user to Google user
        existingUser.googleId = uid;
        existingUser.photoURL = photoURL;
        await existingUser.save();
        user = existingUser;
        console.log('Converted existing user to Google user');
      } else {
        // Create new user with Google data
        user = new User({
          name: name || email.split('@')[0],
          email: email.toLowerCase(),
          googleId: uid,
          photoURL: photoURL,
          password: 'google-auth',
          role: 'admin'
        });
        await user.save();
        console.log('New Google user created:', user.email);
      }
    } else {
      console.log('Existing user found:', user.email);
      
      // Update user data if needed
      const updates = {};
      if (!user.googleId) {
        updates.googleId = uid;
        console.log('Adding Google ID to existing user');
      }
      if (photoURL && user.photoURL !== photoURL) {
        updates.photoURL = photoURL;
        console.log('Updating user photo URL');
      }
      if (name && user.name !== name) {
        updates.name = name;
        console.log('Updating user name');
      }
      
      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(user._id, updates);
        console.log('User profile updated');
      }
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    console.log('Google login successful for:', user.email);

    res.json({
      success: true,
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Account with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during Google login: ' + error.message
    });
  }
});

// Check authentication status
router.get('/check', auth, async (req, res) => {
  try {
    // Check if user still exists in database
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      authenticated: true,
      user: {
        id: currentUser._id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        photoURL: currentUser.photoURL
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Authentication failed'
    });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        photoURL: req.user.photoURL,
        isGoogleUser: !!req.user.googleId
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const updates = {};
    
    if (name && name !== req.user.name) {
      updates.name = name;
    }
    
    if (Object.keys(updates).length > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true }
      ).select('-password');
      
      console.log('Profile updated for:', updatedUser.email);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          photoURL: updatedUser.photoURL
        }
      });
    } else {
      res.json({
        success: true,
        message: 'No changes made',
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          photoURL: req.user.photoURL
        }
      });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', auth, async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token here
    console.log('User logout:', req.user.email);
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;