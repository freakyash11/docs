import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        // console.log('NODE ENV:', process.env.NODE_ENV);
        // console.log('MONGO_URI (raw):', process.env.MONGO_URI);
        // console.log('typeof MONGO_URI:', typeof process.env.MONGO_URI);

        mongoose.connection.on('connected', () => console.log('MongoDB connected successfully'));
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: 'docs'
        });
    } catch (error) {
        console.log(error.message);
        process.exit(1); 
    }
}

export default connectDB;