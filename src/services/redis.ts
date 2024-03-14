import { BOARD_SIZE, REDIS_SETTING } from "../constants.js";
import { IRoom } from "../interfaces/room.js";
import { IUserSession } from "../interfaces/socket.io.js";
import { Redis } from 'ioredis';
import { createBoard } from "./board.js";

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
        board: createBoard(BOARD_SIZE),
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

    return JSON.parse(room);
}

export async function joinRoom(roomID: string, userID: string) {
    const roomData: IRoom = await getRoom(roomID);

    const playerIds = new Set(roomData.playerIds);

    if(playerIds.size >= 2) throw new Error('Room is full');

    playerIds.add(userID);

    roomData.playerIds = Array.from(playerIds);

    console.log(JSON.stringify(roomData));

    await redis.hset('room', roomID, JSON.stringify(roomData));

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

    await redis.hset('room', roomID, JSON.stringify(roomData));
}

export async function roomExist(roomID: string) {
    return (await redis.hexists('room', roomID)) === 1;
}

export async function deleteRoom(roomID: string) {
    await redis.hdel('room', roomID);
}

/** Board */

function getArrayIndexByCellNum(cellNum: number) {
    let row = Math.floor(cellNum / BOARD_SIZE);
    let col = cellNum % BOARD_SIZE;

    if(col === 0) {
        --row;
        col = BOARD_SIZE - 1;
    }else if(col > 0) {
        --col;
    }

    return [row, col];
}

/**
 * 
 * @param roomID Room 의 key 값
 * @param cellNum 1 부터 시작하는 보드의 셀 번호
 */
export async function placeStone(roomID: string, cellNum: number) {
    const roomData: IRoom = await getRoom(roomID);
    const board = roomData.board;

    const [row, col] = getArrayIndexByCellNum(cellNum);

    if(board[row][col] !== 0) throw new Error('Cell already occupied');

    board[row][col] = 1;

    roomData.board = board;

    await redis.hset('room', roomID, JSON.stringify(roomData));
}
