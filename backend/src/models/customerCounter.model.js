// backend/src/models/customerCounter.model.js

import mongoose from "mongoose";


const customerCounterSchema =
    new mongoose.Schema(
        {
            key: {
                type: String,
                required: true,
                unique: true,
            },

            sequence: {
                type: Number,
                default: 0,
            },
        },
        {
            timestamps: true,
        }
    );


export default mongoose.model(
    "CustomerCounter",
    customerCounterSchema
);