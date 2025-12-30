import React from 'react'
import { useTranslation } from 'react-i18next'

type TriggerProps = {
  tags: string[]
}

const Trigger = ({
  tags,
}: TriggerProps) => {
  const { t } = useTranslation()

  return (
    <div className='flex w-full cursor-pointer items-center gap-1 overflow-hidden rounded-lg p-1 hover:bg-state-base-hover'>
      {!tags.length ? (
        <div className='flex items-center gap-1 rounded border border-[#e5e5e5] bg-[#f0f0f0] px-2 py-1 text-xs font-medium text-[#0a0a0a]'>
          <div className='text-nowrap'>
            {t('common.tag.addTag')}
          </div>
        </div>
      ) : (
        <>
          {
            tags.map((content, index) => {
              return (
                <div
                  key={index}
                  className='flex items-center gap-1 rounded border border-[#e5e5e5] bg-[#f0f0f0] px-2 py-1 text-xs font-medium text-[#0a0a0a]'
                >
                  <div className='text-nowrap'>
                    {content}
                  </div>
                </div>
              )
            })
          }
        </>
      )}
    </div>
  )
}

export default React.memo(Trigger)
