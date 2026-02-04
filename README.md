# Seat Finder 🎥

**Seat Finder** is a specialized tool designed to optimize the movie-going experience by identifying the best available seats in real-time. It uses a custom heatmap algorithm to rank seating quality and identify contiguous blocks for groups.

**Live Demo:** [seat-finder-webapp.vercel.app](https://seat-finder-webapp.vercel.app)  
*(Requires the companion Chrome Extension for seat scraping)*

---

## ✨ Key Features
* **Contiguous Block Finder:** Instantly find seats together for any group size.
* **Heatmap Logic:** Visualizes the "prime" viewing areas within any theater layout.
* **Extension-Powered:** Uses a Chrome Extension to bypass scraping blocks and handle credentials securely.
* **Performance:** Built with **Next.js** and **TypeScript**, utilizing **NeonDB** for smart data caching.

## 🛠 Tech Stack
* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Database:** NeonDB (PostgreSQL)
* **Styling:** Tailwind CSS
* **Deployment:** Vercel

## 📝 Technical Note
This repository is primarily for **portfolio demonstration**. Because the application relies on private environment variables and a specific database schema (NeonDB), it is not intended to be run locally without prior configuration of the backend services.

---

## 🛡 Disclaimer
This project is for educational purposes only. It is not affiliated with, endorsed by, or supported by Cinemark or any other theater chain. Use responsibly.

