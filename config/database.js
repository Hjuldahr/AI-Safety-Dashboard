import User from '../models/user.js';
import Chart_Config from '../models/Chart_Config.js';
import mongoose from 'mongoose';
import defaultCharts from './seed_data/defaultCharts.json' with { type: 'json' };


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('MongoDB connected successfully.');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

const seedDataBase = async () => {
    seedAdminUser();
}

const seedAdminUser = async () => {
    try {
        // Check if an admin user already exists
        const adminExists = await User.findOne({ username: 'admin' });

        // If an admin already exists, do nothing.
        if (adminExists) {
            console.log('-INFO- An Admin user already exists.');
        }
        else {
            // If no admin exists, create one from the .env variables
            const adminUser = new User({
                username: process.env.DEFAULT_APP_USER,
                email: process.env.DEFAULT_ADD_EMAIL,
                password: process.env.DEFAULT_APP_PASSWORD,
                roles: ['admin'] // Assign admin role
            });

            await adminUser.save();
            console.log('-INFO- Default admin user created successfully.');
        }

    } catch (error) {
        console.error('Error seeding admin user:', error);
        // Exit process with failure if seeding fails, as it's a critical startup step
        process.exit(1);
    }
};

const seedCharts = async () => {
    try {

        const count = await Chart_Config.countDocuments();

        if (count > 0) {
            console.log("-INFO- Chart(s) already exist in DB, no default charts created.");
            return;
        }

        await Chart_Config.insertMany(defaultCharts);

        console.log("-INFO- Default charts seeded successfully.");
    } catch (error) {
        onsole.error('Error seeding default charts:', error);
    }
};

export { connectDB, seedDataBase, seedCharts };
