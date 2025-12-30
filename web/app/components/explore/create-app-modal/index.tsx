'use client'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RiCloseLine, RiCommandLine, RiCornerDownLeftLine } from '@remixicon/react'
import { useDebounceFn, useKeyPress } from 'ahooks'
import AppIconPicker from '../../base/app-icon-picker'
import Modal from '@/app/components/base/modal'
import Button from '@/app/components/base/button'
import Input from '@/app/components/base/input'
import Textarea from '@/app/components/base/textarea'
import Switch from '@/app/components/base/switch'
import Toast from '@/app/components/base/toast'
import AppIcon from '@/app/components/base/app-icon'
import { useProviderContext } from '@/context/provider-context'
import { SimpleSelect } from '@/app/components/base/select'
import PureSelect from '@/app/components/base/select/pure'
import AppsFull from '@/app/components/billing/apps-full-in-dialog'
import { type AppIconType, AppModeEnum } from '@/types/app'
import { noop } from 'lodash-es'

export type CreateAppModalProps = {
  show: boolean
  isEditModal?: boolean
  appName: string
  appDescription: string
  appIconType: AppIconType | null
  appIcon: string
  appIconBackground?: string | null
  appIconUrl?: string | null
  appMode?: string
  appModule?: string | null
  appStatus?: string | null
  appUseIconAsAnswerIcon?: boolean
  appCreatorName?: string | null
  max_active_requests?: number | null
  onConfirm: (info: {
    name: string
    icon_type: AppIconType
    icon: string
    icon_background?: string
    description: string
    module?: string | null
    app_status?: string | null
    use_icon_as_answer_icon?: boolean
    max_active_requests?: number | null
    created_by_name?: string | null
  }) => Promise<void>
  confirmDisabled?: boolean
  onHide: () => void
}

