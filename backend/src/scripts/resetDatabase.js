import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();


/*
============================================================
STOREPOS DEPLOYMENT CLEANUP
============================================================

PURPOSE
============================================================

This script prepares the LOCAL StorePOS MongoDB database
for a fresh deployment.

It removes:

- Test products
- Branch inventory
- Sales
- Sale items
- Customers
- Customer counters
- Inventory movements
- Inventory transactions
- Ledger accounts
- Ledger transactions
- Worker ledgers
- Bulk orders
- Stock transfers
- Prepared carts
- Held carts
- Product sync history
- Product sync state
- Cloud sync state
- Counters

It PRESERVES:

- Users
- Branches
- Any other collection not explicitly listed below

IMPORTANT
============================================================

This script connects ONLY to:

    MONGO_URI

from the StorePOS backend.

It does NOT connect to:

    MONGO_PRICING_URI

It therefore does NOT delete anything from the online
Product Pricing database.

Your online:

    pricedproducts

collection remains untouched.

============================================================
DANGER
============================================================

This permanently deletes StorePOS data.

Use this ONLY when preparing a database for deployment or
when intentionally clearing test data.

For extra safety, TWO explicit environment confirmations
are required:

    PREPARE_FOR_DEPLOYMENT=true

and:

    CONFIRM_DEPLOYMENT_RESET=I_UNDERSTAND

Production is additionally blocked unless:

    ALLOW_PRODUCTION_RESET=true

is explicitly supplied.

============================================================
RECOMMENDED USAGE
============================================================

Development / test database:

PREPARE_FOR_DEPLOYMENT=true \
CONFIRM_DEPLOYMENT_RESET=I_UNDERSTAND \
RESET_DATABASE_NAME=your_database_name \
node scripts/resetDatabase.js

Production:

PREPARE_FOR_DEPLOYMENT=true \
CONFIRM_DEPLOYMENT_RESET=I_UNDERSTAND \
ALLOW_PRODUCTION_RESET=true \
RESET_DATABASE_NAME=your_database_name \
node scripts/resetDatabase.js

============================================================
*/


/*
============================================================
MONGODB CONFIGURATION
============================================================
*/

const MONGO_URI =
    process.env.MONGO_URI;


const EXPECTED_DATABASE_NAME =
    process.env.RESET_DATABASE_NAME;


const PREPARE_FOR_DEPLOYMENT =
    process.env.PREPARE_FOR_DEPLOYMENT ===
    "true";


const CONFIRM_DEPLOYMENT_RESET =
    process.env.CONFIRM_DEPLOYMENT_RESET ===
    "I_UNDERSTAND";


const ALLOW_PRODUCTION_RESET =
    process.env.ALLOW_PRODUCTION_RESET ===
    "true";


/*
============================================================
COLLECTIONS TO CLEAR
============================================================

IMPORTANT:

This is an explicit allowlist.

ONLY collections listed here are deleted.

Anything not listed here is automatically preserved.

That means if you later add another StorePOS collection and
forget to update this script, this script will NOT suddenly
delete that new collection.

You can add a collection here only after confirming that it
contains deployment/test data that should be removed.
============================================================
*/

