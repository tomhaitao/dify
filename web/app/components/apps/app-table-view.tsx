'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useContext } from 'use-context-selector'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { RiMoreFill } from '@remixicon/react'
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
import { AppTypeIcon } from '@/app/components/app/type-selector'
import { useAsyncWindowOpen } from '@/hooks/use-async-window-open'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { formatTime } from '@/utils/time'
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

  const onConfirmDelete = useCallback(async () => {
    try {
      await deleteApp(app.id)
      notify({ type: 'success', message: t('app.appDeleted') })
      if (onRefresh)
        onRefresh()
      onPlanInfoChanged()
    }
    catch (e: any) {
      notify({
        type: 'error',
        message: `${t('app.appDeleteFailed')}${'message' in e ? `: ${e.message}` : ''}`,
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

  const onClickSettings = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    handleCloseOperations()
    setShowEditModal(true)
  }, [handleCloseOperations])

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

  const updateTimeText = useMemo(() => {
    return formatTime({
      date: (app.updated_at || app.created_at) * 1000,
      dateFormat: 'YYYY/MM/DD HH:mm',
    })
  }, [app.updated_at, app.created_at])

  const handleRowClick = (e: React.MouseEvent) => {
    e.preventDefault()
    getRedirection(isCurrentWorkspaceEditor, app, push)
  }

  return (
    <>
      <tr
        onClick={handleRowClick}
        className='group cursor-pointer border-b border-divider-subtle bg-components-panel-bg transition-colors hover:bg-background-default-hover'
      >
        {/* Title column */}
        <td className='h-[54px] px-4 py-2'>
          <div className='flex items-center gap-3'>
            <div className='relative shrink-0'>
              <AppIcon
                size="small"
                iconType={app.icon_type}
                icon={app.icon}
                background={app.icon_background}
                imageUrl={app.icon_url}
              />
              <AppTypeIcon type={app.mode} wrapperClassName='absolute -bottom-0.5 -right-0.5 w-4 h-4 shadow-sm' className='h-3 w-3' />
            </div>
            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
              <p className='truncate text-sm font-medium text-text-secondary' title={app.name}>
                {app.name}
              </p>
              {app.description && (
                <p className='truncate text-xs text-text-tertiary' title={app.description}>
                  {app.description}
                </p>
              )}
            </div>
          </div>
        </td>

        {/* Module column */}
        <td className='h-[54px] w-[160px] px-4 py-2'>
          <p className='truncate text-sm font-bold text-text-secondary'>
            {app.module ? `【 ${moduleDisplayMap[app.module] || app.module} 】` : '-'}
          </p>
        </td>

        {/* Status column */}
        <td className='h-[54px] w-[160px] px-4 py-2'>
          {app.app_status
            ? (
              <div className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                app.app_status === 'inProgress' && 'bg-[#e1f0ff] text-[#2b85e4]',
                app.app_status === 'testing' && 'bg-[#fff5e6] text-[#f29100]',
                app.app_status === 'completed' && 'bg-[#ffebf0] text-[#e84e72]',
              )}>
                <div className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  app.app_status === 'inProgress' && 'bg-[#2b85e4]',
                  app.app_status === 'testing' && 'bg-[#f29100]',
                  app.app_status === 'completed' && 'bg-[#e84e72]',
                )} />
                {statusDisplayMap[app.app_status] || app.app_status}
              </div>
            )
            : '-'}
        </td>

        {/* Tags column */}
        <td className='h-[54px] w-[160px] px-4 py-2' onClick={e => e.stopPropagation()}>
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
                    className='inline-flex items-center rounded bg-components-badge-bg-dimm px-1.5 py-1 text-xs font-medium text-text-tertiary'
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
        <td className='h-[54px] w-[160px] px-4 py-2'>
          <p className='truncate text-sm text-text-tertiary' title={app.author_name || '-'}>
            {app.author_name || '-'}
          </p>
        </td>

        {/* Update time column */}
        <td className='h-[54px] w-[200px] px-4 py-2'>
          <p className='text-sm text-text-tertiary'>
            {updateTimeText}
          </p>
        </td>

        {/* Actions column */}
        <td className='h-[54px] w-[56px] px-4 py-2' onClick={e => e.stopPropagation()}>
          {isCurrentWorkspaceEditor && (
            <PortalToFollowElem
              open={showOperations}
              onOpenChange={setShowOperations}
              placement='bottom-end'
              offset={4}
            >
              <PortalToFollowElemTrigger onClick={() => setShowOperations(v => !v)}>
                <div
                  className={cn(
                    'flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-opacity hover:bg-state-base-hover',
                    showOperations ? 'bg-state-base-hover opacity-100' : 'opacity-0 group-hover:opacity-100',
                  )}
                >
                  <RiMoreFill className='h-4 w-4 text-text-tertiary' />
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
                    <button type="button" className='mx-1 flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3 hover:bg-state-base-hover' onClick={onClickSettings}>
                      <span className='system-sm-regular text-text-secondary'>{t('app.editApp')}</span>
                    </button>
                    <Divider className="my-1" />
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
          )}
        </td>
      </tr>
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
    <div className='w-full overflow-x-auto'>
      <table className='w-full min-w-[800px] border-collapse'>
        <thead>
          <tr className='h-10 border-b border-divider-subtle'>
            <th className='px-4 text-left text-sm font-normal text-text-tertiary'>
              {t('app.table.title')}
            </th>
            <th className='w-[160px] px-4 text-left text-sm font-normal text-text-tertiary'>
              {t('app.table.module')}
            </th>
            <th className='w-[160px] px-4 text-left text-sm font-normal text-text-tertiary'>
              {t('app.table.status')}
            </th>
            <th className='w-[160px] px-4 text-left text-sm font-normal text-text-tertiary'>
              {t('app.table.tags')}
            </th>
            <th className='w-[160px] px-4 text-left text-sm font-normal text-text-tertiary'>
              {t('app.table.creator')}
            </th>
            <th className='w-[200px] px-4 text-left text-sm font-normal text-text-tertiary'>
              {t('app.table.updateTime')}
            </th>
            <th className='w-[56px] px-4'></th>
          </tr>
        </thead>
        <tbody>
          {apps.map(app => (
            <AppTableRow key={app.id} app={app} onRefresh={onRefresh} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default React.memo(AppTableView)
