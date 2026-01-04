import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx
 * Handles conditional classes and removes conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatCredits(credits: number): string {
  if (credits >= 1_000_000) {
    return `${(credits / 1_000_000).toFixed(2)}M`
  }
  if (credits >= 1_000) {
    return `${(credits / 1_000).toFixed(1)}K`
  }
  return credits.toLocaleString()
}

/**
 * Format currency in GBP
 */
export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format tonnage with appropriate precision
 */
export function formatTonnage(tonnes: number): string {
  if (tonnes >= 1) {
    return `${tonnes.toFixed(2)} t`
  }
  return `${tonnes.toFixed(4)} t`
}

/**
 * Convert credits to tonnes (1 tonne = 100,000 credits)
 */
export function creditsToTonnes(credits: number): number {
  return credits / 100_000
}

/**
 * Convert tonnes to credits
 */
export function tonnesToCredits(tonnes: number): number {
  return tonnes * 100_000
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return `${str.slice(0, length)}...`
}

/**
 * Truncate address/hash for display
 */
export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

