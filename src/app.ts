import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import router from './routes/index.js';
import cookieParser from 'cookie-parser';
import { EXPRESS_CORS_SETTING } from './constants.js';
import InitSocket from './socket.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(EXPRESS_CORS_SETTING));

app.use(router);

const server = app.listen(8005, () => { });

const io = new Server(server, {
    cookie: {
        name: 'userID',
        path: "/",
        httpOnly: true,
        sameSite: "none",
        secure: true
    },
    cors: {
        origin: ['http://localhost:3000', 'https://270zvh4l-3000.asse.devtunnels.ms'],
        credentials: true,
        allowedHeaders: ['ngrok-skip-browser-warning']
    }
});

InitSocket(io);
