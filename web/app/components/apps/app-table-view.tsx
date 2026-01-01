'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useContext } from 'use-context-selector'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { RiEditLine, RiMoreFill } from '@remixicon/react'
import cn from '@/utils/classnames'
import { type App, AppModeEnum } from '@/types/app'
import Toast, { ToastContext } from '@/app/components/base/toast'
import { copyApp, deleteApp, exportAppConfig, updateAppInfo } from '@/service/apps'
import type { DuplicateAppModalProps } from '@/app/components/app/duplicate-modal'
import AppIcon from '@/app/components/base/app-icon'
import { useAppContext } from '@/context/app-context'
import {
  PortalToFollowElem,
  PortalToFollowElemContent,
  PortalToFollowElemTrigger,
} from '@/app/components/base/portal-to-follow-elem'
import Divider from '@/app/components/base/divider'
import { getRedirection } from '@/utils/app-redirection'
import { useProviderContext } from '@/context/provider-context'
import { NEED_REFRESH_APP_LIST_KEY } from '@/config'
import type { CreateAppModalProps } from '@/app/components/explore/create-app-modal'
import type { Tag } from '@/app/components/base/tag-management/constant'
import TagSelector from '@/app/components/base/tag-management/selector'
import type { EnvironmentVariable } from '@/app/components/workflow/types'
import { fetchWorkflowDraft } from '@/service/workflow'
import { fetchInstalledAppList } from '@/service/explore'
// import { AppTypeIcon } from '@/app/components/app/type-selector'
import { useAsyncWindowOpen } from '@/hooks/use-async-window-open'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { useGetUserCanAccessApp } from '@/service/access-control'
import { basePath } from '@/utils/var'
import dynamic from 'next/dynamic'

const EditAppModal = dynamic(() => import('@/app/components/explore/create-app-modal'), {
  ssr: false,
})
const DuplicateAppModal = dynamic(() => import('@/app/components/app/duplicate-modal'), {
  ssr: false,
})
const SwitchAppModal = dynamic(() => import('@/app/components/app/switch-app-modal'), {
  ssr: false,
})
const Confirm = dynamic(() => import('@/app/components/base/confirm'), {
  ssr: false,
})
const DSLExportConfirmModal = dynamic(() => import('@/app/components/workflow/dsl-export-confirm-modal'), {
  ssr: false,
})
const AccessControl = dynamic(() => import('@/app/components/app/app-access-control'), {
  ssr: false,
})

type AppTableRowProps = {
  app: App
  onRefresh?: () => void
}

