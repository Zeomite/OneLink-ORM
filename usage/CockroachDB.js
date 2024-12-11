const db = require('./src/index');

// Connect to CockroachDB
const cockroachdb = db.connect('cockroachdb', {
    host: 'localhost',
    port: 26257,
    database: 'mydb',
    user: 'root',
    password: '',
    ssl: false
});

// Initialize the connection
await cockroachdb.initialize();

// Create table with schema
await cockroachdb.createTable('users', {
    id: { type: 'uuid', primaryKey: true },
    username: { type: 'string', length: 50, unique: true, notNull: true },
    email: { type: 'string', unique: true, notNull: true },
    age: { type: 'integer', check: 'age >= 18' },
    metadata: { type: 'json' },
    created_at: { type: 'date', default: 'now' }
}, {
    indexes: [
        { columns: 'email', unique: true },
        { columns: ['username', 'email'], name: 'idx_users_search' }
    ],
    partitionBy: 'RANGE (created_at)'
});

// Insert records
const users = await cockroachdb.insert('users', {
    username: 'john_doe',
    email: 'john@example.com',
    age: 30,
    metadata: { preferences: { theme: 'dark' } }
});

// Find records with complex queries
const results = await cockroachdb.find('users', {
    age: { $gte: 25 },
    email: { $like: '%@example.com' },
    'metadata->preferences->theme': 'dark'
}, {
    select: 'id, username, email',
    orderBy: { created_at: -1 },
    limit: 10
});

// Update records
await cockroachdb.update('users',
    { username: 'john_doe' },
    {
        age: { $inc: 1 },
        metadata: { $set: { preferences: { theme: 'light' } } }
    }
);

// Transaction with high priority
await cockroachdb.transaction(async (client) => {
    const user = await client.query(
        'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
        ['jane_doe', 'jane@example.com']
    );
    await client.query(
        'INSERT INTO user_profiles (user_id) VALUES ($1)',
        [user.rows[0].id]
    );
    return user.rows[0];
}, { priority: 'high' });

// Raw query with JSON operations
const result = await cockroachdb.query(`
    SELECT 
        id,
        username,
        metadata->>'preferences' as preferences
    FROM users
    WHERE metadata @> '{"preferences": {"theme": "dark"}}'
`);