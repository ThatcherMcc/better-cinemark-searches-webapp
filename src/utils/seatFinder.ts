// utils/seatFinder.ts
import { HeatmapPreference, Seat, SeatBlock } from "../types";

export default function SeatFinder(allSeats: Seat[], groupSize: number, heatmapPreference: HeatmapPreference) : SeatBlock[] {
  console.log(`🎯 SeatFinder - Starting with ${allSeats.length} seats, group size: ${groupSize}, preference: ${heatmapPreference}`);
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
  
  console.log('📐 Theater layouts:', Object.keys(theaterLayouts).map(time => 
    `${time}: ${theaterLayouts[time].rows.length} rows, cols ${theaterLayouts[time].minCol}-${theaterLayouts[time].maxCol}`
  ).join(', '));

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
  
  console.log(`📊 Available groups: ${Object.keys(availableGroups).length} time-row combinations`);

  // "groups" is a record of time-row pairs as the key, and the value is an array of columns that are available for that time and row.
  for (const key in availableGroups) {
    const [time, row] = key.split('-');
    const columns = availableGroups[key].columns.sort((a, b) => a - b);
    const url = availableGroups[key].url;
    const layout = theaterLayouts[time];
    const totalRows = layout.rows.length;

    const rowsToOmit = totalRows === 9 ? 3 : 2;
    const rowIndex = layout.rows.indexOf(row);
    
    // Skip front rows for all preferences EXCEPT 'front'
    if (heatmapPreference !== 'front' && rowIndex < rowsToOmit) {
      console.log(`  ⏭️ Skipping ${time}-${row}: front row (index ${rowIndex} < ${rowsToOmit})`);
      continue;
    }
    
    if (columns.length < groupSize) {
      console.log(`  ⏭️ Skipping ${time}-${row}: not enough seats (${columns.length} < ${groupSize})`);
      continue;
    }
    
    const theaterMiddle = (layout.minCol + layout.maxCol) / 2;

    let blocksFoundInRow = 0;
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
        blocksFoundInRow++;
      }
    }
    
    if (blocksFoundInRow > 0) {
      console.log(`  ✅ ${time}-${row}: Found ${blocksFoundInRow} contiguous blocks`);
    }
  }
  
  blocks.sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);
  console.log(`✅ SeatFinder - Found ${blocks.length} total blocks, sorted by preference`);
  
  if (blocks.length > 0) {
    console.log(`🥇 Top 3 blocks:`, blocks.slice(0, 3).map(b => 
      `${b.showtime} Row ${b.row} (score: ${b.distanceFromCenter.toFixed(2)})`
    ));
  }
  
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

  let score: number;
  switch (preference) {
    case 'middles':
      score = distanceFromMiddle;
      break;
    
    case 'crosshair':
      score = distanceFromMiddleRow + distanceFromMiddle;
      break;
    
    case 'back-triangle':
      const backBonus = distanceFromBack * 5;
      const columnPenalty = distanceFromMiddle * (1 + normalizedRowPosition);
      score = backBonus + columnPenalty;
      break;
    
    case 'back':
      score = distanceFromBack * 100 + distanceFromMiddle;
      break;
    
    case 'front':
      const distanceFromFront = rowIndex;
      score = distanceFromFront * 100 + distanceFromMiddle;
      break;
    
    case 'back-back':
      score = distanceFromBack * 1000 + distanceFromMiddle * 0.1;
      break;
    
    default:
      score = distanceFromMiddle;
  }
  
  return score;
}