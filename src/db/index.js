import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

// Connecting db by mongooes
const connectDB = async() => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`,{});
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log(`MongoDB connection failed : ${error}`);
        process.exit(1);
    }
}
export default connectDB;