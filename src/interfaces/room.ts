// Redis 에 저장되는 Room 정보에 대한 인터페이스.
export interface IRoom {
    ownerId: string;
    playerIds: string[];
    spectators: string[];
    board: number[][];
    whoIsBlack: string; // 흑돌을 가진 유저의 id
    turn: string; // 유저의 id
}
