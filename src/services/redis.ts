import { REDIS_SETTING } from "../constants.js";
import { IUserSession } from "../interfaces/socket.io.js";
import { Redis } from 'ioredis';

const redis = new Redis(REDIS_SETTING);

export function setUserSession(userID: string, session: IUserSession) {
    redis.hset('session', userID, JSON.stringify(session));
}

/** Room */

export function createRoom(roomID: string, roomName: string, userID: string) {
    redis.hset('room', roomID, JSON.stringify({ roomName, userID }));
}

export function joinRoom(roomID: string, userID: string) {
    redis.hset('room', roomID, JSON.stringify({ userID }));
}

export async function roomExist(roomID: string) {
    return (await redis.hexists('room', roomID)) === 1;
}