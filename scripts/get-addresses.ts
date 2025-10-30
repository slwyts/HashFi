import { ethers } from "ethers";
import * as readline from "readline";

/**
 * 从助记词生成指定数量的账户地址
 * 使用标准的 BIP44 派生路径: m/44'/60'/0'/0/index
 */
async function generateAddressesFromMnemonic() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // 提示用户输入助记词
  rl.question("请输入助记词 (12或24个单词，用空格分隔): ", async (mnemonic: string) => {
    rl.close();

    try {
      // 验证助记词
      const trimmedMnemonic = mnemonic.trim();
      if (!ethers.Mnemonic.isValidMnemonic(trimmedMnemonic)) {
        console.error("❌ 无效的助记词，请检查后重试");
        return;
      }

      console.log("\n✅ 助记词验证成功\n");
      console.log("=" .repeat(80));
      console.log("正在生成账户地址...");
      console.log("=" .repeat(80));
      console.log();

      // 生成账户 1-30
      const accounts: { index: number; address: string; path: string }[] = [];

      for (let i = 0; i < 30; i++) {
        // 使用标准的以太坊派生路径
        const path = `m/44'/60'/0'/0/${i}`;
        const hdNode = ethers.HDNodeWallet.fromPhrase(trimmedMnemonic, undefined, path);
        
        accounts.push({
          index: i + 1,
          address: hdNode.address,
          path: path,
        });
      }

      // 以表格形式打印结果
      console.log("序号\t地址\t\t\t\t\t\t派生路径");
      console.log("-".repeat(80));

      accounts.forEach((account) => {
        console.log(`${account.index}\t${account.address}\t${account.path}`);
      });

      console.log();
      console.log("=" .repeat(80));
      console.log(`✅ 成功生成 ${accounts.length} 个账户地址`);
      console.log("=" .repeat(80));

      // 保存到文件（可选）
      const fs = require("fs");
      const outputPath = "./generated-addresses.json";
      fs.writeFileSync(
        outputPath,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            accounts: accounts,
          },
          null,
          2
        )
      );
      console.log(`\n💾 地址已保存到: ${outputPath}`);
    } catch (error) {
      console.error("❌ 发生错误:", error);
    }
  });
}

// 运行脚本
generateAddressesFromMnemonic().catch((error) => {
  console.error("脚本执行失败:", error);
  process.exit(1);
});
