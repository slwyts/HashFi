#!/usr/bin/env node

/**
 * 导出代币持仓信息脚本
 * 
 * 从 BscScan 导出的 CSV 文件中提取代币持仓信息，支持过滤和排序
 * 
 * 使用方式: 
 *   npx tsx scripts/export-balances.ts <csv文件路径> [--exclude-top N] [--top M] [--output 输出文件名]
 * 
 * 参数说明:
 *   csv文件路径: BscScan 导出的代币持仓 CSV 文件
 *   --exclude-top N: 排除持仓前 N 名（如合约地址、项目方等）
 *   --top M: 只保留余额前 M 名
 *   --output: 输出文件名（默认: balances-{timestamp}.json）
 * 
 * 示例:
 *   npx tsx scripts/export-balances.ts ./holders.csv --exclude-top 3 --top 200
 */

import fs from 'fs';
import path from 'path';

interface HolderInfo {
  rank: number;
  address: string;
  balance: bigint;
  balanceFormatted: string;
  percentage: string;
}

interface ExportResult {
  exportTime: string;
  sourceFile: string;
  excludeTop: number;
  topLimit: number;
  totalHolders: number;
  filteredHolders: number;
  holders: Record<string, string>; // address => balance (wei string)
}

/**
 * 解析 CSV 文件
 * BscScan 导出的 CSV 格式通常是:
 * "HolderRank","HolderAddress","Balance","PendingBalanceUpdate"
 * 或
 * Rank,Address,Balance,Percentage
 */
function parseCSV(filePath: string): HolderInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV 文件格式错误：至少需要标题行和一行数据');
  }

  // 解析标题行，确定列索引
  const header = lines[0].toLowerCase();
  let rankIndex = -1;
  let addressIndex = -1;
  let balanceIndex = -1;
  let percentageIndex = -1;

  // 解析标题
  const headerParts = parseCSVLine(lines[0]);
  headerParts.forEach((col, i) => {
    const colLower = col.toLowerCase().trim();
    if (colLower.includes('rank')) rankIndex = i;
    if (colLower.includes('address') || colLower.includes('holderaddress')) addressIndex = i;
    if (colLower.includes('balance') && !colLower.includes('pending')) balanceIndex = i;
    if (colLower.includes('percentage') || colLower.includes('%')) percentageIndex = i;
  });

  if (addressIndex === -1 || balanceIndex === -1) {
    throw new Error('CSV 文件格式错误：找不到地址或余额列');
  }

  const holders: HolderInfo[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);
    
    const address = parts[addressIndex]?.trim().replace(/"/g, '');
    let balanceStr = parts[balanceIndex]?.trim().replace(/"/g, '').replace(/,/g, '');
    const percentage = percentageIndex !== -1 ? parts[percentageIndex]?.trim().replace(/"/g, '') : '';
    
    if (!address || !balanceStr) continue;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) continue;

    // 解析余额 - BscScan 导出的是人类可读格式（如 "1,234,567.89"）
    // 需要转换为 wei
    let balance: bigint;
    try {
      // 移除逗号，处理小数
      balanceStr = balanceStr.replace(/,/g, '');
      
      // 检查是否有小数点
      if (balanceStr.includes('.')) {
        const [intPart, decPart] = balanceStr.split('.');
        // 假设 18 位小数
        const decimals = 18;
        const paddedDec = (decPart || '').padEnd(decimals, '0').slice(0, decimals);
        balance = BigInt(intPart + paddedDec);
      } else {
        // 如果没有小数点，假设已经是完整数值，乘以 10^18
        balance = BigInt(balanceStr) * BigInt(10 ** 18);
      }
    } catch (e) {
      console.warn(`跳过无效余额行: ${line}`);
      continue;
    }

    holders.push({
      rank: rankIndex !== -1 ? parseInt(parts[rankIndex]?.replace(/"/g, '') || String(i)) : i,
      address: address.toLowerCase(), // 统一小写
      balance,
      balanceFormatted: balanceStr,
      percentage,
    });
  }

  // 按余额降序排序
  holders.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));

  // 重新分配排名
  holders.forEach((h, i) => {
    h.rank = i + 1;
  });

  return holders;
}

/**
 * 解析 CSV 行，处理引号
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * 格式化余额为人类可读格式
 */
