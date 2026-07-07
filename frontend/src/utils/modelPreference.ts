export const MODEL_STORAGE_KEY = 'knowlix.model'

export const MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', hint: 'Fast everyday reading, chat, and summaries.' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', hint: 'Deeper reasoning for harder research questions.' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', hint: 'Lightweight fallback for quick tasks.' },
] as const

export type ModelPreference = (typeof MODEL_OPTIONS)[number]['value']

export const DEFAULT_MODEL: ModelPreference = 'gemini-2.5-flash'

export function getModelPreference(): ModelPreference {
  const stored = localStorage.getItem(MODEL_STORAGE_KEY)
  return MODEL_OPTIONS.some((option) => option.value === stored) ? (stored as ModelPreference) : DEFAULT_MODEL
}

export function setModelPreference(model: ModelPreference) {
  localStorage.setItem(MODEL_STORAGE_KEY, model)
}
