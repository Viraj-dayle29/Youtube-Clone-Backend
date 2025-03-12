import express, { urlencoded } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// preperation of backend
const app = express();

// solving cors error and configire it
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

// Accepting json data
app.use(express.json({limit: "16kb"}));

// Working with urls
app.use(urlencoded({extended: true, limit: "16kb"}));

// Performing crud operation in the browser cookie by it 
app.use(cookieParser());

// Storing and allocate static files folder
app.use(express.static("public"));

import router from './routes/users.routes.js';


app.use("/api/v1/user", router);


export default app;