function formatBalance(balance: bigint, decimals: number = 18): string {
  const str = balance.toString().padStart(decimals + 1, '0');
  const intPart = str.slice(0, -decimals) || '0';
  const decPart = str.slice(-decimals).replace(/0+$/, '');
  return decPart ? `${intPart}.${decPart}` : intPart;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
使用方式: npx tsx scripts/export-balances.ts <csv文件路径> [选项]

选项:
  --exclude-top N   排除持仓前 N 名
  --top M           只保留余额前 M 名
  --output FILE     指定输出文件名
  --help, -h        显示帮助信息

示例:
  npx tsx scripts/export-balances.ts ./holders.csv --exclude-top 3 --top 200
  npx tsx scripts/export-balances.ts ./holders.csv --exclude-top 5 --top 100 --output my-holders.json
`);
    process.exit(0);
  }

  // 解析参数
  let csvPath = '';
  let excludeTop = 0;
  let topLimit = 0;
  let outputFile = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--exclude-top' && args[i + 1]) {
      excludeTop = parseInt(args[++i]);
    } else if (arg === '--top' && args[i + 1]) {
      topLimit = parseInt(args[++i]);
    } else if (arg === '--output' && args[i + 1]) {
      outputFile = args[++i];
    } else if (!arg.startsWith('--')) {
      csvPath = arg;
    }
  }

  if (!csvPath) {
    console.error('❌ 请提供 CSV 文件路径');
    process.exit(1);
  }

  // 解析相对路径
  if (!path.isAbsolute(csvPath)) {
    csvPath = path.resolve(process.cwd(), csvPath);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ 文件不存在: ${csvPath}`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 导出代币持仓信息');
  console.log('='.repeat(60) + '\n');

  console.log(`📁 源文件: ${csvPath}`);
  console.log(`🔢 排除前: ${excludeTop} 名`);
  console.log(`🔢 保留前: ${topLimit || '全部'} 名`);
  console.log('');

  // 解析 CSV
  console.log('📖 正在解析 CSV 文件...');
  const allHolders = parseCSV(csvPath);
  console.log(`✅ 共解析到 ${allHolders.length} 个持仓地址\n`);

  // 显示前几名（方便用户确认排除范围）
  console.log('📋 持仓排名前 10:');
  console.log('-'.repeat(60));
  allHolders.slice(0, 10).forEach((h, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${h.address} - ${formatBalance(h.balance)} (${h.percentage || 'N/A'})`);
  });
  console.log('-'.repeat(60) + '\n');

  // 过滤
  let filteredHolders = allHolders;

  if (excludeTop > 0) {
    filteredHolders = filteredHolders.slice(excludeTop);
    console.log(`🚫 已排除前 ${excludeTop} 名，剩余 ${filteredHolders.length} 个地址`);
  }

  if (topLimit > 0 && topLimit < filteredHolders.length) {
    filteredHolders = filteredHolders.slice(0, topLimit);
    console.log(`✂️ 已保留前 ${topLimit} 名`);
  }

  console.log(`\n📊 最终筛选: ${filteredHolders.length} 个地址\n`);

  // 构建输出数据
  const holders: Record<string, string> = {};
  filteredHolders.forEach((h) => {
    holders[h.address] = h.balance.toString();
  });

  const result: ExportResult = {
    exportTime: new Date().toISOString(),
    sourceFile: path.basename(csvPath),
    excludeTop,
    topLimit: topLimit || allHolders.length,
    totalHolders: allHolders.length,
    filteredHolders: filteredHolders.length,
    holders,
  };

  // 输出文件名
  if (!outputFile) {
    outputFile = `balances-${Date.now()}.json`;
  }

  // 写入文件
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`✅ 已导出到: ${outputFile}`);

  // 打印摘要
  console.log('\n========== 导出摘要 ==========');
  console.log(`总持仓地址: ${allHolders.length}`);
  console.log(`排除前: ${excludeTop} 名`);
  console.log(`保留前: ${topLimit || '全部'} 名`);
  console.log(`最终导出: ${filteredHolders.length} 个地址`);
  console.log(`输出文件: ${outputFile}`);
  console.log('');
}

main().catch((error) => {
  console.error('❌ 错误:', error.message);
  process.exit(1);
});
