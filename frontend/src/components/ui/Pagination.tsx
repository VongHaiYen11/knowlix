import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  // Maximum visible pages = 5.
  // The selected page must always lie at the second-to-last position (index 3 of 5 visible pages: 0, 1, 2, [3], 4), unless constrained at limits.
  const maxVisible = 5
  let startPage = currentPage - 3
  if (startPage < 1) {
    startPage = 1
  }
  let endPage = startPage + maxVisible - 1
  if (endPage > totalPages) {
    endPage = totalPages
    startPage = Math.max(1, endPage - maxVisible + 1)
  }

  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1.5 mt-8', className)}>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all duration-200 hover:border-ring/40 disabled:opacity-50 disabled:hover:border-border disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          aria-current={page === currentPage ? 'page' : undefined}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-all duration-200',
            page === currentPage
              ? 'border-primary bg-primary text-primary-foreground shadow-md'
              : 'border-border bg-card text-muted-foreground hover:border-ring/40 hover:text-foreground'
          )}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all duration-200 hover:border-ring/40 disabled:opacity-50 disabled:hover:border-border disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}
