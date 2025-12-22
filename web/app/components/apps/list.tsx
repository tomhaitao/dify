'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useRouter,
} from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useDebounceFn, useLocalStorageState } from 'ahooks'
import {
  RiApps2Line,
  RiDragDropLine,
  RiExchange2Line,
  RiFile4Line,
  RiMessage3Line,
  RiRobot3Line,
} from '@remixicon/react'
import AppCard from './app-card'
import AppTableView from './app-table-view'
import ViewToggle, { type ViewMode } from './view-toggle'
import QuickCreate from './quick-create'
import useAppsQueryState from './hooks/use-apps-query-state'
import { useDSLDragDrop } from './hooks/use-dsl-drag-drop'
import { useAppContext } from '@/context/app-context'
import { NEED_REFRESH_APP_LIST_KEY } from '@/config'
import { CheckModal } from '@/hooks/use-pay'
import TabSliderNew from '@/app/components/base/tab-slider-new'
import { useTabSearchParams } from '@/hooks/use-tab-searchparams'
import Input from '@/app/components/base/input'
import { useStore as useTagStore } from '@/app/components/base/tag-management/store'
import TagFilter from '@/app/components/base/tag-management/filter'
import CheckboxWithLabel from '@/app/components/datasets/create/website/base/checkbox-with-label'
import PureSelect from '@/app/components/base/select/pure'
import dynamic from 'next/dynamic'
import Empty from './empty'
import Footer from './footer'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { AppModeEnum } from '@/types/app'
import { useInfiniteAppList } from '@/service/use-apps'

const TagManagementModal = dynamic(() => import('@/app/components/base/tag-management'), {
  ssr: false,
})
const CreateFromDSLModal = dynamic(() => import('@/app/components/app/create-from-dsl-modal'), {
  ssr: false,
})

const APPS_VIEW_MODE_KEY = 'apps-view-mode'

