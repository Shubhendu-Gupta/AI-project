# 2048 React Game - Team Configuration

## Project Overview
This is a 2048 game implementation built with React, TypeScript, and Vite. The game follows the classic 2048 mechanics with tile merging and score tracking.

## Bash commands
- npm run dev: Starts the dev server on port 3000
- npm run build: Build the project for production
- npm run test: Run unit tests with Vitest
- npm run lint: Run Oxlint
- npm run typecheck: Run TypeScript compiler check
- npm run preview: Preview production build

## Code style
- Use TypeScript with strict mode enabled
- Follow Airbnb style guide with Prettier formatting
- Destructure imports when possible (import { useState } from 'react')
- Use arrow functions for components and utilities
- IMPORTANT: Always include error handling in async functions

## Workflow
- Be sure to typecheck when you're done making code changes
- Prefer running single tests over the full test suite for performance
- YOU MUST write unit tests for new components and utilities
- Always update documentation when adding new features

## Repository structure
- /src/components: React components (Grid, Tile, GameHeader, GameOverlay)
- /src/hooks: Custom React hooks (useGame)
- /src/utils: Pure utility functions (gameLogic)
- /src/types: TypeScript type definitions

## Development server
- Always use port 3000
- Configured to allow testing from *.cloudfront.net domains

## Game Architecture
- **Game State**: Managed by useGame hook with localStorage for best score persistence
- **Tile Movement**: Grid-based system with merge detection
- **Controls**: Arrow keys and WASD for movement
- **Win Condition**: Reach 2048 tile value
- **Lose Condition**: No valid moves remaining
