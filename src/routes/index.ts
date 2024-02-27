import express from 'express';
import { customAlphabet } from 'nanoid';
import { createRoom, setUserSession } from '../services/redis.js';
import { IUserSession } from '../interfaces/socket.io.js';

const router = express.Router();

router.post('/register', (req, res) => {
    const userID = req.cookies.userID;
    const { nickname } = req.body;
    
    setUserSession(userID, { nickname });

    const userSession: IUserSession = {
        nickname: nickname
    }

    res.json(userSession);
});

router.post('/create-room', (req, res) => {
    const userID = req.cookies.userID;
    const { roomName } = req.body;
    const inviteCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10)();

    // DB 에 방 생성
    createRoom(inviteCode, roomName, userID);

    res.json({value: { roomName, inviteCode }});
});

export default router;