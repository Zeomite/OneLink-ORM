const db = require('./src/index');

// Connect to Neo4j
const neo4j = db.connect('neo4j', {
    uri: 'neo4j://localhost:7687',
    username: 'neo4j',
    password: 'password'
});

// Initialize the connection
await neo4j.initialize();

// Define node models
await neo4j.defineModel('Person', {
    id: { type: 'string', unique: true },
    name: { type: 'string', required: true },
    age: { type: 'number' },
    active: { type: 'boolean', default: true }
});

await neo4j.defineModel('Movie', {
    id: { type: 'string', unique: true },
    title: { type: 'string', required: true },
    year: { type: 'number' }
});

// Create nodes
const person = await neo4j.createNode('Person', {
    id: '1',
    name: 'John Doe',
    age: 30
});

const movie = await neo4j.createNode('Movie', {
    id: '1',
    title: 'The Matrix',
    year: 1999
});

// Create relationship
await neo4j.createRelationship(
    'Person', '1',
    'Movie', '1',
    'ACTED_IN',
    { role: 'Neo' }
);

// Find nodes
const actors = await neo4j.findNodes('Person', {
    age: { $gte: 25 },
    orderBy: 'name',
    limit: 10
});

// Find relationships
const roles = await neo4j.findRelationships('ACTED_IN', {
    role: 'Neo'
});

// Complex graph query
const result = await neo4j.query(`
    MATCH (p:Person)-[r:ACTED_IN]->(m:Movie)
    WHERE m.year >= $year
    RETURN p.name as actor, m.title as movie, r.role as role
`, {
    year: 1990
});

// Update node
await neo4j.updateNode('Person', '1', {
    age: 31
});

// Delete node
await neo4j.deleteNode('Person', '1');

// Transaction example
await neo4j.transaction(async (tx) => {
    await tx.run(`
        CREATE (p:Person {id: $id, name: $name})
        CREATE (m:Movie {id: $movieId, title: $title})
        CREATE (p)-[:DIRECTED]->(m)
    `, {
        id: '2',
        name: 'Christopher Nolan',
        movieId: '2',
        title: 'Inception'
    });
});