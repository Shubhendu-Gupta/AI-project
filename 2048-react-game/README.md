# 2048 React Game

A fully functional implementation of the popular 2048 game built with React, TypeScript, and Vite.

## Features

- Classic 2048 gameplay mechanics
- Smooth animations and transitions
- Score tracking with best score persistence
- Keyboard controls (Arrow keys and WASD)
- Win/lose detection
- Responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

```bash
npm install
```

### Development

Start the development server on port 3000:

```bash
npm run dev
```

### Build

Build for production:

```bash
npm run build
```

### Testing

Run unit tests:

```bash
npm run test
```

Run type checking:

```bash
npm run typecheck
```

## How to Play

Use your **arrow keys** or **WASD** keys to move the tiles. Tiles with the same number merge into one when they touch. Add them up to reach **2048**!

## Project Structure

- `/src/components` - React components (Grid, Tile, GameHeader, GameOverlay)
- `/src/hooks` - Custom React hooks (useGame)
- `/src/utils` - Game logic utilities
- `/src/types` - TypeScript type definitions

## Tech Stack

- React 19
- TypeScript 6
- Vite 8
- Vitest (for testing)
