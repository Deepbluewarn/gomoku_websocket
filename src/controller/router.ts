import express from 'express';
import { customAlphabet, nanoid } from 'nanoid';
import { createRoom, setUserSession } from '../services/redis.js';

export function registerController(req: express.Request, res: express.Response) {
    const userID = req.cookies.userID;
    const { nickname } = req.body;
    
    const userSession = {
        id: nanoid(),
        nickname: nickname
    }
    
    setUserSession(userID, userSession);
    res.json(userSession);
}

export function createRoomController(req: express.Request, res: express.Response) {
    const userID = req.cookies.userID;
    const { roomName } = req.body;
    const inviteCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10)();

    // DB 에 방 생성
    createRoom(inviteCode, roomName, userID);

    res.json({value: { roomName, inviteCode }});
}


