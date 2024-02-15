import express from 'express';
import { customAlphabet } from 'nanoid';
import { setUserSession } from '../services/redis.js';

const router = express.Router();

router.post('/register', (req, res) => {
    const userID = req.cookies.userID;
    const { nickname } = req.body;
    const inviteCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10)();

    setUserSession(userID, { nickname, inviteCode });

    res.json({value: { nickname, inviteCode }});
});

export default router;