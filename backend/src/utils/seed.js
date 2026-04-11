import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedUsers = [
  {
    name: 'Admin User',
    email: 'admin@gstpro.com',
    password: 'Admin@123',
    role: 'admin',
    company: 'GSTPro Solutions',
    gstin: '27AABCU9603R1ZX'
  },
  {
    name: 'Client User',
    email: 'client@gstpro.com',
    password: 'Client@123',
    role: 'client',
    company: 'ABC Traders Pvt Ltd',
    gstin: '27AAAPL1234C1ZT'
  },
  {
    name: 'Officer User',
    email: 'officer@gstpro.com',
    password: 'Officer@123',
    role: 'officer',
    company: 'GST Department',
    gstin: '27BBBPL5678D2ZS'
  }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    for (const userData of seedUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created ${userData.role}: ${userData.email}`);
    }

    console.log('\n🌱 Seed complete! Login credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    seedUsers.forEach(u => {
      console.log(`  ${u.role.toUpperCase().padEnd(8)} | ${u.email} | ${u.password}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seed();
