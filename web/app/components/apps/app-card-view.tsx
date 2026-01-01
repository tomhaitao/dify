'use client'

import React from 'react'
import type { App } from '@/types/app'
import AppCard from './app-card'

export type AppCardViewProps = {
  apps: App[]
  onRefresh?: () => void
}

const AppCardView = ({ apps, onRefresh }: AppCardViewProps) => {
  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      {/* Scrollable Cards Grid */}
      <div className='min-h-0 w-full flex-1 overflow-auto px-4'>
        <div className='grid grid-cols-1 content-start gap-4 pt-2 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4'>
          {apps.map(app => (
            <AppCard key={app.id} app={app} onRefresh={onRefresh} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default React.memo(AppCardView)
