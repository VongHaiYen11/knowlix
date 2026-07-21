import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(target) : entry.name.endsWith('.ts') ? [target] : []
  }))
  return files.flat()
}

test('database access stays inside repositories and database infrastructure', async () => {
  const root = path.resolve('src')
  const files = await sourceFiles(root)
  const violations: string[] = []

  for (const file of files) {
    const relative = path.relative(root, file)
    if (relative.includes(`${path.sep}database${path.sep}`) || relative.startsWith(`database${path.sep}`) || file.endsWith('.repository.ts')) continue
    const content = await readFile(file, 'utf8')
    if (content.includes('database/pool') || /\bpool\.(?:query|connect)\s*\(/.test(content)) violations.push(relative)
  }

  assert.deepEqual(violations, [])
})

test('controllers do not depend on repositories or password hashing', async () => {
  const root = path.resolve('src')
  const controllers = (await sourceFiles(root)).filter((file) => file.endsWith('.controller.ts'))
  const violations: string[] = []

  for (const file of controllers) {
    const content = await readFile(file, 'utf8')
    if (/from ['"].*\.repository\.js['"]/.test(content) || content.includes("from 'bcryptjs'")) {
      violations.push(path.relative(root, file))
    }
  }

  assert.deepEqual(violations, [])
})

test('Gemini retry wrapper uses Proxy without mutating SDK methods', async () => {
  const content = await readFile(path.resolve('src/config/gemini.ts'), 'utf8')
  assert.match(content, /new Proxy\(client\.models/)
  assert.match(content, /new Proxy\(client,/)
  assert.doesNotMatch(content, /client\.models\.(?:generateContent|generateContentStream|embedContent)\s*=/)
})
