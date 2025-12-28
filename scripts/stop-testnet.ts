import { exec } from 'child_process'
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'

const isWindows = process.platform === 'win32'

function getPidFile(): string {
  return isWindows
    ? join(process.env.TEMP || 'C:\\Windows\\Temp', 'hardhat-node.pid')
    : '/tmp/hardhat-node.pid'
}

async function killByPid(pid: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (isWindows) {
      exec(`taskkill /F /PID ${pid}`, (error) => {
        resolve(!error)
      })
    } else {
      exec(`kill ${pid}`, (error) => {
        resolve(!error)
      })
    }
  })
}

async function killByPort(): Promise<boolean> {
  return new Promise((resolve) => {
    if (isWindows) {
      // Find and kill process using port 8545
      exec('netstat -ano | findstr :8545', (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(false)
          return
        }

        const lines = stdout.trim().split('\n')
        const pids = new Set<string>()

        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          const pid = parts[parts.length - 1]
          if (pid && /^\d+$/.test(pid)) {
            pids.add(pid)
          }
        }

        if (pids.size === 0) {
          resolve(false)
          return
        }

        let killed = false
        let remaining = pids.size

        for (const pid of pids) {
          exec(`taskkill /F /PID ${pid}`, (err) => {
            if (!err) killed = true
            remaining--
            if (remaining === 0) resolve(killed)
          })
        }
      })
    } else {
      // Unix: use lsof
      exec('lsof -ti:8545', (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(false)
          return
        }

        const pid = stdout.trim()
        exec(`kill ${pid}`, (killError) => {
          resolve(!killError)
        })
      })
    }
  })
}

async function main() {
  console.log('Stopping Hardhat testnet...')

  const pidFile = getPidFile()
  let stopped = false

  // Try to kill by PID file first
  if (existsSync(pidFile)) {
    const pid = readFileSync(pidFile, 'utf-8').trim()
    console.log(`Found PID file, killing process ${pid}...`)

    stopped = await killByPid(pid)

    try {
      unlinkSync(pidFile)
    } catch {
      // Ignore
    }
  }

  // Fallback: kill by port
  if (!stopped) {
    console.log('Trying to find process by port 8545...')
    stopped = await killByPort()
  }

  if (stopped) {
    console.log('Testnet stopped successfully!')
  } else {
    console.log('No running testnet found.')
  }

  // Clean up log files
  const logFile = isWindows
    ? join(process.env.TEMP || 'C:\\Windows\\Temp', 'hardhat-node.log')
    : '/tmp/hardhat-node.log'

  if (existsSync(logFile)) {
    try {
      unlinkSync(logFile)
    } catch {
      // Ignore
    }
  }
}

main().catch(console.error)
