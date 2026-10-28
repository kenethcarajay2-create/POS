import mongoose from "mongoose";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

/*
============================================================
CONFIGURATION
============================================================
*/

const CLOUD_URI = process.env.MONGO_CLOUD_URI;
const LOCAL_URI = process.env.MONGO_URI;

const CONFIRM_WORD = "COPY";

const BATCH_SIZE = 1000;

/*
============================================================
HELPERS
============================================================
*/

const askQuestion = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

const maskMongoUri = (uri) => {
  if (!uri) return "(missing)";

  try {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^@]+)@/, "$1***:***@");
  } catch {
    return "(hidden)";
  }
};

/*
============================================================
COPY COLLECTION
============================================================
*/

const copyCollection = async ({ sourceDb, targetDb, collectionName }) => {
  console.log("");
  console.log("------------------------------------------------------------");
  console.log(`Copying collection: ${collectionName}`);
  console.log("------------------------------------------------------------");

  const sourceCollection = sourceDb.collection(collectionName);

  const targetCollection = targetDb.collection(collectionName);

  /*
    ========================================================
    COUNT DOCUMENTS
    ========================================================
    */

  const totalDocuments = await sourceCollection.countDocuments();

  console.log(`Documents found: ${totalDocuments.toLocaleString()}`);

  /*
    ========================================================
    CREATE TARGET COLLECTION
    ========================================================
    */

  const existingCollections = await targetDb
    .listCollections({
      name: collectionName,
    })
    .toArray();

  if (existingCollections.length === 0) {
    await targetDb.createCollection(collectionName);
  }

  /*
    ========================================================
    COPY DOCUMENTS
    ========================================================
    */

  if (totalDocuments > 0) {
    const cursor = sourceCollection.find({});

    let batch = [];
    let copied = 0;

    while (await cursor.hasNext()) {
      const document = await cursor.next();

      batch.push(document);

      if (batch.length >= BATCH_SIZE) {
        await targetCollection.insertMany(batch, {
          ordered: false,
        });

        copied += batch.length;

        console.log(
          `Copied ${copied.toLocaleString()} / ${totalDocuments.toLocaleString()}`,
        );

        batch = [];
      }
    }

    /*
        ====================================================
        INSERT REMAINING DOCUMENTS
        ====================================================
        */

    if (batch.length > 0) {
      await targetCollection.insertMany(batch, {
        ordered: false,
      });

      copied += batch.length;
    }

    console.log(`✅ Documents copied: ${copied.toLocaleString()}`);
  } else {
    console.log("Collection is empty. Collection created.");
  }

  /*
    ========================================================
    COPY INDEXES
    ========================================================
    */

  try {
    const indexes = await sourceCollection.indexes();

    for (const index of indexes) {
      /*
            MongoDB automatically creates the _id index.
            Do not recreate it.
            */

      if (index.name === "_id_") {
        continue;
      }

      const { key, name, v, ns, background, ...options } = index;

      /*
            Some index metadata returned by MongoDB is not
            accepted when creating an index.
            */

      delete options.buildUUID;

      try {
        await targetCollection.createIndex(key, {
          ...options,
          name,
        });

        console.log(`   ✅ Index copied: ${name}`);
      } catch (indexError) {
        console.warn(`   ⚠️ Could not copy index ${name}:`);

        console.warn(`      ${indexError.message}`);
      }
    }
  } catch (indexListError) {
    console.warn("⚠️ Could not read indexes:");

    console.warn(indexListError.message);
  }

  console.log(`✅ Finished: ${collectionName}`);
};

/*
============================================================
MAIN
============================================================
*/

