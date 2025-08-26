import mongoose from "mongoose";

 export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI, {});
    console.log(`MongoDB connected: `);


  } catch (error) {
    console.log(`MongoDB not connected: `);

    console.log(error);
  }
};

