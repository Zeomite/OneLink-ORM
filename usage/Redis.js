const db = require('./src/index');

// Connect to Redis
const redis = db.connect('redis', {
    host: 'localhost',
    port: 6379,
    password: 'optional',
    db: 0,
    enablePubSub: true
});

// Initialize the connection
await redis.initialize();

// Basic Key-Value Operations
await redis.set('user:1', { name: 'John', age: 30 }, { ttl: 3600 });
const user = await redis.get('user:1');

// Hash Operations
await redis.hset('users', 'user1', { name: 'John', age: 30 });
const userData = await redis.hget('users', 'user1');
const allUsers = await redis.hgetall('users');

// List Operations
await redis.lpush('queue', 'task1', 'task2');
const tasks = await redis.lrange('queue', 0, -1);

// Set Operations
await redis.sadd('roles', 'admin', 'user');
const roles = await redis.smembers('roles');

// Sorted Set Operations
await redis.zadd('scores', 100, 'player1');
const topScores = await redis.zrange('scores', 0, -1, true);

// Pub/Sub
await redis.subscribe('notifications', (message) => {
    console.log('Received:', message);
});
await redis.publish('notifications', { type: 'alert', text: 'Hello!' });

// Caching
const data = await redis.cache('expensive-query', async () => {
    // Expensive operation here
    return { result: 'cached data' };
}, 3600);

// Transactions
await redis.transaction(async (multi) => {
    multi.set('key1', 'value1');
    multi.incr('counter');
});