const COLLECTIONS_TO_CLEAR = [

    /*
    ========================================================
    GLOBAL PRODUCT CATALOG
    ========================================================

    Products will be imported again from the online
    Product Pricing system after deployment.
    */

    "products",


    /*
    ========================================================
    BRANCH INVENTORY
    ========================================================

    BranchInventory is authoritative for live branch stock.

    Since this is a fresh deployment, branch inventory starts
    empty.

    Product synchronization / branch provisioning can create
    the appropriate records again.
    */

    "branchinventories",


    /*
    ========================================================
    SALES
    ========================================================
    */

    "sales",

    "saleitems",


    /*
    ========================================================
    HELD / PREPARED CARTS
    ========================================================

    These are temporary/test transaction data.
    */

    "heldcarts",

    "preparedcarts",


    /*
    ========================================================
    BULK ORDERS
    ========================================================
    */

    "bulkorders",


    /*
    ========================================================
    CUSTOMERS
    ========================================================

    Customers created during testing are removed.

    If customers are already real production data, DO NOT run
    this script against that database.
    */

    "customers",

    "customercounters",


    /*
    ========================================================
    INVENTORY HISTORY
    ========================================================
    */

    "inventorymovements",

    "inventorytransactions",


    /*
    ========================================================
    STOCK TRANSFERS
    ========================================================
    */

    "stocktransfers",


    /*
    ========================================================
    LEDGER DATA
    ========================================================

    These contain financial/accounting test records.

    They are safe to clear when preparing a completely fresh
    StorePOS deployment.

    Ledger accounts are recreated as needed by the application.
    */

    "ledgeraccounts",

    "ledgertransactions",


    /*
    ========================================================
    WORKER LEDGERS
    ========================================================
    */

    "workerledgers",


    /*
    ========================================================
    LOYALTY
    ========================================================

    If loyalty transactions exist in the current database,
    remove test records as well.
    */

    "loyaltytransactions",


    /*
    ========================================================
    PRODUCT PRICING SYNC HISTORY
    ========================================================

    These contain synchronization history only.

    The online Product Pricing database is NOT touched.
    */

    "productsynclogs",

    "pricedproductsyncstates",


    /*
    ========================================================
    CLOUD SYNC STATE
    ========================================================

    Resetting this makes the StorePOS cloud backup state start
    clean after deployment.

    It does NOT delete the cloud database itself.
    */

    "syncstates",


    /*
    ========================================================
    COUNTERS
    ========================================================

    Fresh deployment should start fresh counters.

    This can include things such as:

    - Receipt numbering
    - Product barcode sequences
    - Other application counters

    If you ever use this script on an already-running
    production database, STOP and review this section first.
    */

    "counters",

];


/*
============================================================
COLLECTIONS THAT MUST BE PRESERVED
============================================================

These are NOT deleted.

Users contain:

- passwords
- roles
- permissions
- branch access
- bulkOrder permission
- settings permission
- etc.

Branches contain:

- branch codes
- branch names
- addresses
- phone numbers
- default branch information
- active status

We verify that their document counts do not change.
============================================================
*/

const COLLECTIONS_TO_PRESERVE = [

    "users",

    "branches",

];


/*
============================================================
UTILITY
============================================================
*/

const fail =
    (
        message
    ) => {

        console.error(
            "\n============================================================"
        );

        console.error(
            "DEPLOYMENT CLEANUP ABORTED"
        );

        console.error(
            "============================================================"
        );

        console.error(
            message
        );

        console.error("");

        process.exit(
            1
        );

    };


/*
============================================================
PRINT HEADER
============================================================
*/

const printHeader =
    () => {

        console.log(
            "\n============================================================"
        );

        console.log(
            "STOREPOS DEPLOYMENT DATABASE CLEANUP"
        );

        console.log(
            "============================================================"
        );

        console.log(
            ""
        );

        console.log(
            "This will permanently delete StorePOS test data."
        );

        console.log(
            ""
        );

    };


/*
============================================================
CONNECT TO DATABASE
============================================================
*/

const connectDatabase =
    async () => {

        console.log(
            "Connecting to MongoDB..."
        );


        await mongoose.connect(
            MONGO_URI
        );


        const db =
            mongoose.connection.db;


        if (
            !db
        ) {

            throw new Error(
                "MongoDB connection was created but database handle is unavailable."
            );

        }


        return db;

    };


/*
============================================================
GET EXISTING COLLECTIONS
============================================================
*/

const getExistingCollections =
    async (
        db
    ) => {

        const collections =
            await db
                .listCollections(
                    {},
                    {
                        nameOnly:
                            true,
                    }
                )
                .toArray();


        return new Set(
            collections.map(
                (
                    collection
                ) =>
                    collection.name
            )
        );

    };


