import { Request } from 'express';
import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { serialize, parse } from "cookie";
import { IUserSession, LEAVED, ROOM_NOT_EXIST, USER_JOINED, USER_LEAVED, USER_NOT_FOUND } from './interfaces/socket.io.js';
import { REDIS_SETTING } from './constants.js';
import { ClientToServerEvents, JOIN, JOINED, PLACE, PLACED, REQUEST_USER_INFO, ROOM_INFO, ServerToClientEvents } from './interfaces/socket.io.js';
import { deleteRoom, joinRoom, leaveRoom, placeStone, roomExist } from './services/redis.js';

const redis = new Redis(REDIS_SETTING);


async function getUserSession(userID: string) {
    let res: IUserSession;
    const redis_res = await redis.hget('session', userID);

    if (redis_res === null) {
        res = { id: '', nickname: '' };
    } else {
        res = JSON.parse(redis_res);
    }

    return res;
}

function getCookies(socket: Socket) {
    const request = socket.request as Request;
    return parse(request.headers.cookie || '');
}

function getSocketById(io: Server, id: string){
    return io.sockets.sockets.get(id) as Socket;
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
            placeStone(data.room_id, data.cell_num).then(() => {
                io.to(data.room_id).emit(PLACED, data);
            }).catch(err => {
                console.log('place event err: ', err);
            });
        });
    });

    io.of("/").adapter.on("create-room", (room) => {
        console.log(`room ${room} was created`);
        
    });

    io.of("/").adapter.on("join-room", (room_id, user_id) => {
        if(user_id === room_id) return;

        const cookies = getCookies(getSocketById(io, user_id));

        console.log(`socket ${user_id} has joined room ${room_id}`);

        // redis 에서 room 으로 생성된 방의 정보를 업데이트한다.
        // 일단 redis 에서 room 정보를 가져온 다음
        // user 가 있으면 실패이므로 방에서 내보낸다.

        joinRoom(room_id, cookies.userID).then(async (room) => {
            io.sockets.emit(JOINED, { room_id: room_id});
            io.to(user_id).emit(ROOM_INFO, {
                room_id: room_id,
                players: await Promise.all(room.playerIds.map(async (id) => await getUserSession(id))),
                owner: await getUserSession(room.ownerId),
                board: room.board,
                black: room.whoIsBlack === cookies.userID,
                turn: room.turn === cookies.userID
            });
            io.sockets.emit(USER_JOINED, await getUserSession(cookies.userID));
        }).catch(err => {
            console.log('join-room event err: ', err);
            io.socketsLeave(room_id);
        });
    });

    io.of("/").adapter.on("delete-room", (room) => {
        console.log(`room ${room} was deleted`);
        deleteRoom(room);
    });

    io.of("/").adapter.on("leave-room", (room, id) => {
        if(id === room) return;

        const cookies = getCookies(getSocketById(io, id));

        console.log(`${id} leave from ${room} room`);

        leaveRoom(room, cookies.userID).then(async () => {
            io.to(id).emit(LEAVED, { room_id: room });
            io.sockets.emit(USER_LEAVED, await getUserSession(cookies.userID));
        }).catch(err => {
            console.log('leave-room event err: ', err);
        })
    });
}

