/**
 * Main entry point for the React application
 * Renders the root App component in StrictMode
 * @module main
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app.jsx'

/**
 * Creates and renders the root React component
 * Uses StrictMode for additional development checks
 * @function
 * @returns {void}
 */
createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App/>
    </StrictMode>,
)