/*
============================================================
COUNT PRESERVED COLLECTIONS
============================================================

We record their counts BEFORE cleanup.

After cleanup we verify that they still contain the same
number of documents.

This does not prove individual documents were unchanged, but
it provides an additional safeguard against this script
accidentally deleting from those collections.
============================================================
*/

const capturePreservedCounts =
    async (
        db,
        existingNames
    ) => {

        const counts = {};


        for (
            const collectionName
            of COLLECTIONS_TO_PRESERVE
        ) {

            if (
                !existingNames.has(
                    collectionName
                )
            ) {

                counts[
                    collectionName
                ] = null;


                continue;

            }


            counts[
                collectionName
            ] =
                await db
                    .collection(
                        collectionName
                    )
                    .countDocuments();

        }


        return counts;

    };


/*
============================================================
DISPLAY DATABASE SAFETY INFORMATION
============================================================
*/

const displayDatabaseInformation =
    (
        db,
        existingNames
    ) => {

        console.log(
            `Connected database: ${db.databaseName}`
        );

        console.log(
            ""
        );


        console.log(
            "Collections that WILL be cleared:"
        );


        for (
            const collectionName
            of COLLECTIONS_TO_CLEAR
        ) {

            if (
                existingNames.has(
                    collectionName
                )
            ) {

                console.log(
                    `  [DELETE] ${collectionName}`
                );

            }
            else {

                console.log(
                    `  [SKIP]   ${collectionName} does not exist`
                );

            }

        }


        console.log(
            ""
        );


        console.log(
            "Collections that WILL be preserved:"
        );


        for (
            const collectionName
            of COLLECTIONS_TO_PRESERVE
        ) {

            if (
                existingNames.has(
                    collectionName
                )
            ) {

                console.log(
                    `  [KEEP]   ${collectionName}`
                );

            }
            else {

                console.log(
                    `  [KEEP]   ${collectionName} does not exist`
                );

            }

        }


        console.log(
            ""
        );


        console.log(
            "All other collections will also be preserved."
        );


        console.log(
            ""
        );

    };


/*
============================================================
CLEAR COLLECTION
============================================================
*/

const clearCollection =
    async (
        db,
        collectionName,
        existingNames
    ) => {

        if (
            !existingNames.has(
                collectionName
            )
        ) {

            console.log(
                `[SKIP] ${collectionName} does not exist.`
            );


            return 0;

        }


        const collection =
            db.collection(
                collectionName
            );


        const before =
            await collection.countDocuments();


        if (
            before ===
            0
        ) {

            console.log(
                `[EMPTY] ${collectionName}`
            );


            return 0;

        }


        const result =
            await collection.deleteMany(
                {}
            );


        const deleted =
            Number(
                result.deletedCount ||
                0
            );


        console.log(
            `[CLEARED] ${collectionName}: ${deleted} document(s)`
        );


        return deleted;

    };


/*
============================================================
VERIFY CLEARED COLLECTIONS
============================================================
*/

const verifyClearedCollections =
    async (
        db,
        existingNames
    ) => {

        console.log(
            "\nVerifying cleared collections...\n"
        );


        let verificationFailed =
            false;


        for (
            const collectionName
            of COLLECTIONS_TO_CLEAR
        ) {

            if (
                !existingNames.has(
                    collectionName
                )
            ) {

                continue;

            }


            const remaining =
                await db
                    .collection(
                        collectionName
                    )
                    .countDocuments();


            console.log(
                `${collectionName}: ${remaining} remaining`
            );


            if (
                remaining !==
                0
            ) {

                verificationFailed =
                    true;

            }

        }


        if (
            verificationFailed
        ) {

            throw new Error(
                "One or more collections still contain documents after cleanup."
            );

        }

    };


/*
============================================================
VERIFY PRESERVED COLLECTIONS
============================================================
*/

