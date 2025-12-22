'use client'

import type { FC } from 'react'
import { RiGridLine, RiTableLine } from '@remixicon/react'
import cn from '@/utils/classnames'

export type ViewMode = 'grid' | 'table'

type ViewToggleProps = {
  value: ViewMode
  onChange: (value: ViewMode) => void
  className?: string
}

const ViewToggle: FC<ViewToggleProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <div className={cn('flex items-center rounded-lg bg-components-segmented-control-bg-normal p-0.5', className)}>
      <button
        type='button'
        onClick={() => onChange('grid')}
        className={cn(
          'flex items-center justify-center rounded-md p-1.5 transition-colors',
          value === 'grid'
            ? 'bg-components-panel-bg text-text-secondary shadow-xs'
            : 'text-text-tertiary hover:text-text-secondary',
        )}
        aria-label='Grid view'
      >
        <RiGridLine className='size-4' />
      </button>
      <button
        type='button'
        onClick={() => onChange('table')}
        className={cn(
          'flex items-center justify-center rounded-md p-1.5 transition-colors',
          value === 'table'
            ? 'bg-components-panel-bg text-text-secondary shadow-xs'
            : 'text-text-tertiary hover:text-text-secondary',
        )}
        aria-label='Table view'
      >
        <RiTableLine className='size-4' />
      </button>
    </div>
  )
}

export default ViewToggle
