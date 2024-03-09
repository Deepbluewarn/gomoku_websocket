import express from 'express';
import { 
    registerController, 
    createRoomController 
} from '../controller/router.js';

const router = express.Router();

router.post('/register', registerController);
router.post('/create-room', createRoomController);

export default router;