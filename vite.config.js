/**
 * Vite configuration file
 * Configures build settings and plugins for the application
 * @see {@link https://vite.dev/config/}
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite configuration object
 * @type {import('vite').UserConfig}
 */
export default defineConfig({
  /**
   * Plugins configuration
   * @property {Array} plugins - List of Vite plugins
   * @property {Function} plugins[].react - React plugin for Vite
   */
  plugins: [react()],

  /**
   * Base public path
   * Used when deploying to GitHub Pages or other non-root URLs
   * @property {string} base - The base URL path for the application
   */
  base: '/CostManegerApp/',
})