const run = async () => {
  let cloudConnection = null;
  let localConnection = null;

  try {
    console.log("");
    console.log("============================================================");
    console.log("STOREPOS CLOUD → LOCAL DATABASE COPY");
    console.log("============================================================");
    console.log("");

    /*
        ====================================================
        VALIDATE ENVIRONMENT
        ====================================================
        */

    if (!CLOUD_URI) {
      throw new Error("MONGO_CLOUD_URI is missing from backend/.env");
    }

    if (!LOCAL_URI) {
      throw new Error("MONGO_URI is missing from backend/.env");
    }

    if (
      !CLOUD_URI.startsWith("mongodb+srv://") &&
      !CLOUD_URI.startsWith("mongodb://")
    ) {
      throw new Error(
        "MONGO_CLOUD_URI does not appear to be a valid MongoDB URI.",
      );
    }

    if (!LOCAL_URI.includes("127.0.0.1") && !LOCAL_URI.includes("localhost")) {
      throw new Error(
        "SAFETY CHECK FAILED: MONGO_URI does not point to localhost.",
      );
    }

    console.log("Cloud source:");

    console.log(`  ${maskMongoUri(CLOUD_URI)}`);

    console.log("");

    console.log("Local destination:");

    console.log(`  ${maskMongoUri(LOCAL_URI)}`);

    console.log("");

    /*
        ====================================================
        CONNECT TO CLOUD
        ====================================================
        */

    console.log("Connecting to MongoDB Atlas...");

    cloudConnection = await mongoose
      .createConnection(CLOUD_URI, {
        serverSelectionTimeoutMS: 30000,
      })
      .asPromise();

    console.log(`✅ Cloud connected: ${cloudConnection.host}`);

    /*
        ====================================================
        CONNECT TO LOCAL
        ====================================================
        */

    console.log("Connecting to local MongoDB...");

    localConnection = await mongoose
      .createConnection(LOCAL_URI, {
        serverSelectionTimeoutMS: 10000,
      })
      .asPromise();

    console.log(`✅ Local connected: ${localConnection.host}`);

    const sourceDb = cloudConnection.db;

    const targetDb = localConnection.db;

    console.log("");
    console.log(`Cloud database : ${sourceDb.databaseName}`);

    console.log(`Local database : ${targetDb.databaseName}`);

    console.log("");

    /*
        ====================================================
        READ CLOUD COLLECTIONS
        ====================================================
        */

    const cloudCollections = await sourceDb
      .listCollections(
        {},
        {
          nameOnly: true,
        },
      )
      .toArray();

    if (cloudCollections.length === 0) {
      throw new Error("The cloud database contains no collections.");
    }

    console.log(`Cloud collections found: ${cloudCollections.length}`);

    console.log("");

    for (const collection of cloudCollections) {
      console.log(`  • ${collection.name}`);
    }

    /*
        ====================================================
        WARNING
        ====================================================
        */

    console.log("");
    console.log("============================================================");
    console.log("⚠️ WARNING");
    console.log("============================================================");
    console.log("");
    console.log(`This will DELETE everything currently in local database:`);

    console.log(`  ${targetDb.databaseName}`);

    console.log("");

    console.log("The Atlas/cloud database will NOT be modified.");

    console.log("");

    const answer = await askQuestion(`Type ${CONFIRM_WORD} to continue: `);

    if (answer !== CONFIRM_WORD) {
      console.log("");
      console.log("❌ Copy cancelled. Nothing was changed.");

      return;
    }

    /*
        ====================================================
        DROP LOCAL DATABASE
        ====================================================
        */

    console.log("");
    console.log("Deleting existing local database...");

    await targetDb.dropDatabase();

    console.log("✅ Local database cleared.");

    /*
        ====================================================
        COPY COLLECTIONS
        ====================================================
        */

    let completedCollections = 0;

    for (const collection of cloudCollections) {
      await copyCollection({
        sourceDb,
        targetDb,
        collectionName: collection.name,
      });

      completedCollections++;
    }

    /*
        ====================================================
        VERIFICATION
        ====================================================
        */

    console.log("");
    console.log("============================================================");
    console.log("VERIFYING COPY");
    console.log("============================================================");

    let cloudTotal = 0;
    let localTotal = 0;

    for (const collection of cloudCollections) {
      const name = collection.name;

      const sourceCount = await sourceDb.collection(name).countDocuments();

      const targetCount = await targetDb.collection(name).countDocuments();

      cloudTotal += sourceCount;

      localTotal += targetCount;

      const matches = sourceCount === targetCount;

      console.log(
        `${matches ? "✅" : "❌"} ${name}: Cloud=${sourceCount}, Local=${targetCount}`,
      );
    }

    console.log("");
    console.log("============================================================");
    console.log("COPY COMPLETE");
    console.log("============================================================");
    console.log("");

    console.log(`Collections copied: ${completedCollections}`);

    console.log(`Cloud documents:    ${cloudTotal.toLocaleString()}`);

    console.log(`Local documents:    ${localTotal.toLocaleString()}`);

    if (cloudTotal === localTotal) {
      console.log("");
      console.log(
        "✅ StorePOS cloud database successfully copied to local MongoDB.",
      );
    } else {
      console.log("");
      console.warn("⚠️ Document totals do not match. Review the output above.");
    }

    console.log("");
  } catch (error) {
    console.error("");
    console.error(
      "============================================================",
    );
    console.error("COPY FAILED");
    console.error(
      "============================================================",
    );
    console.error("");

    console.error(error.message);

    console.error("");

    process.exitCode = 1;
  } finally {
    /*
        ====================================================
        CLOSE CONNECTIONS
        ====================================================
        */

    if (cloudConnection) {
      try {
        await cloudConnection.close();
      } catch {
        // Ignore close error
      }
    }

    if (localConnection) {
      try {
        await localConnection.close();
      } catch {
        // Ignore close error
      }
    }
  }
};

/*
============================================================
RUN
============================================================
*/

run();
