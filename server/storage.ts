import { 
  User, InsertUser, Subscription, InsertSubscription, 
  Job, InsertJob, Payment, InsertPayment, Notification,
  Setting, OnboardingState, users, subscriptions, 
  jobs, payments, notifications, settings, onboardingState,
  jobStatusEnum, paymentStatusEnum, paymentMethodEnum,
  subscriptionStatusEnum
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  
  // Subscription operations
  getSubscription(id: number): Promise<Subscription | undefined>;
  getUserSubscription(userId: number): Promise<Subscription | undefined>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription>;
  getAllSubscriptions(filters?: any): Promise<Subscription[]>;

  // Job operations
  getJob(id: number): Promise<Job | undefined>;
  getUserJobs(userId: number): Promise<Job[]>;
  getTechnicianJobs(technicianId: number): Promise<Job[]>;
  getJobsByStatus(status: string): Promise<Job[]>;
  getJobsByDate(date: Date): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, data: Partial<Job>): Promise<Job>;
  getAllJobs(filters?: any): Promise<Job[]>;

  // Payment operations
  getPayment(id: number): Promise<Payment | undefined>;
  getUserPayments(userId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, data: Partial<Payment>): Promise<Payment>;
  getAllPayments(filters?: any): Promise<Payment[]>;
  
  // Notification operations
  getUserNotifications(userId: number): Promise<Notification[]>;
  createNotification(userId: number, title: string, message: string): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification>;
  
  // Settings operations
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  
  // Onboarding state operations
  getOnboardingState(userId: number): Promise<OnboardingState | undefined>;
  updateOnboardingState(userId: number, data: Partial<OnboardingState>): Promise<OnboardingState>;
  
  // Technician operations
  getAllTechnicians(): Promise<User[]>;
  
  // Session store
  sessionStore: session.Store;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private subscriptionsData: Map<number, Subscription>;
  private jobsData: Map<number, Job>;
  private paymentsData: Map<number, Payment>;
  private notificationsData: Map<number, Notification>;
  private settingsData: Map<string, Setting>;
  private onboardingStateData: Map<number, OnboardingState>;
  
  userIdCounter: number;
  subscriptionIdCounter: number;
  jobIdCounter: number;
  paymentIdCounter: number;
  notificationIdCounter: number;
  settingIdCounter: number;
  onboardingIdCounter: number;
  
  sessionStore: session.SessionStore;

  constructor() {
    this.usersData = new Map();
    this.subscriptionsData = new Map();
    this.jobsData = new Map();
    this.paymentsData = new Map();
    this.notificationsData = new Map();
    this.settingsData = new Map();
    this.onboardingStateData = new Map();
    
    this.userIdCounter = 1;
    this.subscriptionIdCounter = 1;
    this.jobIdCounter = 1;
    this.paymentIdCounter = 1;
    this.notificationIdCounter = 1;
    this.settingIdCounter = 1;
    this.onboardingIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Set default plan price
    this.setSetting('plan_price', '25');
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.phone === phone,
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.usersData.values()).filter(
      (user) => user.role === role,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      created_at: now,
      lastLogin: null,
    };
    this.usersData.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    const updatedUser = { ...user, ...data };
    this.usersData.set(id, updatedUser);
    return updatedUser;
  }
  
  // Subscription operations
  async getSubscription(id: number): Promise<Subscription | undefined> {
    return this.subscriptionsData.get(id);
  }

  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    return Array.from(this.subscriptionsData.values()).find(
      (sub) => sub.userId === userId,
    );
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const id = this.subscriptionIdCounter++;
    const now = new Date();
    
    // Set next payment date to 1 month from now
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    
    const subscription: Subscription = { 
      ...sub, 
      id,
      status: 'pending',
      created_at: now,
      updated_at: now,
      nextPaymentDate,
      cardLast4: null,
      cardType: null,
    };
    
    this.subscriptionsData.set(id, subscription);
    return subscription;
  }

  async updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription> {
    const subscription = await this.getSubscription(id);
    if (!subscription) {
      throw new Error(`Subscription with id ${id} not found`);
    }
    
    const updatedSubscription = { 
      ...subscription, 
      ...data,
      updated_at: new Date(),
    };
    
    this.subscriptionsData.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async getAllSubscriptions(filters?: any): Promise<Subscription[]> {
    let subscriptions = Array.from(this.subscriptionsData.values());
    
    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        subscriptions = subscriptions.filter(sub => sub.status === filters.status);
      }
      // Add more filters as needed
    }
    
    return subscriptions;
  }
  
  // Job operations
  async getJob(id: number): Promise<Job | undefined> {
    return this.jobsData.get(id);
  }

  async getUserJobs(userId: number): Promise<Job[]> {
    return Array.from(this.jobsData.values()).filter(
      (job) => job.userId === userId,
    );
  }

  async getTechnicianJobs(technicianId: number): Promise<Job[]> {
    return Array.from(this.jobsData.values()).filter(
      (job) => job.technicianId === technicianId,
    );
  }

  async getJobsByStatus(status: string): Promise<Job[]> {
    return Array.from(this.jobsData.values()).filter(
      (job) => job.status === status,
    );
  }

  async getJobsByDate(date: Date): Promise<Job[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.jobsData.values()).filter(
      (job) => {
        const jobDate = new Date(job.scheduledFor);
        return jobDate >= startOfDay && jobDate <= endOfDay;
      }
    );
  }

  async createJob(job: InsertJob): Promise<Job> {
    const id = this.jobIdCounter++;
    const now = new Date();
    
    const newJob: Job = { 
      ...job, 
      id,
      status: 'scheduled',
      photoProof: null,
      created_at: now,
      updated_at: now,
    };
    
    this.jobsData.set(id, newJob);
    return newJob;
  }

  async updateJob(id: number, data: Partial<Job>): Promise<Job> {
    const job = await this.getJob(id);
    if (!job) {
      throw new Error(`Job with id ${id} not found`);
    }
    
    const updatedJob = { 
      ...job, 
      ...data,
      updated_at: new Date(),
    };
    
    this.jobsData.set(id, updatedJob);
    return updatedJob;
  }

  async getAllJobs(filters?: any): Promise<Job[]> {
    let allJobs = Array.from(this.jobsData.values());
    
    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        allJobs = allJobs.filter(job => job.status === filters.status);
      }
      
      if (filters.date) {
        const filterDate = new Date(filters.date);
        const startOfDay = new Date(filterDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(filterDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        allJobs = allJobs.filter(job => {
          const jobDate = new Date(job.scheduledFor);
          return jobDate >= startOfDay && jobDate <= endOfDay;
        });
      }
      
      if (filters.technicianId) {
        allJobs = allJobs.filter(job => job.technicianId === filters.technicianId);
      }
      
      if (filters.type) {
        allJobs = allJobs.filter(job => job.type === filters.type);
      }
    }
    
    return allJobs;
  }
  
  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.paymentsData.get(id);
  }

  async getUserPayments(userId: number): Promise<Payment[]> {
    return Array.from(this.paymentsData.values()).filter(
      (payment) => payment.userId === userId,
    );
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.paymentIdCounter++;
    const now = new Date();
    const transactionId = `TRX-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${id.toString().padStart(3, '0')}`;
    
    const newPayment: Payment = { 
      ...payment, 
      id,
      status: 'pending',
      transactionId,
      cardLast4: null,
      cardType: null,
      created_at: now,
      updated_at: now,
    };
    
    this.paymentsData.set(id, newPayment);
    return newPayment;
  }

  async updatePayment(id: number, data: Partial<Payment>): Promise<Payment> {
    const payment = await this.getPayment(id);
    if (!payment) {
      throw new Error(`Payment with id ${id} not found`);
    }
    
    const updatedPayment = { 
      ...payment, 
      ...data,
      updated_at: new Date(),
    };
    
    this.paymentsData.set(id, updatedPayment);
    return updatedPayment;
  }

  async getAllPayments(filters?: any): Promise<Payment[]> {
    let payments = Array.from(this.paymentsData.values());
    
    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        payments = payments.filter(payment => payment.status === filters.status);
      }
      
      if (filters.method) {
        payments = payments.filter(payment => payment.method === filters.method);
      }
      
      if (filters.fromDate && filters.toDate) {
        const fromDate = new Date(filters.fromDate);
        const toDate = new Date(filters.toDate);
        
        payments = payments.filter(payment => {
          const paymentDate = new Date(payment.created_at);
          return paymentDate >= fromDate && paymentDate <= toDate;
        });
      }
    }
    
    return payments;
  }
  
  // Notification operations
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notificationsData.values()).filter(
      (notification) => notification.userId === userId,
    );
  }

  async createNotification(userId: number, title: string, message: string): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const now = new Date();
    
    const notification: Notification = { 
      id,
      userId,
      title,
      message,
      read: false,
      created_at: now,
    };
    
    this.notificationsData.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const notification = this.notificationsData.get(id);
    if (!notification) {
      throw new Error(`Notification with id ${id} not found`);
    }
    
    const updatedNotification = { ...notification, read: true };
    this.notificationsData.set(id, updatedNotification);
    return updatedNotification;
  }
  
  // Settings operations
  async getSetting(key: string): Promise<string | undefined> {
    const setting = Array.from(this.settingsData.values()).find(
      (setting) => setting.key === key,
    );
    
    return setting?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const existingSetting = Array.from(this.settingsData.values()).find(
      (setting) => setting.key === key,
    );
    
    const now = new Date();
    
    if (existingSetting) {
      const updatedSetting = { 
        ...existingSetting, 
        value, 
        updated_at: now,
      };
      
      this.settingsData.set(existingSetting.id, updatedSetting);
    } else {
      const id = this.settingIdCounter++;
      
      const newSetting: Setting = {
        id,
        key,
        value,
        created_at: now,
        updated_at: now,
      };
      
      this.settingsData.set(key, newSetting);
    }
  }
  
  // Onboarding state operations
  async getOnboardingState(userId: number): Promise<OnboardingState | undefined> {
    return Array.from(this.onboardingStateData.values()).find(
      (state) => state.userId === userId,
    );
  }

  async updateOnboardingState(userId: number, data: Partial<OnboardingState>): Promise<OnboardingState> {
    let state = await this.getOnboardingState(userId);
    const now = new Date();
    
    if (!state) {
      // Create new onboarding state if it doesn't exist
      const id = this.onboardingIdCounter++;
      
      state = {
        id,
        userId,
        step: 'account',
        planSelected: false,
        termsAccepted: false,
        addressEntered: false,
        installationScheduled: false,
        paymentCompleted: false,
        created_at: now,
        updated_at: now,
      };
      
      this.onboardingStateData.set(id, state);
    }
    
    const updatedState = { 
      ...state, 
      ...data,
      updated_at: now,
    };
    
    this.onboardingStateData.set(state.id, updatedState);
    return updatedState;
  }
  
  // Technician operations
  async getAllTechnicians(): Promise<User[]> {
    return Array.from(this.usersData.values()).filter(
      (user) => user.role === 'technician',
    );
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    // Create PostgreSQL session store
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    });
    
    // Initialize default setting for plan price if it doesn't exist
    this.initDefaultSettings();
  }

  private async initDefaultSettings() {
    const planPriceSetting = await db.select().from(settings).where(eq(settings.key, 'plan_price'));
    if (planPriceSetting.length === 0) {
      await db.insert(settings).values({
        key: 'plan_price',
        value: '25', // Default plan price in JOD
      });
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Subscription operations
  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription;
  }

  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return subscription;
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        ...sub,
        status: 'pending',
        cardLast4: null,
        cardType: null,
        nextPaymentDate,
      })
      .returning();
    return subscription;
  }

  async updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ ...data, updated_at: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  async getAllSubscriptions(filters?: any): Promise<Subscription[]> {
    let query = db.select().from(subscriptions);
    
    if (filters?.status) {
      query = query.where(eq(subscriptions.status, filters.status));
    }
    
    return await query;
  }

  // Job operations
  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getUserJobs(userId: number): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.userId, userId));
  }

  async getTechnicianJobs(technicianId: number): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.technicianId, technicianId));
  }

  async getJobsByStatus(status: string): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.status, status));
  }

  async getJobsByDate(date: Date): Promise<Job[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db.select().from(jobs).where(
      and(
        gte(jobs.scheduledFor, startOfDay),
        lte(jobs.scheduledFor, endOfDay)
      )
    );
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db
      .insert(jobs)
      .values({
        ...job,
        status: 'scheduled',
        photoProof: null,
      })
      .returning();
    return newJob;
  }

  async updateJob(id: number, data: Partial<Job>): Promise<Job> {
    const [updatedJob] = await db
      .update(jobs)
      .set({ ...data, updated_at: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return updatedJob;
  }

  async getAllJobs(filters?: any): Promise<Job[]> {
    let query = db.select().from(jobs);
    
    if (filters) {
      if (filters.status) {
        query = query.where(eq(jobs.status, filters.status));
      }
      
      if (filters.technicianId) {
        query = query.where(eq(jobs.technicianId, parseInt(filters.technicianId)));
      }
      
      if (filters.type) {
        query = query.where(eq(jobs.type, filters.type));
      }
      
      if (filters.date) {
        const startOfDay = new Date(filters.date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(filters.date);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query.where(
          and(
            gte(jobs.scheduledFor, startOfDay),
            lte(jobs.scheduledFor, endOfDay)
          )
        );
      }
    }
    
    return await query;
  }

  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getUserPayments(userId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.userId, userId));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const now = new Date();
    const transactionId = `TRX-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    const [newPayment] = await db
      .insert(payments)
      .values({
        ...payment,
        status: 'pending',
        transactionId,
        cardLast4: null,
        cardType: null,
      })
      .returning();
    return newPayment;
  }

  async updatePayment(id: number, data: Partial<Payment>): Promise<Payment> {
    const [updatedPayment] = await db
      .update(payments)
      .set({ ...data, updated_at: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return updatedPayment;
  }

  async getAllPayments(filters?: any): Promise<Payment[]> {
    let query = db.select().from(payments);
    
    if (filters) {
      if (filters.status) {
        query = query.where(eq(payments.status, filters.status));
      }
      
      if (filters.method) {
        query = query.where(eq(payments.method, filters.method));
      }
      
      if (filters.fromDate && filters.toDate) {
        const fromDate = new Date(filters.fromDate);
        const toDate = new Date(filters.toDate);
        
        query = query.where(
          and(
            gte(payments.created_at, fromDate),
            lte(payments.created_at, toDate)
          )
        );
      }
    }
    
    return await query;
  }

  // Notification operations
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.created_at));
  }

  async createNotification(userId: number, title: string, message: string): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId,
        title,
        message,
        read: false,
      })
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const [updatedNotification] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();
    return updatedNotification;
  }

  // Settings operations
  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const existingSetting = await db.select().from(settings).where(eq(settings.key, key));
    
    if (existingSetting.length > 0) {
      await db
        .update(settings)
        .set({ value, updated_at: new Date() })
        .where(eq(settings.key, key));
    } else {
      await db
        .insert(settings)
        .values({
          key,
          value,
        });
    }
  }

  // Onboarding state operations
  async getOnboardingState(userId: number): Promise<OnboardingState | undefined> {
    const [state] = await db.select().from(onboardingState).where(eq(onboardingState.userId, userId));
    return state;
  }

  async updateOnboardingState(userId: number, data: Partial<OnboardingState>): Promise<OnboardingState> {
    const existingState = await this.getOnboardingState(userId);
    
    if (existingState) {
      const [updatedState] = await db
        .update(onboardingState)
        .set({ ...data, updated_at: new Date() })
        .where(eq(onboardingState.id, existingState.id))
        .returning();
      return updatedState;
    } else {
      const [newState] = await db
        .insert(onboardingState)
        .values({
          userId,
          step: data.step || 'account',
          planSelected: data.planSelected || false,
          termsAccepted: data.termsAccepted || false,
          addressEntered: data.addressEntered || false,
          installationScheduled: data.installationScheduled || false,
          paymentCompleted: data.paymentCompleted || false,
        })
        .returning();
      return newState;
    }
  }

  // Technician operations
  async getAllTechnicians(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'technician'));
  }
}

// Use PostgreSQL database implementation
export const storage = new DatabaseStorage();