const CreateAppModal = ({
  show = false,
  isEditModal = false,
  appIconType,
  appIcon: _appIcon,
  appIconBackground,
  appIconUrl,
  appName,
  appDescription,
  appMode,
  appModule,
  appStatus,
  appUseIconAsAnswerIcon,
  appCreatorName,
  max_active_requests,
  onConfirm,
  confirmDisabled,
  onHide,
}: CreateAppModalProps) => {
  const { t } = useTranslation()

  const [name, setName] = React.useState(appName)
  const [appIcon, setAppIcon] = useState(
    () => appIconType === 'image'
      ? { type: 'image' as const, fileId: _appIcon, url: appIconUrl }
      : { type: 'emoji' as const, icon: _appIcon, background: appIconBackground },
  )
  const [showAppIconPicker, setShowAppIconPicker] = useState(false)
  const [description, setDescription] = useState(appDescription || '')
  const [moduleValue, setModuleValue] = useState(appModule || '')
  const [statusValue, setStatusValue] = useState(appStatus || '')
  const [useIconAsAnswerIcon, setUseIconAsAnswerIcon] = useState(appUseIconAsAnswerIcon || false)
  // Valid creator options
  const validCreatorValues = ['chen', 'zing', 'erik', 'flex', 'alan', 'tony']

  // Parse comma-separated creator names into array, filtering out invalid values like 'admin'
  const [creatorNames, setCreatorNames] = useState<string[]>(() => {
    if (!appCreatorName) return []
    return appCreatorName.split(',').map(name => name.trim()).filter(name => validCreatorValues.includes(name))
  })

  const [maxActiveRequestsInput, setMaxActiveRequestsInput] = useState(
    max_active_requests !== null && max_active_requests !== undefined ? String(max_active_requests) : '',
  )

  const { plan, enableBilling } = useProviderContext()
  const isAppsFull = (enableBilling && plan.usage.buildApps >= plan.total.buildApps)

  const moduleOptions = [
    { value: 'global', name: t('app.moduleOptions.global') },
    { value: 'college', name: t('app.moduleOptions.college') },
    { value: 'major', name: t('app.moduleOptions.major') },
    { value: 'skill', name: t('app.moduleOptions.skill') },
    { value: 'career', name: t('app.moduleOptions.career') },
    { value: 'region', name: t('app.moduleOptions.region') },
  ]

  const statusOptions = [
    { value: 'testing', name: t('app.statusOptions.testing') },
    { value: 'inProgress', name: t('app.statusOptions.inProgress') },
    { value: 'completed', name: t('app.statusOptions.completed') },
  ]

  const submit = useCallback(() => {
    if (!name.trim()) {
      Toast.notify({ type: 'error', message: t('explore.appCustomize.nameRequired') })
      return
    }
    // Validate required fields in edit modal
    if (isEditModal) {
      if (!moduleValue) {
        Toast.notify({ type: 'error', message: t('app.validation.moduleRequired') })
        return
      }
      if (!statusValue) {
        Toast.notify({ type: 'error', message: t('app.validation.statusRequired') })
        return
      }
      if (creatorNames.length === 0) {
        Toast.notify({ type: 'error', message: t('app.validation.creatorRequired') })
        return
      }
    }
    const isValid = maxActiveRequestsInput.trim() !== '' && !isNaN(Number(maxActiveRequestsInput))
    const payload: any = {
      name,
      icon_type: appIcon.type,
      icon: appIcon.type === 'emoji' ? appIcon.icon : appIcon.fileId,
      icon_background: appIcon.type === 'emoji' ? appIcon.background! : undefined,
      description,
      module: moduleValue || null,
      app_status: statusValue || null,
      use_icon_as_answer_icon: useIconAsAnswerIcon,
      created_by_name: creatorNames.length > 0 ? creatorNames.join(',') : null,
    }
    if (isValid)
      payload.max_active_requests = Number(maxActiveRequestsInput)

    onConfirm(payload)
    onHide()
  }, [name, appIcon, description, moduleValue, statusValue, useIconAsAnswerIcon, creatorNames, onConfirm, onHide, t, maxActiveRequestsInput, isEditModal])

  const { run: handleSubmit } = useDebounceFn(submit, { wait: 300 })

  useKeyPress(['meta.enter', 'ctrl.enter'], () => {
    if (show && !(!isEditModal && isAppsFull) && name.trim())
      handleSubmit()
  })

  useKeyPress('esc', () => {
    if (show)
      onHide()
  })

  return (
    <>
      <Modal
        isShow={show}
        onClose={noop}
        className='relative !max-w-[480px] px-8'
      >
        <div className='absolute right-4 top-4 cursor-pointer p-2' onClick={onHide}>
          <RiCloseLine className='h-4 w-4 text-text-tertiary' />
        </div>
        {isEditModal && (
          <div className='mb-9 text-xl font-semibold leading-[30px] text-text-primary'>{t('app.editAppTitle')}</div>
        )}
        {!isEditModal && (
          <div className='mb-9 text-xl font-semibold leading-[30px] text-text-primary'>{t('explore.appCustomize.title', { name: appName })}</div>
        )}
        <div className='mb-9'>
          {/* icon & name */}
          <div className='pt-2'>
            <div className='py-2 text-sm font-medium leading-[20px] text-text-primary'>{t('app.newApp.captionName')}</div>
            <div className='flex items-center justify-between space-x-2'>
              <AppIcon
                size='large'
                onClick={() => { setShowAppIconPicker(true) }}
                className='cursor-pointer'
                iconType={appIcon.type}
                icon={appIcon.type === 'image' ? appIcon.fileId : appIcon.icon}
                background={appIcon.type === 'image' ? undefined : appIcon.background}
                imageUrl={appIcon.type === 'image' ? appIcon.url : undefined}
              />
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('app.newApp.appNamePlaceholder') || ''}
                className='h-10 grow'
              />
            </div>
          </div>
          {/* description */}
          <div className='pt-2'>
            <div className='py-2 text-sm font-medium leading-[20px] text-text-primary'>{t('app.newApp.captionDescription')}</div>
            <Textarea
              className='resize-none'
              placeholder={t('app.newApp.appDescriptionPlaceholder') || ''}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          {isEditModal && (
            <div className='pt-2'>
              <div className='mb-1 flex h-6 items-center'>
                <label className='text-sm font-medium leading-[20px] text-text-primary'>{t('app.table.module')}</label>
                <span className='ml-1 text-red-500'>*</span>
              </div>
              <SimpleSelect
                items={moduleOptions}
                defaultValue={moduleValue}
                onSelect={item => setModuleValue(item.value as string)}
                placeholder={t('common.placeholder.select') || ''}
              />
              <div className='mt-3'>
                <div className='mb-1 flex h-6 items-center'>
                  <label className='text-sm font-medium leading-[20px] text-text-primary'>{t('app.table.status')}</label>
                  <span className='ml-1 text-red-500'>*</span>
                </div>
                <SimpleSelect
                  items={statusOptions}
                  defaultValue={statusValue}
                  onSelect={item => setStatusValue(item.value as string)}
                  placeholder={t('common.placeholder.select') || ''}
                />
              </div>
              <div className='mt-3'>
                <div className='mb-1 flex h-6 items-center'>
                  <label className='text-sm font-medium leading-[20px] text-text-primary'>{t('app.table.creator')}</label>
                  <span className='ml-1 text-red-500'>*</span>
                </div>
                <PureSelect
                  multiple={true}
                  options={[
                    { value: 'chen', label: 'chen' },
                    { value: 'zing', label: 'zing' },
                    { value: 'erik', label: 'erik' },
                    { value: 'flex', label: 'flex' },
                    { value: 'alan', label: 'alan' },
                    { value: 'tony', label: 'tony' },
                  ]}
                  value={creatorNames}
                  onChange={values => setCreatorNames(values)}
                  placeholder={t('app.newApp.creatorPlaceholder') || ''}
                  triggerPopupSameWidth={true}
                  renderTriggerText={selectedValues => selectedValues.join(', ')}
                />
              </div>
            </div>
          )}
          {/* answer icon */}
          {isEditModal && (appMode === AppModeEnum.CHAT || appMode === AppModeEnum.ADVANCED_CHAT || appMode === AppModeEnum.AGENT_CHAT) && (
            <div className='pt-2'>
              <div className='flex items-center justify-between'>
                <div className='py-2 text-sm font-medium leading-[20px] text-text-primary'>{t('app.answerIcon.title')}</div>
                <Switch
                  defaultValue={useIconAsAnswerIcon}
                  onChange={v => setUseIconAsAnswerIcon(v)}
                />
              </div>
              <p className='body-xs-regular text-text-tertiary'>{t('app.answerIcon.descriptionInExplore')}</p>
            </div>
          )}
          {isEditModal && (
            <div className='pt-2'>
              <div className='mb-2 mt-2 text-sm font-medium leading-[20px] text-text-primary'>{t('app.maxActiveRequests')}</div>
              <Input
                type='number'
                min={1}
                placeholder={t('app.maxActiveRequestsPlaceholder')}
                value={maxActiveRequestsInput}
                onChange={(e) => {
                  setMaxActiveRequestsInput(e.target.value)
                }}
                className='h-10 w-full'
              />
              <p className='body-xs-regular mb-0 mt-2 text-text-tertiary'>{t('app.maxActiveRequestsTip')}</p>
            </div>
          )}
          {!isEditModal && isAppsFull && <AppsFull className='mt-4' loc='app-explore-create' />}
        </div>
        <div className='flex flex-row-reverse'>
          <Button
            disabled={(!isEditModal && isAppsFull) || !name.trim() || confirmDisabled}
            className='ml-2 w-24 gap-1'
            variant='primary'
            onClick={handleSubmit}
          >
            <span>{!isEditModal ? t('common.operation.create') : t('common.operation.save')}</span>
            <div className='flex gap-0.5'>
              <RiCommandLine size={14} className='system-kbd rounded-sm bg-components-kbd-bg-white p-0.5' />
              <RiCornerDownLeftLine size={14} className='system-kbd rounded-sm bg-components-kbd-bg-white p-0.5' />
            </div>
          </Button>
          <Button className='w-24' onClick={onHide}>{t('common.operation.cancel')}</Button>
        </div>
      </Modal>
      {showAppIconPicker && <AppIconPicker
        onSelect={(payload) => {
          setAppIcon(payload)
          setShowAppIconPicker(false)
        }}
        onClose={() => {
          setAppIcon(appIconType === 'image'
            ? { type: 'image' as const, url: appIconUrl, fileId: _appIcon }
            : { type: 'emoji' as const, icon: _appIcon, background: appIconBackground })
          setShowAppIconPicker(false)
        }}
      />}
    </>
  )
}

export default CreateAppModal
