import { Seat, SeatBlock } from "../types";

export default function SeatFinder(availableSeats: Seat[], groupSize: number) : SeatBlock[] {
  const blocks: SeatBlock[] = [];

  const groups: Record<string, number[]> = {};

  // Group seats by time and row
  availableSeats.forEach(seat => {
    const key = `${seat.time}-${seat.row}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(seat.column);
  });

  // "groups" now is a record of time-row pairs as the key, and the value is an array of columns that are available for that time and row.
  // Example: { "10:00-A": [1, 2, 3, 4, 5], "10:00-B": [1, 2, 3, 4, 5] }

  for (const key in groups) {
    const [time, row] = key.split('-');
    const columns = groups[key].sort((a, b) => a - b);
    
    if (columns.length < groupSize) {
      continue;
    }

    for (let i = 0; i < columns.length - groupSize + 1; i++) {
      const startColumn = columns[i];
      let isContiguous = true;

      for (let j = 1; j < groupSize - 1; j++) {
        if (columns[i + j] !== startColumn + j) {
          isContiguous = false;
          break;
        }
      }
      if (isContiguous) {
        blocks.push({
          showtime: time,
          row: row,
          seats: columns.slice(i, i + groupSize).map(column => ({ column, row, time }))
        });
      }
    }
  }

  return blocks;
}
