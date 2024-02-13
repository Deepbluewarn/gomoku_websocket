import express from 'express';
import Redis from 'ioredis';
import { REDIS_SESSION_SETTING } from '../constants';

const redis = new Redis(REDIS_SESSION_SETTING);
const router = express.Router();

router.post('/register', (req, res) => {
    const userID = req.cookies.userID;
    const { nickname } = req.body;

    redis.set(userID, nickname);

    res.json({message: `${nickname} 님 환영합니다!`});
});

export default router;