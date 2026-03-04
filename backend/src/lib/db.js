import mongoose from 'mongoose'

export function isConnected() {
  return mongoose.connection.readyState === 1
}
