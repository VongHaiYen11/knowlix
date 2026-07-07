import 'dotenv/config'
import path from 'node:path'
import { ingestRawFile, listRawFiles } from '../backend/src/wiki/ingest.js'

async function main(): Promise<void> {
  const requested = process.argv.slice(2)
  const files = requested.length ? requested.map((item) => path.resolve(process.cwd(), item)) : await listRawFiles()

  if (!files.length) {
    console.log('No supported raw files found. Add .md, .txt, .json, or .csv files under raw/.')
    return
  }

  for (const file of files) {
    const result = await ingestRawFile(file)
    if (result.skipped) {
      console.log(`Skipped ${result.sourcePath}: ${result.skipped}`)
    } else {
      console.log(`Ingested ${result.sourcePath}: ${result.written.join(', ')}`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