const List = () => {
  const { t } = useTranslation()
  const { systemFeatures } = useGlobalPublicStore()
  const router = useRouter()
  const { isCurrentWorkspaceEditor, isCurrentWorkspaceDatasetOperator } = useAppContext()
  const showTagManagementModal = useTagStore(s => s.showTagManagementModal)
  const [activeTab, setActiveTab] = useTabSearchParams({
    defaultTab: 'all',
  })
  const { query: { tagIDs = [], keywords = '', isCreatedByMe: queryIsCreatedByMe = false, module: queryModule = '', appStatus: queryAppStatus = '' }, setQuery } = useAppsQueryState()
  const [isCreatedByMe, setIsCreatedByMe] = useState(queryIsCreatedByMe)
  const [tagFilterValue, setTagFilterValue] = useState<string[]>(tagIDs)
  const [searchKeywords, setSearchKeywords] = useState(keywords)
  const [moduleFilter, setModuleFilter] = useState(queryModule)
  const [statusFilter, setStatusFilter] = useState(queryAppStatus)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showCreateFromDSLModal, setShowCreateFromDSLModal] = useState(false)
  const [droppedDSLFile, setDroppedDSLFile] = useState<File | undefined>()
  const [viewMode, setViewMode] = useLocalStorageState<ViewMode>(APPS_VIEW_MODE_KEY, {
    defaultValue: 'grid',
  })
  const setKeywords = useCallback((keywords: string) => {
    setQuery(prev => ({ ...prev, keywords }))
  }, [setQuery])
  const setTagIDs = useCallback((tagIDs: string[]) => {
    setQuery(prev => ({ ...prev, tagIDs }))
  }, [setQuery])

  const handleModuleChange = useCallback((value: string) => {
    setModuleFilter(value)
    setQuery(prev => ({ ...prev, module: value }))
  }, [setQuery])

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value)
    setQuery(prev => ({ ...prev, appStatus: value }))
  }, [setQuery])

  const moduleOptions = [
    { value: '', label: t('app.table.module') },
    { value: 'global', label: t('app.moduleOptions.global') },
    { value: 'college', label: t('app.moduleOptions.college') },
    { value: 'major', label: t('app.moduleOptions.major') },
    { value: 'skill', label: t('app.moduleOptions.skill') },
    { value: 'career', label: t('app.moduleOptions.career') },
    { value: 'region', label: t('app.moduleOptions.region') },
  ]

  const statusOptions = [
    { value: '', label: t('app.table.status') },
    { value: 'testing', label: t('app.statusOptions.testing') },
    { value: 'inProgress', label: t('app.statusOptions.inProgress') },
    { value: 'completed', label: t('app.statusOptions.completed') },
  ]

  const handleDSLFileDropped = useCallback((file: File) => {
    setDroppedDSLFile(file)
    setShowCreateFromDSLModal(true)
  }, [])

  const { dragging } = useDSLDragDrop({
    onDSLFileDropped: handleDSLFileDropped,
    containerRef,
    enabled: isCurrentWorkspaceEditor,
  })

  const appListQueryParams = {
    page: 1,
    limit: 30,
    name: searchKeywords,
    tag_ids: tagIDs,
    is_created_by_me: isCreatedByMe,
    ...(activeTab !== 'all' ? { mode: activeTab as AppModeEnum } : {}),
    ...(moduleFilter ? { module: moduleFilter } : {}),
    ...(statusFilter ? { app_status: statusFilter } : {}),
  }

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
    refetch,
  } = useInfiniteAppList(appListQueryParams, { enabled: !isCurrentWorkspaceDatasetOperator })

  const anchorRef = useRef<HTMLDivElement>(null)
  const options = [
    { value: 'all', text: t('app.types.all'), icon: <RiApps2Line className='mr-1 h-[14px] w-[14px]' /> },
    { value: AppModeEnum.WORKFLOW, text: t('app.types.workflow'), icon: <RiExchange2Line className='mr-1 h-[14px] w-[14px]' /> },
    { value: AppModeEnum.ADVANCED_CHAT, text: t('app.types.advanced'), icon: <RiMessage3Line className='mr-1 h-[14px] w-[14px]' /> },
    { value: AppModeEnum.CHAT, text: t('app.types.chatbot'), icon: <RiMessage3Line className='mr-1 h-[14px] w-[14px]' /> },
    { value: AppModeEnum.AGENT_CHAT, text: t('app.types.agent'), icon: <RiRobot3Line className='mr-1 h-[14px] w-[14px]' /> },
    { value: AppModeEnum.COMPLETION, text: t('app.types.completion'), icon: <RiFile4Line className='mr-1 h-[14px] w-[14px]' /> },
  ]

  useEffect(() => {
    if (localStorage.getItem(NEED_REFRESH_APP_LIST_KEY) === '1') {
      localStorage.removeItem(NEED_REFRESH_APP_LIST_KEY)
      refetch()
    }
  }, [refetch])

  useEffect(() => {
    if (isCurrentWorkspaceDatasetOperator)
      return router.replace('/datasets')
  }, [router, isCurrentWorkspaceDatasetOperator])

  useEffect(() => {
    if (isCurrentWorkspaceDatasetOperator)
      return
    const hasMore = hasNextPage ?? true
    let observer: IntersectionObserver | undefined

    if (error) {
      if (observer)
        observer.disconnect()
      return
    }

    if (anchorRef.current && containerRef.current) {
      // Calculate dynamic rootMargin: clamps to 100-200px range, using 20% of container height as the base value for better responsiveness
      const containerHeight = containerRef.current.clientHeight
      const dynamicMargin = Math.max(100, Math.min(containerHeight * 0.2, 200)) // Clamps to 100-200px range, using 20% of container height as the base value

      observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading && !isFetchingNextPage && !error && hasMore)
          fetchNextPage()
      }, {
        root: containerRef.current,
        rootMargin: `${dynamicMargin}px`,
        threshold: 0.1, // Trigger when 10% of the anchor element is visible
      })
      observer.observe(anchorRef.current)
    }
    return () => observer?.disconnect()
  }, [isLoading, isFetchingNextPage, fetchNextPage, error, hasNextPage, isCurrentWorkspaceDatasetOperator])

  const { run: handleSearch } = useDebounceFn(() => {
    setSearchKeywords(keywords)
  }, { wait: 500 })
  const handleKeywordsChange = (value: string) => {
    setKeywords(value)
    handleSearch()
  }

  const { run: handleTagsUpdate } = useDebounceFn(() => {
    setTagIDs(tagFilterValue)
  }, { wait: 500 })
  const handleTagsChange = (value: string[]) => {
    setTagFilterValue(value)
    handleTagsUpdate()
  }

  const handleCreatedByMeChange = useCallback(() => {
    const newValue = !isCreatedByMe
    setIsCreatedByMe(newValue)
    setQuery(prev => ({ ...prev, isCreatedByMe: newValue }))
  }, [isCreatedByMe, setQuery])

  const pages = data?.pages ?? []
  const hasAnyApp = (pages[0]?.total ?? 0) > 0

  return (
    <>
      <div ref={containerRef} className='relative flex h-0 shrink-0 grow flex-col overflow-y-auto bg-background-body'>
        {dragging && (
          <div className="absolute inset-0 z-50 m-0.5 rounded-2xl border-2 border-dashed border-components-dropzone-border-accent bg-[rgba(21,90,239,0.14)] p-2">
          </div>
        )}
        {isCurrentWorkspaceEditor && (
          <QuickCreate onSuccess={refetch} selectedAppType={activeTab} />
        )}

        <div className='sticky top-0 z-10 flex flex-col gap-4 bg-background-body px-12 pb-5 pt-7'>
          <div className='flex flex-wrap items-center justify-between gap-y-2'>
            <div className='flex items-center gap-3'>
              <TabSliderNew
                value={activeTab}
                onChange={setActiveTab}
                options={options}
              />
            </div>
            <div className='flex items-center gap-2'>
              <CheckboxWithLabel
                className='mr-2'
                label={t('app.showMyCreatedAppsOnly')}
                isChecked={isCreatedByMe}
                onChange={handleCreatedByMeChange}
              />
              <PureSelect
                value={statusFilter}
                options={statusOptions}
                onChange={handleStatusChange}
                triggerProps={{ className: 'min-w-[80px]' }}
              />
              <PureSelect
                value={moduleFilter}
                options={moduleOptions}
                onChange={handleModuleChange}
                triggerProps={{ className: 'min-w-[80px]' }}
              />
              <TagFilter type='app' value={tagFilterValue} onChange={handleTagsChange} />
              <Input
                showLeftIcon
                showClearIcon
                wrapperClassName='w-[200px]'
                value={keywords}
                onChange={e => handleKeywordsChange(e.target.value)}
                onClear={() => handleKeywordsChange('')}
              />
              <ViewToggle value={viewMode ?? 'grid'} onChange={setViewMode} />
            </div>
          </div>
        </div>
        {hasAnyApp
          ? viewMode === 'table'
            ? (
              <div className='flex grow flex-col px-12 pt-2'>
                <AppTableView
                  apps={pages.flatMap(page => page.data)}
                  onRefresh={refetch}
                />
              </div>
            )
            : (
              <div className='relative grid grow grid-cols-1 content-start gap-4 px-12 pt-2 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 2k:grid-cols-6'>
                {pages.map(({ data: apps }) => apps.map(app => (
                  <AppCard key={app.id} app={app} onRefresh={refetch} />
                )))}
              </div>
            )
          : <div className='relative grid grow grid-cols-1 content-start gap-4 overflow-hidden px-12 pt-2 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 2k:grid-cols-6'>
            <Empty />
          </div>}

        {isCurrentWorkspaceEditor && (
          <div
            className={`flex items-center justify-center gap-2 py-4 ${dragging ? 'text-text-accent' : 'text-text-quaternary'}`}
            role="region"
            aria-label={t('app.newApp.dropDSLToCreateApp')}
          >
            <RiDragDropLine className="h-4 w-4" />
            <span className="system-xs-regular">{t('app.newApp.dropDSLToCreateApp')}</span>
          </div>
        )}
        {!systemFeatures.branding.enabled && (
          <Footer />
        )}
        <CheckModal />
        <div ref={anchorRef} className='h-0'> </div>
        {showTagManagementModal && (
          <TagManagementModal type='app' show={showTagManagementModal} />
        )}
      </div>

      {showCreateFromDSLModal && (
        <CreateFromDSLModal
          show={showCreateFromDSLModal}
          onClose={() => {
            setShowCreateFromDSLModal(false)
            setDroppedDSLFile(undefined)
          }}
          onSuccess={() => {
            setShowCreateFromDSLModal(false)
            setDroppedDSLFile(undefined)
            refetch()
          }}
          droppedFile={droppedDSLFile}
        />
      )}
    </>
  )
}

export default List
