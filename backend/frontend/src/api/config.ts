/**
 * API configuration for NEMX frontend
 * Automatically handles development vs production environments
 */

// Get base API URL from environment or default
const getApiBaseUrl = (): string => {
  // In production, API is at the same domain under /api
  if (import.meta.env.PROD) {
    return '/api'
  }
  
  // In development, use Vite proxy or environment variable
  return import.meta.env.VITE_API_URL || ''
}

export const API_BASE_URL = getApiBaseUrl()

/**
 * Construct full API URL for an endpoint
 */
export const apiUrl = (path: string): string => {
  const base = API_BASE_URL
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}

export default {
  API_BASE_URL,
  apiUrl,
}

