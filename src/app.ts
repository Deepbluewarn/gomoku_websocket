import express from 'express';
import { Server } from 'socket.io';
// import cors from 'cors';

const app = express();

// app.use(cors({
//     origin: ['http://localhost:3000', 'https://270zvh4l-3000.asse.devtunnels.ms'],
//     methods: ["GET", "POST"],
//     credentials: true,
// }));
// // app.use(router);

const server = app.listen(8005, () => { });

const io = new Server(server, {
    cookie: {
        name: 'userID',
        path: "/socket.io",
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

io.on('connection', (socket) => {
    
    console.log('a user connected');
    console.log('[cookie] : ', socket.request.headers.cookie);

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    
    socket.on('error', (error) => {
        console.error('[error]]', error);
    });

    socket.on('client', (data) => { // reply라는 이벤트로 송신오면 메세지가 data인수에 담김
        console.log('[reply]', data);
    });

    socket.emit('server', 'Hello Socket.IO'); // news라는 이벤트로 문자열을 포함하여 송신
});
