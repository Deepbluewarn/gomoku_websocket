import { Request } from 'express';
import { serialize, parse } from "cookie";
import { Server, Socket } from "socket.io";
import { ClientToServerEvents, IUserSession, JOIN, JOINED, LEAVED, PLACE, PLACED, REQUEST_USER_INFO, ROOM_INFO, ROOM_NOT_EXIST, ServerToClientEvents, USER_JOINED, USER_LEAVED, USER_NOT_FOUND } from "../interfaces/socket.io.js";
import { Redis } from 'ioredis';
import { REDIS_SETTING } from '../constants.js';
import { deleteRoom, joinRoom, leaveRoom, placeStone, roomExist } from '../services/redis.js';

const redis = new Redis(REDIS_SETTING);

export type IO = Server<ClientToServerEvents, ServerToClientEvents>;
export type SOCKET = Socket<ClientToServerEvents, ServerToClientEvents>;

function getSocketById(io: IO, id: string) {
    return io.sockets.sockets.get(id) as SOCKET;
}

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

const getCookies = (socket: SOCKET) => {
    const request = socket.request as Request;
    return parse(request.headers.cookie || '');
}

export const handleConnectionEvent = (socket: SOCKET) => {
    socket.on('disconnect', (reason, description) => {
        console.log('user disconnected', reason, description);
    });

    socket.on('error', (error) => {
        console.error('[error]]', error);
    });
}

export const handleUserEvent = (socket: SOCKET) => {
    socket.on(REQUEST_USER_INFO, async () => {
        const userID = getCookies(socket).userID;
        let res: IUserSession = await getUserSession(userID);

        socket.emit(REQUEST_USER_INFO, res);
    });
}

export const handleRoomEvent = (io: IO, socket: SOCKET) => {
    socket.on(JOIN, async (data) => {
        const userID = getCookies(socket).userID;
        const res = await getUserSession(userID);

        if (res.nickname === '') {
            console.log('user not found userID" ', userID)
            socket.emit(USER_NOT_FOUND);

            return;
        }

        // POST /create-room 요청에서 생성된 방이 아니면 방이 존재하지 않는다고 알린다.
        if (await roomExist(data)) socket.emit(ROOM_NOT_EXIST);

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
}

export const handleSocketCreateRoomEvent = (room: string) => {
    console.log(`room ${room} was created`);
}

export const handleSocketJoinRoomEvent = (room_id: string, user_id: string, io: IO) => {
    if (user_id === room_id) return;

    const socket = getSocketById(io, user_id);
    const cookies = getCookies(socket);

    console.log(`socket ${user_id} has joined room ${room_id}`);

    // redis 에서 room 으로 생성된 방의 정보를 업데이트한다.
    // 일단 redis 에서 room 정보를 가져온 다음
    // user 가 있으면 실패이므로 방에서 내보낸다.

    joinRoom(room_id, cookies.userID).then(async (room) => {
        socket.emit(JOINED, { room_id: room_id });
        socket.emit(ROOM_INFO, {
            room_id: room_id,
            players: await Promise.all(room.playerIds.map(async (id) => await getUserSession(id))),
            owner: await getUserSession(room.ownerId),
            board: room.board,
            black: room.whoIsBlack === cookies.userID,
            turn: room.turn === cookies.userID
        });
        io.to(room_id).emit(USER_JOINED, await getUserSession(cookies.userID));
    }).catch(err => {
        console.log('join-room event err: ', err);
        socket.leave(room_id);
    });
}

export const handleSocketDeleteRoomEvent = (room: string) => {
    console.log(`room ${room} was deleted`);
    deleteRoom(room);
}

export const handleSocketLeaveRoomEvent = (room_id: string, user_id: string, io: IO) => {
    if (user_id === room_id) return;

    const socket = getSocketById(io, user_id);
    const cookies = getCookies(socket);

    console.log(`${user_id} leave from ${room_id} room`);

    leaveRoom(room_id, cookies.userID).then(async () => {
        socket.emit(LEAVED, { room_id });
        io.to(room_id).emit(USER_LEAVED, await getUserSession(cookies.userID));
    }).catch(err => {
        console.log('leave-room event err: ', err);
    });
}
