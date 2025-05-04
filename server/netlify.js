const express = require('express');
const serverless = require('serverless-http');
const { Pool } = require('@neondatabase/serverless');
const crypto = require('crypto');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const ws = require('ws');

// Initialize Express app
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Get environment variables
const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'pureflow-mvp-secret-key';

// Log environment variables (without sensitive values)
console.log("Environment variables check:");
console.log("- DATABASE_URL exists:", !!DATABASE_URL);
console.log("- SESSION_SECRET exists:", !!SESSION_SECRET);
console.log("- NODE_ENV:", process.env.NODE_ENV);

// Setup database connection for Neon Serverless
let pool;
try {
  // Configure Neon to use websockets
  if (typeof process.env.DATABASE_URL === 'string') {
    // Create PostgreSQL connection pool
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1, // Keep connection pool minimal for serverless
      ssl: true,
      wsProxy: true,
    });
    
    console.log("Database pool initialized");
  } else {
    console.error("DATABASE_URL is not defined or not a string");
  }
} catch (error) {
  console.error("Failed to initialize database connection:", error);
}

// Configure session for serverless
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: isProduction ? 'none' : 'lax',
  }
}));

// Set trust proxy if in production
if (isProduction) {
  app.set("trust proxy", 1);
}

// Helper functions for authentication
async function comparePasswords(supplied, stored) {
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    
    return new Promise((resolve, reject) => {
      crypto.scrypt(supplied, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        try {
          resolve(crypto.timingSafeEqual(hashedBuf, derivedKey));
        } catch (error) {
          console.error("Error in timingSafeEqual:", error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Error in comparePasswords:", error);
    return false;
  }
}

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport local strategy
passport.use(new LocalStrategy(
  { usernameField: "email" },
  async (email, password, done) => {
    console.log(`Attempting login for email: ${email}`);
    
    try {
      if (!pool) {
        console.error("No database pool available");
        return done(new Error("Database connection not available"));
      }
      
      // Get user by email
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      console.log(`Query executed, found ${userResult.rows.length} users`);
      
      if (userResult.rows.length === 0) {
        console.log("No user found with that email");
        return done(null, false, { message: "Invalid email or password" });
      }
      
      const user = userResult.rows[0];
      
      // Check password
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        console.log("Invalid password");
        return done(null, false, { message: "Invalid email or password" });
      }
      
      // Update last login time
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );
      
      console.log("Login successful");
      return done(null, user);
    } catch (err) {
      console.error("Error in authentication:", err);
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  console.log(`Serializing user: ${user.id}`);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  console.log(`Deserializing user: ${id}`);
  try {
    if (!pool) {
      console.error("No database pool available for deserialization");
      return done(new Error("Database connection not available"));
    }
    
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      console.log(`No user found with id: ${id}`);
      return done(null, false);
    }
    
    const user = result.rows[0];
    done(null, user);
  } catch (err) {
    console.error("Error in deserialization:", err);
    done(err);
  }
});

// API Routes
// Login route
app.post("/api/login", (req, res, next) => {
  console.log("Login request received:", req.body.email);
  
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Authentication error:", err);
      return next(err);
    }
    
    if (!user) {
      console.log("Authentication failed:", info?.message);
      return res.status(401).json({ message: info?.message || "Invalid email or password" });
    }
    
    req.login(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      // Don't include password in response
      const { password, ...userWithoutPassword } = user;
      console.log("Login successful, returning user data");
      res.status(200).json(userWithoutPassword);
    });
  })(req, res, next);
});

// Current user route
app.get("/api/user", (req, res) => {
  console.log("User request received, authenticated:", req.isAuthenticated());
  
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // Don't include password in response
  const { password, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
});

// Logout route
app.post("/api/logout", (req, res, next) => {
  console.log("Logout request received");
  
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return next(err);
    }
    
    console.log("Logout successful");
    res.sendStatus(200);
  });
});

// Health check route
app.get("/api/health", async (req, res) => {
  console.log("Health check requested");
  
  let dbStatus = "not connected";
  
  try {
    if (pool) {
      // Test the connection
      const result = await pool.query('SELECT NOW()');
      if (result.rows.length > 0) {
        dbStatus = "connected";
      }
    }
  } catch (err) {
    console.error("Database health check error:", err);
    dbStatus = `error: ${err.message}`;
  }
  
  res.json({ 
    status: "ok", 
    environment: process.env.NODE_ENV,
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Test route to check database connection
app.get("/api/test-db", async (req, res) => {
  console.log("Testing database connection");
  
  try {
    if (!pool) {
      throw new Error("Database pool not initialized");
    }
    
    const result = await pool.query('SELECT NOW() as time');
    res.json({ 
      success: true, 
      message: "Database connection successful",
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Database test error:", err);
    res.status(500).json({ 
      success: false,
      message: "Database connection failed",
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
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