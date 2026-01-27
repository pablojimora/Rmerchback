import mongoose from "mongoose";

const dbConnection = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI no definido");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
    console.log("MongoDB conectado");
  }
};

export default dbConnection;
