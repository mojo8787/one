import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import pg from 'pg';
const { Client } = pg;

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function createTechnicianUser() {
  try {
    // Create PostgreSQL client
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    
    // Check if technician user already exists
    const checkResult = await client.query('SELECT * FROM users WHERE email = $1', ['tech@pureflow.com']);
    
    if (checkResult.rows.length > 0) {
      console.log('Technician user already exists!');
      await client.end();
      return;
    }
    
    // Hash password
    const hashedPassword = await hashPassword('tech123');
    
    // Insert technician user
    const result = await client.query(
      'INSERT INTO users (email, phone, password, username, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, role',
      ['tech@pureflow.com', '9876543210', hashedPassword, 'technician', 'technician']
    );
    
    console.log('Technician user created successfully:', result.rows[0]);
    
    await client.end();
  } catch (error) {
    console.error('Error creating technician user:', error);
  }
}

createTechnicianUser();