import { REDIS_SETTING } from "../constants.js";
import { IRoom } from "../interfaces/room.js";
import { IUserSession } from "../interfaces/socket.io.js";
import { Redis } from 'ioredis';

const redis = new Redis(REDIS_SETTING);

export function setUserSession(userID: string, session: IUserSession) {
    redis.hset('session', userID, JSON.stringify(session));
}

/** Room */

export async function createRoom(roomID: string, roomName: string, userID: string) {
    const room: IRoom = {
        ownerId: userID,
        playerIds: [userID],
        spectators: [],
        whoIsBlack: userID,
        board: [],
        turn: userID,
    }
    await redis.hset('room', roomID, JSON.stringify(room));
}

export async function joinRoom(roomID: string, userID: string) {
    const room = await redis.hget('room', roomID);

    if(room === null) {
        throw new Error('Room not exist');
    }

    console.log('joinRoom room', room)
    console.log('joinRoom userID', userID)

    const roomData: IRoom = JSON.parse(room);

    const playerIds = new Set(roomData.playerIds);

    if(playerIds.size >= 2) throw new Error('Room is full');

    playerIds.add(userID);

    roomData.playerIds = Array.from(playerIds);

    console.log(JSON.stringify(roomData));

    await redis.hset('room', roomID, JSON.stringify(roomData));

    return roomData;
}

export async function leaveRoom(roomID: string, userID: string) {
    const room = await redis.hget('room', roomID);

    if(room === null) {
        throw new Error('Room not exist');
    }

    const roomData: IRoom = JSON.parse(room);
    const playerIds = new Set(roomData.playerIds);
    const spectators = new Set(roomData.spectators);

    playerIds.delete(userID);
    spectators.delete(userID);

    roomData.playerIds = Array.from(playerIds);
    roomData.spectators = Array.from(spectators);

    await redis.hset('room', roomID, JSON.stringify(roomData));
}

export async function roomExist(roomID: string) {
    return (await redis.hexists('room', roomID)) === 1;
}

export async function deleteRoom(roomID: string) {
    await redis.hdel('room', roomID);
}