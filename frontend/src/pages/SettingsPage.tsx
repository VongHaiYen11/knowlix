import { Boxes, Check, DownloadCloud, HardDrive, Moon, Palette, ShieldCheck, Sparkles, Sun } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { useThemeContext } from '@/components/layout/ThemeProvider'
import { SettingsGroup, SettingsRow } from '@/features/settings/SettingsGroup'
import { cn } from '@/utils/cn'

export function SettingsPage() {
  const [offline, setOffline] = useState(true)
  const [autoOrganize, setAutoOrganize] = useState(true)
  const [analytics, setAnalytics] = useState(false)
  const [model, setModel] = useState('Balanced')
  const { theme, setTheme } = useThemeContext()

  return (
    <PageShell variant="readable">
      <PageHeader title="Settings" description="Your knowledge stays yours. Everything here is private by default." />
      <div className="space-y-10">
        <SettingsGroup icon={HardDrive} title="Storage">
          <SettingsRow label="Local-first storage" hint="Your library lives on your device and syncs only if you choose."><span className="text-sm text-muted-foreground">1,204 items · 84 MB</span></SettingsRow>
          <SettingsRow label="Offline mode" hint="Keep working with no connection. Sync resumes automatically."><Toggle enabled={offline} onChange={setOffline} label="Offline mode" /></SettingsRow>
        </SettingsGroup>
        <SettingsGroup icon={Sparkles} title="AI Model">
          <SettingsRow label="Reasoning quality" hint="Higher quality thinks longer; faster is lighter on your device."><Segmented value={model} options={['Fast', 'Balanced', 'Deep']} onChange={setModel} /></SettingsRow>
          <SettingsRow label="Auto-organize" hint="Let the assistant file, link, and de-duplicate captures for you."><Toggle enabled={autoOrganize} onChange={setAutoOrganize} label="Auto-organize" /></SettingsRow>
        </SettingsGroup>
        <SettingsGroup icon={Boxes} title="Embeddings">
          <SettingsRow label="Semantic index" hint="Powers meaning-based search across your whole library."><span className="inline-flex items-center gap-1.5 text-sm text-primary"><Check className="h-4 w-4" />Up to date</span></SettingsRow>
          <SettingsRow label="Model" hint="Local embedding model, 384 dimensions."><span className="text-sm text-muted-foreground">paper-embed-mini</span></SettingsRow>
        </SettingsGroup>
        <SettingsGroup icon={Palette} title="Appearance">
          <SettingsRow label="Theme" hint="Warm paper by day, deep sage by night."><IconSegmented value={theme} onChange={setTheme} /></SettingsRow>
          <SettingsRow label="Reading width" hint="Comfortable measure for long-form."><span className="text-sm text-muted-foreground">Comfortable</span></SettingsRow>
        </SettingsGroup>
        <SettingsGroup icon={DownloadCloud} title="Backup">
          <SettingsRow label="Export library" hint="Download everything as Markdown and JSON. No lock-in."><Button variant="outline" size="sm">Export</Button></SettingsRow>
          <SettingsRow label="Last backup" hint="Automatic local snapshots."><span className="text-sm text-muted-foreground">Today, 6:00 AM</span></SettingsRow>
        </SettingsGroup>
        <SettingsGroup icon={ShieldCheck} title="Privacy">
          <SettingsRow label="Usage analytics" hint="Off by default. Nothing about your content is ever shared."><Toggle enabled={analytics} onChange={setAnalytics} label="Usage analytics" /></SettingsRow>
          <SettingsRow label="On-device processing" hint="Your notes are never used to train external models."><span className="inline-flex items-center gap-1.5 text-sm text-primary"><ShieldCheck className="h-4 w-4" />Guaranteed</span></SettingsRow>
        </SettingsGroup>
      </div>
    </PageShell>
  )
}

function Segmented({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return <div className="inline-flex rounded-lg border border-border bg-card p-0.5">{options.map((option) => <button key={option} onClick={() => onChange(option)} className={cn('rounded-md px-3 py-1.5 text-xs transition', value === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>{option}</button>)}</div>
}

function IconSegmented({ value, onChange }: { value: string; onChange: (value: 'light' | 'dark') => void }) {
  const options = [{ key: 'light', label: 'Light', icon: Sun }, { key: 'dark', label: 'Dark', icon: Moon }] as const
  return <div className="inline-flex rounded-lg border border-border bg-card p-0.5">{options.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => onChange(key)} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition', value === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}><Icon className="h-3.5 w-3.5" strokeWidth={1.75} />{label}</button>)}</div>
}
