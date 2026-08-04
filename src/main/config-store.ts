import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_PET_CONFIG, type PetConfig } from '../shared/types'

let config: PetConfig = { ...DEFAULT_PET_CONFIG }
let loaded = false

function configFile (): string {
  return path.join(app.getPath('userData'), 'config.json')
}

export function loadConfig (): PetConfig {
  if (loaded) return config
  loaded = true
  try {
    const raw = fs.readFileSync(configFile(), 'utf-8')
    const saved = JSON.parse(raw)
    config = { ...DEFAULT_PET_CONFIG, ...saved }
  } catch {
    config = { ...DEFAULT_PET_CONFIG }
  }
  return config
}

export function getConfig (): PetConfig {
  return loadConfig()
}

export function updateConfig (patch: Partial<PetConfig>): PetConfig {
  config = { ...loadConfig(), ...patch }
  saveConfig()
  return config
}

function saveConfig (): void {
  try {
    const file = configFile()
    const tmp = file + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(config, null, 2), 'utf-8')
    fs.renameSync(tmp, file)
  } catch (err) {
    console.error('[config] save failed', err)
  }
}
