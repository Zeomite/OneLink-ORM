const db = require('../src/index');

// Connect to PostgreSQL
const postgres = db.connect('postgres', {
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    user: 'user',
    password: 'password'
});

// Define a model
postgres.defineModel('User', {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true },
    email: { type: 'string', required: true, unique: true },
    age: { type: 'integer' }
});

// Create a record
postgres.create('User', {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
});

// Find records
const user = postgres.findOne('User', { 
    email: { $eq: 'john@example.com' } 
});
console.log(user)


// Update records
postgres.update('User', 
    { email: 'john@example.com' },
    { age: 31 }
);

// Delete records

postgres.delete('User', { 
    email: 'john@example.com' 
});
