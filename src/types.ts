export interface Seat {
    row: string;
    column: number;
    time:string;
  }
  
export interface SeatBlock {
    showtime: string;
    row: string;
    seats: Seat[];
}

export type Showtime = {
    time: string;
    format: string;
    url: string | 'Unknown';
}
  