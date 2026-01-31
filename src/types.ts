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

export interface MovieInfo {
    name: string;
    imageUrl: string | null;
    rating: string | null;
    runtime: string | null;
}

export type HeatmapPreference = 
  | 'middles'
  | 'crosshair'
  | 'back-triangle'
  | 'back'
  | 'front'
  | 'back-back';


export interface HeatmapOption {
    id: HeatmapPreference;
    name: string;
    description: string;
    image_name: string;
}