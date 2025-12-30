import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useStore as useTagStore } from './store'
import type { Tag } from '@/app/components/base/tag-management/constant'
import { fetchTagList } from '@/service/tag'
import Trigger from './trigger'
import Panel from './panel'
import {
  PortalToFollowElem,
  PortalToFollowElemContent,
  PortalToFollowElemTrigger,
} from '@/app/components/base/portal-to-follow-elem'

export type TagSelectorProps = {
  targetID: string
  isPopover?: boolean
  position?: 'bl' | 'br'
  type: 'knowledge' | 'app'
  value: string[]
  selectedTags: Tag[]
  onCacheUpdate: (tags: Tag[]) => void
  onChange?: () => void
  minWidth?: string
}

const TagSelector: FC<TagSelectorProps> = ({
  targetID,
  isPopover = true,
  position = 'bl',
  type,
  value,
  selectedTags,
  onCacheUpdate,
  onChange,
}) => {
  const tagList = useTagStore(s => s.tagList)
  const setTagList = useTagStore(s => s.setTagList)
  const [open, setOpen] = useState(false)

  const getTagList = useCallback(async () => {
    const res = await fetchTagList(type)
    setTagList(res)
  }, [setTagList, type])

  const tags = useMemo(() => {
    if (selectedTags?.length)
      return selectedTags.filter(selectedTag => tagList.find(tag => tag.id === selectedTag.id)).map(tag => tag.name)
    return []
  }, [selectedTags, tagList])

  return (
    <>
      {isPopover && (
        <PortalToFollowElem
          open={open}
          onOpenChange={setOpen}
          placement={position === 'br' ? 'bottom-end' : 'bottom-start'}
          offset={4}
        >
          <PortalToFollowElemTrigger onClick={() => setOpen(v => !v)}>
            <Trigger tags={tags} />
          </PortalToFollowElemTrigger>
          <PortalToFollowElemContent className='z-50'>
            <div
              className='w-[280px]'
              onMouseLeave={() => setOpen(false)}
            >
              <Panel
                type={type}
                targetID={targetID}
                value={value}
                selectedTags={selectedTags}
                onCacheUpdate={onCacheUpdate}
                onChange={onChange}
                onCreate={getTagList}
              />
            </div>
          </PortalToFollowElemContent>
        </PortalToFollowElem>
      )}
    </>

  )
}

export default TagSelector
