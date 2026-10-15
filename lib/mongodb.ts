import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

interface GlobalMongoCache {
  clientPromise?: Promise<MongoClient>;
  mongooseConn?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

const globalWithMongo = globalThis as typeof globalThis & {
  _mongoCache?: GlobalMongoCache;
};

if (!globalWithMongo._mongoCache) {
  globalWithMongo._mongoCache = {
    mongooseConn: { conn: null, promise: null },
  };
}

const cache = globalWithMongo._mongoCache;

export function getMongoClientPromise(): Promise<MongoClient> {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }
  if (!cache.clientPromise) {
    const client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
    });
    cache.clientPromise = client.connect();
  }
  return cache.clientPromise;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }
  if (cache.mongooseConn?.conn) {
    return cache.mongooseConn.conn;
  }

  if (!cache.mongooseConn?.promise) {
    cache.mongooseConn!.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
  }

  cache.mongooseConn!.conn = await cache.mongooseConn!.promise;
  return cache.mongooseConn!.conn;
}
