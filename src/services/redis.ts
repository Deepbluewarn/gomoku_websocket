import { REDIS_SETTING } from "../constants.js";
import { IRoom } from "../interfaces/room.js";
import { IUserSession, Stone } from "../interfaces/socket.io.js";
import { Redis } from 'ioredis';

const redis = new Redis(REDIS_SETTING);

/** User */

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
        status: 'waiting',
    }
    await redis.hset('room', roomID, JSON.stringify(room));
}

export async function getRoom(roomID: string) {
    const room = await redis.hget('room', roomID);

    if(room === null) {
        throw new Error('Room not exist');
    }

    return JSON.parse(room) as IRoom;
}

export async function setRoom(roomID: string, room: IRoom){
    await redis.hset('room', roomID, JSON.stringify(room));
}

export async function joinRoom(roomID: string, userID: string) {
    const roomData: IRoom = await getRoom(roomID);

    const playerIds = new Set(roomData.playerIds);
    playerIds.add(userID);

    roomData.playerIds = Array.from(playerIds);

    console.log(JSON.stringify(roomData));

    await setRoom(roomID, roomData);

    return roomData;
}

export async function leaveRoom(roomID: string, userID: string) {
    const roomData: IRoom = await getRoom(roomID);
    const playerIds = new Set(roomData.playerIds);
    const spectators = new Set(roomData.spectators);

    playerIds.delete(userID);
    spectators.delete(userID);

    roomData.playerIds = Array.from(playerIds);
    roomData.spectators = Array.from(spectators);

    await setRoom(roomID, roomData);
}

export async function roomExist(roomID: string) {
    return (await redis.hexists('room', roomID)) === 1;
}

export async function deleteRoom(roomID: string) {
    await redis.hdel('room', roomID);
}

/** Board */

/**
 * 
 * @param roomID Room 의 key 값
 * @param cellNum 1 부터 시작하는 보드의 셀 번호
 */
export async function placeStone(room: IRoom, cellNum: number, stone: Stone) {
    const board = room.board;

    const stoneExist = board.some((stone, i) => {
        return stone.cellNum === cellNum;
    })

    if(stoneExist) throw new Error('Cell already occupied');

    board.push({ cellNum, color: stone });

    room.board = board;

    return room;
}
