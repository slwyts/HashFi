const input = process.argv[2]

if (!input) {
  console.log('Please specify the time to jump')
  console.log('Usage: npm run time <duration>')
  console.log('Examples:')
  console.log('  npm run time 7    # Jump 7 days (default)')
  console.log('  npm run time 10s  # Jump 10 seconds')
  console.log('  npm run time 10m  # Jump 10 minutes')
  console.log('  npm run time 10h  # Jump 10 hours')
  console.log('  npm run time 10d  # Jump 10 days')
  process.exit(1)
}

let seconds = 0
let durationDescription = ''

// Parse input: number + optional unit (s/m/h/d)
const match = input.match(/^(\d+)([smhd]?)$/i)

if (!match) {
  console.error('Invalid format. Please use format like 10s, 10m, 10h, or 10d.')
  process.exit(1)
}

const value = parseInt(match[1])
const unit = match[2].toLowerCase() || 'd' // Default to days if no unit

if (value <= 0) {
  console.error('Duration must be positive')
  process.exit(1)
}

switch (unit) {
  case 's':
    seconds = value
    durationDescription = `${value} seconds`
    break
  case 'm':
    seconds = value * 60
    durationDescription = `${value} minutes`
    break
  case 'h':
    seconds = value * 3600
    durationDescription = `${value} hours`
    break
  case 'd':
    seconds = value * 24 * 3600
    durationDescription = `${value} days`
    break
}
const RPC_URL = 'http://localhost:8545'

async function rpcCall(method: string, params: unknown[] = []): Promise<unknown> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: 1
    })
  })

  if (!response.ok) {
    throw new Error(`RPC call failed: ${response.statusText}`)
  }

  const data = await response.json() as { result?: unknown; error?: { message: string } }
  if (data.error) {
    throw new Error(data.error.message)
  }

  return data.result
}

function hexToNumber(hex: string): number {
  return parseInt(hex, 16)
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

async function main() {
  console.log(`Jumping time by ${durationDescription} (${seconds} seconds)...`)

  // Check if node is running
  try {
    await rpcCall('eth_blockNumber')
  } catch {
    console.error('Hardhat node is not running!')
    console.log('Please start it first: npm run testnet')
    process.exit(1)
  }

  // Get current block info
  console.log('')
  console.log('Current state:')
  const currentBlockHex = await rpcCall('eth_blockNumber') as string
  const currentBlock = hexToNumber(currentBlockHex)

  const blockInfo = await rpcCall('eth_getBlockByNumber', ['latest', false]) as { timestamp: string }
  const currentTimestamp = hexToNumber(blockInfo.timestamp)

  console.log(`   Block: ${currentBlock}`)
  console.log(`   Time: ${formatDate(currentTimestamp)}`)

  // Increase time
  console.log('')
  console.log('Executing time jump...')
  await rpcCall('evm_increaseTime', [seconds])

  // Mine a new block
  await rpcCall('evm_mine')

  // Get new block info
  const newBlockHex = await rpcCall('eth_blockNumber') as string
  const newBlock = hexToNumber(newBlockHex)

  const newBlockInfo = await rpcCall('eth_getBlockByNumber', ['latest', false]) as { timestamp: string }
  const newTimestamp = hexToNumber(newBlockInfo.timestamp)

  console.log('')
  console.log('Time jump complete!')
  console.log('New state:')
  console.log(`   Block: ${newBlock}`)
  console.log(`   Time: ${formatDate(newTimestamp)}`)
  console.log(`   Jumped: ${durationDescription}`)
}

main().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})
