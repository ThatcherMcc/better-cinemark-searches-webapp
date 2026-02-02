import { HeatmapPreference, Seat, SeatBlock } from "../types";

export default function SeatFinder(allSeats: Seat[], groupSize: number, heatmapPreference: HeatmapPreference) : SeatBlock[] {
  const blocks: SeatBlock[] = [];

  // Check if the theater's walk in is on the right or left (changes where the middle is) and set the min and max columns for each time.
  const theaterLayouts: Record<string, { minCol: number; maxCol: number; rows: string[] }> = {};
  allSeats.forEach(seat => {
    if (!theaterLayouts[seat.time]) {
      theaterLayouts[seat.time] = { minCol: seat.column, maxCol: seat.column, rows: [] };
    }
    const layout = theaterLayouts[seat.time];

    if (!layout.rows.includes(seat.row)) {
      layout.rows.push(seat.row);
    }

    if (seat.column < layout.minCol) layout.minCol = seat.column;
    if (seat.column > layout.maxCol) layout.maxCol = seat.column;
  });

  for (const time in theaterLayouts) {
    theaterLayouts[time].rows.sort(); 
  }

  // Group available seats by time and row.
  const availableGroups: Record<string, { columns: number[]; url: string }> = {};
  allSeats.forEach(seat => {
    if (!seat.isAvailable) return;

    const key = `${seat.time}-${seat.row}`;
    if (!availableGroups[key]) {
      availableGroups[key] = { columns: [], url: seat.url };
    }
    availableGroups[key].columns.push(seat.column);
  });

  // "groups" is a record of time-row pairs as the key, and the value is an array of columns that are available for that time and row.
  // Example: { "10:00-A": [1, 2, 3, 4, 5], "10:00-B": [1, 2, 3, 4, 5] }
  for (const key in availableGroups) {
    const [time, row] = key.split('-');
    const columns = availableGroups[key].columns.sort((a, b) => a - b);
    const url = availableGroups[key].url;
    const layout = theaterLayouts[time];
    const totalRows = layout.rows.length;

    const rowsToOmit = totalRows === 9 ? 3 : 2;
    const rowIndex = layout.rows.indexOf(row);
    
    // Skip front rows for all preferences EXCEPT 'front'
    if (heatmapPreference !== 'front' && rowIndex < rowsToOmit) continue;
    
    if (columns.length < groupSize) continue;
    
    const theaterMiddle = (layout.minCol + layout.maxCol) / 2;

    for (let i = 0; i < columns.length - groupSize + 1; i++) {
      const startColumn = columns[i];
      let isContiguous = true;

      for (let j = 1; j < groupSize; j++) {
        if (columns[i + j] !== startColumn + j) {
          isContiguous = false;
          break;
        }
      }
      
      if (isContiguous) {
        const groupCenterPoint = startColumn + (groupSize - 1) / 2;
        const distanceFromMiddle = Math.abs(theaterMiddle - groupCenterPoint);
        
        // Calculate score based on heatmap preference
        const score = calculateHeatmapScore(
          heatmapPreference,
          rowIndex,
          totalRows,
          rowsToOmit,
          groupCenterPoint,
          theaterMiddle,
          distanceFromMiddle
        );

        blocks.push({
          showtime: time,
          row: row,
          distanceFromCenter: score,
          seats: columns.slice(i, i + groupSize).map(column => ({ column, row, time, isAvailable: true, url: url })),
          url: url
        });
      }
    }
  }
  
  blocks.sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);
  return blocks;
}

function calculateHeatmapScore(
  preference: HeatmapPreference,
  rowIndex: number,
  totalRows: number,
  rowsToOmit: number,
  groupCenterPoint: number,
  theaterMiddle: number,
  distanceFromMiddle: number
): number {
  // Normalize row position (0 = front available row, 1 = back row)
  const availableRows = totalRows - rowsToOmit;
  const normalizedRowPosition = (rowIndex - rowsToOmit) / (availableRows - 1);
  
  // Distance from back (0 = back row, increases toward front)
  const distanceFromBack = (availableRows - 1) - (rowIndex - rowsToOmit);
  
  // Middle row index
  const middleRowIndex = Math.floor((totalRows - 1) / 2);
  const distanceFromMiddleRow = Math.abs(rowIndex - middleRowIndex);

  switch (preference) {
    case 'middles':
      // Just horizontal middle distance (existing behavior)
      return distanceFromMiddle;
    
    case 'crosshair':
      // Prefer middle rows AND middle columns
      // Combine row and column distance with equal weight
      return distanceFromMiddleRow + distanceFromMiddle;
    
    case 'back-triangle':
      // Triangle from back corners to middle center
      // Back rows get lower scores, and within each row, middle is best
      // As you go forward, the acceptable range narrows
      const backBonus = distanceFromBack * 5; // Heavy penalty for front rows
      const columnPenalty = distanceFromMiddle * (1 + normalizedRowPosition); // Tighter tolerance in middle rows
      return backBonus + columnPenalty;
    
    case 'back':
      // Prefer back rows, then use middle distance as tiebreaker
      return distanceFromBack * 100 + distanceFromMiddle;
    
    case 'front':
      // Prefer front rows (reverse of back), then use middle distance as tiebreaker
      const distanceFromFront = rowIndex; // 0-indexed from actual front
      return distanceFromFront * 100 + distanceFromMiddle;
    
    case 'back-back':
      // Strongly prefer back rows in order, column doesn't matter as much
      // Back row = 0, second to back = 1, etc.
      return distanceFromBack * 1000 + distanceFromMiddle * 0.1;
    
    default:
      return distanceFromMiddle;
  }
}