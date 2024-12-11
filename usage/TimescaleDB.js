const db = require('./src/index');

// Connect to TimescaleDB
const timescaledb = db.connect('timescale', {
    host: 'localhost',
    port: 5432,
    database: 'timeseriesdb',
    user: 'user',
    password: 'password'
});

// Initialize the connection
await timescaledb.initialize();

// Create a hypertable for sensor data
await timescaledb.createHypertable('sensor_data', {
    time: { type: 'timestamp' },
    sensor_id: { type: 'string' },
    temperature: { type: 'double' },
    humidity: { type: 'double' },
    pressure: { type: 'double' },
    metadata: { type: 'json' }
}, {
    timeColumn: 'time',
    chunkTimeInterval: '1 day',
    compressionEnabled: true,
    retentionPolicy: '30 days'
});

// Insert time-series data
await timescaledb.insertTimeSeriesData('sensor_data', [
    {
        time: new Date(),
        sensor_id: 'sensor1',
        temperature: 25.5,
        humidity: 60.2,
        pressure: 1013.2,
        metadata: { location: 'room1' }
    },
    // ... more data points
]);

// Query time-series data with aggregations
const data = await timescaledb.queryTimeSeriesData('sensor_data', {
    startTime: '2024-01-01',
    endTime: '2024-01-31',
    interval: '1 hour',
    aggregates: {
        avg_temp: { function: 'avg', column: 'temperature' },
        max_temp: { function: 'max', column: 'temperature' },
        min_temp: { function: 'min', column: 'temperature' }
    },
    groupBy: ['sensor_id'],
    where: {
        sensor_id: 'sensor1'
    },
    orderBy: 'bucket DESC',
    limit: 100
});

// Create a continuous aggregate view
await timescaledb.createContinuousAggregate('hourly_sensor_stats', 'sensor_data', {
    timeColumn: 'time',
    interval: '1 hour',
    aggregates: {
        avg_temp: { function: 'avg', column: 'temperature' },
        avg_humidity: { function: 'avg', column: 'humidity' }
    },
    groupBy: ['sensor_id']
});

// Add compression policy
await timescaledb.addCompressionPolicy('sensor_data', {
    compress_after: '7 days'
});

// Get statistics
const stats = await timescaledb.getTimeSeriesStats('sensor_data');