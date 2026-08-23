import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/product.model.js";

dotenv.config();

const products = [
    // =========================
    // BEVERAGES
    // =========================

    {
        barcode: "4800016068010",
        name: "C2 Solo",
        description: "C2 Green Tea Apple",
        category: "Beverages",
        costPrice: 17,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 20 },
            { quantity: 24, price: 370 },
        ],
        stock: 0,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4801981118502",
        name: "Coca Cola Mismo",
        description: "Coca Cola 290ml",
        category: "Beverages",
        costPrice: 20,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 25 },
            { quantity: 12, price: 280 },
        ],
        stock: 80,
        minimumStock: 10,
        isActive: true,
    },

    {
        barcode: "4800888112345",
        name: "Sprite Mismo",
        description: "Sprite 290ml",
        category: "Beverages",
        costPrice: 20,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 25 },
            { quantity: 12, price: 280 },
        ],
        stock: 45,
        minimumStock: 10,
        isActive: true,
    },

    {
        barcode: "4800016641234",
        name: "Coca Cola 1.5L",
        description: "Coca Cola 1.5 Liter",
        category: "Beverages",
        costPrice: 75,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 85 },
            { quantity: 6, price: 490 },
        ],
        stock: 25,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800016641241",
        name: "Sprite 1.5L",
        description: "Sprite 1.5 Liter",
        category: "Beverages",
        costPrice: 75,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 85 },
            { quantity: 6, price: 490 },
        ],
        stock: 18,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800016641258",
        name: "Royal Tru-Orange",
        description: "Royal Tru-Orange 1.5L",
        category: "Beverages",
        costPrice: 75,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 85 },
            { quantity: 6, price: 490 },
        ],
        stock: 12,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4801234567890",
        name: "Wilkins Water 500ml",
        description: "Purified drinking water",
        category: "Beverages",
        costPrice: 12,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 15 },
            { quantity: 24, price: 330 },
        ],
        stock: 50,
        minimumStock: 10,
        isActive: true,
    },

    {
        barcode: "4807777770305",
        name: "Nescafe 3in1 Original",
        description: "Instant coffee mix",
        category: "Beverages",
        costPrice: 8,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 10 },
            { quantity: 10, price: 95 },
        ],
        stock: 30,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4807777770312",
        name: "Nescafe Creamy White",
        description: "Instant coffee mix",
        category: "Beverages",
        costPrice: 9,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 12 },
            { quantity: 10, price: 110 },
        ],
        stock: 3,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4807777770107",
        name: "Kopiko Brown",
        description: "Instant coffee mix",
        category: "Beverages",
        costPrice: 5,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 7 },
            { quantity: 10, price: 65 },
        ],
        stock: 120,
        minimumStock: 10,
        isActive: true,
    },


    // =========================
    // SNACKS
    // =========================

    {
        barcode: "4800016012345",
        name: "Piattos Cheese",
        description: "Cheese flavored potato crisps",
        category: "Snacks",
        costPrice: 30,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 35 },
            { quantity: 10, price: 330 },
        ],
        stock: 30,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800016012352",
        name: "Piattos Sour Cream",
        description: "Sour cream potato crisps",
        category: "Snacks",
        costPrice: 30,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 35 },
            { quantity: 10, price: 330 },
        ],
        stock: 20,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800016012369",
        name: "Lays Classic",
        description: "Classic potato chips",
        category: "Snacks",
        costPrice: 32,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 38 },
            { quantity: 10, price: 360 },
        ],
        stock: 25,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800016012376",
        name: "Nova Multigrain",
        description: "Multigrain snack",
        category: "Snacks",
        costPrice: 30,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 35 },
            { quantity: 10, price: 330 },
        ],
        stock: 40,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800016012383",
        name: "Chippy Barbecue",
        description: "Barbecue corn chips",
        category: "Snacks",
        costPrice: 10,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 12 },
            { quantity: 10, price: 110 },
        ],
        stock: 60,
        minimumStock: 10,
        isActive: true,
    },

    {
        barcode: "4800016012390",
        name: "Clover Chips",
        description: "Cheese flavored corn snack",
        category: "Snacks",
        costPrice: 10,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 12 },
            { quantity: 10, price: 110 },
        ],
        stock: 35,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800016012406",
        name: "Boy Bawang Garlic",
        description: "Garlic flavored cornick",
        category: "Snacks",
        costPrice: 8,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 10 },
            { quantity: 10, price: 90 },
        ],
        stock: 75,
        minimumStock: 10,
        isActive: true,
    },

    {
        barcode: "4800016012413",
        name: "Choc Nut",
        description: "Chocolate peanut candy",
        category: "Snacks",
        costPrice: 5,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 7 },
            { quantity: 10, price: 65 },
        ],
        stock: 45,
        minimumStock: 5,
        isActive: true,
    },


    // =========================
    // CANNED GOODS
    // =========================

    {
        barcode: "4800017001001",
        name: "Argentina Corned Beef",
        description: "Corned beef 175g",
        category: "Canned Goods",
        costPrice: 48,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 55 },
            { quantity: 6, price: 315 },
        ],
        stock: 18,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800017001018",
        name: "555 Sardines Tomato",
        description: "Sardines in tomato sauce",
        category: "Canned Goods",
        costPrice: 21,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 25 },
            { quantity: 10, price: 230 },
        ],
        stock: 40,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800017001025",
        name: "Mega Sardines",
        description: "Sardines in tomato sauce",
        category: "Canned Goods",
        costPrice: 20,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 24 },
            { quantity: 10, price: 220 },
        ],
        stock: 35,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800017001032",
        name: "Ligo Sardines",
        description: "Sardines in tomato sauce",
        category: "Canned Goods",
        costPrice: 22,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 27 },
            { quantity: 10, price: 250 },
        ],
        stock: 28,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800017001049",
        name: "Century Tuna Flakes",
        description: "Tuna flakes in oil",
        category: "Canned Goods",
        costPrice: 38,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 45 },
            { quantity: 6, price: 255 },
        ],
        stock: 22,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800017001056",
        name: "Youngs Town Sardines",
        description: "Sardines in tomato sauce",
        category: "Canned Goods",
        costPrice: 20,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 24 },
            { quantity: 10, price: 220 },
        ],
        stock: 2,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800017001063",
        name: "Maling Luncheon Meat",
        description: "Luncheon meat",
        category: "Canned Goods",
        costPrice: 55,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 65 },
            { quantity: 6, price: 370 },
        ],
        stock: 15,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800017001070",
        name: "Libbys Vienna Sausage",
        description: "Vienna sausage",
        category: "Canned Goods",
        costPrice: 48,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 55 },
            { quantity: 6, price: 315 },
        ],
        stock: 10,
        minimumStock: 5,
        isActive: true,
    },


    // =========================
    // FROZEN
    // =========================

    {
        barcode: "4800028001001",
        name: "Purefoods Tender Juicy Hotdog",
        description: "Classic hotdog",
        category: "Frozen",
        costPrice: 120,
        baseUnit: "Pack",
        pricing: [
            { quantity: 1, price: 140 },
            { quantity: 3, price: 405 },
        ],
        stock: 12,
        minimumStock: 3,
        isActive: true,
    },

    {
        barcode: "4800028001018",
        name: "CDO Idol Cheese Hotdog",
        description: "Cheese flavored hotdog",
        category: "Frozen",
        costPrice: 110,
        baseUnit: "Pack",
        pricing: [
            { quantity: 1, price: 130 },
            { quantity: 3, price: 375 },
        ],
        stock: 8,
        minimumStock: 3,
        isActive: true,
    },

    {
        barcode: "4800028001025",
        name: "Pampanga Tocino",
        description: "Sweet cured pork",
        category: "Frozen",
        costPrice: 145,
        baseUnit: "Pack",
        pricing: [
            { quantity: 1, price: 165 },
            { quantity: 3, price: 480 },
        ],
        stock: 6,
        minimumStock: 3,
        isActive: true,
    },

    {
        barcode: "4800028001032",
        name: "Chicken Nuggets",
        description: "Frozen chicken nuggets",
        category: "Frozen",
        costPrice: 125,
        baseUnit: "Pack",
        pricing: [
            { quantity: 1, price: 150 },
            { quantity: 3, price: 435 },
        ],
        stock: 4,
        minimumStock: 3,
        isActive: true,
    },

    {
        barcode: "4800028001049",
        name: "French Fries",
        description: "Frozen French fries",
        category: "Frozen",
        costPrice: 95,
        baseUnit: "Pack",
        pricing: [
            { quantity: 1, price: 115 },
            { quantity: 3, price: 330 },
        ],
        stock: 10,
        minimumStock: 3,
        isActive: true,
    },


    // =========================
    // HOUSEHOLD
    // =========================

    {
        barcode: "4800039001001",
        name: "Surf Powder Detergent",
        description: "Laundry detergent",
        category: "Household",
        costPrice: 9,
        baseUnit: "Sachet",
        pricing: [
            { quantity: 1, price: 12 },
            { quantity: 10, price: 110 },
        ],
        stock: 80,
        minimumStock: 10,
        isActive: true,
    },

    {
        barcode: "4800039001018",
        name: "Ariel Powder Detergent",
        description: "Laundry detergent",
        category: "Household",
        costPrice: 10,
        baseUnit: "Sachet",
        pricing: [
            { quantity: 1, price: 13 },
            { quantity: 10, price: 120 },
        ],
        stock: 65,
        minimumStock: 10,
        isActive: true,
    },

    {
        barcode: "4800039001025",
        name: "Joy Dishwashing Liquid",
        description: "Dishwashing liquid",
        category: "Household",
        costPrice: 8,
        baseUnit: "Sachet",
        pricing: [
            { quantity: 1, price: 10 },
            { quantity: 10, price: 95 },
        ],
        stock: 55,
        minimumStock: 10,
        isActive: true,
    },

    {
        barcode: "4800039001032",
        name: "Zonrox Bleach",
        description: "Bleach cleaning solution",
        category: "Household",
        costPrice: 28,
        baseUnit: "Bottle",
        pricing: [
            { quantity: 1, price: 35 },
            { quantity: 6, price: 195 },
        ],
        stock: 20,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800039001049",
        name: "Pride Fabric Conditioner",
        description: "Fabric conditioner",
        category: "Household",
        costPrice: 15,
        baseUnit: "Sachet",
        pricing: [
            { quantity: 1, price: 20 },
            { quantity: 10, price: 185 },
        ],
        stock: 40,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800039001056",
        name: "Mr Muscle Cleaner",
        description: "Multi-purpose household cleaner",
        category: "Household",
        costPrice: 70,
        baseUnit: "Bottle",
        pricing: [
            { quantity: 1, price: 85 },
            { quantity: 6, price: 480 },
        ],
        stock: 7,
        minimumStock: 5,
        isActive: true,
    },


    // =========================
    // PERSONAL CARE
    // =========================

    {
        barcode: "4800045001001",
        name: "Safeguard Soap",
        description: "Antibacterial bathing soap",
        category: "Personal Care",
        costPrice: 20,
        baseUnit: "Piece",
        pricing: [
            { quantity: 1, price: 25 },
            { quantity: 6, price: 140 },
        ],
        stock: 35,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800045001018",
        name: "Cream Silk Conditioner",
        description: "Hair conditioner sachet",
        category: "Personal Care",
        costPrice: 12,
        baseUnit: "Sachet",
        pricing: [
            { quantity: 1, price: 15 },
            { quantity: 10, price: 140 },
        ],
        stock: 45,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800045001025",
        name: "Palmolive Shampoo",
        description: "Shampoo sachet",
        category: "Personal Care",
        costPrice: 7,
        baseUnit: "Sachet",
        pricing: [
            { quantity: 1, price: 10 },
            { quantity: 10, price: 90 },
        ],
        stock: 50,
        minimumStock: 10,
        isActive: true,
    },

    {
        barcode: "4800045001032",
        name: "Colgate Toothpaste",
        description: "Fluoride toothpaste",
        category: "Personal Care",
        costPrice: 65,
        baseUnit: "Tube",
        pricing: [
            { quantity: 1, price: 75 },
            { quantity: 6, price: 420 },
        ],
        stock: 18,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800045001049",
        name: "Closeup Toothpaste",
        description: "Fresh gel toothpaste",
        category: "Personal Care",
        costPrice: 60,
        baseUnit: "Tube",
        pricing: [
            { quantity: 1, price: 70 },
            { quantity: 6, price: 390 },
        ],
        stock: 12,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800045001056",
        name: "Head & Shoulders Shampoo",
        description: "Anti-dandruff shampoo",
        category: "Personal Care",
        costPrice: 10,
        baseUnit: "Sachet",
        pricing: [
            { quantity: 1, price: 15 },
            { quantity: 10, price: 140 },
        ],
        stock: 5,
        minimumStock: 5,
        isActive: true,
    },


    // =========================
    // OTHERS
    // =========================

    {
        barcode: "4800056001001",
        name: "Lucky Me Pancit Canton",
        description: "Instant stir-fried noodles",
        category: "Others",
        costPrice: 11,
        baseUnit: "Pack",
        pricing: [
            { quantity: 1, price: 14 },
            { quantity: 10, price: 130 },
        ],
        stock: 52,
        minimumStock: 10,
        isActive: true,
    },

    {
        barcode: "4800056001018",
        name: "Lucky Me Beef Noodles",
        description: "Instant beef flavored noodles",
        category: "Others",
        costPrice: 10,
        baseUnit: "Pack",
        pricing: [
            { quantity: 1, price: 13 },
            { quantity: 10, price: 120 },
        ],
        stock: 40,
        minimumStock: 10,
        isActive: true,
    },

    {
        barcode: "4800056001025",
        name: "Bear Brand 300ml",
        description: "Milk drink",
        category: "Others",
        costPrice: 21,
        baseUnit: "Can",
        pricing: [
            { quantity: 1, price: 25 },
            { quantity: 6, price: 140 },
        ],
        stock: 15,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800056001032",
        name: "Alaska Evaporated Milk",
        description: "Evaporated milk",
        category: "Others",
        costPrice: 35,
        baseUnit: "Can",
        pricing: [
            { quantity: 1, price: 42 },
            { quantity: 6, price: 240 },
        ],
        stock: 10,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800056001049",
        name: "Eden Cheese",
        description: "Processed cheese",
        category: "Others",
        costPrice: 85,
        baseUnit: "Pack",
        pricing: [
            { quantity: 1, price: 100 },
            { quantity: 6, price: 570 },
        ],
        stock: 9,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800056001056",
        name: "Brown Sugar",
        description: "Refined brown sugar",
        category: "Others",
        costPrice: 55,
        baseUnit: "Kilo",
        pricing: [
            { quantity: 1, price: 65 },
            { quantity: 5, price: 300 },
        ],
        stock: 20,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800056001063",
        name: "Premium Rice",
        description: "Premium rice",
        category: "Others",
        costPrice: 48,
        baseUnit: "Kilo",
        pricing: [
            { quantity: 1, price: 55 },
            { quantity: 5, price: 265 },
        ],
        stock: 25,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800056001070",
        name: "Cooking Oil 1L",
        description: "Vegetable cooking oil",
        category: "Others",
        costPrice: 85,
        baseUnit: "Bottle",
        pricing: [
            { quantity: 1, price: 100 },
            { quantity: 6, price: 570 },
        ],
        stock: 6,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800056001087",
        name: "Datu Puti Soy Sauce",
        description: "Soy sauce",
        category: "Others",
        costPrice: 18,
        baseUnit: "Bottle",
        pricing: [
            { quantity: 1, price: 23 },
            { quantity: 6, price: 125 },
        ],
        stock: 32,
        minimumStock: 5,
        isActive: true,
    },

    {
        barcode: "4800056001094",
        name: "Datu Puti Vinegar",
        description: "Cane vinegar",
        category: "Others",
        costPrice: 18,
        baseUnit: "Bottle",
        pricing: [
            { quantity: 1, price: 23 },
            { quantity: 6, price: 125 },
        ],
        stock: 28,
        minimumStock: 5,
        isActive: true,
    },
];


// =========================================
// SEED FUNCTION
// =========================================

const seedProducts = async () => {

    try {

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log(
            "MongoDB connected."
        );


        // Clear existing products

        await Product.deleteMany({});

        console.log(
            "Existing products cleared."
        );


        // Insert products

        const inserted =
            await Product.insertMany(
                products
            );


        console.log(
            `Successfully inserted ${inserted.length} products.`
        );


        console.log(
            "All products are ACTIVE."
        );


    } catch (error) {

        console.error(
            "Product seeding failed:"
        );

        console.error(error);

        process.exitCode = 1;

    } finally {

        await mongoose.disconnect();

    }
};


seedProducts();