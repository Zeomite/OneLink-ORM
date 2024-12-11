const admin = require('firebase-admin');
const { DatabaseError } = require('../utils/errors');
const BaseAdapter = require('./BaseAdapter');

class FirestoreAdapter extends BaseAdapter {
    constructor(config) {
        super();
        this.config = config;
        this.db = null;
        this.app = null;
    }

    async initialize() {
        try {
            // Initialize Firebase Admin if not already initialized
            if (!this.app) {
                this.app = await admin.initializeApp({
                    credential: admin.credential.cert(this.config.serviceAccount)
                });
            }

            this.db = await admin.firestore();
            console.log("Connections Succesful")
            return this.db;
        } catch (error) {
            throw new DatabaseError(`Firestore initialization failed: ${error.message}`);
        }
    }

    async create(collection, data) {
        try {
            const docRef = this.db.collection(collection).doc();
            const timestamp = admin.firestore.FieldValue.serverTimestamp();
            
            const docData = {
                ...data,
                id: docRef.id,
                createdAt: timestamp,
                updatedAt: timestamp
            };

            await docRef.set(docData);
            
            // Get the created document
            const doc = await docRef.get();
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            throw new DatabaseError(`Create failed: ${error.message}`);
        }
    }

    async findOne(collection, query) {
        try {
            let docRef;

            // If query has an id, use it directly
            if (query.id) {
                docRef = this.db.collection(collection).doc(query.id);
                const doc = await docRef.get();
                if (!doc.exists) return null;
                return { id: doc.id, ...doc.data() };
            }

            // Otherwise, build query
            const queryRef = this._buildQuery(collection, query);
            const snapshot = await queryRef.limit(1).get();
            
            if (snapshot.empty) return null;
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            throw new DatabaseError(`Find one failed: ${error.message}`);
        }
    }

    async findMany(collection, query = {}) {
        try {
            const queryRef = this._buildQuery(collection, query);
            const snapshot = await queryRef.get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            throw new DatabaseError(`Find many failed: ${error.message}`);
        }
    }

    async update(collection, query, data) {
        try {
            if (query.id) {
                const docRef = this.db.collection(collection).doc(query.id);
                const updateData = {
                    ...data,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                await docRef.update(updateData);
                
                const doc = await docRef.get();
                return { id: doc.id, ...doc.data() };
            }

            // Batch update for query
            const queryRef = this._buildQuery(collection, query);
            const snapshot = await queryRef.get();
            
            const batch = this.db.batch();
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    ...data,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            return { updated: snapshot.size };
        } catch (error) {
            throw new DatabaseError(`Update failed: ${error.message}`);
        }
    }

    async delete(collection, query) {
        try {
            if (query.id) {
                await this.db.collection(collection).doc(query.id).delete();
                return { deleted: 1 };
            }

            const queryRef = this._buildQuery(collection, query);
            const snapshot = await queryRef.get();
            
            const batch = this.db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            return { deleted: snapshot.size };
        } catch (error) {
            throw new DatabaseError(`Delete failed: ${error.message}`);
        }
    }

    async close() {
        try {
            await this.app.delete();
            this.db = null;
            this.app = null;
        } catch (error) {
            throw new DatabaseError(`Close failed: ${error.message}`);
        }
    }

    _buildQuery(collection, query) {
        let ref = this.db.collection(collection);

        Object.entries(query).forEach(([field, value]) => {
            if (field === 'id') return; 

            if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([operator, operand]) => {
                    switch (operator) {
                        case '$eq':
                            ref = ref.where(field, '==', operand);
                            break;
                        case '$gt':
                            ref = ref.where(field, '>', operand);
                            break;
                        case '$gte':
                            ref = ref.where(field, '>=', operand);
                            break;
                        case '$lt':
                            ref = ref.where(field, '<', operand);
                            break;
                        case '$lte':
                            ref = ref.where(field, '<=', operand);
                            break;
                        case '$in':
                            ref = ref.where(field, 'in', operand);
                            break;
                        case '$contains':
                            ref = ref.where(field, 'array-contains', operand);
                            break;
                    }
                });
            } else {
                ref = ref.where(field, '==', value);
            }
        });

        return ref;
    }
}

module.exports = FirestoreAdapter;
