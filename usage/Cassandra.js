const db = require('./src/index');

// Connect to Cassandra
const cassandra = db.connect('cassandra', {
    contactPoints: ['localhost'],
    localDataCenter: 'datacenter1',
    keyspace: 'mykeyspace',
    username: 'cassandra',
    password: 'cassandra'
});

// Initialize the connection
await cassandra.initialize();

// Create keyspace
await cassandra.createKeyspace('mykeyspace', {
    replication: {
        class: 'SimpleStrategy',
        replication_factor: 3
    }
});

// Define a table model
await cassandra.defineModel('users', {
    id: { type: 'uuid' },
    username: { type: 'string' },
    email: { type: 'string' },
    created_at: { type: 'date' },
    profile: { type: 'json' },
    roles: { type: 'set', itemType: 'string' },
    settings: { type: 'map', keyType: 'string', valueType: 'string' }
}, {
    partitionKey: 'id',
    clusteringKey: ['created_at'],
    secondaryIndexes: ['email'],
    withClusteringOrderBy: { created_at: 'desc' }
});

// Insert data
await cassandra.insert('users', {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'john_doe',
    email: 'john@example.com',
    created_at: new Date(),
    profile: { firstName: 'John', lastName: 'Doe' },
    roles: new Set(['user', 'admin']),
    settings: new Map([['theme', 'dark'], ['language', 'en']])
});

// Find users
const users = await cassandra.find('users', {
    email: 'john@example.com'
}, {
    select: ['id', 'username', 'email'],
    limit: 10
});

// Update user
await cassandra.update('users', 
    { id: '550e8400-e29b-41d4-a716-446655440000' },
    { 
        settings: { $add: new Map([['notifications', 'enabled']]) },
        roles: { $add: new Set(['moderator']) }
    }
);

// Delete user
await cassandra.delete('users', {
    id: '550e8400-e29b-41d4-a716-446655440000'
});

// Batch operations
await cassandra.batch([
    {
        type: 'insert',
        table: 'users',
        data: { /* ... */ }
    },
    {
        type: 'update',
        table: 'users',
        query: { /* ... */ },
        update: { /* ... */ }
    },
    {
        type: 'delete',
        table: 'users',
        query: { /* ... */ }
    }
]);

// Stream large result sets
const stream = cassandra.stream('users', {
    created_at: { $gte: new Date('2024-01-01') }
}, {
    fetchSize: 1000
});

stream.on('data', user => {
    console.log(user);
});