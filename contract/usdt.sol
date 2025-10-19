// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract USDT is ERC20, ERC20Burnable {
    uint256 public constant MINT_AMOUNT = 10000 * 10**9 * 10**18;
    // 10,000 亿枚，BEP-20 USDT 精度 18
    // 推荐编译器版本 0.8.24，EVM版本 Cancun, 编译优化开启，20000次
    constructor() ERC20("Tether USD", "USDT") {
        _mint(msg.sender, MINT_AMOUNT);
    }
    function mint() external {
        _mint(msg.sender, MINT_AMOUNT);
    }
}