import { Request } from 'express';
import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import { serialize, parse } from "cookie";
import { IUserSession } from './interfaces/index.js';
import { REDIS_SESSION_SETTING } from './constants.js';

const redis = new Redis(REDIS_SESSION_SETTING);

export default function InitSocket(io: Server) {
    io.engine.on("initial_headers", (headers, request) => {
        const cookies = parse(request.headers.cookie || '');

        if (cookies.userID) {
            headers["set-cookie"] = [serialize("userID", cookies.userID, { sameSite: "none", secure: true, httpOnly: true, path: "/" })];
        }
    });

    io.on('connection', (socket) => {
        const request = socket.request as Request;
        const cookies = parse(request.headers.cookie || '');

        console.log('a user connected');

        socket.on('disconnect', (reason, description) => {
            console.log('user disconnected', reason, description);
        });

        socket.on('error', (error) => {
            console.error('[error]]', error);
        });

        socket.on('register', async (data) => {
            const userID = cookies.userID;
            let res: IUserSession;

            console.log('[register] userID: ', userID);

            const redis_res = await redis.get(userID);

            if (redis_res === null) {
                res = { nickname: '', inviteCode: '' };
            } else {
                res = JSON.parse(redis_res);
            }

            socket.emit('register', { value: res });
        });

        socket.on('join', (data) => {
            console.log('[방 입장] data: ', data);
            socket.join(data);
        });

        socket.on('place', data => {
            socket.emit('placed', data);
        });
    });
}

