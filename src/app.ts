import express, { Request } from 'express';
import { Server } from 'socket.io';
import { serialize, parse } from "cookie";
import cors from 'cors';
import router from './routes/index';
import cookieParser from 'cookie-parser';
import { EXPRESS_CORS_SETTING } from './constants';

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

io.engine.on("initial_headers", (headers, request) => {
    const cookies = parse(request.headers.cookie || '');

    if(cookies.userID){
        headers["set-cookie"] = [serialize("userID", cookies.userID, { sameSite: "none", secure: true, httpOnly: true, path: "/"})];
    }
});

io.on('connection', (socket) => {
    const request = socket.request as Request;
    const cookies = parse(request.headers.cookie || '');

    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('error', (error) => {
        console.error('[error]]', error);
    });

    socket.on('join', (data) => {
        console.log('[방 입장] data: ', data);
        socket.join(data);
    });

    socket.on('place', data => {
        socket.emit('placed', data);
    });
});
