// src/adapters/MongoAdapter.js
const mongoose = require('mongoose');
const { DatabaseError } = require('../utils/errors');
const BaseAdapter = require('./BaseAdapter');

class MongoAdapter extends BaseAdapter {
    constructor(config) {
        super();
        this.config = config;
        this.connection = null;
        this.models = new Map();
        this.defaultSchema = {
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
        };
    }


    /**
     * Initialize MongoDB connection
     */
    async initialize() {
        try {
            // Set mongoose options
            mongoose.set('strictQuery', false);
            
            // Connect with proper options
            await mongoose.connect(this.config.uri, {
                dbName: this.config.database,
                connectTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                serverSelectionTimeoutMS: 5000
            });

            this.connection = mongoose.connection;

            // Handle connection events
            this.connection.on('error', (err) => {
                console.error('MongoDB connection error:', err);
            });

            this.connection.once('open', () => {
                console.log('MongoDB connected successfully');
            });

            return this.connection;
        } catch (error) {
            throw new DatabaseError(`MongoDB initialization failed: ${error.message}`);
        }
    }

    /**
     * Get or create model
     * @private
     */
    _getOrCreateModel(modelName, schema = {}) {
        try {
            // Check if model exists
            if (this.models.has(modelName)) {
                return this.models.get(modelName);
            }

            // If no model exists, create one with given schema or default schema
            const mongooseSchema = new mongoose.Schema(
                this._convertSchemaToMongoose({ ...this.defaultSchema, ...schema }),
                { 
                    timestamps: true,
                    strict: false // Allow dynamic fields
                }
            );

            const model = this.connection.model(modelName, mongooseSchema);
            this.models.set(modelName, model);
            console.log("Model Created!")
            return model;
        } catch (error) {
            throw new DatabaseError(`Model creation failed: ${error.message}`);
        }
    }

    /**
     * Define a model
     * @param {string} modelName - Name of the model
     * @param {Object} schema - Schema definition
     */
    async defineModel(modelName, schema) {
        try {
            // Convert schema to Mongoose schema
            const mongooseSchema = new mongoose.Schema(
                this._convertSchemaToMongoose(schema),
                { 
                    timestamps: true,
                    strict: true
                }
            );

            // Create the model
            const model = mongoose.model(modelName, mongooseSchema);
            this.models.set(modelName, model);
            console.log("Model Created!")
            return model;
        } catch (error) {
            throw new DatabaseError(`Failed to define model: ${error.message}`);
        }
    }

    /**
     * Create a new document
     */
    async create(modelName, data) {
        try {
            const model = this._getOrCreateModel(modelName);
            const result = await model.create(data);
            return result.toObject();
        } catch (error) {
            throw new DatabaseError(`Create failed: ${error.message}`);
        }
    }

    async findOne(modelName, query) {
        try {
            const model = this._getOrCreateModel(modelName);
            const result = await model.findOne(this._convertQuery(query)).exec();
            return result ? result.toObject() : null;
        } catch (error) {
            throw new DatabaseError(`Find one failed: ${error.message}`);
        }
    }

    // In MongoAdapter class, update the findMany method:

async findMany(modelName, query = {}) {
    try {

        // Get model using mongoose directly
        const model = mongoose.model(modelName);
        if (!model) {
            throw new Error(`Model ${modelName} not found`);
        }

        // Convert the query
        const mongoQuery = this._convertQuery(query);

        // Execute find with converted query
        var results = await model.find(mongoQuery)
        console.log(results)
        return results;
    } catch (error) {
        throw new DatabaseError(`Find many failed: ${error.message}`);
    }
}

// Update _convertQuery method to handle MongoDB operators better
_convertQuery(query) {
    const converted = {};

    for (const [key, value] of Object.entries(query)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const operators = {};
            for (const [op, val] of Object.entries(value)) {
                // Convert our operators to MongoDB operators
                switch (op) {
                    case '$eq':
                        operators['$eq'] = val;
                        break;
                    case '$ne':
                        operators['$ne'] = val;
                        break;
                    case '$gt':
                        operators['$gt'] = val;
                        break;
                    case '$gte':
                        operators['$gte'] = val;
                        break;
                    case '$lt':
                        operators['$lt'] = val;
                        break;
                    case '$lte':
                        operators['$lte'] = val;
                        break;
                    case '$in':
                        operators['$in'] = Array.isArray(val) ? val : [val];
                        break;
                    case '$nin':
                        operators['$nin'] = Array.isArray(val) ? val : [val];
                        break;
                    case '$regex':
                        operators['$regex'] = val;
                        break;
                    case '$exists':
                        operators['$exists'] = val;
                        break;
                    default:
                        operators['$eq'] = val;
                }
            }
            converted[key] = operators;
        } else {
            converted[key] = value;
        }
    }

