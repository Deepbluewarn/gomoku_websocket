import { Server } from 'socket.io';
import { serialize, parse } from "cookie";
import { ClientToServerEvents, ServerToClientEvents } from './interfaces/socket.io.js';
import { handleConnectionEvent, handleRoomEvent, handleSocketCreateRoomEvent, handleSocketDeleteRoomEvent, handleSocketJoinRoomEvent, handleSocketLeaveRoomEvent, handleUserEvent } from './controller/socket.js';

export default function InitSocket(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    io.engine.on("initial_headers", (headers, request) => {
        const cookies = parse(request.headers.cookie || '');

        if (cookies.userID) {
            headers["set-cookie"] = [serialize("userID", cookies.userID, { sameSite: "none", secure: true, httpOnly: true, path: "/" })];
        }
    });

    io.on('connection', (socket) => {
        console.log('a user connected');

        handleConnectionEvent(socket);
        handleUserEvent(socket);
        handleRoomEvent(io, socket);
    });

    io.of("/").adapter.on("create-room", (room) => {
        handleSocketCreateRoomEvent(room);
    });

    io.of("/").adapter.on("join-room", (room_id, user_id) => {
        handleSocketJoinRoomEvent(room_id, user_id, io);
    });

    io.of("/").adapter.on("delete-room", (room) => {
        handleSocketDeleteRoomEvent(room);
    });

    io.of("/").adapter.on("leave-room", (room, id) => {
        handleSocketLeaveRoomEvent(room, id, io);
    });
}

