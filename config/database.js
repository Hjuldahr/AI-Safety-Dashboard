import User from '../models/user.js';
import Chart_Config from '../models/Chart_Config.js';
import ReportTemplate from '../models/ReportTemplate.js';
import mongoose from 'mongoose';
import defaultCharts from './seed_data/defaultCharts.json' with { type: 'json' };
import defaultReportTemplates from './seed_data/defaultReportTemplates.json' with { type: 'json' };
import { seedDefaultRoles } from './seedRoles.js';


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
    await seedDefaultRoles();
    await seedOwnerUser();
    await seedAdminUser();
}

const seedOwnerUser = async () => {
    try {
        const ownerUsername = process.env.DEFAULT_OWNER_USER;
        const ownerEmail = process.env.DEFAULT_OWNER_EMAIL;
        const ownerPassword = process.env.DEFAULT_OWNER_PASSWORD;

        // Only seed if owner env vars are configured
        if (!ownerUsername || !ownerEmail || !ownerPassword) {
            console.log('-INFO- Owner env vars not set, skipping owner user seed.');
            return;
        }

        const ownerExists = await User.findOne({ username: ownerUsername });

        if (ownerExists) {
            console.log('-INFO- An Owner user already exists.');
        } else {
            const ownerUser = new User({
                username: ownerUsername,
                email: ownerEmail,
                password: ownerPassword,
                roles: ['owner']
            });

            await ownerUser.save();
            console.log('-INFO- Default owner user created successfully.');
        }
    } catch (error) {
        console.error('Error seeding owner user:', error);
        process.exit(1);
    }
};

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

const seedReportTemplates = async () => {
    try {
        const count = await ReportTemplate.countDocuments();
        if (count > 0) {
            console.log("-INFO- Report template(s) already exist in DB, no defaults created.");
            return;
        }
        await ReportTemplate.insertMany(defaultReportTemplates);
        console.log("-INFO- Default report templates seeded successfully.");
    } catch (error) {
        console.error('Error seeding default report templates:', error);
    }
};

export { connectDB, seedDataBase, seedCharts, seedReportTemplates };
