import { pgTable, text, serial, integer, boolean, timestamp, varchar, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums for various status types
export const userRoleEnum = pgEnum('user_role', ['customer', 'technician', 'admin']);
export const jobStatusEnum = pgEnum('job_status', ['scheduled', 'en_route', 'arrived', 'completed', 'cancelled']);
export const jobTypeEnum = pgEnum('job_type', ['installation', 'filter_change', 'repair']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'successful', 'failed']);
export const paymentMethodEnum = pgEnum('payment_method', ['card', 'cash']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'pending', 'cancelled', 'payment_failed', 'paused']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull().unique(),
  password: text('password').notNull(),
  username: text('username').notNull(),
  role: userRoleEnum('role').notNull().default('customer'),
  city: text('city'),
  address: text('address'),
  addressCoordinates: json('address_coordinates').$type<{ lat: number, lng: number }>(),
  created_at: timestamp('created_at').defaultNow(),
  lastLogin: timestamp('last_login'),
});

// Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  status: subscriptionStatusEnum('status').notNull().default('pending'),
  planPrice: integer('plan_price').notNull(), // in JOD
  plan: text('plan').default('basic'),
  interval: text('interval').default('month'),
  paymentMethod: text('payment_method'),
  nextPaymentDate: timestamp('next_payment_date'),
  pausedUntil: timestamp('paused_until'),
  cancelReason: text('cancel_reason'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at'),
  cardLast4: text('card_last4'),
  cardType: text('card_type'),
  // Stripe fields
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
});

// Jobs table for installations and maintenance
export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  technicianId: integer('technician_id').references(() => users.id),
  type: jobTypeEnum('type').notNull(),
  status: jobStatusEnum('status').notNull().default('scheduled'),
  scheduledFor: timestamp('scheduled_for').notNull(),
  scheduledEndTime: timestamp('scheduled_end_time').notNull(),
  notes: text('notes'),
  address: text('address').notNull(),
  addressCoordinates: json('address_coordinates').$type<{ lat: number, lng: number }>(),
  photoProof: text('photo_proof'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at'),
});

// Payments table
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id),
  amount: integer('amount').notNull(), // in JOD
  status: paymentStatusEnum('status').notNull().default('pending'),
  method: paymentMethodEnum('method').notNull(),
  transactionId: text('transaction_id'),
  cardLast4: text('card_last4'),
  cardType: text('card_type'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at'),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  created_at: timestamp('created_at').defaultNow(),
});

// Settings table
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at'),
});

// OnboardingState for tracking customer signup progress
export const onboardingState = pgTable('onboarding_state', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id).unique(),
  step: text('step').notNull().default('account'),
  planSelected: boolean('plan_selected').default(false),
  termsAccepted: boolean('terms_accepted').default(false),
  addressEntered: boolean('address_entered').default(false),
  installationScheduled: boolean('installation_scheduled').default(false),
  paymentCompleted: boolean('payment_completed').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at'),
});

// Zod schemas for validations
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  phone: true,
  password: true,
  username: true,
  role: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  userId: true,
  planPrice: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  stripePaymentIntentId: true,
});

export const insertJobSchema = createInsertSchema(jobs).pick({
  userId: true,
  technicianId: true,
  type: true,
  scheduledFor: true,
  scheduledEndTime: true,
  notes: true,
  address: true,
  addressCoordinates: true,
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  userId: true,
  subscriptionId: true,
  amount: true,
  method: true,
  status: true,
  transactionId: true,
  cardLast4: true,
  cardType: true,
});

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const registerCustomerSchema = z.object({
  email: z.string().email(),
  phone: z.string(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const updateJobStatusSchema = z.object({
  status: z.enum(['scheduled', 'en_route', 'arrived', 'completed', 'cancelled']),
  photoProof: z.string().optional(),
});

export const addressSchema = z.object({
  address: z.string(),
  city: z.string(),
  zip: z.string().optional(),
  notes: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

export const installationDateSchema = z.object({
  date: z.string(),
  time: z.string(),
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type RegisterCustomer = z.infer<typeof registerCustomerSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type UpdateJobStatus = z.infer<typeof updateJobStatusSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Notification = typeof notifications.$inferSelect;

export type Setting = typeof settings.$inferSelect;

export type OnboardingState = typeof onboardingState.$inferSelect;

export type Address = z.infer<typeof addressSchema>;
export type InstallationDate = z.infer<typeof installationDateSchema>;
