const express = require('express');
const serverless = require('serverless-http');
const { Pool } = require('@neondatabase/serverless');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const crypto = require('crypto');

// Initialize Express app
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Get environment variables
const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'pureflow-mvp-secret-key';

// Setup database connection
let pool = null;
let isDbConnected = false;

// Log environment variables (without sensitive values)
console.log("Environment variables check:");
console.log("- DATABASE_URL exists:", !!DATABASE_URL);
console.log("- SESSION_SECRET exists:", !!SESSION_SECRET);
console.log("- NODE_ENV:", process.env.NODE_ENV);

// Configure session for serverless
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: isProduction ? 'none' : 'lax',
  }
}));

// Set trust proxy if in production
if (isProduction) {
  app.set("trust proxy", 1);
}

// Helper functions for authentication
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  
  return new Promise((resolve, reject) => {
    crypto.scrypt(supplied, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(crypto.timingSafeEqual(hashedBuf, derivedKey));
    });
  });
}

// Setup Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  { usernameField: "email" },
  async (email, password, done) => {
    try {
      // Get user by email
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      const user = result.rows[0];
      
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false, { message: "Invalid email or password" });
      }
      
      // Update last login time
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    const user = result.rows[0];
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// API Routes

// Login route
app.post("/api/login", (req, res) => {
  try {
    console.log("Login request received");
    
    // For testing, just return a successful login with mock data
    const mockUser = {
      id: 1,
      email: req.body.email || "admin@pureflow.com",
      username: "admin",
      role: "admin"
    };
    
    console.log("Returning mock user:", mockUser.email);
    res.status(200).json(mockUser);
  } catch (err) {
    console.error("Error in login route:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
});

// Current user route
app.get("/api/user", (req, res) => {
  try {
    // For testing, return a mock user
    const mockUser = {
      id: 1,
      email: "admin@pureflow.com",
      username: "admin",
      role: "admin"
    };
    
    res.json(mockUser);
  } catch (err) {
    console.error("Error in user route:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
});

// Logout route
app.post("/api/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.sendStatus(200);
  });
});

// Health check route
app.get("/api/health", (req, res) => {
  console.log("Health check requested");
  
  res.json({ 
    status: "ok", 
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({ 
    message: "Internal Server Error", 
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Export the handler
exports.handler = serverless(app); 