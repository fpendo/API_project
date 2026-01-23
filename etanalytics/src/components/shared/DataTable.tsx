/**
 * DataTable Component
 * Reusable table with sorting, filtering, and pagination
 */
import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

interface Column<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  render?: (row: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (row: T) => string | number
  searchable?: boolean
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  pageSize?: number
  emptyMessage?: string
  onRowClick?: (row: T) => void
  className?: string
  stickyHeader?: boolean
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  pageSize = 10,
  emptyMessage = 'No data available',
  onRowClick,
  className = '',
  stickyHeader = false
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter data by search term
  const filteredData = useMemo(() => {
    if (!searchTerm || searchKeys.length === 0) return data
    
    const term = searchTerm.toLowerCase()
    return data.filter(row =>
      searchKeys.some(key => {
        const value = row[key]
        if (value === null || value === undefined) return false
        return String(value).toLowerCase().includes(term)
      })
    )
  }, [data, searchTerm, searchKeys])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortKey]
      const bValue = b[sortKey]
      
      if (aValue === bValue) return 0
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      
      const comparison = aValue < bValue ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortKey, sortDirection])

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  const totalPages = Math.ceil(sortedData.length / pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) return null
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />
  }

  return (
    <div className={`${className}`}>
      {/* Search Bar */}
      {searchable && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
            <tr className="border-b border-white/10 bg-dark-800/50">
              {columns.map(column => (
                <th
                  key={String(column.key)}
                  className={`text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:text-white select-none' : ''
                  } ${column.headerClassName || ''}`}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && <SortIcon columnKey={String(column.key)} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length}
                  className="py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <motion.tr
                  key={keyExtractor(row)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => onRowClick?.(row)}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-white/5' : ''} transition-colors`}
                >
                  {columns.map(column => (
                    <td 
                      key={`${keyExtractor(row)}-${String(column.key)}`}
                      className={`py-3 px-4 ${column.className || ''}`}
                    >
                      {column.render 
                        ? column.render(row, index)
                        : String(row[column.key as keyof T] ?? '-')
                      }
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-dark-800 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number
                if (totalPages <= 5) {
                  page = i + 1
                } else if (currentPage <= 3) {
                  page = i + 1
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i
                } else {
                  page = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm ${
                      currentPage === page
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-dark-800 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable



