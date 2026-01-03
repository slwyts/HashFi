import { spawn, exec } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const isWindows = process.platform === 'win32'
const noLogs = process.argv.includes('--no-logs')

// Helper to run command and wait for completion
function runCommand(command: string, args: string[] = []): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd()
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
      process.stdout.write(data)
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
      process.stderr.write(data)
    })

    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr })
    })
  })
}

// Helper to make HTTP request using fetch
async function checkNode(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8545', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    })
    return response.ok
  } catch {
    return false
  }
}

// Kill existing hardhat node processes
async function killExistingNodes(): Promise<void> {
  console.log('Cleaning old processes...')

  if (isWindows) {
    // Windows: use taskkill
    await new Promise<void>((resolve) => {
      exec('taskkill /F /IM node.exe /FI "WINDOWTITLE eq hardhat*" 2>nul', () => resolve())
    })
    // Also try to kill by port
    await new Promise<void>((resolve) => {
      exec('for /f "tokens=5" %a in (\'netstat -ano ^| findstr :8545\') do taskkill /F /PID %a 2>nul', () => resolve())
    })
  } else {
    // Unix: use pkill
    await new Promise<void>((resolve) => {
      exec('pkill -f "hardhat node" || true', () => resolve())
    })
  }
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Start hardhat node in background
function startHardhatNode(): { pid: number | undefined } {
  console.log('Starting Hardhat node...')

  const child = spawn('npx', ['hardhat', 'node'], {
    shell: true,
    detached: !isWindows,
    stdio: 'ignore',
    cwd: process.cwd()
  })

  child.unref()

  return { pid: child.pid }
}

// Update env file with deployed addresses
function updateEnvFile(deploymentFile: string): void {
  const envFile = '.env.localnet'

  if (!existsSync(deploymentFile)) {
    console.log('Warning: Deployment file not found, using default addresses')
    return
  }

  if (!existsSync(envFile)) {
    console.log(`Warning: ${envFile} not found`)
    return
  }

  try {
    const deployedAddresses = JSON.parse(readFileSync(deploymentFile, 'utf-8'))
    const usdtAddress = deployedAddresses['LocalDeployModule#USDT']
    const hashfiAddress = deployedAddresses['LocalDeployModule#HashFi']

    let envContent = readFileSync(envFile, 'utf-8')

    envContent = envContent.replace(
      /VITE_CONTRACT_ADDRESS=.*/g,
      `VITE_CONTRACT_ADDRESS=${hashfiAddress}`
    )
    envContent = envContent.replace(
      /VITE_USDT_ADDRESS=.*/g,
      `VITE_USDT_ADDRESS=${usdtAddress}`
    )

    writeFileSync(envFile, envContent)

    console.log('Environment config updated:')
    console.log(`   USDT Address: ${usdtAddress}`)
    console.log(`   HashFi Address: ${hashfiAddress}`)
  } catch (e) {
    console.log('Warning: Failed to update env file:', e)
  }
}

// Save PID to file
function savePid(pid: number | undefined): void {
  if (pid) {
    const pidFile = isWindows
      ? join(process.env.TEMP || 'C:\\Windows\\Temp', 'hardhat-node.pid')
      : '/tmp/hardhat-node.pid'
    writeFileSync(pidFile, pid.toString())
  }
}

async function main() {
  console.log('Starting test environment...')

  // Clean old processes
  await killExistingNodes()
  await sleep(1000)

  // Start hardhat node
  const { pid } = startHardhatNode()
  console.log(`Hardhat node starting (PID: ${pid})...`)

  // Wait for node to be ready
  console.log('Waiting for node...')
  let nodeReady = false
  for (let i = 1; i <= 15; i++) {
    await sleep(2000)
    if (await checkNode()) {
      console.log(`Node started successfully!`)
      nodeReady = true
      break
    }
    console.log(`   Waiting... (${i}/15)`)
  }

  if (!nodeReady) {
    console.error('Failed to start node!')
    process.exit(1)
  }

  // Deploy contracts
  console.log('Deploying contracts...')
  const deployResult = await runCommand('npx', ['hardhat', 'ignition', 'deploy', 'ignition/modules/LocalDeploy.ts', '--network', 'localhost'])

  if (deployResult.code !== 0) {
    console.error('Failed to deploy contracts!')
    process.exit(1)
  }

  // Update env config
  console.log('Updating environment config...')
  const deploymentFile = 'ignition/deployments/chain-31337/deployed_addresses.json'
  updateEnvFile(deploymentFile)

  // Fund test accounts
  console.log('Funding test accounts...')
  await runCommand('npx', ['hardhat', 'run', 'scripts/fund-accounts.ts', '--network', 'localhost'])

  // Save PID
  savePid(pid)

  // Print summary
  console.log('')
  console.log('========================================')
  console.log('Test environment ready!')
  console.log('')
  console.log('Node info:')
  console.log('   RPC URL: http://localhost:8545')
  console.log(`   PID: ${pid}`)
  console.log('')
  console.log('Commands:')
  console.log('   Time jump: npm run time 7  # Jump 7 days')
  console.log('   Stop: npm run stop')
  console.log('   Frontend: npm run dev:local')
  console.log('========================================')

  if (!noLogs) {
    console.log('')
    console.log('Node is running. Press Ctrl+C to stop.')
    // Keep process alive if showing logs
    await new Promise(() => {})
  }
}

main().catch(console.error)
