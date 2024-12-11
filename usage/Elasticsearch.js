const db = require('./src/index');

// Connect to Elasticsearch
const elasticsearch = db.connect('elasticsearch', {
    node: 'http://localhost:9200',
    username: 'elastic',
    password: 'password'
});

// Initialize the connection
await elasticsearch.initialize();

// Create an index with mappings
await elasticsearch.createIndex('products', {
    name: { type: 'text', analyzer: 'standard' },
    description: { type: 'text', analyzer: 'standard' },
    price: { type: 'double' },
    category: { type: 'keyword' },
    tags: { type: 'keyword' },
    created_at: { type: 'date' }
});

// Index a document
await elasticsearch.index('products', {
    name: 'Smartphone XYZ',
    description: 'Latest smartphone with amazing features',
    price: 999.99,
    category: 'Electronics',
    tags: ['smartphone', 'electronics', 'mobile'],
    created_at: new Date()
});

// Bulk index documents
await elasticsearch.bulkIndex('products', [
    {
        id: '1',
        name: 'Laptop ABC',
        price: 1299.99,
        category: 'Electronics'
    },
    {
        id: '2',
        name: 'Tablet DEF',
        price: 599.99,
        category: 'Electronics'
    }
]);

// Search documents
const results = await elasticsearch.search('products', {
    query: {
        multi_match: {
            query: 'smartphone features',
            fields: ['name', 'description']
        }
    },
    filter: {
        price: { $gte: 500 },
        category: 'Electronics'
    },
    sort: {
        price: 'desc'
    },
    from: 0,
    size: 10,
    aggs: {
        avg_price: {
            type: 'avg',
            field: 'price'
        },
        categories: {
            type: 'terms',
            field: 'category'
        }
    },
    highlight: {
        fields: ['name', 'description'],
        pre_tags: ['<em>'],
        post_tags: ['</em>']
    }
});

// Get document by ID
const product = await elasticsearch.get('products', '1');

// Update document
await elasticsearch.update('products', '1', {
    price: 1199.99
});

// Delete document
await elasticsearch.delete('products', '1');

// Delete by query
await elasticsearch.deleteByQuery('products', {
    match: {
        category: 'Electronics'
    }
});