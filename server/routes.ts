import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import Stripe from "stripe";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import {
  addressSchema,
  installationDateSchema,
  insertJobSchema,
  insertPaymentSchema,
  insertSubscriptionSchema,
  updateJobStatusSchema
} from "@shared/schema";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any, // Casting to any to fix type issue
});

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Middleware to check user role
function hasRole(role: string) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Customer onboarding routes
  // ==========================
  
  // Get onboarding state
  app.get("/api/onboarding", isAuthenticated, async (req, res) => {
    try {
      const onboardingState = await storage.getOnboardingState(req.user.id);
      res.json(onboardingState || { step: 'account' });
    } catch (error) {
      res.status(500).json({ message: "Error fetching onboarding state" });
    }
  });

  // Update onboarding state
  app.post("/api/onboarding", isAuthenticated, async (req, res) => {
    try {
      const { step, ...data } = req.body;
      const onboardingState = await storage.updateOnboardingState(req.user.id, {
        step,
        ...data
      });
      res.json(onboardingState);
    } catch (error) {
      res.status(500).json({ message: "Error updating onboarding state" });
    }
  });

  // Subscription routes
  // ==================

  // Get subscription plan price
  app.get("/api/plan-price", async (req, res) => {
    try {
      const price = await storage.getSetting('plan_price');
      res.json({ price: parseInt(price || '25') });
    } catch (error) {
      res.status(500).json({ message: "Error fetching plan price" });
    }
  });

  // Create subscription
  app.post("/api/subscriptions", isAuthenticated, async (req, res) => {
    try {
      // Check if user already has a subscription
      const existingSubscription = await storage.getUserSubscription(req.user.id);
      if (existingSubscription) {
        return res.status(400).json({ message: "User already has a subscription" });
      }

      const planPrice = parseInt(await storage.getSetting('plan_price') || '25');
      
      const subscription = await storage.createSubscription({
        userId: req.user.id,
        planPrice,
      });
      
      // Send notification about new subscription
      await storage.createNotification(
        req.user.id,
        "New Subscription Created",
        `Your water filter subscription has been created. Your plan costs $${planPrice} per month.`
      );
      
      // Also notify admin about new subscription
      const adminUsers = await storage.getUsersByRole('admin');
      if (adminUsers && adminUsers.length > 0) {
        for (const admin of adminUsers) {
          await storage.createNotification(
            admin.id,
            "New Subscription",
            `A new subscription has been created for user ${req.user.username || req.user.email} (ID: ${req.user.id}).`
          );
        }
      }
      
      res.status(201).json(subscription);
    } catch (error) {
      res.status(500).json({ message: "Error creating subscription" });
    }
  });

  // Get user subscription
  app.get("/api/subscriptions/me", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching subscription for user:", req.user.id);
      
      try {
        // First, check if a subscription exists
        const existingSubscription = await storage.getUserSubscription(req.user.id);
        
        if (existingSubscription) {
          console.log("Found existing subscription:", existingSubscription.id);
          return res.json(existingSubscription);
        }
        
        console.log("No subscription found, creating one");
        
        // Get plan price for new subscription
        const planPriceSetting = await storage.getSetting('plan_price');
        const planPrice = parseInt(planPriceSetting || '25');
        
        console.log("Using plan price:", planPrice);
        
        // Create a new subscription for the user
        const newSubscription = await storage.createSubscription({
          userId: req.user.id,
          planPrice,
        });
        
        // Send notification about new subscription
        await storage.createNotification(
          req.user.id,
          "New Subscription Created",
          `Your water filter subscription has been created. Your plan costs $${planPrice} per month.`
        );
        
        // Also notify admin about new subscription
        const adminUsers = await storage.getUsersByRole('admin');
        if (adminUsers && adminUsers.length > 0) {
          for (const admin of adminUsers) {
            await storage.createNotification(
              admin.id,
              "New Subscription",
              `A new subscription has been created for user ${req.user.username || req.user.email} (ID: ${req.user.id}).`
            );
          }
        }
        
        console.log("Created new subscription with ID:", newSubscription.id);
        return res.json(newSubscription);
        
      } catch (dbError: any) {
        console.error("Database error in /api/subscriptions/me:", dbError);
        return res.status(500).json({ 
          message: "Database error while fetching subscription", 
          error: dbError.message,
          stack: dbError.stack
        });
      }
    } catch (error: any) {
      console.error("Unexpected error in /api/subscriptions/me:", error);
      return res.status(500).json({ 
        message: "Error fetching subscription", 
        error: error.message,
        stack: error.stack
      });
    }
  });

  // All subscriptions (admin only)
  app.get("/api/subscriptions", hasRole('admin'), async (req, res) => {
    try {
      const { status } = req.query;
      const filters = status ? { status } : undefined;
      
      const subscriptions = await storage.getAllSubscriptions(filters);
      
      // Enhance with user details
      const enhancedSubscriptions = await Promise.all(
        subscriptions.map(async (sub) => {
          const user = await storage.getUser(sub.userId);
          return { ...sub, user };
        })
      );
      
      res.json(enhancedSubscriptions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching subscriptions" });
    }
  });

  // Update subscription
  app.patch("/api/subscriptions/:id", hasRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const subscription = await storage.updateSubscription(parseInt(id), req.body);
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ message: "Error updating subscription" });
    }
  });

  // Address and Scheduling routes
  // ============================

  // Save address
  app.post("/api/address", isAuthenticated, async (req, res) => {
    try {
      const validatedData = addressSchema.parse(req.body);
      
      // Update user with address info
      const user = await storage.updateUser(req.user.id, {
        address: validatedData.address,
        city: validatedData.city,
        addressCoordinates: validatedData.coordinates,
      });
      
      // Update onboarding state
      await storage.updateOnboardingState(req.user.id, {
        addressEntered: true,
        step: 'address',
      });
      
      res.json({ success: true, user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: fromZodError(error).message,
        });
      }
      res.status(500).json({ message: "Error saving address" });
    }
  });

  // Schedule installation
  app.post("/api/schedule-installation", isAuthenticated, async (req, res) => {
    try {
      const validatedData = installationDateSchema.parse(req.body);
      
      // Parse date and time
      const [year, month, day] = validatedData.date.split('-').map(Number);
      const [hour, minute] = validatedData.time.split(':').map(Number);
      
      const scheduledFor = new Date(year, month - 1, day, hour, minute);
      
      // End time is 2 hours after start time
      const scheduledEndTime = new Date(scheduledFor);
      scheduledEndTime.setHours(scheduledEndTime.getHours() + 2);
      
      // Create installation job
      const job = await storage.createJob({
        userId: req.user.id,
        technicianId: null, // Will be assigned by admin later
        type: 'installation',
        scheduledFor,
        scheduledEndTime,
        notes: "New installation",
        address: req.user.address || "",
        addressCoordinates: req.user.addressCoordinates,
      });
      
      // Update onboarding state
      await storage.updateOnboardingState(req.user.id, {
        installationScheduled: true,
        step: 'payment',
      });
      
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: fromZodError(error).message,
        });
      }
      res.status(500).json({ message: "Error scheduling installation" });
    }
  });

  // Payment routes
  // =============

  // Process payment
  app.post("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const { method, cardDetails } = req.body;
      
      // First, check if a subscription doesn't exist and create one
      let subscription = await storage.getUserSubscription(req.user.id);
      
      if (!subscription) {
        try {
          // Get plan price for new subscription
          const planPrice = parseInt(await storage.getSetting('plan_price') || '25');
          
          // Create a new subscription for the user
          subscription = await storage.createSubscription({
            userId: req.user.id,
            planPrice,
          });
          
          console.log("Created new subscription for user:", req.user.id, subscription);
        } catch (createError: any) {
          console.error("Error creating subscription:", createError);
          return res.status(500).json({ 
            message: "Error creating subscription", 
            error: createError.message
          });
        }
      }
      
      try {
        // Create payment
        const payment = await storage.createPayment({
          userId: req.user.id,
          subscriptionId: subscription.id,
          amount: subscription.planPrice,
          method,
          transactionId: "direct-" + Date.now(), // Simple transaction ID for direct payments
        });
        
        // For card payments, update card details
        if (method === 'card' && cardDetails) {
          await storage.updatePayment(payment.id, {
            cardLast4: cardDetails.last4,
            cardType: cardDetails.type,
          });
          
          // Also update subscription with card details
          await storage.updateSubscription(subscription.id, {
            cardLast4: cardDetails.last4,
            cardType: cardDetails.type,
          });
        }
        
        // In a real app, we would integrate with a payment gateway here
        // For MVP, we'll just mark the payment as successful immediately
        const updatedPayment = await storage.updatePayment(payment.id, {
          status: 'successful',
        });
        
        // Update subscription status
        await storage.updateSubscription(subscription.id, {
          status: 'active',
          nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        });
        
        // Update onboarding state
        await storage.updateOnboardingState(req.user.id, {
          paymentCompleted: true,
          step: 'complete',
        });
        
        // Create a notification for the customer
        await storage.createNotification(
          req.user.id,
          "Payment Successful",
          `Your payment of ${payment.amount} JOD has been processed successfully.`
        );
        
        // Also notify admins about successful payment
        const adminUsers = await storage.getUsersByRole('admin');
        if (adminUsers && adminUsers.length > 0) {
          for (const admin of adminUsers) {
            await storage.createNotification(
              admin.id,
              "New Payment Received",
              `Payment of ${payment.amount} JOD has been received from ${req.user.username || req.user.email} (ID: ${req.user.id}).`
            );
          }
        }
        
        res.json(updatedPayment);
      } catch (paymentError: any) {
        console.error("Error processing payment:", paymentError);
        return res.status(500).json({ 
          message: "Error processing payment", 
          error: paymentError.message 
        });
      }
    } catch (error: any) {
      console.error("Error in /api/payments:", error);
      res.status(500).json({ 
        message: "Error processing payment", 
        error: error.message 
      });
    }
  });

  // Get user payments
  app.get("/api/payments/me", isAuthenticated, async (req, res) => {
    try {
      const payments = await storage.getUserPayments(req.user.id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching payments" });
    }
  });

  // All payments (admin only)
  app.get("/api/payments", hasRole('admin'), async (req, res) => {
    try {
      const { status, method, fromDate, toDate } = req.query;
      const filters = {
        ...(status && { status: status as string }),
        ...(method && { method: method as string }),
        ...(fromDate && toDate && { fromDate, toDate }),
      };
      
      const payments = await storage.getAllPayments(filters);
      
      // Enhance with user details
      const enhancedPayments = await Promise.all(
        payments.map(async (payment) => {
          const user = await storage.getUser(payment.userId);
          return { ...payment, user };
        })
      );
      
      res.json(enhancedPayments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching payments" });
    }
  });

  // Job routes
  // =========

  // Get user jobs
  app.get("/api/jobs/me", isAuthenticated, async (req, res) => {
    try {
      const jobs = await storage.getUserJobs(req.user.id);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Error fetching jobs" });
    }
  });

  // Get technician jobs
  app.get("/api/jobs/technician", hasRole('technician'), async (req, res) => {
    try {
      const jobs = await storage.getTechnicianJobs(req.user.id);
      
      // Enhance with customer details
      const enhancedJobs = await Promise.all(
        jobs.map(async (job) => {
          const customer = await storage.getUser(job.userId);
          return { ...job, customer };
        })
      );
      
      res.json(enhancedJobs);
    } catch (error) {
      res.status(500).json({ message: "Error fetching technician jobs" });
    }
  });

  // All jobs (admin only)
  app.get("/api/jobs", hasRole('admin'), async (req, res) => {
    try {
      const { status, date, technicianId, type } = req.query;
      const filters = {
        ...(status && { status: status as string }),
        ...(date && { date: date as string }),
        ...(technicianId && { technicianId: parseInt(technicianId as string) }),
        ...(type && { type: type as string }),
      };
      
      const jobs = await storage.getAllJobs(filters);
      
      // Enhance with user details
      const enhancedJobs = await Promise.all(
        jobs.map(async (job) => {
          const customer = await storage.getUser(job.userId);
          const technician = job.technicianId ? await storage.getUser(job.technicianId) : null;
          return { ...job, customer, technician };
        })
      );
      
      res.json(enhancedJobs);
    } catch (error) {
      res.status(500).json({ message: "Error fetching jobs" });
    }
  });

  // Get job by id
  app.get("/api/jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const job = await storage.getJob(parseInt(req.params.id));
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && job.userId !== req.user.id && job.technicianId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Enhance with user details
      const customer = await storage.getUser(job.userId);
      const technician = job.technicianId ? await storage.getUser(job.technicianId) : null;
      
      res.json({ ...job, customer, technician });
    } catch (error) {
      res.status(500).json({ message: "Error fetching job" });
    }
  });

  // Update job status (technician or admin)
  app.patch("/api/jobs/:id/status", isAuthenticated, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && job.technicianId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validatedData = updateJobStatusSchema.parse(req.body);
      
      // Update job
      const updatedJob = await storage.updateJob(jobId, {
        status: validatedData.status,
        photoProof: validatedData.photoProof,
      });
      
      // Create notification for customer
      await storage.createNotification(
        job.userId,
        `Job status updated to ${validatedData.status}`,
        `Your maintenance job has been updated to status: ${validatedData.status}.`
      );
      
      res.json(updatedJob);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: fromZodError(error).message,
        });
      }
      res.status(500).json({ message: "Error updating job status" });
    }
  });

  // Assign technician to job (admin only)
  app.patch("/api/jobs/:id/assign", hasRole('admin'), async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { technicianId } = req.body;
      
      if (!technicianId) {
        return res.status(400).json({ message: "Technician ID is required" });
      }
      
      // Check if technician exists and has the right role
      const technician = await storage.getUser(technicianId);
      if (!technician || technician.role !== 'technician') {
        return res.status(400).json({ message: "Invalid technician" });
      }
      
      // Update job
      const job = await storage.updateJob(jobId, { technicianId });
      
      // Create notification for technician
      await storage.createNotification(
        technicianId,
        "New Job Assigned",
        `You have been assigned a new ${job.type} job.`
      );
      
      res.json(job);
    } catch (error) {
      res.status(500).json({ message: "Error assigning technician" });
    }
  });

  // Create new job (admin only)
  app.post("/api/jobs", hasRole('admin'), async (req, res) => {
    try {
      // Create a custom schema that properly handles date strings
      const createJobSchema = z.object({
        userId: z.number(),
        technicianId: z.number().optional().nullable(),
        type: z.enum(['installation', 'filter_change', 'repair']),
        scheduledFor: z.string().or(z.date()).transform(val => new Date(val)),
        scheduledEndTime: z.string().or(z.date()).transform(val => new Date(val)),
        notes: z.string().optional().nullable(),
        address: z.string(),
        status: z.string().optional(),
        addressCoordinates: z.object({
          lat: z.number(),
          lng: z.number()
        }).optional().nullable()
      });
      
      // Validate data
      const validatedData = createJobSchema.parse(req.body);
      
      // Create job
      const job = await storage.createJob(validatedData);
      
      // Create notification for customer
      await storage.createNotification(
        job.userId,
        "New Maintenance Job Scheduled",
        `A new ${job.type} job has been scheduled for you.`
      );
      
      // If technician is assigned, notify them
      if (job.technicianId) {
        await storage.createNotification(
          job.technicianId,
          "New Job Assigned",
          `You have been assigned a new ${job.type} job.`
        );
      }
      
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: fromZodError(error).message,
        });
      }
      console.error("Job creation error:", error);
      res.status(500).json({ message: "Error creating job" });
    }
  });

  // Notifications routes
  // ===================

  // Get user notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Error fetching notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Error marking notification as read" });
    }
  });
  
  // Mark all notifications as read
  app.patch("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user.id);
      const unreadNotifications = notifications.filter(n => !n.read);
      
      const results = await Promise.all(
        unreadNotifications.map(n => storage.markNotificationAsRead(n.id))
      );
      
      res.json({ message: "All notifications marked as read", count: results.length });
    } catch (error) {
      res.status(500).json({ message: "Error marking all notifications as read" });
    }
  });

  // Technician routes
  // ================

  // Get all technicians (admin only)
  app.get("/api/technicians", hasRole('admin'), async (req, res) => {
    try {
      const technicians = await storage.getAllTechnicians();
      res.json(technicians);
    } catch (error) {
      res.status(500).json({ message: "Error fetching technicians" });
    }
  });
  
  // Get users by role (admin only)
  app.get("/api/users", hasRole('admin'), async (req, res) => {
    try {
      const { role } = req.query;
      
      if (!role) {
        return res.status(400).json({ message: "Role parameter is required" });
      }
      
      const users = await storage.getUsersByRole(role as string);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  // Create technician (admin only)
  app.post("/api/technicians", hasRole('admin'), async (req, res) => {
    try {
      console.log("Creating new technician with data:", { ...req.body, password: "[REDACTED]" });
      const { email, phone, password, username } = req.body;
      
      if (!email || !phone || !password || !username) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Check if user exists
      try {
        const existingUserByEmail = await storage.getUserByEmail(email);
        if (existingUserByEmail) {
          return res.status(400).json({ message: "Email already in use" });
        }
        
        const existingUserByPhone = await storage.getUserByPhone(phone);
        if (existingUserByPhone) {
          return res.status(400).json({ message: "Phone number already in use" });
        }
      } catch (checkError) {
        console.error("Error checking existing user:", checkError);
        return res.status(500).json({ message: "Error validating user information" });
      }
      
      // Hash password
      let hashedPassword;
      try {
        const salt = randomBytes(16).toString("hex");
        const buf = (await promisify(scrypt)(password, salt, 64)) as Buffer;
        hashedPassword = `${buf.toString("hex")}.${salt}`;
      } catch (hashError) {
        console.error("Error hashing password:", hashError);
        return res.status(500).json({ message: "Error processing password" });
      }
      
      // Create technician
      try {
        const technician = await storage.createUser({
          email,
          phone,
          username,
          password: hashedPassword,
          role: 'technician',
        });
        
        // Don't include password in response
        const { password: _, ...technicianWithoutPassword } = technician;
        
        console.log("Technician created successfully:", { id: technician.id, email });
        return res.status(201).json(technicianWithoutPassword);
      } catch (createError) {
        console.error("Error creating technician in database:", createError);
        return res.status(500).json({ message: "Error saving technician to database" });
      }
    } catch (error) {
      console.error("Unexpected error creating technician:", error);
      return res.status(500).json({ message: "Error creating technician" });
    }
  });

  // Admin Settings
  // =============

  // Update plan price (admin only)
  app.post("/api/settings/plan-price", hasRole('admin'), async (req, res) => {
    try {
      const { price } = req.body;
      
      if (!price || isNaN(price) || price <= 0) {
        return res.status(400).json({ message: "Invalid price" });
      }
      
      await storage.setSetting('plan_price', price.toString());
      
      res.json({ success: true, price });
    } catch (error) {
      res.status(500).json({ message: "Error updating plan price" });
    }
  });

  // Stripe payment routes
  // =================

  // Create a payment intent for one-time payments
  app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      // First, check if a subscription doesn't exist and create one
      let subscription = await storage.getUserSubscription(req.user.id);
      
      if (!subscription) {
        try {
          // Get plan price for new subscription
          const planPrice = parseInt(await storage.getSetting('plan_price') || '25');
          
          // Create a new subscription for the user
          subscription = await storage.createSubscription({
            userId: req.user.id,
            planPrice,
          });
          
          console.log("Created new subscription for user:", req.user.id, subscription);
        } catch (createError: any) {
          console.error("Error creating subscription:", createError);
          return res.status(500).json({ 
            message: "Error creating subscription", 
            error: createError.message
          });
        }
      }

      try {
        // Amount in cents (convert from JOD to cents)
        const amount = Math.round(subscription.planPrice * 100);

        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd", // Using USD since this is a demo
          metadata: {
            userId: req.user.id.toString(),
            subscriptionId: subscription.id.toString(),
          },
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (stripeError: any) {
        console.error("Error creating Stripe payment intent:", stripeError);
        return res.status(500).json({ 
          message: "Error creating Stripe payment intent", 
          error: stripeError.message 
        });
      }
    } catch (error: any) {
      console.error("Error in /api/create-payment-intent:", error);
      res.status(500).json({ 
        message: "Error creating payment intent", 
        error: error.message 
      });
    }
  });

  // Create or get subscription with Stripe
  app.post("/api/get-or-create-subscription", isAuthenticated, async (req, res) => {
    try {
      console.log("Processing get-or-create-subscription for user:", req.user.id);
      
      // First, check if a subscription exists
      let localSubscription;
      try {
        localSubscription = await storage.getUserSubscription(req.user.id);
        console.log("Existing subscription query result:", localSubscription ? `ID: ${localSubscription.id}` : "Not found");
      } catch (dbError) {
        console.error("Error querying subscription:", dbError);
        return res.status(500).json({
          message: "Database error while retrieving subscription",
          error: dbError.message
        });
      }
      
      // Create a new subscription if one doesn't exist
      if (!localSubscription) {
        try {
          console.log("Creating new subscription");
          const planPrice = parseInt(await storage.getSetting('plan_price') || '25');
          
          localSubscription = await storage.createSubscription({
            userId: req.user.id,
            planPrice,
          });
          
          // Send notification about new subscription
          await storage.createNotification(
            req.user.id,
            "New Subscription Created",
            `Your water filter subscription has been created. Your plan costs $${planPrice} per month.`
          );
          
          // Also notify admin about new subscription
          const adminUsers = await storage.getUsersByRole('admin');
          if (adminUsers && adminUsers.length > 0) {
            for (const admin of adminUsers) {
              await storage.createNotification(
                admin.id,
                "New Subscription",
                `A new subscription has been created for user ${req.user.username || req.user.email} (ID: ${req.user.id}).`
              );
            }
          }
          
          console.log("Created new subscription for user:", req.user.id, "with ID:", localSubscription.id);
        } catch (createError) {
          console.error("Error creating subscription:", createError);
          return res.status(500).json({ 
            message: "Error creating subscription", 
            error: createError.message
          });
        }
      }

      // Check if user already has a Stripe subscription
      if (localSubscription.stripeSubscriptionId) {
        try {
          console.log("Retrieving existing Stripe subscription:", localSubscription.stripeSubscriptionId);
          const subscription = await stripe.subscriptions.retrieve(localSubscription.stripeSubscriptionId);
          console.log("Stripe subscription found:", subscription.id, "Status:", subscription.status);

          // If subscription exists, send client secret for its payment intent
          let clientSecret = null;
          
          if (
            typeof subscription.latest_invoice === 'object' && 
            subscription.latest_invoice?.payment_intent
          ) {
            if (typeof subscription.latest_invoice.payment_intent === 'object') {
              clientSecret = subscription.latest_invoice.payment_intent.client_secret;
            } else if (typeof subscription.latest_invoice.payment_intent === 'string') {
              // If it's a string, we need to retrieve the payment intent
              try {
                const paymentIntent = await stripe.paymentIntents.retrieve(
                  subscription.latest_invoice.payment_intent
                );
                clientSecret = paymentIntent.client_secret;
              } catch (piError) {
                console.error("Error retrieving payment intent:", piError);
              }
            }
          }
          
          if (clientSecret) {
            console.log("Returning existing subscription with client secret");
            return res.send({
              subscriptionId: subscription.id,
              clientSecret,
            });
          } else {
            console.log("No client secret found, will create a new payment intent");
          }
        } catch (stripeErr) {
          // If stripe subscription not found, continue to create a new one
          console.log("Stripe subscription not found or error occurred:", stripeErr.message);
        }
      }

      try {
        // Create or get Stripe Customer
        let customer;
        if (localSubscription.stripeCustomerId) {
          console.log("Using existing Stripe customer:", localSubscription.stripeCustomerId);
          customer = await stripe.customers.retrieve(localSubscription.stripeCustomerId);
        } else {
          console.log("Creating new Stripe customer");
          customer = await stripe.customers.create({
            email: req.user.email,
            name: req.user.username,
            metadata: {
              userId: req.user.id.toString(),
            }
          });

          console.log("Created Stripe customer:", customer.id);
          
          // Update local subscription with Stripe customer ID
          await storage.updateSubscription(localSubscription.id, {
            stripeCustomerId: customer.id,
          });
        }

        // Create payment intent for the subscription
        console.log("Creating payment intent for amount:", localSubscription.planPrice * 100, "cents");
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(localSubscription.planPrice * 100),
          currency: "usd",
          customer: typeof customer === 'string' ? customer : customer.id,
          setup_future_usage: "off_session",
          metadata: {
            userId: req.user.id.toString(),
            subscriptionId: localSubscription.id.toString(),
          },
        });

        console.log("Created payment intent:", paymentIntent.id);

        // Store payment intent ID on subscription
        await storage.updateSubscription(localSubscription.id, {
          stripePaymentIntentId: paymentIntent.id,
        });

        return res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (stripeError) {
        console.error("Stripe error:", stripeError);
        return res.status(500).json({ 
          message: "Error processing Stripe request", 
          error: stripeError.message 
        });
      }
    } catch (error) {
      console.error("Unexpected error in /api/get-or-create-subscription:", error);
      return res.status(500).json({ 
        message: "Error setting up subscription", 
        error: error.message 
      });
    }
  });

  // Webhook to handle Stripe events
  app.post("/api/stripe-webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (!endpointSecret) {
        // In development, we can skip signature verification
        event = req.body;
      } else {
        // In production, verify the signature
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      }

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          const { userId, subscriptionId } = paymentIntent.metadata;

          if (userId && subscriptionId) {
            // Update subscription status
            await storage.updateSubscription(parseInt(subscriptionId), {
              status: 'active',
              nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            });

            // Create a payment record
            const payment = await storage.createPayment({
              userId: parseInt(userId),
              subscriptionId: parseInt(subscriptionId),
              amount: paymentIntent.amount / 100, // Convert from cents
              method: 'card',
              status: 'successful',
              transactionId: paymentIntent.id,
            });

            // Update payment with card details if available
            if (paymentIntent.payment_method && typeof paymentIntent.payment_method !== 'string') {
              const paymentMethod = await stripe.paymentMethods.retrieve(
                paymentIntent.payment_method
              );

              if (paymentMethod.card) {
                await storage.updatePayment(payment.id, {
                  cardLast4: paymentMethod.card.last4,
                  cardType: paymentMethod.card.brand,
                });
              }
            }

            // Create notification for customer
            await storage.createNotification(
              parseInt(userId),
              "Payment Successful",
              `Your payment of $${paymentIntent.amount / 100} has been processed successfully.`
            );
            
            // Notify admins about the successful payment
            const adminUsers = await storage.getUsersByRole('admin');
            if (adminUsers && adminUsers.length > 0) {
              for (const admin of adminUsers) {
                await storage.createNotification(
                  admin.id,
                  "New Payment Received",
                  `Payment of $${paymentIntent.amount / 100} has been received for subscription ID: ${subscriptionId}.`
                );
              }
            }

            // Mark onboarding as complete
            await storage.updateOnboardingState(parseInt(userId), {
              paymentCompleted: true,
              step: 'complete',
            });
          }
          break;
        
        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object;
          const failedMetadata = failedPaymentIntent.metadata;
          
          if (failedMetadata.userId && failedMetadata.subscriptionId) {
            // Create failed payment record
            await storage.createPayment({
              userId: parseInt(failedMetadata.userId),
              subscriptionId: parseInt(failedMetadata.subscriptionId),
              amount: failedPaymentIntent.amount / 100,
              method: 'card',
              status: 'failed',
              transactionId: failedPaymentIntent.id,
            });

            // Update subscription status
            await storage.updateSubscription(parseInt(failedMetadata.subscriptionId), {
              status: 'payment_failed',
            });

            // Create notification for customer
            await storage.createNotification(
              parseInt(failedMetadata.userId),
              "Payment Failed",
              "Your payment attempt has failed. Please update your payment method."
            );
            
            // Notify admins about the failed payment
            const adminUsers = await storage.getUsersByRole('admin');
            if (adminUsers && adminUsers.length > 0) {
              for (const admin of adminUsers) {
                await storage.createNotification(
                  admin.id,
                  "Payment Failed",
                  `Payment for subscription ID: ${failedMetadata.subscriptionId} failed. User ID: ${failedMetadata.userId}.`
                );
              }
            }
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.send({ received: true });
    } catch (err: any) {
      console.log(`Webhook Error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Subscription Management Endpoints
  // ===============================

  // Update user's subscription
  app.patch("/api/subscriptions/me", isAuthenticated, async (req, res) => {
    try {
      const subscription = await storage.getUserSubscription(req.user.id);
      
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      // Update subscription with data from request body
      const updatedSubscription = await storage.updateSubscription(subscription.id, req.body);
      
      // If the status was changed to paused, add notification
      if (req.body.status === 'paused' && subscription.status !== 'paused') {
        const pauseEndDate = req.body.pausedUntil 
          ? new Date(req.body.pausedUntil) 
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
          
        await storage.createNotification(
          req.user.id,
          "Subscription Paused",
          `Your subscription has been paused until ${pauseEndDate.toLocaleDateString()}.`
        );
      }
      
      // If the status was changed to cancelled, add notification
      if (req.body.status === 'cancelled' && subscription.status !== 'cancelled') {
        await storage.createNotification(
          req.user.id,
          "Subscription Cancelled",
          `Your subscription has been cancelled. You will no longer be billed for this service.`
        );
        
        // Notify admin of the cancellation
        const adminUsers = await storage.getUsersByRole('admin');
        if (adminUsers && adminUsers.length > 0) {
          const reason = req.body.cancelReason || 'No reason provided';
          for (const admin of adminUsers) {
            await storage.createNotification(
              admin.id,
              "Subscription Cancelled",
              `User ${req.user.username || req.user.email} (ID: ${req.user.id}) has cancelled their subscription. Reason: ${reason}`
            );
          }
        }
      }
      
      // If the status was changed to active from paused or cancelled, add notification
      if (req.body.status === 'active' && 
          (subscription.status === 'paused' || subscription.status === 'cancelled')) {
        await storage.createNotification(
          req.user.id,
          "Subscription Reactivated",
          `Your subscription has been reactivated. Your next billing date is ${updatedSubscription.nextPaymentDate 
            ? new Date(updatedSubscription.nextPaymentDate).toLocaleDateString() 
            : 'soon'}.`
        );
      }
      
      // If the plan was changed, add notification
      if (req.body.plan && req.body.plan !== subscription.plan) {
        const planName = req.body.plan.charAt(0).toUpperCase() + req.body.plan.slice(1);
        await storage.createNotification(
          req.user.id,
          "Subscription Plan Changed",
          `Your subscription plan has been changed to ${planName}. The new price is $${req.body.planPrice || subscription.planPrice} per ${req.body.interval || subscription.interval || 'month'}.`
        );
      }
      
      return res.json(updatedSubscription);
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      return res.status(500).json({ 
        message: "Error updating subscription", 
        error: error.message 
      });
    }
  });
  
  // Change subscription plan
  app.post("/api/subscriptions/change-plan", isAuthenticated, async (req, res) => {
    try {
      const { plan } = req.body;
      
      if (!plan) {
        return res.status(400).json({ message: "Plan is required" });
      }
      
      const subscription = await storage.getUserSubscription(req.user.id);
      
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      // Get the price for the new plan
      let planPrice = subscription.planPrice;
      if (plan === 'basic') {
        const basicPriceSetting = await storage.getSetting('basic_plan_price');
        planPrice = parseInt(basicPriceSetting || '25');
      } else if (plan === 'premium') {
        const premiumPriceSetting = await storage.getSetting('premium_plan_price');
        planPrice = parseInt(premiumPriceSetting || '35');
      }
      
      // Update the subscription
      const updatedSubscription = await storage.updateSubscription(subscription.id, {
        plan,
        planPrice,
        status: 'active', // Ensure the subscription is active when changing plans
      });
      
      // Add notification about plan change
      const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
      await storage.createNotification(
        req.user.id,
        "Subscription Plan Changed",
        `Your subscription plan has been changed to ${planName}. Your new monthly price is $${planPrice}.`
      );
      
      return res.json(updatedSubscription);
    } catch (error: any) {
      console.error("Error changing subscription plan:", error);
      return res.status(500).json({ 
        message: "Error changing subscription plan", 
        error: error.message 
      });
    }
  });

  // Update payment method
  app.post("/api/subscriptions/update-payment", isAuthenticated, async (req, res) => {
    try {
      const { cardType, cardLast4 } = req.body;
      
      if (!cardType || !cardLast4) {
        return res.status(400).json({ message: "Card information is required" });
      }
      
      const subscription = await storage.getUserSubscription(req.user.id);
      
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      // Update the subscription with new card info
      const updatedSubscription = await storage.updateSubscription(subscription.id, {
        cardType,
        cardLast4,
        paymentMethod: 'card',
      });
      
      // Add notification about payment method update
      await storage.createNotification(
        req.user.id,
        "Payment Method Updated",
        `Your payment method has been updated to ${cardType} ending in ${cardLast4}.`
      );
      
      return res.json(updatedSubscription);
    } catch (error: any) {
      console.error("Error updating payment method:", error);
      return res.status(500).json({ 
        message: "Error updating payment method", 
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
