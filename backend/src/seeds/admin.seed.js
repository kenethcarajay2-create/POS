import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import connectDB from "../config/database.js";
import User from "../models/user.model.js";

dotenv.config();

const seedAdmin = async () => {
    try {
        await connectDB();

        const existingAdmin = await User.findOne({
            username: process.env.ADMIN_USERNAME.toLowerCase(),
        });

        if (existingAdmin) {
            console.log("✅ Admin user already exists.");
            await mongoose.connection.close();
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(
            process.env.ADMIN_PASSWORD,
            10
        );

        await User.create({
            name: process.env.ADMIN_NAME,
            username: process.env.ADMIN_USERNAME.toLowerCase(),
            password: hashedPassword,
            role: "admin",
            isActive: true,
        });

        console.log("✅ Admin user created successfully.");

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error(error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

seedAdmin();