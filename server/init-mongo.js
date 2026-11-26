// MongoDB initialization script
// This runs on first container startup to set up the database

const dbName = 'universal-video-downloader';
const adminDb = db.getSiblingDB('admin');

// Switch to application database
db = db.getSiblingDB(dbName);

// Create collections with validation
db.createCollection('jobs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['jobId', 'status', 'createdAt', 'updatedAt'],
      properties: {
        jobId: { bsonType: 'string' },
        status: { enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] },
        progress: { bsonType: 'int', minimum: 0, maximum: 100 },
        message: { bsonType: 'string' },
        error: { bsonType: 'string' },
        downloadUrl: { bsonType: 'string' },
        filename: { bsonType: 'string' },
        filesize: { bsonType: 'long' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

// Create indexes
db.jobs.createIndex({ jobId: 1 }, { unique: true });
db.jobs.createIndex({ status: 1 });
db.jobs.createIndex({ createdAt: -1 });
db.jobs.createIndex({ updatedAt: -1 });

// TTL index for automatic cleanup of completed/failed jobs after 24 hours
db.jobs.createIndex(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 86400, // 24 hours
    partialFilterExpression: {
      status: { $in: ['completed', 'failed', 'cancelled'] },
    },
  }
);

// Create downloads collection for tracking downloaded files
db.createCollection('downloads', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['jobId', 'url', 'formatId', 'filename', 'filesize', 'createdAt'],
      properties: {
        jobId: { bsonType: 'string' },
        url: { bsonType: 'string' },
        formatId: { bsonType: 'string' },
        filename: { bsonType: 'string' },
        filesize: { bsonType: 'long' },
        format: { bsonType: 'object' },
        createdAt: { bsonType: 'date' },
        downloadedAt: { bsonType: 'date' },
      },
    },
  },
});

db.downloads.createIndex({ jobId: 1 }, { unique: true });
db.downloads.createIndex({ createdAt: -1 });

print('Database initialized successfully');