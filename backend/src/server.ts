import { app } from './app.js'
import { env } from './config/env.js'
import { googleDriveScheduler } from './modules/google-drive/google-drive.scheduler.js'

app.listen(env.port, () => {
  console.log(`Knowlix API listening on http://127.0.0.1:${env.port}`)
  googleDriveScheduler.start()
})
