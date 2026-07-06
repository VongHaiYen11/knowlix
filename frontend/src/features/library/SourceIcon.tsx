import { Bookmark, CircleCheck, CircleDashed, File as FileIcon, FileText, FileType2, ImageIcon, Mic, Newspaper, Timer } from 'lucide-react'
import type { ComponentType } from 'react'
import type { ProcessingStatus, SourceType } from '@/types/knowledge'

export const sourceTypeIcon: Record<SourceType, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Note: FileText,
  PDF: FileType2,
  Article: Newspaper,
  Bookmark,
  Image: ImageIcon,
  Voice: Mic,
  File: FileIcon,
}

export const statusIcon: Record<ProcessingStatus, { icon: ComponentType<{ className?: string }>; className: string }> = {
  Processed: { icon: CircleCheck, className: 'text-primary' },
  Processing: { icon: Timer, className: 'text-muted-foreground' },
  Queued: { icon: CircleDashed, className: 'text-muted-foreground' },
}
