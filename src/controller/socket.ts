import { Request } from 'express';
import { parse } from "cookie";
import { IO, IUserSession, JOIN, JOINED, LEAVED, PLACE, PLACED, REQUEST_USER_INFO, GAME_INFO, ROOM_NOT_EXIST, SOCKET, ServerToClientEvents, TURN, USER_JOINED, USER_LEAVED, USER_NOT_FOUND, GAME_STARTED, Stone } from "../interfaces/socket.io.js";
import { Redis } from 'ioredis';
import { REDIS_SETTING } from '../constants.js';
import { deleteRoom, getRoom, joinRoom, leaveRoom, placeStone, roomExist, setRoom } from '../services/redis.js';
import { IRoom } from '../interfaces/room.js';

const redis = new Redis(REDIS_SETTING);

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

const canStartGame = (room: IRoom, userID: string) => {
    return room.playerIds.length === 2 && room.whoIsBlack === userID;
}

const getPlayerStoneColor = (room: IRoom, userID: string) => {
    return (room.whoIsBlack === userID ? 'black' : 'white') as Stone;
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

    socket.on(PLACE, async (data) => {
        const userID = getCookies(socket).userID;

        console.log('place event', data, userID);

        try{
            const room = await getRoom(data.room_id);

            if(room.status === 'end') return;

            if(room.status === 'waiting' && canStartGame(room, userID)){
                room.status = 'playing';
            }

            if(room.status === 'playing'){
                if(room.turn !== userID) {
                    console.log('not your turn.', userID);
                    return;
                }

                const placedRoom = await placeStone(room, data.cell_num);

                placedRoom.turn = room.playerIds.find(id => id !== userID) as string;

                await setRoom(data.room_id, placedRoom);

                io.to(data.room_id).emit(PLACED, {
                    ...data,
                    color: getPlayerStoneColor(placedRoom, userID),
                    time: new Date().getTime(),
                });

                io.to(data.room_id).emit(GAME_STARTED);

                const stone = placedRoom.whoIsBlack === userID; // 이 값이 true 이면 백돌 차례. false 이면 흑돌 차례

                io.to(data.room_id).emit(TURN, stone ? 'white' : 'black');
            }
        }catch(err){
            console.log('place event err: ', err);
        }
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
        socket.emit(GAME_INFO, {
            room_id: room_id,
            players: await Promise.all(room.playerIds.map(async (id) => await getUserSession(id))),
            owner: await getUserSession(room.ownerId),
            board: room.board,
            black: room.whoIsBlack === cookies.userID,
            status: room.status,
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
