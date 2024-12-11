const db = require('./src/index');

// Connect to OrientDB
const orientdb = db.connect('orientdb', {
    host: 'localhost',
    port: 2424,
    username: 'root',
    password: 'root',
    database: 'mydb',
    dbUsername: 'admin',
    dbPassword: 'admin'
});

// Initialize the connection
await orientdb.initialize();

// Create vertex class for users
await orientdb.createClass('User', {
    name: { type: 'string', mandatory: true },
    email: { type: 'string', notNull: true },
    age: { type: 'integer', min: 0 },
    profile: { 
        type: 'embedded',
        schema: {
            bio: { type: 'string' },
            interests: { type: 'list', itemType: 'string' }
        }
    },
    createdAt: { type: 'date', default: new Date() }
}, {
    extends: 'V',
    indexes: [
        { properties: 'email', type: 'UNIQUE' },
        { properties: ['name', 'email'], name: 'User_search' }
    ]
});

// Create edge class for friendships
await orientdb.createClass('Friendship', {
    since: { type: 'date' },
    strength: { type: 'integer', min: 1, max: 10 }
}, {
    extends: 'E'
});

// Create vertices (users)
const user1 = await orientdb.createVertex('User', {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    profile: {
        bio: 'Software developer',
        interests: ['coding', 'music']
    }
});

const user2 = await orientdb.createVertex('User', {
    name: 'Jane Smith',
    email: 'jane@example.com',
    age: 28,
    profile: {
        bio: 'Data scientist',
        interests: ['AI', 'statistics']
    }
});

// Create edge (friendship)
const friendship = await orientdb.createEdge('Friendship',
    user1._id,
    user2._id,
    {
        since: new Date(),
        strength: 8
    }
);

// Find vertices with complex queries
const users = await orientdb.findVertices('User', {
    age: { $gte: 25 },
    'profile.interests': { $contains: 'coding' }
}, {
    select: 'name, email, profile',
    orderBy: { name: 1 },
    limit: 10
});

// Traverse graph
const connections = await orientdb.traverse(user1._id, {
    direction: 'OUT',
    edgeClass: 'Friendship',
    maxDepth: 2,
    strategy: 'BREADTH_FIRST'
});

// Find shortest path
const path = await orientdb.findShortestPath(user1._id, user2._id, {
    direction: 'BOTH',
    edgeClass: 'Friendship'
});

// Execute custom query
const results = await orientdb.query(`
    SELECT expand(both('Friendship').profile.interests) as interests
    FROM User
    WHERE name = :name
`, {
    name: 'John Doe'
});

// Transaction
await orientdb.transaction(async (tx) => {
    const user = await tx.create('VERTEX', 'User')
        .set({
            name: 'Bob Wilson',
            email: 'bob@example.com'
        })
        .one();

    await tx.create('EDGE', 'Friendship')
        .from(user1._id)
        .to(user['@rid'])
        .set({ strength: 5 })
        .one();

    return user;
});