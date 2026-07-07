import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './errors/index.js'
import { multerErrorMiddleware } from './middleware/multer-error.middleware.js'
import { notFoundMiddleware } from './middleware/not-found.middleware.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { usersRouter } from './modules/users/users.routes.js'
import { knowledgeRouter } from './modules/knowledge/knowledge.routes.js'
import { sourcesRouter, filesRouter } from './modules/sources/sources.routes.js'
import { notesRouter } from './modules/notes/notes.routes.js'
import { journalRouter } from './modules/journal/journal.routes.js'
import { graphRouter } from './modules/graph/graph.routes.js'
import { researchRouter } from './modules/research/research.routes.js'
import { maintenanceRouter } from './modules/maintenance/maintenance.routes.js'
import { inspirationRouter } from './modules/inspiration/inspiration.routes.js'

export const app = express()

app.use(cors({ origin: env.frontendOrigin, credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '2mb' }))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api/v1/auth', authRouter)
app.use('/api/v1', usersRouter)
app.use('/api/v1/knowledge', knowledgeRouter)
app.use('/api/v1/sources', sourcesRouter)
app.use('/api/v1/files', filesRouter)
app.use('/api/v1/notes', notesRouter)
app.use('/api/v1/journal', journalRouter)
app.use('/api/v1/graph', graphRouter)
app.use('/api/v1/research', researchRouter)
app.use('/api/v1/maintenance', maintenanceRouter)
app.use('/api/v1/inspiration', inspirationRouter)

app.use(notFoundMiddleware)
app.use(multerErrorMiddleware)
app.use(errorHandler)
