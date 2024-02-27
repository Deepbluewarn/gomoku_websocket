import { Request } from 'express';
import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import { serialize, parse } from "cookie";
import { IUserSession, ROOM_NOT_EXIST, USER_NOT_FOUND } from './interfaces/socket.io.js';
import { REDIS_SETTING } from './constants.js';
import { ClientToServerEvents, JOIN, JOINED, PLACE, PLACED, REQUEST_USER_INFO, ROOM_INFO, ServerToClientEvents } from './interfaces/socket.io.js';
import { roomExist } from './services/redis.js';

const redis = new Redis(REDIS_SETTING);


async function getUserSession(userID: string) {
    let res: IUserSession;
    const redis_res = await redis.hget('session', userID);

    if (redis_res === null) {
        res = { nickname: '' };
    } else {
        res = JSON.parse(redis_res);
    }

    return res;
}

export default function InitSocket(io: Server<ClientToServerEvents, ServerToClientEvents>) {
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

        socket.on(REQUEST_USER_INFO, async () => {
            const userID = cookies.userID;
            let res: IUserSession = await getUserSession(userID);

            socket.emit(REQUEST_USER_INFO, res);
        });

        socket.on(JOIN, async (data) => {
            const userID = cookies.userID;
            const res = await getUserSession(userID);

            if(res.nickname === '') {
                console.log('user not found userID" ', userID)
                socket.emit(USER_NOT_FOUND);

                return;
            }

            // POST /create-room 요청에서 생성된 방이 아니면 방이 존재하지 않는다고 알린다.
            if(await roomExist(data)) socket.emit(ROOM_NOT_EXIST);

            console.log('socket.join', data);
            await socket.join(data);
        });

        socket.on(PLACE, data => {
            io.to(data.room_id).emit(PLACED, data);
        });
    });

    io.of("/").adapter.on("create-room", (room) => {
        console.log(`room ${room} was created`);
        
    });

    io.of("/").adapter.on("join-room", (room, id) => {
        console.log(`socket ${id} has joined room ${room}`);

        const user_cnt = io.sockets.adapter.rooms.get(room)?.size || 0;

        io.sockets.emit(JOINED, { room_id: room, user_count: user_cnt});
        io.sockets.emit(ROOM_INFO, { room_id: room, user_count: user_cnt });

        // redis 에서 room 으로 생성된 방의 정보를 업데이트한다.
        
    });

    io.of("/").adapter.on("delete-room", (room) => {
        console.log(`room ${room} was deleted`);

    });

    io.of("/").adapter.on("leave-room", (room, id) => {
        console.log(`${id} leave from ${room} room`);

        const user_cnt = io.sockets.adapter.rooms.get(room)?.size || 0;

        io.sockets.emit(ROOM_INFO, { room_id: room, user_count: user_cnt });
    });
}

