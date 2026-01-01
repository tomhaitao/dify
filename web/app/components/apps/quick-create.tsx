'use client'

import React, { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { CreateFromDSLModalTab } from '@/app/components/app/create-from-dsl-modal'
import { useProviderContext } from '@/context/provider-context'
import { FileArrow01, FilePlus01, FilePlus02 } from '@/app/components/base/icons/src/vender/line/files'
import dynamic from 'next/dynamic'

const CreateAppModal = dynamic(() => import('@/app/components/app/create-app-modal'), {
  ssr: false,
})
const CreateAppTemplateDialog = dynamic(() => import('@/app/components/app/create-app-dialog'), {
  ssr: false,
})
const CreateFromDSLModal = dynamic(() => import('@/app/components/app/create-from-dsl-modal'), {
  ssr: false,
})

export type QuickCreateProps = {
  onSuccess?: () => void
  selectedAppType?: string
}

const QuickCreate = ({
  onSuccess,
  selectedAppType,
}: QuickCreateProps) => {
  const { t } = useTranslation()
  const { onPlanInfoChanged } = useProviderContext()
  const searchParams = useSearchParams()
  const { replace } = useRouter()
  const dslUrl = searchParams.get('remoteInstallUrl') || undefined

  const [showNewAppTemplateDialog, setShowNewAppTemplateDialog] = useState(false)
  const [showNewAppModal, setShowNewAppModal] = useState(false)
  const [showCreateFromDSLModal, setShowCreateFromDSLModal] = useState(!!dslUrl)

  const activeTab = useMemo(() => {
    if (dslUrl)
      return CreateFromDSLModalTab.FROM_URL
    return undefined
  }, [dslUrl])

  return (
    <div className="flex flex-col gap-1 px-8 pb-4 pt-4">
      {/* <div className="flex items-center px-1">
        <span className="text-sm font-medium text-text-secondary">
          {t('app.quickCreate.title')}
        </span>
      </div> */}
      <div className="flex items-center gap-4">
        {/* 创建空白应用 - 紫色系 */}
        <button
          type="button"
          onClick={() => setShowNewAppModal(true)}
          className="flex h-16 w-[244px] cursor-pointer items-center gap-3 rounded-lg border-[0.5px] border-[#d9caf9] bg-[#fbf9fe] px-6 py-4 transition-all hover:shadow-sm"
        >
          <div className="flex items-center justify-center">
            <div className="flex size-6 items-center justify-center rounded bg-[#dacdfb]">
              <FilePlus01 className="size-4 text-[#7c3aed]" />
            </div>
          </div>
          <span className="text-sm font-medium text-text-secondary">
            {t('app.newApp.startFromBlank')}
          </span>
        </button>

        {/* 从应用模版创建 - 绿色系 */}
        <button
          type="button"
          onClick={() => setShowNewAppTemplateDialog(true)}
          className="flex h-16 w-[244px] cursor-pointer items-center gap-3 rounded-lg border-[0.5px] border-[#a7e3a0] bg-[#f8fdf7] px-6 py-4 transition-all hover:shadow-sm"
        >
          <div className="flex items-center justify-center">
            <div className="flex size-6 items-center justify-center rounded bg-[#bce4bc]">
              <FilePlus02 className="size-4 text-[#16a34a]" />
            </div>
          </div>
          <span className="text-sm font-medium text-text-secondary">
            {t('app.newApp.startFromTemplate')}
          </span>
        </button>

        {/* 导入DSL文件 - 蓝色系 */}
        <button
          type="button"
          onClick={() => setShowCreateFromDSLModal(true)}
          className="flex h-16 w-[244px] cursor-pointer items-center gap-3 rounded-lg border-[0.5px] border-[#c5d3fb] bg-[#f8f9fe] px-6 py-4 transition-all hover:shadow-sm"
        >
          <div className="flex items-center justify-center">
            <div className="flex size-6 items-center justify-center rounded bg-[#acc4fa]">
              <FileArrow01 className="size-4 text-[#2563eb]" />
            </div>
          </div>
          <span className="text-sm font-medium text-text-secondary">
            {t('app.importDSL')}
          </span>
        </button>
      </div>

      {showNewAppModal && (
        <CreateAppModal
          show={showNewAppModal}
          onClose={() => setShowNewAppModal(false)}
          onSuccess={() => {
            onPlanInfoChanged()
            if (onSuccess)
              onSuccess()
          }}
          onCreateFromTemplate={() => {
            setShowNewAppTemplateDialog(true)
            setShowNewAppModal(false)
          }}
          defaultAppMode={selectedAppType !== 'all' ? selectedAppType as any : undefined}
        />
      )}
      {showNewAppTemplateDialog && (
        <CreateAppTemplateDialog
          show={showNewAppTemplateDialog}
          onClose={() => setShowNewAppTemplateDialog(false)}
          onSuccess={() => {
            onPlanInfoChanged()
            if (onSuccess)
              onSuccess()
          }}
          onCreateFromBlank={() => {
            setShowNewAppModal(true)
            setShowNewAppTemplateDialog(false)
          }}
        />
      )}
      {showCreateFromDSLModal && (
        <CreateFromDSLModal
          show={showCreateFromDSLModal}
          onClose={() => {
            setShowCreateFromDSLModal(false)
            if (dslUrl)
              replace('/')
          }}
          activeTab={activeTab}
          dslUrl={dslUrl}
          onSuccess={() => {
            onPlanInfoChanged()
            if (onSuccess)
              onSuccess()
          }}
        />
      )}
    </div>
  )
}

QuickCreate.displayName = 'QuickCreate'

export default React.memo(QuickCreate)
