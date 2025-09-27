// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HAFToken
 * @dev HAF生态系统的ERC20代币合约。
 * 主业务合约 (HashFi.sol) 将拥有铸造和销毁代币的权限。
 */
contract HAFToken is ERC20, Ownable {
    // Minter角色的地址，只有该地址（即HashFi主合约）可以铸造和销毁代币
    address public minter;

    /**
     * @dev 修饰器，限制函数只能由minter地址调用。
     */
    modifier onlyMinter() {
        require(msg.sender == minter, unicode"HAFToken: 调用者不是minter");
        _;
    }

    /**
     * @dev 构造函数，初始化代币名称和符号。
     * @param initialOwner 合约部署时指定的拥有者地址。
     */
    constructor(address initialOwner) ERC20("Hash Fi Token", "HAF") Ownable(initialOwner) {
        // 初始发行量为0，所有代币将由HashFi主合约根据业务逻辑铸造。
    }

    /**
     * @dev 设置minter的地址（通常是HashFi主合约的地址）。
     * 只能由合约的拥有者(owner)调用。
     * @param _minter HashFi主合约的地址。
     */
    function setMinter(address _minter) external onlyOwner {
        require(_minter != address(0), unicode"HAFToken: minter地址不能是零地址");
        minter = _minter;
    }

    /**
     * @dev 铸造新的代币并分配给指定账户。
     * 只能由minter合约调用。
     * @param account 接收新代币的账户地址。
     * @param amount 要铸造的代币数量。
     */
    function mint(address account, uint256 amount) external onlyMinter {
        _mint(account, amount);
    }
    
    /**
     * @dev 从指定账户销毁代币。
     * 只能由minter合约调用。
     * @param account 要销毁代币的账户地址。
     * @param amount 要销毁的代币数量。
     */
    function burn(address account, uint256 amount) external onlyMinter {
        _burn(account, amount);
    }
}