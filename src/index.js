import 'dotenv/config'; 
import connectDB from './db/index.js'; 
import app from './app.js';

const PORT = process.env.PORT || 8000;
connectDB()
.then(()=>{
    app.on("error",error => {
        console.log(`Error is ${error}`);
        throw error;
    })
    app.listen(PORT,() => {
        console.log(`Server is connected to the port : ${PORT}`)
    })
})
.catch((err) => {
    console.log(`MongoDB connection fail : ${err}`);
})