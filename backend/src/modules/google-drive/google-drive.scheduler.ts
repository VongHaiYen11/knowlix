import { env } from '../../config/env.js'
import { googleDriveRepository } from './google-drive.repository.js'
import { ProcessGoogleDriveFileUseCase } from './use-cases/ProcessGoogleDriveFileUseCase.js'
import { ScanGoogleDriveUseCase } from './use-cases/ScanGoogleDriveUseCase.js'

const HEARTBEAT_MS = 60_000

class GoogleDriveScheduler {
  private timer?: NodeJS.Timeout
  private running = false
  private readonly scanner = new ScanGoogleDriveUseCase()
  private readonly processor = new ProcessGoogleDriveFileUseCase()

  start() {
    if (!env.googleDriveSyncEnabled || this.timer) return
    this.timer = setInterval(() => this.wake(), HEARTBEAT_MS)
    this.timer.unref()
    this.wake()
    console.info(`[Google Drive] scheduler started syncIntervalMs=${env.googleDriveSyncIntervalMs}`)
  }

  wake() {
    if (this.running || !env.googleDriveSyncEnabled) return
    this.running = true
    void this.drain().finally(() => {
      this.running = false
    })
  }

  private async drain() {
    try {
      let connection
      while ((connection = await googleDriveRepository.claimDueConnection())) {
        await this.scanner.executeClaimed(connection)
      }
      let job
      while ((job = await googleDriveRepository.claimPendingFile())) {
        await this.processor.executeClaimed(job)
      }
    } catch (error) {
      console.error('[Google Drive] scheduler cycle failed:', error)
    }
  }
}

export const googleDriveScheduler = new GoogleDriveScheduler()
