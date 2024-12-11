const db = require('./src/index');

// Connect to ArangoDB
const arangodb = db.connect('arangodb', {
    url: 'http://localhost:8529',
    database: 'mydb',
    username: 'root',
    password: 'password'
});

// Initialize the connection
await arangodb.initialize();

// Create collections
await arangodb.createCollection('users', {
    schema: {
        rule: {
            type: 'object',
            required: ['username', 'email'],
            properties: {
                username: { type: 'string' },
                email: { type: 'string' },
                age: { type: 'number' }
            }
        }
    }
});

await arangodb.createCollection('friendships', {
    type: 'edge'
});

// Create graph
await arangodb.createGraph('social', [
    {
        collection: 'friendships',
        from: ['users'],
        to: ['users']
    }
]);

// Insert documents
const user1 = await arangodb.insert('users', {
    username: 'john',
    email: 'john@example.com',
    age: 30
});


const user2 = await arangodb.insert('users', {
    username: 'jane',
    email: 'jane@example.com',
    age: 28
});

// Create edge (friendship) between users
await arangodb.insertEdge('friendships', 
    user1._id, 
    user2._id,
    { since: new Date(), type: 'friend' }
);

// Find documents with complex queries
const users = await arangodb.find('users', {
    age: { $gte: 25 },
    username: { $regex: '^j' }
}, {
    sort: { age: -1 },
    limit: 10,
    select: ['username', 'email']
});

// Update documents
await arangodb.update('users',
    { username: 'john' },
    {
        age: { $inc: 1 },
        lastLogin: { $set: new Date() },
        interests: { $push: 'coding' }
    }
);

// Graph traversal
const connections = await arangodb.traverse(user1._id, {
    direction: 'outbound',
    minDepth: 1,
    maxDepth: 2,
    edgeCollection: 'friendships'
});

// Complex AQL query
const result = await arangodb.query(`
    FOR u IN users
    FILTER u.age >= @minAge
    LET friends = (
        FOR v, e IN 1..1 OUTBOUND u friendships
        RETURN v
    )
    RETURN {
        user: u,
        friendCount: LENGTH(friends),
        friends: friends
    }
`, {
    minAge: 25
});

// Transaction
await arangodb.transaction(
    async (trx) => {
        const user = await trx.insert('users', {
            username: 'bob',
            email: 'bob@example.com'
        });
        await trx.insertEdge('friendships', user1._id, user._id);
        return true;
    },
    {
        collections: {
            write: ['users', 'friendships']
        }
    }
);