    return converted;
}

    async update(modelName, query, data) {
        try {
            const model = this._getOrCreateModel(modelName);
            const result = await model.updateMany(
                this._convertQuery(query),
                data,
                { new: true }
            );
            return result;
        } catch (error) {
            throw new DatabaseError(`Update failed: ${error.message}`);
        }
    }

    async delete(modelName, query) {
        try {
            const model = this._getOrCreateModel(modelName);
            const result = await model.deleteMany(this._convertQuery(query));
            return result;
        } catch (error) {
            throw new DatabaseError(`Delete failed: ${error.message}`);
        }
    }
    /**
     * Close connection
     */
    async close() {
        try {
            await this.connection.close();
        } catch (error) {
            throw new DatabaseError(`Close failed: ${error.message}`);
        }
    }

    // Private helper methods
    _getModel(modelName) {
        const model = this.models.get(modelName);
        if (!model) {
            throw new Error(`Model ${modelName} not found`);
        }
        return model;
    }

    _convertSchemaToMongoose(schema) {
        const mongooseSchema = {};
        
        for (const [field, definition] of Object.entries(schema)) {
            mongooseSchema[field] = this._convertFieldDefinition(definition);
        }

        return mongooseSchema;
    }

    _getMongooseType(type) {
        const typeMap = {
            'string': String,
            'number': Number,
            'boolean': Boolean,
            'date': Date,
            'objectId': mongoose.Schema.Types.ObjectId,
            'array': Array,
            'object': mongoose.Schema.Types.Mixed, // Changed to Mixed type
            'mixed': mongoose.Schema.Types.Mixed,  // Added explicit Mixed type
            'buffer': Buffer,
            'json': mongoose.Schema.Types.Mixed    // Added JSON type as Mixed
        };

        return typeMap[type] || mongoose.Schema.Types.Mixed; // Default to Mixed if type unknown
    }

    _convertFieldDefinition(definition) {
        // Handle array type with items
        if (definition.type === 'array' && definition.items) {
            return {
                type: [this._convertFieldDefinition(definition.items)],
                required: definition.required || false,
                default: definition.default
            };
        }
    
        // Handle nested object type with properties
        if ((definition.type === 'object' || definition.type === 'json') && definition.properties) {
            const nestedSchema = {};
            for (const [key, prop] of Object.entries(definition.properties)) {
                nestedSchema[key] = this._convertFieldDefinition(prop);
            }
            return nestedSchema;
        }
    
        // Handle basic object/json type without properties
        if (definition.type === 'object' || definition.type === 'json') {
            return {
                type: mongoose.Schema.Types.Mixed,
                required: definition.required || false,
                default: definition.default
            };
        }
    
        // Only include ref if it's specified in the definition
        const schemaType = {
            type: this._getMongooseType(definition.type),
            required: definition.required || false,
            unique: definition.unique || false
        };
    
        if (definition.default !== undefined) {
            schemaType.default = definition.default;
        }
    
        // Only add ref if it's specified and type is objectId
        if (definition.ref && definition.type === 'objectId') {
            schemaType.ref = definition.ref;
        }
    
        return schemaType;
    }
    
    
    _convertQuery(query) {
        const converted = {};

        for (const [key, value] of Object.entries(query)) {
            if (typeof value === 'object' && value !== null) {
                converted[key] = this._convertOperators(value);
            } else {
                converted[key] = value;
            }
        }

        return converted;
    }

    _convertOperators(conditions) {
        const converted = {};

        for (const [operator, value] of Object.entries(conditions)) {
            switch (operator) {
                case '$eq':
                case '$gt':
                case '$gte':
                case '$lt':
                case '$lte':
                case '$ne':
                case '$in':
                case '$nin':
                    converted[operator] = value;
                    break;
                default:
                    converted['$eq'] = value;
            }
        }

        return converted;
    }
}

module.exports = MongoAdapter;