const db = require('../src/index');

// Connect to MongoDB
const mongodb = db.connect('mongodb', {
    uri: 'mongodb://localhost:27017/mydatabase',
    database: 'mydatabase'
});

// Initialize the connection
mongodb.initialize();

// Define a model
mongodb.defineModel('User', {
    name: { type: 'string', required: true },
    email: { type: 'string', required: true, unique: true },
    age: { type: 'integer' },
    profile: { type: 'json' },
    roles: { type: 'array' },
    department: { type: 'objectId'}
});

// Create a document

const user = mongodb.create('User', {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    profile: { location: 'New York' },
    roles: ['user', 'admin']
});

// Find documents
const olderUsers = mongodb.findMany('User', {
        age: { $gte: 30 }
    });
console.log(olderUsers)



// Update documents
mongodb.update('User',
    { email: 'john@example.com' },
    { 
        $set: { age: 31 },
        $push: { roles: 'moderator' }
    }
);
