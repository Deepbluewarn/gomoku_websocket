import { REDIS_SESSION_SETTING } from "../constants.js";
import { IUserSession } from "../interfaces/index.js";
import { Redis } from 'ioredis';

const redis = new Redis(REDIS_SESSION_SETTING);

export function setUserSession(userID: string, session: IUserSession) {
    redis.set(userID, JSON.stringify(session));
}