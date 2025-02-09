require('dotenv').config({ path: './.env.local' });

if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in .env.local");
}

const { MongoClient } = require('mongodb');

// Use the MongoDB URI from .env.local
const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error("Missing MONGODB_URI in .env.local");
}

// Function to test the connection
async function testConnection() {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        // Connect to the MongoDB cluster
        await client.connect();

        console.log("✅ Successfully connected to MongoDB");

        // Access a sample database and collection
        const database = client.db("test");
        const collection = database.collection("testCollection");

        // Insert a test document
        const result = await collection.insertOne({ message: "Hello, MongoDB!" });
        console.log("✅ Document inserted with _id:", result.insertedId);

        // Fetch the inserted document
        const document = await collection.findOne({ _id: result.insertedId });
        console.log("✅ Fetched document:", document);

        // Delete a test document
        const delete_doc = await collection.deleteOne({ _id: result.insertedId });
        console.log("✅ Delete document:", delete_doc)
    } catch (error) {
        console.error("❌ Failed to connect to MongoDB:", error);
    } finally {
        // Close the connection
        await client.close();
        console.log("✅ Connection closed");
    }
}

// Run the connection test
testConnection();
