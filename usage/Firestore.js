const db = require('../src/index');

// Your service account credentials
const serviceAccount = require("../xen-bloom-firebase-adminsdk-7k518-13aa170df7.json");

(async () => {
    let firestore;
    try {
        // Connect to Firestore
        firestore = await db.connect('firestore', {
            serviceAccount: serviceAccount
        });

        await firestore.initialize();
/*
        // Create a document
        const user = await firestore.create('users', {
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            profile: {
                location: 'New York'
            }
        });

        console.log('Created user:', user);
*/
        // Find users
        const users = await firestore.findMany('users', {
            status: { $eq: true }
        });

        console.log('Found users:', users);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (firestore) {
            await firestore.close();
        }
        process.exit(0);
    }
})();
