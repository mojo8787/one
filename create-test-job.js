import { pool } from './server/db.js';
import { jobs } from './shared/schema.js';
import { drizzle } from 'drizzle-orm/neon-serverless';

async function createTestJob() {
  try {
    const db = drizzle(pool, { schema: { jobs } });
    
    const scheduledFor = new Date();
    scheduledFor.setHours(scheduledFor.getHours() + 2);
    
    const scheduledEndTime = new Date(scheduledFor);
    scheduledEndTime.setHours(scheduledEndTime.getHours() + 2);
    
    const [job] = await db.insert(jobs).values({
      userId: 2,
      technicianId: 5,
      type: 'filter_change',
      status: 'scheduled',
      scheduledFor,
      scheduledEndTime,
      notes: 'Regular filter change for customer',
      address: '123 Green Street, Amman',
      addressCoordinates: {lat: 31.95, lng: 35.93},
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    console.log('Test job created:', job);
    
    // Create another job that's en_route
    const [job2] = await db.insert(jobs).values({
      userId: 2,
      technicianId: 5,
      type: 'repair',
      status: 'en_route',
      scheduledFor: new Date(),
      scheduledEndTime: new Date(new Date().setHours(new Date().getHours() + 1)),
      notes: 'Emergency repair service',
      address: '456 Palm Avenue, Amman',
      addressCoordinates: {lat: 31.96, lng: 35.94},
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    console.log('Second test job created:', job2);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test jobs:', error);
    process.exit(1);
  }
}

createTestJob();