export interface IUserSession {
    id: string;
    nickname: string;
}

interface ISocketRoom {
    room_id: string;
    players?: IUserSession[];
    owner?: IUserSession;
    board?: number[][]; // 현재까지 진행된 게임의 상황을 표현한다.
    black?: boolean;
    turn?: boolean;
}

interface IPlacement {
    room_id: string
    cell_num: number
}

export const JOIN = 'join';
export const PLACE = 'place';
export const JOINED = 'joined'; // 본인에게만 전송되는 이벤트
export const LEAVED = 'leaved'; // 본인에게만 전송되는 이벤트
export const USER_JOINED = 'user-joined'; // 전역 이벤트
export const USER_LEAVED = 'user-leaved'; // 전역 이벤트
export const PLACED = 'placed';
export const ROOM_INFO = 'room-info';
export const REQUEST_USER_INFO = 'request-user-info';
export const USER_NOT_FOUND = 'user-not-found';
export const ROOM_NOT_EXIST = 'room-not-exist';
export const GAME_STARTED = 'game-started';
export const GAME_END = 'game-end';

export interface ServerToClientEvents {
    [JOINED]: (room: ISocketRoom) => void // 누가 참가했는지에 대한 정보를 포함해야 한다.
    [LEAVED]: (room: ISocketRoom) => void // 누가 떠났는지에 대한 정보를 포함해야 한다.
    [USER_JOINED]: (user_session: IUserSession) => void
    [USER_LEAVED]: (user_session: IUserSession) => void
    [PLACED]: (data: IPlacement) => void
    [ROOM_INFO]: (room: ISocketRoom) => void // 두 플레이어에 대한 정보 (닉네임) 와 방의 아이디를 포함한다. 누가 흑돌인지 (누가 게임을 시작해야 하는지) 를 표현한다.
    // 방이 처음 생성되면, 방의 주인이 흑돌을 가진다. 두 플레이어가 모두 참가했고, 흑돌이 place 이벤트를 발생시키면 db 의 room 에 게임이 시작되었다는 정보를 업데이트한다.
    // placed 이벤트에서 게임의 진행 상황을 알려준다. (누가 둔 것인지, 누가 이겼는지, 누구 차례인지, 남은 시간(초읽기))
    // place 이벤트를 받은 직후 interval 을 설정하여 일정 시간동안 place 이벤트를 받지 않으면 상대방이 이겼다고 판정한다. (game_end 이벤트)
    
    [REQUEST_USER_INFO]: (user_session: IUserSession) => void
    [USER_NOT_FOUND] : () => void
    [ROOM_NOT_EXIST] : () => void
    [GAME_STARTED] : () => void
    [GAME_END] : () => void
}

export interface ClientToServerEvents {
    [JOIN]: (room_id: string) => void
    [PLACE]: (data: IPlacement) => void
    [REQUEST_USER_INFO]: () => void
}
