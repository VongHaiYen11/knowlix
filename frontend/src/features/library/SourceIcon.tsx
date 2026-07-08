import { CircleCheck, CircleDashed, FileText, FileType2, Timer } from 'lucide-react'
import type { ComponentType } from 'react'
import type { ProcessingStatus, SourceType } from '@/types/knowledge'

export const sourceTypeIcon: Record<SourceType, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  PDF: FileType2,
  DOCX: FileText,
  TXT: FileText,
  Markdown: FileText,
}

export const statusIcon: Record<ProcessingStatus, { icon: ComponentType<{ className?: string }>; className: string }> = {
  Processed: { icon: CircleCheck, className: 'text-primary' },
  Processing: { icon: Timer, className: 'text-muted-foreground' },
  Queued: { icon: CircleDashed, className: 'text-muted-foreground' },
}
