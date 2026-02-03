import type { SeatBlock } from '../types';

export function groupAndFilterSeatBlocks(
  seatBlocks: SeatBlock[]
): Record<string, SeatBlock[]> {
  const showtimeGroups = seatBlocks.reduce((groups, block) => {
    if (!groups[block.showtime]) {
      groups[block.showtime] = [];
    }
    groups[block.showtime].push(block);
    return groups;
  }, {} as Record<string, SeatBlock[]>);

  Object.keys(showtimeGroups).forEach(showtime => {
    const rowGroups = showtimeGroups[showtime].reduce((rows, block) => {
      if (!rows[block.row] || block.distanceFromCenter < rows[block.row].distanceFromCenter) {
        rows[block.row] = block;
      }
      return rows;
    }, {} as Record<string, SeatBlock>);

    showtimeGroups[showtime] = Object.values(rowGroups).slice(0, 3);
  });

  return showtimeGroups;
}