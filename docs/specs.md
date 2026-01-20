# Project Specifications: LobbyLink (LFG Platform)

## 1. Project Overview
**Concept:** A "Looking For Group" (LFG) platform where gamers find teammates based on social compatibility (tags like "No Swearing," "Chill," "Mic Required") rather than just skill. many rooms with different for a single game 
**Core Value:** Solving "Solo Queue Hell" by enabling users to filter for specific social vibes and game modes for a specific .
**Target Audience:** Casual and semi-competitive gamers (Valorant, CS2, BGMI, etc.).

## 2. Tech Stack (Strict Constraints)
## 2. Tech Stack (Revised for JavaScript)
* **Frontend:** React (Vite) + JavaScript (ES6+).
* **Styling:** Tailwind CSS + ShadcnUI.
* **State Management:**
    * **Global Client State:** Zustand (Preferred over Redux for simplicity).
    * **Server State:** TanStack Query (v5).
* **Backend:** Node.js + Express + JavaScript.
* **Database:** MongoDB with Prisma ORM.
* **Real-time:** Socket.io.

## 3. Core Features & Requirements

### A. User System (Auth)
* User registration/login (Email + Password).
* Profile management: Username, Avatar, Bio.
* **Reputation System:** Users have a visible "Karma Score."
    * Score increases when teammates commend them.
    * Score decreases if they are kicked/reported.

### B. The Lobby System (Ephemeral)
* **Create Lobby:**
    * user selects: Game (e.g., Valorant) 
    * user sees rooms with tags like Title ("Rank Push"), Max Players (5). chill and many more : discord like rooms  
    * **Tags (The USP):** user selects tags (e.g., "Mic On," "No Toxic," "Gold Rank") to filter rooms according to their interest .
* **Lobby Lifecycle:**
    * Lobbies are **temporary**. They disappear if the host(creator of room) leaves or after X minutes of inactivity.
    * Lobbies have status: `OPEN`, `FULL`, `IN_GAME`.
* **Join Request:**
    * If Public: Instant join.
    * If Private/Filtered: User requests -> Host accepts/denies via Socket event.

### C. Real-Time Interaction (Socket.io)
* **Live Dashboard:** The list of lobbies updates automatically (someone joins/leaves) without refreshing.
* **Lobby Chat:** Private chat room for lobby members only.
* **Notifications:** "User X wants to join," "You were kicked," "Lobby is full."

### D. AI Integration (Future Phase)
* **Toxicity Filter:** AI scans chat messages in real-time to flag "Toxic" behavior in "Chill" lobbies.
* **Smart Match:** "Find me a lobby" button based on user's past tags.


## 4. Data Model (Prisma Relations)
* **User:** `id`, `email`, `password_hash`, `karma_score`, `lobbies_hosted` (relation), `lobbies_joined` (relation).
* **Game:** `id`, `name`, `genre`, `image_url`.
* **Lobby:** `id`, `hostId`, `gameId`, `title`, `description`, `status`, `maxPlayers`, `createdAt`.
* **LobbyParticipant:** `userId`, `lobbyId`, `role` (HOST/MEMBER), `joinedAt`.
* **Tag:** `id`, `name`, `category` (Vibe/Rank/Mode). 
* **LobbyTag:** Many-to-Many relation between Lobby and Tag.


## 5. Coding Standards
1.  **Language:** Standard JavaScript (No TypeScript). Use JSDoc comments if explaining complex logic is needed.
2.  **Architecture:**
    * Use Functional Components with Hooks.
    * **Avoid `useEffect` for data fetching**; use TanStack Query instead.
    * **Zustand** for simple global state (like 'isSidebarOpen' or 'currentUser').


## 6. Coding Standards & Rules (For AI Generation)
1.  **Controller-Service Pattern:** In Express, separate business logic (Service) from HTTP handling (Controller).
2.  **Environment Variables:** Never hardcode secrets. Use `process.env`.
3.  **Error Handling:** All async errors must be caught and passed to a global error handling middleware.
4.  **Frontend Components:** Use small, reusable components. Do not put 500 lines of code in one file.
5.  **Validation:** Use **Zod** for both backend API validation and frontend form validation.


## 7. Folder Structure Guidelines (basic for now , can change accordingly)
* `/server`:
    * `/src/controllers`
    * `/src/services`
    * `/src/routes`
    * `/src/sockets` (Socket.io event handlers)
* `/client`:
    * `/src/components/ui` (Shadcn)
    * `/src/features/lobby` (Lobby specific components)
    * `/src/hooks` (Custom hooks & TanStack Query)
    * `/src/store` (Zustand)