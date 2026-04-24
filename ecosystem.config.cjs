const fs = require('fs')
const path = require('path')

const cwd = '/home/laisonamarante/novo_amarante'

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return env

      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) return env

      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '')
      env[key] = value
      return env
    }, {})
}

const envFile = readEnvFile(path.join(cwd, '.env'))

module.exports = {
  apps: [{
    name: "novo-amarante",
    script: "dist/server/index.js",
    interpreter: "node",
    cwd,
    env: {
      ...envFile,
      NODE_ENV: "production",
      PORT: envFile.PORT || "3050"
    }
  }]
}
