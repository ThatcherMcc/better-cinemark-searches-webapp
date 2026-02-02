export interface Seat {
    row: string;
    column: number;
    time:string;
    isAvailable: boolean;
    url: string;
  }
  
export interface SeatBlock {
    showtime: string;
    row: string;
    distanceFromCenter: number;
    seats: Seat[];
    url: string;
}

export type Showtime = {
    time: string;
    format: string;
    url: string;
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