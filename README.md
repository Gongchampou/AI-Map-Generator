# AI Mind Map Generator

This is a modern, responsive web application that uses the Google Gemini API to automatically generate interactive mind maps from user-provided text. It's built with React, TypeScript, and styled with Tailwind CSS.

## Features

-   **AI-Powered Mind Map Generation**: Paste any text document, and the app will analyze it and create a hierarchical mind map of the key topics and subtopics.
-   **Interactive Visualization**: View the mind map as an interactive SVG graph with clear connecting branches. Pan and zoom for easy navigation.
-   **File Import**: Supports importing text from `.txt`, `.pdf`, and `.docx` files directly.
-   **PDF Export**: Export the entire mind map structure as a formatted PDF document.
-   **Real-time Search**: Search for nodes within the mind map and see them highlighted instantly.
-   **Modern UI/UX**: A clean, responsive interface with both light and dark themes, a collapsible sidebar, and interactive elements.

## Tech Stack

-   **Vite**: For a fast and modern development environment.
-   **React 18**: For building the user interface.
-   **TypeScript**: For type safety and better developer experience.
-   **Tailwind CSS**: For utility-first styling (used via CDN).
-   **@google/genai**: The official Google Gemini API client.

## Project Setup

This project is now configured to run with Vite. Follow these steps to get it running locally.

### 1. Prerequisites

-   Node.js (v18 or later)
-   npm, yarn, or pnpm

### 2. Installation

Clone or download the project files, then install the required dependencies using your package manager.

```bash
npm install
```

### 3. Environment Variables

The application requires a Google Gemini API key to function.

1.  **Get an API Key**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

2.  **Create a `.env` file**: In the root of the project, rename the `.env.example` file to `.env`.

3.  **Add your key**: Open the new `.env` file and add your API key.
    ```
    API_KEY="YOUR_GEMINI_API_KEY_HERE"
    ```

### 4. Vite Configuration (Important!)

The application code expects the API key to be available at `process.env.API_KEY`. By default, Vite does **not** expose environment variables this way for security reasons. To make it work, you must configure your `vite.config.js` (or `vite.config.ts`) file.

Create a `vite.config.ts` file in the project root with the following content:

```typescript
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
```
This configuration securely loads the key from your `.env` file and makes it available to the application code as `process.env.API_KEY`.

### 5. Running the Development Server

Once the dependencies are installed and your `.env` file is configured, you can start the development server.

```bash
npm run dev
```

This will start the Vite development server, and you can access the application at `http://localhost:5173` (or another port if 5173 is busy).

## Code Structure

-   `index.html`: Main HTML file, includes CDN links for Tailwind CSS and other libraries.
-   `index.tsx`: The entry point of the React application.
-   `package.json`: Defines project scripts and dependencies.
-   `vite.config.ts`: Configuration file for the Vite development server.
-   `src/`: Contains the main application source code.
    -   `App.tsx`: The main application component that manages state and layout.
    -   `components/`: Contains reusable React components.
        -   `MindMap.tsx`: Renders the entire SVG mind map.
        -   `Icon.tsx`: Helper for rendering SVG icons.
    -   `services/`: Modules for handling external logic.
        -   `geminiService.ts`: Encapsulates all communication with the Google Gemini API.
        -   `fileParser.ts`: Logic for reading and parsing user-uploaded files.
    -   `types.ts`: Shared TypeScript type definitions.