const AppTableRow = ({ app, onRefresh }: AppTableRowProps) => {
  const { t } = useTranslation()
  const { notify } = useContext(ToastContext)
  const systemFeatures = useGlobalPublicStore(s => s.systemFeatures)
  const { isCurrentWorkspaceEditor } = useAppContext()
  const { onPlanInfoChanged } = useProviderContext()
  const { push } = useRouter()
  const openAsyncWindow = useAsyncWindowOpen()

  const moduleDisplayMap: Record<string, string> = useMemo(() => ({
    global: t('app.moduleOptions.global'),
    college: t('app.moduleOptions.college'),
    major: t('app.moduleOptions.major'),
    skill: t('app.moduleOptions.skill'),
    career: t('app.moduleOptions.career'),
    region: t('app.moduleOptions.region'),
  }), [t])

  const statusDisplayMap: Record<string, string> = useMemo(() => ({
    testing: t('app.statusOptions.testing'),
    inProgress: t('app.statusOptions.inProgress'),
    completed: t('app.statusOptions.completed'),
  }), [t])

  const [showEditModal, setShowEditModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showSwitchModal, setShowSwitchModal] = useState<boolean>(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showAccessControl, setShowAccessControl] = useState(false)
  const [secretEnvList, setSecretEnvList] = useState<EnvironmentVariable[]>([])
  const [showOperations, setShowOperations] = useState(false)
  const [showModuleSelector, setShowModuleSelector] = useState(false)
  const [showStatusSelector, setShowStatusSelector] = useState(false)
  const [showCreatorSelector, setShowCreatorSelector] = useState(false)

  const onConfirmDelete = useCallback(async () => {
    try {
      await deleteApp(app.id)
      notify({ type: 'success', message: t('app.appDeleted') })
      if (onRefresh)
        onRefresh()
      onPlanInfoChanged()
    }
    catch (e: any) {
      const errorSuffix = 'message' in e ? `: ${e.message}` : ''
      notify({
        type: 'error',
        message: `${t('app.appDeleteFailed')}${errorSuffix}`,
      })
    }
    setShowConfirmDelete(false)
  }, [app.id, notify, onPlanInfoChanged, onRefresh, t])

  const onEdit: CreateAppModalProps['onConfirm'] = useCallback(async ({
    name,
    icon_type,
    icon,
    icon_background,
    description,
    module,
    app_status,
    use_icon_as_answer_icon,
    max_active_requests,
    created_by_name,
  }) => {
    try {
      await updateAppInfo({
        appID: app.id,
        name,
        icon_type,
        icon,
        icon_background,
        description,
        module,
        app_status,
        use_icon_as_answer_icon,
        max_active_requests,
        created_by_name,
      })
      setShowEditModal(false)
      notify({
        type: 'success',
        message: t('app.editDone'),
      })
      if (onRefresh)
        onRefresh()
    }
    catch (e: any) {
      notify({
        type: 'error',
        message: e.message || t('app.editFailed'),
      })
    }
  }, [app.id, notify, onRefresh, t])

  const onCopy: DuplicateAppModalProps['onConfirm'] = async ({ name, icon_type, icon, icon_background }) => {
    try {
      const newApp = await copyApp({
        appID: app.id,
        name,
        icon_type,
        icon,
        icon_background,
        mode: app.mode,
      })
      setShowDuplicateModal(false)
      notify({
        type: 'success',
        message: t('app.newApp.appCreated'),
      })
      localStorage.setItem(NEED_REFRESH_APP_LIST_KEY, '1')
      if (onRefresh)
        onRefresh()
      onPlanInfoChanged()
      getRedirection(isCurrentWorkspaceEditor, newApp, push)
    }
    catch {
      notify({ type: 'error', message: t('app.newApp.appCreateFailed') })
    }
  }

  const onExport = useCallback(async (include = false) => {
    try {
      const { data } = await exportAppConfig({
        appID: app.id,
        include,
      })
      const a = document.createElement('a')
      const file = new Blob([data], { type: 'application/yaml' })
      const url = URL.createObjectURL(file)
      a.href = url
      a.download = `${app.name}.yml`
      a.click()
      URL.revokeObjectURL(url)
    }
    catch {
      notify({ type: 'error', message: t('app.exportFailed') })
    }
  }, [app.id, app.name, notify, t])

  const exportCheck = useCallback(async () => {
    if (app.mode !== AppModeEnum.WORKFLOW && app.mode !== AppModeEnum.ADVANCED_CHAT) {
      onExport()
      return
    }
    try {
      const workflowDraft = await fetchWorkflowDraft(`/apps/${app.id}/workflows/draft`)
      const list = (workflowDraft.environment_variables || []).filter(env => env.value_type === 'secret')
      if (list.length === 0) {
        onExport()
        return
      }
      setSecretEnvList(list)
    }
    catch {
      notify({ type: 'error', message: t('app.exportFailed') })
    }
  }, [app.mode, app.id, notify, t, onExport])

  const onSwitch = () => {
    if (onRefresh)
      onRefresh()
    setShowSwitchModal(false)
  }

  const onUpdateAccessControl = useCallback(() => {
    if (onRefresh)
      onRefresh()
    setShowAccessControl(false)
  }, [onRefresh, setShowAccessControl])

  const { data: userCanAccessApp, isLoading: isGettingUserCanAccessApp } = useGetUserCanAccessApp({ appId: app?.id, enabled: (showOperations && systemFeatures.webapp_auth.enabled) })

  const handleCloseOperations = useCallback(() => {
    setShowOperations(false)
  }, [])

  const onClickDuplicate = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    handleCloseOperations()
    setShowDuplicateModal(true)
  }, [handleCloseOperations])

  const onClickExport = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    handleCloseOperations()
    exportCheck()
  }, [handleCloseOperations, exportCheck])

  const onClickSwitch = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    handleCloseOperations()
    setShowSwitchModal(true)
  }, [handleCloseOperations])

  const onClickDelete = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    handleCloseOperations()
    setShowConfirmDelete(true)
  }, [handleCloseOperations])

  const onClickAccessControl = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    handleCloseOperations()
    setShowAccessControl(true)
  }, [handleCloseOperations])

  const onClickInstalledApp = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    handleCloseOperations()
    try {
      await openAsyncWindow(async () => {
        const { installed_apps }: any = await fetchInstalledAppList(app.id) || {}
        if (installed_apps?.length > 0)
          return `${basePath}/explore/installed/${installed_apps[0].id}`
        throw new Error('No app found in Explore')
      }, {
        onError: (err) => {
          Toast.notify({ type: 'error', message: `${err.message || err}` })
        },
      })
    }
    catch (e: any) {
      Toast.notify({ type: 'error', message: `${e.message || e}` })
    }
  }, [handleCloseOperations, openAsyncWindow, app.id])

  const [tags, setTags] = useState<Tag[]>(app.tags)
  useEffect(() => {
    setTags(app.tags)
  }, [app.tags])

  const handleRowClick = (e: React.MouseEvent) => {
    e.preventDefault()
    getRedirection(isCurrentWorkspaceEditor, app, push)
  }

  const moduleOptions = useMemo(() => [
    { value: 'global', label: moduleDisplayMap.global, bgColor: 'bg-[#f4dcdce6]', textColor: 'text-[#780a0a]' },
    { value: 'college', label: moduleDisplayMap.college, bgColor: 'bg-[#f0e0d299]', textColor: 'text-[#632903]' },
    { value: 'major', label: moduleDisplayMap.major, bgColor: 'bg-[#efe9d3cc]', textColor: 'text-[#6b5505]' },
    { value: 'skill', label: moduleDisplayMap.skill, bgColor: 'bg-[#d6e8ef]', textColor: 'text-[#073c68]' },
    { value: 'career', label: moduleDisplayMap.career, bgColor: 'bg-[#d7efe2]', textColor: 'text-[#054f31]' },
    { value: 'region', label: moduleDisplayMap.region, bgColor: 'bg-[#ebdcf44d]', textColor: 'text-[#420463]' },
  ], [moduleDisplayMap])

  const handleModuleChange = useCallback(async (newModule: string) => {
    setShowModuleSelector(false)
    if (newModule === app.module) return
    try {
      await updateAppInfo({
        appID: app.id,
        name: app.name,
        icon_type: app.icon_type || 'emoji',
        icon: app.icon,
        icon_background: app.icon_background || undefined,
        description: app.description,
        module: newModule,
        app_status: app.app_status,
        use_icon_as_answer_icon: app.use_icon_as_answer_icon,
        max_active_requests: app.max_active_requests ?? null,
        created_by_name: app.author_name,
      })
      notify({
        type: 'success',
        message: t('app.editDone'),
      })
      if (onRefresh)
        onRefresh()
    }
    catch (e: any) {
      notify({
        type: 'error',
        message: e.message || t('app.editFailed'),
      })
    }
  }, [app, notify, onRefresh, t])

  const currentModuleOption = useMemo(() => {
    return moduleOptions.find(opt => opt.value === app.module)
  }, [app.module, moduleOptions])

  const statusOptions = useMemo(() => [
    { value: 'testing', label: statusDisplayMap.testing, bgColor: 'bg-[#fff5e6]', textColor: 'text-[#f29100]' },
    { value: 'inProgress', label: statusDisplayMap.inProgress, bgColor: 'bg-[#e1f0ff]', textColor: 'text-[#2b85e4]' },
    { value: 'completed', label: statusDisplayMap.completed, bgColor: 'bg-[#d7efe2]', textColor: 'text-[#054f31]' },
  ], [statusDisplayMap])

  const handleStatusChange = useCallback(async (newStatus: string) => {
    setShowStatusSelector(false)
    if (newStatus === app.app_status) return
    try {
      await updateAppInfo({
        appID: app.id,
        name: app.name,
        icon_type: app.icon_type || 'emoji',
        icon: app.icon,
        icon_background: app.icon_background || undefined,
        description: app.description,
        module: app.module,
        app_status: newStatus,
        use_icon_as_answer_icon: app.use_icon_as_answer_icon,
        max_active_requests: app.max_active_requests ?? null,
        created_by_name: app.author_name,
      })
      notify({
        type: 'success',
        message: t('app.editDone'),
      })
      if (onRefresh)
        onRefresh()
    }
    catch (e: any) {
      notify({
        type: 'error',
        message: e.message || t('app.editFailed'),
      })
    }
  }, [app, notify, onRefresh, t])

  const currentStatusOption = useMemo(() => {
    return statusOptions.find(opt => opt.value === app.app_status)
  }, [app.app_status, statusOptions])

  const creatorOptions = useMemo(() => [
    { value: 'chen', label: 'chen', bgColor: 'bg-[#f4dcdce6]', textColor: 'text-[#780a0a]' },
    { value: 'zing', label: 'zing', bgColor: 'bg-[#f0e0d299]', textColor: 'text-[#632903]' },
    { value: 'erik', label: 'erik', bgColor: 'bg-[#efe9d3cc]', textColor: 'text-[#6b5505]' },
    { value: 'flex', label: 'flex', bgColor: 'bg-[#d6e8ef]', textColor: 'text-[#073c68]' },
    { value: 'alan', label: 'alan', bgColor: 'bg-[#d7efe2]', textColor: 'text-[#054f31]' },
    { value: 'tony', label: 'tony', bgColor: 'bg-[#ebdcf44d]', textColor: 'text-[#420463]' },
  ], [])

  // Parse current creator names from comma-separated string
  const currentCreatorNames = useMemo(() => {
    if (!app.author_name) return []
    return app.author_name.split(',').map(name => name.trim()).filter(Boolean)
  }, [app.author_name])

  const handleCreatorChange = useCallback(async (newCreators: string[]) => {
    const newCreatorString = newCreators.join(',')
    if (newCreatorString === app.author_name) return
    try {
      await updateAppInfo({
        appID: app.id,
        name: app.name,
        icon_type: app.icon_type || 'emoji',
        icon: app.icon,
        icon_background: app.icon_background || undefined,
        description: app.description,
        module: app.module,
        app_status: app.app_status,
        use_icon_as_answer_icon: app.use_icon_as_answer_icon,
        max_active_requests: app.max_active_requests ?? null,
        created_by_name: newCreatorString || null,
      })
      notify({
        type: 'success',
        message: t('app.editDone'),
      })
      if (onRefresh)
        onRefresh()
    }
    catch (e: any) {
      notify({
        type: 'error',
        message: e.message || t('app.editFailed'),
      })
    }
  }, [app, notify, onRefresh, t])

  return (
    <>
      <tr
        // onClick={handleRowClick}
        className='group border-b border-divider-subtle bg-components-panel-bg transition-colors hover:bg-background-default-hover'
      >
        {/* Title column */}
        <td className='h-[72px] w-[352px] cursor-pointer px-4 py-2' onClick={handleRowClick}>
          <div className='flex items-center gap-3'>
            <div className='relative shrink-0'>
              <AppIcon
                size="small"
                iconType={app.icon_type}
                icon={app.icon}
                background={app.icon_background}
                imageUrl={app.icon_url}
              />
              {/* <AppTypeIcon type={app.mode} wrapperClassName='absolute -bottom-0.5 -right-0.5 w-4 h-4 shadow-sm' className='h-3 w-3' /> */}
            </div>
            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
              <p className='truncate text-sm font-medium text-[#0a0a0a]' title={app.name}>
                {app.name}
              </p>
              <p className='truncate text-xs text-[#696f81]'>
                {app.updated_at ? new Date(app.updated_at * 1000).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }).replace(/\//g, '/').replace(',', '') : '-'}
              </p>
            </div>
          </div>
        </td>

        {/* Status column */}
        <td className='h-[72px] w-[120px] cursor-pointer px-4 py-2' onClick={e => e.stopPropagation()}>
          {isCurrentWorkspaceEditor ? (
            <PortalToFollowElem
              open={showStatusSelector}
              onOpenChange={setShowStatusSelector}
              placement='bottom-start'
              offset={4}
            >
              <PortalToFollowElemTrigger onClick={() => setShowStatusSelector(v => !v)}>
                <div className='cursor-pointer rounded-md p-1 transition-colors hover:bg-state-base-hover'>
                  {currentStatusOption ? (
                    <div className={cn(
                      'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium',
                      currentStatusOption.bgColor,
                      currentStatusOption.textColor,
                    )}>
                      {currentStatusOption.label}
                    </div>
                  ) : (
                    <div className='flex items-center gap-x-0.5 rounded-[5px] border border-dashed border-divider-deep bg-components-badge-bg-dimm px-[5px] py-[3px]'>
                      <div className='system-2xs-medium-uppercase text-nowrap text-text-tertiary'>
                        {t('app.selectStatus')}
                      </div>
                    </div>
                  )}
                </div>
              </PortalToFollowElemTrigger>
              <PortalToFollowElemContent className='z-50'>
                <div
                  className='w-[200px] overflow-hidden rounded-xl border border-components-panel-border bg-components-panel-bg py-1 shadow-lg'
                  onMouseLeave={() => setShowStatusSelector(false)}
                >
                  {statusOptions.map(option => (
                    <div
                      key={option.value}
                      className={cn(
                        'mx-1 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-state-base-hover',
                        app.app_status === option.value && 'bg-state-base-hover',
                      )}
                      onClick={() => handleStatusChange(option.value)}
                    >
                      <div className={cn(
                        'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium',
                        option.bgColor,
                        option.textColor,
                      )}>
                        {option.label}
                      </div>
                    </div>
                  ))}
                </div>
              </PortalToFollowElemContent>
            </PortalToFollowElem>
          ) : (
            currentStatusOption
              ? (
                <div className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium',
                  currentStatusOption.bgColor,
                  currentStatusOption.textColor,
                )}>
                  {currentStatusOption.label}
                </div>
              )
              : '-'
          )}
        </td>

        {/* Module column */}
        <td className='h-[72px] w-[120px] cursor-pointer px-4 py-2' onClick={e => e.stopPropagation()}>
          {isCurrentWorkspaceEditor ? (
            <PortalToFollowElem
              open={showModuleSelector}
              onOpenChange={setShowModuleSelector}
              placement='bottom-start'
              offset={4}
            >
              <PortalToFollowElemTrigger onClick={() => setShowModuleSelector(v => !v)}>
                <div className='cursor-pointer rounded-md p-1 transition-colors hover:bg-state-base-hover'>
                  {currentModuleOption ? (
                    <div className={cn(
                      'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium',
                      currentModuleOption.bgColor,
                      currentModuleOption.textColor,
                    )}>
                      {currentModuleOption.label}
                    </div>
                  ) : (
                    <div className='flex items-center gap-x-0.5 rounded-[5px] border border-dashed border-divider-deep bg-components-badge-bg-dimm px-[5px] py-[3px]'>
                      <div className='system-2xs-medium-uppercase text-nowrap text-text-tertiary'>
                        {t('app.selectModule')}
                      </div>
                    </div>
                  )}
                </div>
              </PortalToFollowElemTrigger>
              <PortalToFollowElemContent className='z-50'>
                <div
                  className='w-[200px] overflow-hidden rounded-xl border border-components-panel-border bg-components-panel-bg py-1 shadow-lg'
                  onMouseLeave={() => setShowModuleSelector(false)}
                >
                  {moduleOptions.map(option => (
                    <div
                      key={option.value}
                      className={cn(
                        'mx-1 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-state-base-hover',
                        app.module === option.value && 'bg-state-base-hover',
                      )}
                      onClick={() => handleModuleChange(option.value)}
                    >
                      <div className={cn(
                        'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium',
                        option.bgColor,
                        option.textColor,
                      )}>
                        {option.label}
                      </div>
                    </div>
                  ))}
                </div>
              </PortalToFollowElemContent>
            </PortalToFollowElem>
          ) : (
            currentModuleOption
              ? (
                <div className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium',
                  currentModuleOption.bgColor,
                  currentModuleOption.textColor,
                )}>
                  {currentModuleOption.label}
                </div>
              )
              : '-'
          )}
        </td>

        {/* Tags column */}
        <td className='h-[72px] w-[120px] px-4 py-2' onClick={e => e.stopPropagation()}>
          {isCurrentWorkspaceEditor
            ? (
              <TagSelector
                position='bl'
                type='app'
                targetID={app.id}
                value={tags.map(tag => tag.id)}
                selectedTags={tags}
                onCacheUpdate={setTags}
                onChange={onRefresh}
              />
            )
            : (
              <div className='flex flex-wrap gap-1'>
                {tags.slice(0, 2).map(tag => (
                  <span
                    key={tag.id}
                    className='inline-flex items-center rounded border border-[#e5e5e5] bg-[#f0f0f0] px-2 py-1 text-xs font-medium text-[#0a0a0a]'
                  >
                    {tag.name}
                  </span>
                ))}
                {tags.length > 2 && (
                  <span className='inline-flex items-center text-xs text-text-tertiary'>
                    +{tags.length - 2}
                  </span>
                )}
              </div>
            )}
        </td>

        {/* Creator column */}
        <td className='h-[72px] w-[120px] cursor-pointer px-4 py-2' onClick={e => e.stopPropagation()}>
          {isCurrentWorkspaceEditor ? (
            <PortalToFollowElem
              open={showCreatorSelector}
              onOpenChange={setShowCreatorSelector}
              placement='bottom-start'
              offset={4}
            >
              <PortalToFollowElemTrigger onClick={() => setShowCreatorSelector(v => !v)}>
                <div className='cursor-pointer rounded-md p-1 transition-colors hover:bg-state-base-hover'>
                  {currentCreatorNames.filter(name => creatorOptions.some(opt => opt.value === name)).length > 0 ? (
                    <div className='flex flex-wrap gap-1'>
                      {currentCreatorNames.filter(name => creatorOptions.some(opt => opt.value === name)).map((name) => {
                        const option = creatorOptions.find(opt => opt.value === name)
                        return option ? (
                          <span
                            key={name}
                            className={cn(
                              'inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium',
                              option.bgColor,
                              option.textColor,
                            )}
                          >
                            {option.label}
                          </span>
                        ) : null
                      })}
                    </div>
                  ) : (
                    <span className='text-text-tertiary'>-</span>
                  )}
                </div>
              </PortalToFollowElemTrigger>
              <PortalToFollowElemContent className='z-50'>
                <div
                  className='w-[200px] overflow-hidden rounded-xl border border-components-panel-border bg-components-panel-bg py-1 shadow-lg'
                  onMouseLeave={() => setShowCreatorSelector(false)}
                >
                  {creatorOptions.map((option) => {
                    const isSelected = currentCreatorNames.includes(option.value)
                    return (
                      <div
                        key={option.value}
                        className={cn(
                          'mx-1 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-state-base-hover',
                          isSelected && 'bg-state-base-hover',
                        )}
                        onClick={() => {
                          const newCreators = isSelected
                            ? currentCreatorNames.filter(name => name !== option.value)
                            : [...currentCreatorNames, option.value]
                          handleCreatorChange(newCreators)
                        }}
                      >
                        <div className={cn(
                          'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium',
                          option.bgColor,
                          option.textColor,
                        )}>
                          {option.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </PortalToFollowElemContent>
            </PortalToFollowElem>
          ) : (
            currentCreatorNames.filter(name => creatorOptions.some(opt => opt.value === name)).length > 0
              ? (
                <div className='flex flex-wrap gap-1'>
                  {currentCreatorNames.filter(name => creatorOptions.some(opt => opt.value === name)).map((name) => {
                    const option = creatorOptions.find(opt => opt.value === name)
                    return option ? (
                      <span
                        key={name}
                        className={cn(
                          'inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium',
                          option.bgColor,
                          option.textColor,
                        )}
                      >
                        {option.label}
                      </span>
                    ) : null
                  })}
                </div>
              )
              : '-'
          )}
        </td>

        {/* Description column */}
        <td className='h-[72px] w-[280px] px-4 py-2'>
          {app.description
            ? (
              <p className='line-clamp-2 text-sm text-[#737373]' title={app.description}>
                {app.description}
              </p>
            )
            : <span className='text-[#737373]'>-</span>}
        </td>

        {/* Actions column */}
        <td className='h-[72px] w-[88px] px-4 py-2' onClick={e => e.stopPropagation()}>
          {isCurrentWorkspaceEditor && (
            <div className='flex items-center gap-6'>
              {/* Edit icon */}
              <div
                className='flex h-6 w-6 cursor-pointer items-center justify-center rounded-md hover:bg-state-base-hover'
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setShowEditModal(true)
                }}
              >
                <RiEditLine className='h-4 w-4 text-[#696F81]' />
              </div>
              {/* More options */}
              <PortalToFollowElem
                open={showOperations}
                onOpenChange={setShowOperations}
                placement='bottom-end'
                offset={4}
              >
                <PortalToFollowElemTrigger onClick={() => setShowOperations(v => !v)}>
                  <div
                    className={cn(
                      'flex h-6 w-6 cursor-pointer items-center justify-center rounded-md hover:bg-state-base-hover',
                      showOperations && 'bg-state-base-hover',
                    )}
                  >
                    <RiMoreFill className='h-4 w-4 text-[#696F81]' />
                  </div>
                </PortalToFollowElemTrigger>
                <PortalToFollowElemContent className='z-50'>
                  <div
                    className={cn(
                      'overflow-hidden rounded-xl border border-components-panel-border bg-components-panel-bg shadow-lg',
                      (app.mode === AppModeEnum.COMPLETION || app.mode === AppModeEnum.CHAT)
                        ? 'w-[256px]'
                        : 'w-[216px]',
                    )}
                    onMouseLeave={handleCloseOperations}
                  >
                    <div className="flex w-full flex-col py-1">
                      <button type="button" className='mx-1 flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3 hover:bg-state-base-hover' onClick={onClickDuplicate}>
                        <span className='system-sm-regular text-text-secondary'>{t('app.duplicate')}</span>
                      </button>
                      <button type="button" className='mx-1 flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3 hover:bg-state-base-hover' onClick={onClickExport}>
                        <span className='system-sm-regular text-text-secondary'>{t('app.export')}</span>
                      </button>
                      {(app.mode === AppModeEnum.COMPLETION || app.mode === AppModeEnum.CHAT) && (
                        <>
                          <Divider className="my-1" />
                          <button
                            type="button"
                            className='mx-1 flex h-8 cursor-pointer items-center rounded-lg px-3 hover:bg-state-base-hover'
                            onClick={onClickSwitch}
                          >
                            <span className='text-sm leading-5 text-text-secondary'>{t('app.switch')}</span>
                          </button>
                        </>
                      )}
                      {
                        !app.has_draft_trigger && (
                          (!systemFeatures.webapp_auth.enabled)
                            ? <>
                              <Divider className="my-1" />
                              <button type="button" className='mx-1 flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3 hover:bg-state-base-hover' onClick={onClickInstalledApp}>
                                <span className='system-sm-regular text-text-secondary'>{t('app.openInExplore')}</span>
                              </button>
                            </>
                            : !(isGettingUserCanAccessApp || !userCanAccessApp?.result) && (
                              <>
                                <Divider className="my-1" />
                                <button type="button" className='mx-1 flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3 hover:bg-state-base-hover' onClick={onClickInstalledApp}>
                                  <span className='system-sm-regular text-text-secondary'>{t('app.openInExplore')}</span>
                                </button>
                              </>
                            )
                        )
                      }
                      <Divider className="my-1" />
                      {
                        systemFeatures.webapp_auth.enabled && isCurrentWorkspaceEditor && <>
                          <button type="button" className='mx-1 flex h-8 cursor-pointer items-center rounded-lg px-3 hover:bg-state-base-hover' onClick={onClickAccessControl}>
                            <span className='text-sm leading-5 text-text-secondary'>{t('app.accessControl')}</span>
                          </button>
                          <Divider className='my-1' />
                        </>
                      }
                      <button
                        type="button"
                        className='group mx-1 flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3 py-[6px] hover:bg-state-destructive-hover'
                        onClick={onClickDelete}
                      >
                        <span className='system-sm-regular text-text-secondary group-hover:text-text-destructive'>
                          {t('common.operation.delete')}
                        </span>
                      </button>
                    </div>
                  </div>
                </PortalToFollowElemContent>
              </PortalToFollowElem>
            </div>
          )}
        </td>
      </tr>
      {typeof document !== 'undefined' && createPortal(
        <>
          {showEditModal && (
            <EditAppModal
              isEditModal
              appName={app.name}
              appIconType={app.icon_type}
              appIcon={app.icon}
              appIconBackground={app.icon_background}
              appIconUrl={app.icon_url}
              appDescription={app.description}
              appModule={app.module}
              appStatus={app.app_status}
              appMode={app.mode}
              appUseIconAsAnswerIcon={app.use_icon_as_answer_icon}
              appCreatorName={app.author_name}
              max_active_requests={app.max_active_requests ?? null}
              show={showEditModal}
              onConfirm={onEdit}
              onHide={() => setShowEditModal(false)}
            />
          )}
          {showDuplicateModal && (
            <DuplicateAppModal
              appName={app.name}
              icon_type={app.icon_type}
              icon={app.icon}
              icon_background={app.icon_background}
              icon_url={app.icon_url}
              show={showDuplicateModal}
              onConfirm={onCopy}
              onHide={() => setShowDuplicateModal(false)}
            />
          )}
          {showSwitchModal && (
            <SwitchAppModal
              show={showSwitchModal}
              appDetail={app}
              onClose={() => setShowSwitchModal(false)}
              onSuccess={onSwitch}
            />
          )}
          {showConfirmDelete && (
            <Confirm
              title={t('app.deleteAppConfirmTitle')}
              content={t('app.deleteAppConfirmContent')}
              isShow={showConfirmDelete}
              onConfirm={onConfirmDelete}
              onCancel={() => setShowConfirmDelete(false)}
            />
          )}
          {secretEnvList.length > 0 && (
            <DSLExportConfirmModal
              envList={secretEnvList}
              onConfirm={onExport}
              onClose={() => setSecretEnvList([])}
            />
          )}
          {showAccessControl && (
            <AccessControl app={app} onConfirm={onUpdateAccessControl} onClose={() => setShowAccessControl(false)} />
          )}
        </>,
        document.body,
      )}
    </>
  )
}

export type AppTableViewProps = {
  apps: App[]
  onRefresh?: () => void
}

const AppTableView = ({ apps, onRefresh }: AppTableViewProps) => {
  const { t } = useTranslation()

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='min-h-0 w-full flex-1 overflow-auto'>
        <table className='w-full min-w-[1112px] border-collapse'>
          <thead className='sticky top-0 z-10'>
            <tr className='h-10 border-b border-divider-subtle bg-[#f5f5f5]'>
              <th className='w-[280px] px-4 text-left text-sm font-normal text-[#737373]'>
                {t('app.table.title')}
              </th>
              <th className='w-[120px] px-4 text-left text-sm font-normal text-[#737373]'>
                {t('app.table.status')}
              </th>
              <th className='w-[120px] px-4 text-left text-sm font-normal text-[#737373]'>
                {t('app.table.module')}
              </th>
              <th className='w-[120px] px-4 text-left text-sm font-normal text-[#737373]'>
                {t('app.table.tags')}
              </th>
              <th className='w-[120px] px-4 text-left text-sm font-normal text-[#737373]'>
                {t('app.table.creator')}
              </th>
              <th className='w-[360px] px-4 text-left text-sm font-normal text-[#737373]'>
                {t('app.newApp.captionDescription')}
              </th>
              <th className='w-[88px] px-4 text-left text-sm font-normal text-[#737373]'>
                {t('app.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {apps.map(app => (
              <AppTableRow key={app.id} app={app} onRefresh={onRefresh} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default React.memo(AppTableView)
