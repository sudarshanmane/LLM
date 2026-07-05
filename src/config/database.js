import mongoose from "mongoose";

export async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: Number(
        process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000,
      ),
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB error:", error.message);
    process.exit(1);
  }
}
