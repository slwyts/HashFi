const fs = require('fs');

const contracts = ['HashFi', 'USDT'];

console.log('\n合约字节码大小对比:');
console.log('='.repeat(70));

contracts.forEach(name => {
  try {
    const path = `artifacts/contracts/${name === 'USDT' ? 'usdt' : name}.sol/${name}.json`;
    const artifact = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    const bytecode = artifact.bytecode || '';
    const deployedBytecode = artifact.deployedBytecode || '';
    
    const initCodeLength = bytecode.length ? (bytecode.length - 2) / 2 : 0;
    const deployedCodeLength = deployedBytecode.length ? (deployedBytecode.length - 2) / 2 : 0;
    
    console.log(`\n${name}:`);
    console.log(`  Init Code (部署时):      ${initCodeLength.toString().padStart(6)} 字节`);
    console.log(`  Deployed Code (部署后):  ${deployedCodeLength.toString().padStart(6)} 字节`);
    console.log(`  差值:                    ${(initCodeLength - deployedCodeLength).toString().padStart(6)} 字节`);
    
    const percentage = ((deployedCodeLength / 24576) * 100).toFixed(2);
    console.log(`  占限制比例 (部署后):     ${percentage}%`);
  } catch(e) {
    console.log(`${name}: 未找到`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('说明:');
console.log('  - Init Code: 包含构造函数和部署逻辑，仅在部署时使用');
console.log('  - Deployed Code: 实际存储在链上的代码，这是24KB限制检查的对象');
console.log('  - 24KB限制: 仅针对 Deployed Code，不包括 Init Code');
console.log('');
