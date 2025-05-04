// Simplified routes file for Netlify functions
module.exports.registerSimpleRoutes = async (app) => {
  // Login route
  app.post("/api/login", (req, res) => {
    // For testing, return a mock successful login
    const mockUser = {
      id: 1,
      email: "admin@pureflow.com", 
      username: "admin",
      role: "admin"
    };
    
    res.status(200).json(mockUser);
  });

  // Current user route
  app.get("/api/user", (req, res) => {
    // For testing, return a mock user
    const mockUser = {
      id: 1,
      email: "admin@pureflow.com", 
      username: "admin",
      role: "admin"
    };
    
    res.json(mockUser);
  });

  // Health check route to verify the function is working
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", environment: process.env.NODE_ENV });
  });

  return app;
}; 