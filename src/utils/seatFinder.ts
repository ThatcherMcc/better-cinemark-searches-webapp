type Seat = {
  row:string,
  column:number,
  time:string
}

type SeatBlock = {
  showtime:string,
  row: string,
  seats: Seat[]
}

export default function SeatFinder(availableSeats: Seat[], groupSize: number) : SeatBlock[] {
  const blocks: SeatBlock[] = [];

  const groups: Record<string, number[]> = {};

  availableSeats.forEach(seat => {
    
  });
}
