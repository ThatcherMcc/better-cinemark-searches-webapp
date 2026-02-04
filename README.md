Seat Finder 🎥
Seat Finder is a specialized tool designed to optimize the movie-going experience by identifying the best available seats in real-time. It uses a custom heatmap algorithm to rank seating quality and identifies contiguous blocks for groups.

Live Demo: seat-finder-webapp.vercel.app

(Requires the companion Chrome Extension for seat scraping)

✨ Key Features
Contiguous Block Finder: Instantly find seats together for any group size.

Heatmap Logic: Visualizes the "prime" viewing areas within any theater layout.

Next.js + TypeScript: Built for speed and type safety.

Smart Caching: Reduces server load by caching movie lists via NeonDB.

🛠 Technical Overview
This project consists of a Next.js web application and a Chrome Extension. The extension handles the authenticated data retrieval to bypass traditional scraping hurdles, while the web app processes the seating grid and renders the heatmap.

Note: This repository is for portfolio demonstration. Local setup requires specific environment variables and database configurations that are not public.
