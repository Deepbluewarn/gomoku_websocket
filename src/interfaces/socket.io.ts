export interface IUserSession {
    nickname: string;
}

interface IRoom {
    room_id: string;
    user_count: number;
}

interface IPlacement {
    room_id: string
    cell_num: number
}

export const JOIN = 'join';
export const PLACE = 'place';
export const JOINED = 'joined';
export const PLACED = 'placed';
export const ROOM_INFO = 'room-info';
export const REQUEST_USER_INFO = 'request-user-info';
export const USER_NOT_FOUND = 'user-not-found';
export const ROOM_NOT_EXIST = 'room-not-exist';

export interface ServerToClientEvents {
    [JOINED]: (room: IRoom) => void
    [PLACED]: (data: IPlacement) => void
    [ROOM_INFO]: (room: IRoom) => void
    [REQUEST_USER_INFO]: (user_session: IUserSession) => void
    [USER_NOT_FOUND] : () => void
    [ROOM_NOT_EXIST] : () => void
}

export interface ClientToServerEvents {
    [JOIN]: (room_id: string) => void
    [PLACE]: (data: IPlacement) => void
    [REQUEST_USER_INFO]: () => void
}
