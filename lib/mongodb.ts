import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

let cached = (global as any).mongoose ?? { conn: null, promise: null }
;(global as any).mongoose = cached

export async function connectDB() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    }).then(m => m).catch(err => {
      cached.promise = null
      throw err
    })
  }
  cached.conn = await cached.promise
  return cached.conn
}
