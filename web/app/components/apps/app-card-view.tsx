'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import cn from '@/utils/classnames'
import type { App } from '@/types/app'
import AppCard from './app-card'
import {
  PortalToFollowElem,
  PortalToFollowElemContent,
  PortalToFollowElemTrigger,
} from '@/app/components/base/portal-to-follow-elem'

export type AppCardViewProps = {
  apps: App[]
  onRefresh?: () => void
}

const AppCardView = ({ apps, onRefresh }: AppCardViewProps) => {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(false)

  const pageSizeOptions = [10, 20, 50, 100]
  const totalItems = apps.length
  const totalPages = Math.ceil(totalItems / pageSize)

    // Calculate the current page's apps
  const paginatedApps = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return apps.slice(startIndex, endIndex)
  }, [apps, currentPage, pageSize])

    // Reset to first page when apps change
  useEffect(() => {
    setCurrentPage(1)
  }, [apps.length])

    // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
    setShowPageSizeSelector(false)
  }, [])

    // Navigation handlers
  const goToFirstPage = useCallback(() => setCurrentPage(1), [])
  const goToPreviousPage = useCallback(() => setCurrentPage(prev => Math.max(1, prev - 1)), [])
  const goToNextPage = useCallback(() => setCurrentPage(prev => Math.min(totalPages, prev + 1)), [totalPages])
  const goToLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages])

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      {/* Scrollable Cards Grid */}
      <div className='min-h-0 w-full flex-1 overflow-auto px-4'>
        <div className='grid grid-cols-1 content-start gap-4 pt-2 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 2k:grid-cols-6'>
          {paginatedApps.map(app => (
            <AppCard key={app.id} app={app} onRefresh={onRefresh} />
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-end border-t border-divider-subtle px-12 py-3'>
        {/* Rows per page and Page info and navigation */}
        <div className='flex items-center gap-4'>
          {/* Rows per page */}
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium text-[#0a0a0a]'>
              {t('common.pagination.rowsPerPage')}
            </span>
            <PortalToFollowElem
              open={showPageSizeSelector}
              onOpenChange={setShowPageSizeSelector}
              placement='bottom-start'
              offset={4}
            >
              <PortalToFollowElemTrigger onClick={() => setShowPageSizeSelector(v => !v)}>
                <div className='flex h-9 w-20 cursor-pointer items-center justify-between rounded-lg border border-[#e5e5e5] bg-white px-4 py-2 shadow-xs hover:border-[#d4d4d4]'>
                  <span className='text-sm text-[#0a0a0a]'>{pageSize}</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6L8 10L12 6" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </PortalToFollowElemTrigger>
              <PortalToFollowElemContent className='z-50'>
                <div
                  className='w-20 overflow-hidden rounded-lg border border-[#e5e5e5] bg-white py-1 shadow-lg'
                  onMouseLeave={() => setShowPageSizeSelector(false)}
                >
                  {pageSizeOptions.map(option => (
                    <div
                      key={option}
                      className={cn(
                        'cursor-pointer px-4 py-2 text-sm hover:bg-[#f5f5f5]',
                        pageSize === option ? 'bg-[#f5f5f5] text-[#0a0a0a]' : 'text-[#737373]',
                      )}
                      onClick={() => handlePageSizeChange(option)}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              </PortalToFollowElemContent>
            </PortalToFollowElem>
          </div>

          {/* Page info */}
          <span className='text-sm text-[#0a0a0a]'>
            {t('common.pagination.page')} {currentPage} {t('common.pagination.of')} {totalPages}
          </span>

          {/* Navigation buttons */}
          <div className='flex items-center gap-1'>
            {/* First page */}
            <button
              type='button'
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] bg-white shadow-xs',
                currentPage === 1 ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#f5f5f5]',
              )}
              onClick={goToFirstPage}
              disabled={currentPage === 1}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 12L7 8L11 4" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 12L6 4" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Previous page */}
            <button
              type='button'
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] bg-white shadow-xs',
                currentPage === 1 ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#f5f5f5]',
              )}
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Next page */}
            <button
              type='button'
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] bg-white shadow-xs',
                currentPage === totalPages ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#f5f5f5]',
              )}
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 12L10 8L6 4" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Last page */}
            <button
              type='button'
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e5e5] bg-white shadow-xs',
                currentPage === totalPages ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#f5f5f5]',
              )}
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12L9 8L5 4" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 12L10 4" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(AppCardView)
