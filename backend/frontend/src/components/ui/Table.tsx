import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

// Table Root
interface TableProps extends HTMLAttributes<HTMLTableElement> {
  compact?: boolean
}

const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, compact = false, ...props }, ref) => (
    <div className="relative w-full overflow-auto rounded-lg border border-border">
      <table
        ref={ref}
        className={cn(
          'w-full caption-bottom text-sm',
          compact ? '[&_td]:py-2 [&_th]:py-2' : '',
          className
        )}
        {...props}
      />
    </div>
  )
)
Table.displayName = 'Table'

// Table Header
const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn('bg-background-elevated/50 [&_tr]:border-b', className)}
      {...props}
    />
  )
)
TableHeader.displayName = 'TableHeader'

// Table Body
const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
)
TableBody.displayName = 'TableBody'

// Table Footer
const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn(
        'border-t border-border bg-background-elevated/50 font-medium',
        className
      )}
      {...props}
    />
  )
)
TableFooter.displayName = 'TableFooter'

// Table Row
interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  expandable?: boolean
  expandedContent?: ReactNode
  isExpanded?: boolean
  onExpandToggle?: () => void
}

const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, expandable, expandedContent, isExpanded, onExpandToggle, children, ...props }, ref) => (
    <>
      <tr
        ref={ref}
        className={cn(
          'border-b border-border transition-colors',
          'hover:bg-background-elevated/30',
          expandable && 'cursor-pointer',
          className
        )}
        onClick={expandable ? onExpandToggle : undefined}
        {...props}
      >
        {children}
      </tr>
      <AnimatePresence>
        {expandable && isExpanded && expandedContent && (
          <tr>
            <td colSpan={100} className="p-0 border-b border-border">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden bg-background-deep/50"
              >
                <div className="p-4">{expandedContent}</div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
)
TableRow.displayName = 'TableRow'

// Table Head Cell
interface TableHeadProps extends HTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean
  sorted?: 'asc' | 'desc' | false
  onSort?: () => void
  align?: 'left' | 'center' | 'right'
}

const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable, sorted, onSort, align = 'left', children, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-12 px-4 align-middle font-semibold text-text-secondary',
        '[&:has([role=checkbox])]:pr-0',
        sortable && 'cursor-pointer select-none hover:text-text-primary',
        align === 'left' && 'text-left',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className={cn('flex items-center gap-2', align === 'center' && 'justify-center', align === 'right' && 'justify-end')}>
        {children}
        {sortable && (
          <span className="text-text-muted">
            {sorted === 'asc' && '↑'}
            {sorted === 'desc' && '↓'}
            {!sorted && '↕'}
          </span>
        )}
      </div>
    </th>
  )
)
TableHead.displayName = 'TableHead'

// Table Cell
interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right'
  mono?: boolean
  colSpan?: number
}

const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align = 'left', mono = false, colSpan, ...props }, ref) => (
    <td
      ref={ref}
      colSpan={colSpan}
      className={cn(
        'p-4 align-middle text-text-primary',
        '[&:has([role=checkbox])]:pr-0',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        mono && 'font-mono text-sm',
        className
      )}
      {...props}
    />
  )
)
TableCell.displayName = 'TableCell'

// Table Caption
const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      className={cn('mt-4 text-sm text-text-muted', className)}
      {...props}
    />
  )
)
TableCaption.displayName = 'TableCaption'

// Empty state component
interface TableEmptyProps {
  icon?: ReactNode
  title?: string
  description?: string
  action?: ReactNode
  colSpan?: number
}

function TableEmpty({
  icon,
  title = 'No data',
  description,
  action,
  colSpan = 100,
}: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-48">
        <div className="flex flex-col items-center justify-center text-center py-8">
          {icon && <div className="text-text-muted mb-3">{icon}</div>}
          <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>
          {description && <p className="text-sm text-text-muted mb-4 max-w-md">{description}</p>}
          {action}
        </div>
      </td>
    </tr>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableEmpty,
  type TableProps,
  type TableRowProps,
  type TableHeadProps,
  type TableCellProps,
}