const verifyPreservedCollections =
    async (
        db,
        existingNames,
        originalCounts
    ) => {

        console.log(
            "\nVerifying preserved collections...\n"
        );


        let verificationFailed =
            false;


        for (
            const collectionName
            of COLLECTIONS_TO_PRESERVE
        ) {

            const originalCount =
                originalCounts[
                    collectionName
                ];


            if (
                originalCount ===
                null
            ) {

                console.log(
                    `[PRESERVED] ${collectionName} did not exist before cleanup.`
                );


                continue;

            }


            if (
                !existingNames.has(
                    collectionName
                )
            ) {

                console.error(
                    `[ERROR] ${collectionName} disappeared.`
                );


                verificationFailed =
                    true;


                continue;

            }


            const currentCount =
                await db
                    .collection(
                        collectionName
                    )
                    .countDocuments();


            console.log(
                `${collectionName}: ${originalCount} → ${currentCount}`
            );


            if (
                currentCount !==
                originalCount
            ) {

                verificationFailed =
                    true;

            }

        }


        if (
            verificationFailed
        ) {

            throw new Error(
                "Preserved collection verification failed."
            );

        }

    };


/*
============================================================
MAIN CLEANUP FUNCTION
============================================================
*/

const prepareForDeployment =
    async () => {

        printHeader();


        /*
        ========================================================
        ENVIRONMENT VALIDATION
        ========================================================
        */

        if (
            !MONGO_URI
        ) {

            fail(
                "MONGO_URI is not configured."
            );

        }


        if (
            !PREPARE_FOR_DEPLOYMENT
        ) {

            fail(
                'PREPARE_FOR_DEPLOYMENT must be exactly "true".'
            );

        }


        if (
            !CONFIRM_DEPLOYMENT_RESET
        ) {

            fail(
                'CONFIRM_DEPLOYMENT_RESET must be exactly "I_UNDERSTAND".'
            );

        }


        if (
            !EXPECTED_DATABASE_NAME
        ) {

            fail(
                "RESET_DATABASE_NAME must be provided."
            );

        }


        /*
        ========================================================
        PRODUCTION SAFETY
        ========================================================
        */

        if (
            process.env.NODE_ENV ===
                "production" &&
            !ALLOW_PRODUCTION_RESET
        ) {

            fail(
                "Production cleanup is blocked.\n\n" +
                "If you intentionally want to clear a production database, " +
                "set ALLOW_PRODUCTION_RESET=true."
            );

        }


        /*
        ========================================================
        CONNECT
        ========================================================
        */

        const db =
            await connectDatabase();


        /*
        ========================================================
        VERIFY DATABASE NAME
        ========================================================
        */

        const actualDatabaseName =
            db.databaseName;


        if (
            actualDatabaseName !==
            EXPECTED_DATABASE_NAME
        ) {

            fail(
                `Database mismatch.\n\n` +
                `Connected database:\n` +
                `  ${actualDatabaseName}\n\n` +
                `Expected database:\n` +
                `  ${EXPECTED_DATABASE_NAME}\n\n` +
                "Nothing was deleted."
            );

        }


        console.log(
            `Connected database: ${actualDatabaseName}`
        );


        /*
        ========================================================
        IMPORTANT REMOTE DATABASE NOTICE
        ========================================================
        */

        console.log(
            ""
        );

        console.log(
            "ONLINE PRODUCT PRICING DATABASE:"
        );

        console.log(
            "  NOT CONNECTED"
        );

        console.log(
            "  NOT MODIFIED"
        );

        console.log(
            "  pricedproducts remains untouched."
        );


        /*
        ========================================================
        DISCOVER COLLECTIONS
        ========================================================
        */

        const existingNames =
            await getExistingCollections(
                db
            );


        /*
        ========================================================
        DISPLAY EXACT PLAN
        ========================================================
        */

        displayDatabaseInformation(
            db,
            existingNames
        );


        /*
        ========================================================
        CAPTURE PRESERVED COUNTS
        ========================================================
        */

        const preservedCounts =
            await capturePreservedCounts(
                db,
                existingNames
            );


        /*
        ========================================================
        FINAL SAFETY MESSAGE
        ========================================================
        */

        console.log(
            "============================================================"
        );

        console.log(
            "FINAL WARNING"
        );

        console.log(
            "============================================================"
        );

        console.log(
            ""
        );

        console.log(
            "The following data will be permanently deleted:"
        );

        console.log(
            ""
        );

        console.log(
            "- Products"
        );

        console.log(
            "- Branch inventory"
        );

        console.log(
            "- Sales"
        );

        console.log(
            "- Customers"
        );

        console.log(
            "- Bulk orders"
        );

        console.log(
            "- Inventory history"
        );

        console.log(
            "- Stock transfers"
        );

        console.log(
            "- Ledger test data"
        );

        console.log(
            "- Worker ledger test data"
        );

        console.log(
            "- Temporary carts"
        );

        console.log(
            "- Product sync history"
        );

        console.log(
            "- Cloud sync state"
        );

        console.log(
            "- Counters"
        );

        console.log(
            ""
        );

        console.log(
            "Users and permissions WILL remain."
        );

        console.log(
            "Branches WILL remain."
        );

        console.log(
            "Online Product Pricing data WILL remain."
        );

        console.log(
            ""
        );


        /*
        ========================================================
        DELETE
        ========================================================
        */

        console.log(
            "Starting deployment cleanup...\n"
        );


        let totalDeleted =
            0;


        for (
            const collectionName
            of COLLECTIONS_TO_CLEAR
        ) {

            const deleted =
                await clearCollection(
                    db,
                    collectionName,
                    existingNames
                );


            totalDeleted +=
                deleted;

        }


        /*
        ========================================================
        VERIFY DELETED COLLECTIONS
        ========================================================
        */

        await verifyClearedCollections(
            db,
            existingNames
        );


        /*
        ========================================================
        VERIFY PRESERVED COLLECTIONS
        ========================================================
        */

        await verifyPreservedCollections(
            db,
            existingNames,
            preservedCounts
        );


        /*
        ========================================================
        FINAL SUMMARY
        ========================================================
        */

        console.log(
            ""
        );

        console.log(
            "============================================================"
        );

        console.log(
            "STOREPOS DEPLOYMENT CLEANUP COMPLETE"
        );

        console.log(
            "============================================================"
        );

        console.log(
            `Database: ${actualDatabaseName}`
        );

        console.log(
            `Documents deleted: ${totalDeleted}`
        );

        console.log(
            ""
        );

        console.log(
            "PRESERVED:"
        );

        console.log(
            "  ✓ Users"
        );

        console.log(
            "  ✓ User roles"
        );

        console.log(
            "  ✓ User permissions"
        );

        console.log(
            "  ✓ Branches"
        );

        console.log(
            "  ✓ Any other collection not in the deletion allowlist"
        );

        console.log(
            ""
        );

        console.log(
            "NOT TOUCHED:"
        );

        console.log(
            "  ✓ Online Product Pricing database"
        );

        console.log(
            "  ✓ pricedproducts"
        );

        console.log(
            "  ✓ productcaptures"
        );

        console.log(
            ""
        );

        console.log(
            "The StorePOS database is now ready for a fresh"
        );

        console.log(
            "Product Pricing synchronization."
        );

        console.log(
            "============================================================"
        );

        console.log(
            ""
        );

    };


/*
============================================================
RUN
============================================================
*/

try {

    await prepareForDeployment();

}
catch (
    error
) {

    console.error(
        ""
    );

    console.error(
        "============================================================"
    );

    console.error(
        "DEPLOYMENT CLEANUP FAILED"
    );

    console.error(
        "============================================================"
    );

    console.error(
        error
    );

    console.error(
        ""
    );


    process.exitCode =
        1;

}
finally {

    try {

        await mongoose.disconnect();

    }
    catch (
        error
    ) {

        console.error(
            "Failed to disconnect MongoDB:",
            error
        );

    }

}