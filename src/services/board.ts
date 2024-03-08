export function createBoard(board_size: number) {
    const board = [];

    for(let i = 0; i < board_size; i++) {
        board.push(Array(board_size).fill(0));
    }
    return board;
}