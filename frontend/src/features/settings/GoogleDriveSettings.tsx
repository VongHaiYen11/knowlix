import { ChevronRight, Cloud, Folder, RefreshCw, Unplug, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SearchInput } from '@/components/ui/SearchInput'
import { SettingsGroup, SettingsRow } from '@/features/settings/SettingsGroup'
import { googleDriveService, type GoogleDriveFolder, type GoogleDriveStatus } from '@/services/googleDriveService'

function dateTime(value?: string | null) {
  if (!value) return 'Not synced yet'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function GoogleDriveLogo({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#34A853" d="M8.1 4.5 2.4 14.4l3 5.1 5.7-9.9z" />
      <path fill="#FBBC04" d="M8.1 4.5h7.8l5.7 9.9h-7.8z" />
      <path fill="#4285F4" d="M5.4 19.5h11.4l4.8-8.4h-7.8l-2.7 4.8H8.1z" />
    </svg>
  )
}

type FolderNode = GoogleDriveFolder & {
  children: FolderNode[]
  depth: number
  path: string
}

function sortFolderNodes(nodes: FolderNode[]) {
  nodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  for (const node of nodes) sortFolderNodes(node.children)
}

function assignFolderPaths(nodes: FolderNode[], parentPath = '', depth = 0) {
  for (const node of nodes) {
    node.depth = depth
    node.path = parentPath ? `${parentPath} / ${node.name}` : node.name
    assignFolderPaths(node.children, node.path, depth + 1)
  }
}

function buildFolderTree(folders: GoogleDriveFolder[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>()
  for (const folder of folders) {
    nodes.set(folder.id, { ...folder, children: [], depth: 0, path: folder.name })
  }

  const roots: FolderNode[] = []
  for (const node of nodes.values()) {
    const parentId = node.parentIds?.find((id) => id !== node.id && nodes.has(id))
    if (parentId) {
      const parent = nodes.get(parentId)!
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  sortFolderNodes(roots)
  assignFolderPaths(roots)
  return roots
}

function flattenFolderTree(nodes: FolderNode[], expandedIds: Set<string>): FolderNode[] {
  const rows: FolderNode[] = []
  for (const node of nodes) {
    rows.push(node)
    if (expandedIds.has(node.id)) rows.push(...flattenFolderTree(node.children, expandedIds))
  }
  return rows
}

function flattenAllFolders(nodes: FolderNode[]): FolderNode[] {
  return nodes.flatMap((node) => [node, ...flattenAllFolders(node.children)])
}

export function GoogleDriveSettings() {
  const [status, setStatus] = useState<GoogleDriveStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [folderPickerOpen, setFolderPickerOpen] = useState(false)
  const [folderQuery, setFolderQuery] = useState('')
  const [folders, setFolders] = useState<GoogleDriveFolder[]>([])
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())

  async function loadStatus(silent = false) {
    if (!silent) setLoading(true)
    try {
      const next = await googleDriveService.status()
      setStatus(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Google Drive status')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('integration') === 'google-drive') {
      const oauthStatus = params.get('status')
      if (oauthStatus === 'connected') setNotice('Google Drive connected. Choose a source folder.')
      if (oauthStatus === 'error') setError(params.get('message') || 'Google Drive connection failed')
      window.history.replaceState({}, '', window.location.pathname)
    }
    void loadStatus()
  }, [])

  useEffect(() => {
    const active = status?.status === 'syncing' || Boolean(status?.counts.pending) || Boolean(status?.counts.processing)
    if (!active) return
    const timer = window.setInterval(() => void loadStatus(true), 5000)
    return () => window.clearInterval(timer)
  }, [status?.status, status?.counts.pending, status?.counts.processing])

  async function connect() {
    setAction('connect')
    setError(null)
    try {
      const result = await googleDriveService.startOauth()
      window.location.assign(result.authorizationUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Google Drive connection')
      setAction(null)
    }
  }

  async function syncNow() {
    setAction('sync')
    setError(null)
    try {
      await googleDriveService.sync()
      setNotice('Google Drive sync queued.')
      await loadStatus(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sync')
    } finally {
      setAction(null)
    }
  }

  async function openFolderPicker() {
    if (!status?.connected) {
      await connect()
      return
    }
    setAction('folders')
    setError(null)
    try {
      const result = await googleDriveService.folders()
      setFolders(result.folders)
      setFolderQuery('')
      setExpandedFolderIds(new Set())
      setFolderPickerOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Google Drive folders')
    } finally {
      setAction(null)
    }
  }

  async function chooseFolder(folder: GoogleDriveFolder) {
    setAction(`folder:${folder.id}`)
    setError(null)
    try {
      const next = await googleDriveService.setFolder(folder.id)
      setStatus(next)
      setFolderPickerOpen(false)
      setNotice(`${folder.name} selected. Initial sync queued.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not select this folder')
    } finally {
      setAction(null)
    }
  }

  async function disconnect() {
    setAction('disconnect')
    setError(null)
    try {
      await googleDriveService.disconnect()
      setStatus({ configured: status?.configured ?? true, connected: false, folder: null, status: 'disconnected', counts: {} })
      setConfirmDisconnect(false)
      setNotice('Google Drive disconnected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disconnect Google Drive')
    } finally {
      setAction(null)
    }
  }

  const processed = status?.counts.processed ?? 0
  const active = (status?.counts.pending ?? 0) + (status?.counts.processing ?? 0)
  const failed = status?.counts.failed ?? 0
  const normalizedFolderQuery = folderQuery.trim().toLowerCase()
  const folderTree = useMemo(() => buildFolderTree(folders), [folders])
  const visibleFolders = useMemo(() => {
    if (normalizedFolderQuery) {
      return flattenAllFolders(folderTree).filter((folder) => folder.path.toLowerCase().includes(normalizedFolderQuery))
    }
    return flattenFolderTree(folderTree, expandedFolderIds)
  }, [expandedFolderIds, folderTree, normalizedFolderQuery])

  function toggleFolder(folderId: string) {
    setExpandedFolderIds((current) => {
      const next = new Set(current)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  return (
    <>
      <SettingsGroup icon={Cloud} title="Integrations">
        <SettingsRow
          label={(
            <span className="inline-flex items-center gap-2">
              <GoogleDriveLogo />
              Google Drive
            </span>
          )}
          hint={status?.connected
            ? status.googleAccountEmail || 'Connected account'
            : status && !status.configured ? 'Backend setup required' : 'Not connected'}
        >
          {!status?.connected ? (
            <Button icon={<GoogleDriveLogo className="h-4 w-4" />} onClick={connect} disabled={loading || action === 'connect' || status?.configured === false}>
              {status?.configured === false ? 'Not configured' : action === 'connect' ? 'Opening...' : 'Connect Drive'}
            </Button>
          ) : status.status === 'reauthorization_required' ? (
            <Button onClick={connect} disabled={action === 'connect'}>Reconnect</Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={syncNow} disabled={!status.folder || action === 'sync'} title="Sync now" aria-label="Sync Google Drive now">
                <RefreshCw className={`h-4 w-4 ${action === 'sync' || status.status === 'syncing' ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setConfirmDisconnect(true)} title="Disconnect" aria-label="Disconnect Google Drive">
                <Unplug className="h-4 w-4" />
              </Button>
            </div>
          )}
        </SettingsRow>

        {status?.connected && (
          <SettingsRow
            label="Source folder"
            hint={status.folder ? `${status.folder.name} · direct files only` : 'Choose a folder from Google Drive'}
          >
            <Button variant="outline" size="sm" icon={status.folder ? <GoogleDriveLogo className="h-4 w-4" /> : <Folder className="h-4 w-4" />} onClick={openFolderPicker} disabled={action === 'folders'}>
              {action === 'folders' ? 'Loading...' : status.folder ? 'Choose another' : 'Choose folder'}
            </Button>
          </SettingsRow>
        )}

        {status?.connected && status.folder && (
          <SettingsRow
            label="Synchronization"
            hint={`Last: ${dateTime(status.lastSyncAt)} · Next: ${dateTime(status.nextSyncAt)}`}
          >
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {active ? `${active} queued` : `${processed} imported`}{failed ? ` · ${failed} failed` : ''}
            </span>
          </SettingsRow>
        )}

        {(error || status?.lastError || notice) && (
          <div className={`px-6 py-3 text-sm ${error || status?.lastError ? 'text-destructive' : 'text-primary'}`}>
            {error ?? status?.lastError ?? notice}
          </div>
        )}
      </SettingsGroup>

      <ConfirmDialog
        open={confirmDisconnect}
        title="Disconnect Google Drive?"
        message="Imported sources stay in Knowlix. Automatic synchronization will stop."
        confirmLabel="Disconnect"
        loading={action === 'disconnect'}
        onConfirm={disconnect}
        onCancel={() => setConfirmDisconnect(false)}
      />

      {folderPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <GoogleDriveLogo />
                <h3 className="text-base font-semibold text-foreground">Choose source folder</h3>
              </div>
              <button className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground" onClick={() => setFolderPickerOpen(false)} aria-label="Close folder picker">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="border-b border-border px-5 py-4">
              <SearchInput
                value={folderQuery}
                onChange={(event) => setFolderQuery(event.target.value)}
                placeholder="Search folders"
                aria-label="Search Google Drive folders"
                shellClassName="rounded-xl px-3 py-2 elevated-none"
                className="text-sm"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {visibleFolders.length} of {folders.length} folders
              </p>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {visibleFolders.length ? visibleFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center gap-2 rounded-xl py-1.5 pl-2 pr-3 transition hover:bg-secondary"
                  style={{ paddingLeft: normalizedFolderQuery ? undefined : `${8 + folder.depth * 18}px` }}
                >
                  <button
                    type="button"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card hover:text-foreground ${folder.children.length ? '' : 'invisible'}`}
                    onClick={() => toggleFolder(folder.id)}
                    aria-label={expandedFolderIds.has(folder.id) ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
                  >
                    <ChevronRight className={`h-4 w-4 transition ${expandedFolderIds.has(folder.id) ? 'rotate-90' : ''}`} />
                  </button>
                  <button
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-card"
                    onClick={() => chooseFolder(folder)}
                    disabled={action === `folder:${folder.id}`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{folder.name}</span>
                        {normalizedFolderQuery ? <span className="block truncate text-xs text-muted-foreground">{folder.path}</span> : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {action === `folder:${folder.id}` ? 'Selecting...' : 'Select'}
                    </span>
                  </button>
                </div>
              )) : (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {folders.length ? 'No folders match your search.' : 'No Drive folders found.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
