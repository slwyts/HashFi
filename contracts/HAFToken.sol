// SPDX-License-Identifier: MIT
// 声明开源许可证为MIT协议

pragma solidity ^0.8.33;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IUniswapV2Factory} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Pair} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";


interface IHashFiMain {
    // 获取主合约的所有者地址 - 用于接收社区份额和卖出税
    function owner() external view returns (address);
    // 获取活跃创世节点的数量 - 用于计算分发阈值
    function getActiveGenesisNodesCount() external view returns (uint256);
    // 根据索引获取活跃创世节点的地址 - 用于直接转账USDT
    function getActiveGenesisNodeAt(uint256 index) external view returns (address);
}

interface IHAFToken {
    function getPrice() external view returns (uint256);
    function isLpInitialized() external view returns (bool);
    function transferFromContract(address to, uint256 amount) external;
    function getContractBalance() external view returns (uint256);
    function triggerMechanismsExternal() external;
    function balanceOf(address account) external view returns (uint256);
    function addLiquidity(uint256 _usdtAmount, uint256 _hafAmount) external;
    function pancakePair() external view returns (address);
    function withdrawToDefi(address token, uint256 amount) external; // 从Token合约提取资产到DeFi合约
}

/**
 * @title HAFToken - Hash Fi Token合约
 * @dev 这是HashFi生态系统的原生代币，具有以下特性：
 * 1. 总量2100万，通缩销毁至最低21万
 * 2. 与PancakeSwap集成，自动创建HAF/USDT交易对
 * 3. 买入税1.5% - 累积到365U后分发给创世节点
 * 4. 卖出税1.5% - 直接转给owner
 * 5. 每日燃烧5% LP池中的HAF：1%创世节点，1%社区，3%持币分红
 * 6. 每2小时自动销毁0.2%到黑洞地址
 * 7. 持币≥365 HAF可参与分红
 */
contract HAFToken is ERC20 {

    uint256 public constant TOTAL_SUPPLY = 21_000_000 * 1e18;
    uint256 public constant MIN_SUPPLY = 210_000 * 1e18;
    
    // 价格精度：1e18，用于避免整数除法精度丢失
    uint256 public constant PRICE_PRECISION = 1e18;
    
    // 持币分红门槛：365枚HAF
    // 持有≥365 HAF的地址才能参与每日3%的持币分红
    uint256 public constant HOLDER_THRESHOLD = 365 * 1e18;

    uint256 private constant UTC8_OFFSET = 8 hours;

    uint256 private constant BUY_TAX_RATE = 150;
    uint256 private constant SELL_TAX_RATE = 150;
    
    // 税率计算分母：10000
    uint256 private constant TAX_DENOMINATOR = 10000;
    
    // 每天UTC+8 0点，从LP池抽取5%的HAF进行分配
    
    // 创世节点份额：100基点 = 1%
    // 以HAF形式直接分发给所有活跃创世节点
    uint256 private constant DAILY_BURN_GENESIS_RATE = 100;
    
    // 社区份额：100基点 = 1%
    // 以HAF形式转给owner地址
    uint256 private constant DAILY_BURN_COMMUNITY_RATE = 100;
    
    // 持币分红份额：300基点 = 3%
    // 按权重分配给持有≥88 HAF的地址
    uint256 private constant DAILY_BURN_HOLDER_RATE = 300;
    

    // 自动销毁率：20基点 = 0.2%
    uint256 private constant AUTO_BURN_RATE = 20;
    
    // 自动销毁间隔：2小时
    uint256 private constant AUTO_BURN_INTERVAL = 2 hours;
    
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // DeFi主合约地址 - 用于获取创世节点信息和分发奖励
    address public immutable defiContract;
    
    // USDT代币合约地址 - 用于创建交易对和计算价格
    address internal immutable usdtToken;
    
    // PancakeSwap HAF/USDT交易对地址 - 流动性池
    address public pancakePair;
    
    // PancakeSwap工厂合约地址 - 用于创建交易对
    address public pancakeFactory;
    
    // PancakeSwap路由合约地址 - 预留用于更复杂的交换操作
    address public pancakeRouter;
    
    // 税收金库 - 用于解决Uniswap不允许Swap到自身的限制
    TaxVault public taxVault;
    
    // 累积的买入税（HAF数量）
    // 当价值达到365 USDT时，兑换成USDT分发给创世节点
    uint256 internal accumulatedBuyTax;
    
    // 上次执行每日燃烧的时间戳（对齐到UTC+8 0点）
    uint256 internal lastDailyBurnTime;
    
    // 上次执行自动销毁的时间戳
    uint256 internal lastAutoBurnTime;
    
    // 符合分红资格的持有者地址数组
    // 持有≥365 HAF的地址会被添加到此数组
    address[] internal eligibleHolders;
    
    // 地址是否符合分红资格的映射（快速查找）
    mapping(address => bool) internal isEligibleHolder;
    
    // 持有者在eligibleHolders数组中的索引（用于高效删除）
    mapping(address => uint256) internal holderIndex;
    
    // 持币分红池中的HAF总量
    uint256 internal holderDividendPool;
    
    // 每单位权重累积的分红
    // 使用累积器模式，避免每次分红都要遍历所有持有者
    // 新分红加入时：accDividendPerWeight += 分红数量 / 总权重
    uint256 internal accDividendPerWeight;
    
    // 持有者的分红债务 - 用于计算待领取分红
    // 待领取 = 当前权重 * accDividendPerWeight - holderDividendDebt
    mapping(address => uint256) internal holderDividendDebt;
    
    // 持有者已领取的分红总额（用于统计显示）
    mapping(address => uint256) internal holderClaimedDividend;

    // 免税地址映射 - 这些地址的转账不收取买入/卖出税

    mapping(address => bool) public isTaxExempt;

    // 自动分发相关变量
    uint256 public processIndex; // 当前处理到的索引
    uint256 public constant PROCESS_GAS_LIMIT = 6000000; // 每次交易用于自动分发的最大Gas限制

    bool private transient _isExecutingMechanism;
    
    error LpNotInitialized();
    error InvalidAddress();
    error BurnLimitReached();
    error OnlyDefiContract();

    // 每日燃烧执行事件 - 记录各部分分配的数量和执行时间
    event DailyBurnExecuted(
        uint256 genesisAmount,    // 分配给创世节点的数量
        uint256 communityAmount,  // 分配给社区的数量
        uint256 holderAmount,     // 分配给持币分红的数量
        uint256 timestamp         // 执行时间戳
    );
    
    // 自动销毁执行事件 - 记录销毁到黑洞的数量
    event AutoBurnExecuted(
        uint256 amount,           // 销毁数量
        uint256 timestamp         // 执行时间戳
    );
    
    // 买入税分发事件 - 记录将买入税兑换成USDT分发给创世节点
    event BuyTaxDistributed(
        uint256 hafAmount,        // 兑换的HAF数量
        uint256 usdtValue         // 获得的USDT数量
    );
    
    // 卖出税收取事件 - 记录卖出税的去向
    event SellTaxCollected(
        uint256 amount,           // 税额
        address to                // 接收地址（owner）
    );
    
    // 持币分红领取事件 - 记录用户领取分红
    event HolderDividendClaimed(
        address indexed holder,   // 领取者地址（indexed便于过滤查询）
        uint256 amount            // 领取数量
    );
    
    // LP初始化事件 - 记录初始流动性的添加
    event LpInitialized(
        address pair,             // 交易对地址
        uint256 hafAmount,        // 初始HAF数量
        uint256 usdtAmount        // 初始USDT数量
    );
    
    // 价格更新事件 - 记录价格变化（预留）
    event PriceUpdated(
        uint256 newPrice          // 新价格
    );
    

    modifier onlyDefi() {
        if (msg.sender != defiContract) revert OnlyDefiContract();
        _;
    }

    modifier triggerMechanisms() {
        // 先触发懒加载机制
        _triggerLazyMechanisms();
        _; // 然后执行被修饰的函数
    }
    
    // ==================== 构造函数 ====================
    /**
     * @dev 构造函数 - 部署合约时执行一次
     * @param _usdtToken USDT代币合约地址
     * @param _defiContract DeFi主合约地址（将成为此合约的owner）
     * @param _factory PancakeSwap工厂合约地址（BSC/tBSC可传0使用默认值）
     * @param _router PancakeSwap路由合约地址（BSC/tBSC可传0使用默认值）
     */
    constructor(
        address _usdtToken,        // USDT地址
        address _defiContract,     // DeFi合约地址
        address _factory,          // 工厂地址（0则使用链默认值）
        address _router            // 路由地址（0则使用链默认值）
    ) ERC20("Hash Fi Token", "HAF") {
        
        usdtToken = _usdtToken;
        defiContract = _defiContract;

        if (_factory != address(0)) {
            // 使用传入的自定义地址
            pancakeFactory = _factory;
            pancakeRouter = _router;
        } else if (block.chainid == 56) {
            // BSC主网 (Chain ID: 56) - 使用PancakeSwap默认地址
            pancakeFactory = 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73;
            pancakeRouter = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
        } else if (block.chainid == 97) {
            // BSC测试网 (Chain ID: 97) - 使用PancakeSwap测试网地址
            pancakeFactory = 0x6725F303b657a9451d8BA641348b6761A6CC7a17;
            pancakeRouter = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;
        } else {
            revert("Factory address required for this chain");
        }

        _mint(address(this), TOTAL_SUPPLY);
        
        // 初始化税收金库
        taxVault = new TaxVault();

        // 设置免税地址 - 这些地址的转账不收取买入/卖出税
        isTaxExempt[address(this)] = true;
        isTaxExempt[address(taxVault)] = true;
        isTaxExempt[_defiContract] = true;
        isTaxExempt[DEAD_ADDRESS] = true;
        isTaxExempt[address(0)] = true;
        
        // 创建空池子
        pancakePair = IUniswapV2Factory(pancakeFactory).createPair(address(this), usdtToken);
        // 将交易对设为免税 - 移除此行，否则买卖税不生效
        // isTaxExempt[pancakePair] = true;
        
        // 将当前时间对齐到UTC+8的当日0点（实际是前一天的UTC 16:00）
        lastDailyBurnTime = _alignToUtc8Morning(block.timestamp);
        lastAutoBurnTime = block.timestamp;
    }

    function isLpInitialized() public view returns (bool) {
        // 检查LP池中是否有HAF（有HAF就认为已初始化）
        return balanceOf(pancakePair) > 0;
    }
    
    // ==================== 流动性管理 ====================
    /**
     * @dev 添加流动性到LP池
     * @param _usdtAmount USDT数量
     * @param _hafAmount HAF数量
     * 可以同时添加两种代币，也可以只添加一种

     */
    function addLiquidity(uint256 _usdtAmount, uint256 _hafAmount) external onlyDefi {
        // 至少需要添加一种代币
        require(_usdtAmount > 0 || _hafAmount > 0, "Invalid amounts");
        
        // 如果有USDT，从defiContract(HashFi)拉取到交易对
        if (_usdtAmount > 0) {
            // defiContract 已经 approve 过了，直接 transferFrom
            IERC20(usdtToken).transferFrom(defiContract, pancakePair, _usdtAmount);
        }
        
        // 如果有HAF，优先用本合约余额，不足则从defiContract(HashFi)补充
        if (_hafAmount > 0) {
            uint256 hafBalance = balanceOf(address(this));
            if (hafBalance >= _hafAmount) {
                // 本合约HAF充足，直接转
                _transfer(address(this), pancakePair, _hafAmount);
            } else {
                // 本合约HAF不足，先用完本合约的，再从HashFi补
                if (hafBalance > 0) {
                    _transfer(address(this), pancakePair, hafBalance);
                }
                uint256 shortage = _hafAmount - hafBalance;
                // 从HashFi拉取不足的部分（需要HashFi先approve）
                transferFrom(defiContract, pancakePair, shortage);
            }
        }

        if (_usdtAmount > 0 && _hafAmount > 0) {
            IUniswapV2Pair(pancakePair).mint(address(this));
        } else {
            IUniswapV2Pair(pancakePair).sync();
        }
    }
    
    /**
     * @dev 获取HAF当前价格（以USDT计价）
     * @return 价格，乘以PRICE_PRECISION (1e18)
     */
    function getPrice() public view returns (uint256) {
        if (!isLpInitialized()) {
            return 0 * PRICE_PRECISION;
        }
        IUniswapV2Pair pair = IUniswapV2Pair(pancakePair);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        address token0 = pair.token0();
        
        // 根据代币顺序计算价格
        if (token0 == address(this)) {
            return (uint256(reserve1) * PRICE_PRECISION) / uint256(reserve0);
        } else {
            return (uint256(reserve0) * PRICE_PRECISION) / uint256(reserve1);
        }
    }

    function getLpHafBalance() public view returns (uint256) {
        if (pancakePair == address(0)) return 0;
        return balanceOf(pancakePair);
    }

    function getLpUsdtBalance() public view returns (uint256) {
        if (pancakePair == address(0)) return 0;
        return IERC20(usdtToken).balanceOf(pancakePair);
    }

    function _update(address from, address to, uint256 amount) internal virtual override {
        // 只在普通转账（不涉及 pair）时触发懒加载机制
        // 涉及 pair 的操作（买入/卖出）不触发，避免 swap 过程中 K 值检查失败
        // 因为 burn 操作会从 pair 转出代币，导致 K 值 (balance0 * balance1 >= reserve0 * reserve1) 检查失败
        if (from != pancakePair && to != pancakePair) {
            _triggerLazyMechanisms();
        }

        bool takeTax = true;
        
        // 检查免税地址 - 如果发送方或接收方是免税地址，不收买卖税
        if (isTaxExempt[from] || isTaxExempt[to]) {
            takeTax = false;
        }
        
        // 普通转账（不涉及LP池）免税
        // 只有与LP池的交互（买入/卖出）才收税
        if (from != pancakePair && to != pancakePair) {
            takeTax = false;
        }
        
        // 税额初始化为0
        uint256 taxAmount = 0;
        
        // 如果需要收税且LP已初始化
        if (takeTax && isLpInitialized()) {
            if (from == pancakePair) {
                // 买入场景：用户从LP池买入HAF（LP是发送方）
                // 计算买入税 = 数量 * 1.5%
                taxAmount = (amount * BUY_TAX_RATE) / TAX_DENOMINATOR;
                if (taxAmount > 0) {
                    // 累加到买入税账户
                    accumulatedBuyTax += taxAmount;
                    // 将税额转入本合约（等待累积后分发）
                    super._update(from, address(this), taxAmount);
                    // 注意：不在这里调用 _checkAndDistributeBuyTax()
                    // 因为此时 pair 被 swap 的 lock 修饰器锁定，调用 pair.swap 会失败
                    // 分发将在下次普通转账或外部调用 triggerMechanismsExternal() 时触发
                }
            } else if (to == pancakePair) {
                // 卖出场景：用户向LP池卖出HAF（LP是接收方）
                // 计算卖出税 = 数量 * 1.5%
                taxAmount = (amount * SELL_TAX_RATE) / TAX_DENOMINATOR;
                if (taxAmount > 0) {
                    // 获取DeFi合约的owner地址
                    address defiOwner = IHashFiMain(defiContract).owner();
                    // 卖出税直接转给owner
                    super._update(from, defiOwner, taxAmount);
                    // 触发卖出税收取事件
                    emit SellTaxCollected(taxAmount, defiOwner);
                }
            }
        }
        
        // 实际转账数量 = 原数量 - 税额
        uint256 transferAmount = amount - taxAmount;
        // 执行实际转账
        super._update(from, to, transferAmount);
        
        // 更新发送方和接收方的持币分红资格 如果余额变化导致跨过88 HAF门槛，会自动添加/移除资格
        _updateHolderStatus(from);
        _updateHolderStatus(to);
    }
    
    // ==================== 买入税分发 ====================
    /**
     * @dev 检查并分发买入税給创世节点
     * 
     * 工作流程：
     * 1. 获取活跃创世节点数量 T
     * 2. 如果 T = 0，跳过（没有分发对象）
     * 3. 计算累积买入税的USDT价值
     * 4. 如果价值 >= T USDT，触发分发
     * 5. 将HAF兑换成USDT，直接平均分给每个节点（约1U/节点）
     */
    function _checkAndDistributeBuyTax() internal {
        // 获取活跃创世节点数量
        uint256 genesisCount = IHashFiMain(defiContract).getActiveGenesisNodesCount();
        
        // 如果没有活跃创世节点，跳过
        if (genesisCount == 0) return;
        
        // 获取当前HAF价格（USDT计价）
        uint256 price = getPrice();
        // 计算累积买入税的USDT价值
        uint256 taxValueUsdt = (accumulatedBuyTax * price) / PRICE_PRECISION;
        
        // 分发阈值 = 创世节点数量 T（每节点1 USDT）
        // 例如：10个节点，阈值就是10 USDT
        uint256 threshold = genesisCount * 1e18;
        
        // 如果达到分发阈值
        if (taxValueUsdt >= threshold) {
            // 将累积的HAF兑换成USDT
            uint256 hafToSwap = accumulatedBuyTax;
            // 执行HAF→USDT兑换
            uint256 usdtReceived = _swapHafToUsdt(hafToSwap);
            
            // 如果成功获得USDT，直接平均分给每个创世节点
            if (usdtReceived > 0) {
                // 计算每个节点分多少（约1U，考虑滑点可能略少）
                uint256 amountPerNode = usdtReceived / genesisCount;
                
                // 遍历所有活跃创世节点，直接转USDT
                for (uint256 i = 0; i < genesisCount; i++) {
                    address node = IHashFiMain(defiContract).getActiveGenesisNodeAt(i);
                    if (node != address(0) && amountPerNode > 0) {
                        IERC20(usdtToken).transfer(node, amountPerNode);
                    }
                }
                
                // 触发买入税分发事件
                emit BuyTaxDistributed(hafToSwap, usdtReceived);
            }
            
            // 清零累积买入税
            accumulatedBuyTax = 0;
        }
    }
    
    /**
     * @dev 将HAF兑换成USDT（内部函数）
     * @param _hafAmount 要兑换的HAF数量
     * @return 获得的USDT数量
     * 
     * 使用恒定乘积公式计算输出，然后调用pair.swap执行兑换
     */
    function _swapHafToUsdt(uint256 _hafAmount) internal returns (uint256) {
        // 如果数量为0或交易对不存在，返回0
        if (_hafAmount == 0 || pancakePair == address(0)) return 0;
        
        // 获取交易对当前储备量
        IUniswapV2Pair pair = IUniswapV2Pair(pancakePair);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        
        // 获取token0地址，确定代币顺序
        address token0 = pair.token0();
        uint256 hafReserve;    // HAF储备量
        uint256 usdtReserve;   // USDT储备量
        
        // 根据token0确定哪个是HAF，哪个是USDT
        if (token0 == address(this)) {
            // HAF是token0
            hafReserve = uint256(reserve0);
            usdtReserve = uint256(reserve1);
        } else {
            // HAF是token1
            hafReserve = uint256(reserve1);
            usdtReserve = uint256(reserve0);
        }
        
        // 使用恒定乘积公式计算输出（扣除0.25%手续费）
        uint256 amountInWithFee = _hafAmount * 9975;
        uint256 numerator = amountInWithFee * usdtReserve;
        uint256 denominator = hafReserve * 10000 + amountInWithFee;
        uint256 usdtOut = numerator / denominator;

        // 【安全缓冲】将请求金额打个折 (99.9%)，确保交易 100% 成功
        // 留一点点余量给 LP 池，防止因费率/精度问题导致 K 值校验失败而回滚
        if (usdtOut > 0) {
            usdtOut = (usdtOut * 9990) / 10000;
        }
        
        // 如果输出为0，返回0
        if (usdtOut == 0) return 0;
        
        // 将HAF转入交易对
        _transfer(address(this), pancakePair, _hafAmount);
        
        // 调用swap执行兑换，USDT转到税收金库
        if (token0 == address(this)) {
            // HAF是token0，输出USDT(token1)
            pair.swap(0, usdtOut, address(taxVault), new bytes(0));
        } else {
            // HAF是token1，输出USDT(token0)
            pair.swap(usdtOut, 0, address(taxVault), new bytes(0));
        }
        
        // 从税收金库取回所有USDT到本合约，以实际收到为准
        // 这样可以规避费率计算偏差、转账扣税等问题
        uint256 actualUsdtReceived = taxVault.withdrawAllToken(usdtToken, address(this));

        return actualUsdtReceived;
    }
    
    function _triggerLazyMechanisms() internal {
        if (_isExecutingMechanism) return;
        _isExecutingMechanism = true;
        
        // 尝试执行每日燃烧（UTC+8 0点）
        _tryDailyBurn();
        // 尝试执行自动销毁（每2小时）
        _tryAutoBurn();
        // 尝试分发累积的买入税（达到阈值时）
        _checkAndDistributeBuyTax();
        
        // 执行自动分红处理
        _processDividends(PROCESS_GAS_LIMIT);

        _isExecutingMechanism = false;
    }

    /**
     * @dev 批量处理自动分红
     * 利用交易剩余Gas，帮助用户自动领取分红
     * 避免一次性遍历所有用户导致Gas超标
     */
    function _processDividends(uint256 gasLimit) internal {
        uint256 shareholderCount = eligibleHolders.length;
        
        if (shareholderCount == 0) return;

        uint256 gasUsed = 0;
        uint256 gasLeft = gasleft();
        uint256 iterations = 0;
        uint256 currentProcessIndex = processIndex; // 使用局部变量节省Gas

        // 循环直到Gas用完或达到单次上限
        while (gasUsed < gasLimit && iterations < shareholderCount) {
            
            // 如果索引超出范围，重置为0（开始新一轮）
            if (currentProcessIndex >= shareholderCount) {
                currentProcessIndex = 0;
            }

            address shareholder = eligibleHolders[currentProcessIndex];
            
            // 帮用户领取分红（内部逻辑与claimDividend一致，但省去额外检查）
            _distributeDividend(shareholder);

            // 更新索引和迭代计数
            currentProcessIndex++;
            iterations++;

            // 计算已用Gas
            uint256 newGasLeft = gasleft();
            if (gasLeft > newGasLeft) {
                gasUsed += (gasLeft - newGasLeft);
            }
            gasLeft = newGasLeft;
        }

        // 保存新的进度索引
        processIndex = currentProcessIndex;
    }

    /**
     * @dev 内部执行分发逻辑
     * 将 _getHolderWeight 和 计算逻辑内联，减少调用开销
     */
    function _distributeDividend(address holder) internal {
        // 如果不是资格持有者，直接返回（虽然eligibleHolders里应该都是，但_updateHolderStatus可能变更状态）
        if (!isEligibleHolder[holder]) return;

        uint256 weight = _getHolderWeight(holder);
        if (weight == 0) return;

        // 计算累积分红
        uint256 accDividend = (weight * accDividendPerWeight) / PRICE_PRECISION;
        uint256 debt = holderDividendDebt[holder];

        if (accDividend > debt) {
            uint256 pending = accDividend - debt;
            
            // 更新债务
            holderDividendDebt[holder] = accDividend;
            
            // 只有当待领取金额大于0时才执行转账和更新状态
            if (pending > 0) {
                // 如果池子不够（理论上不会，但安全起见）
                if (holderDividendPool >= pending) {
                    holderDividendPool -= pending;
                } else {
                    pending = holderDividendPool;
                    holderDividendPool = 0;
                }
                
                if (pending > 0) {
                    holderClaimedDividend[holder] += pending;
                    _transfer(address(this), holder, pending);
                    // 触发事件
                    // emit HolderDividendClaimed(holder, pending); // 自动模式下为了省Gas可以注释掉事件，或者保留
                }
            }
        } else {
            // 即使没有 pending，也要更新 debt 以防权重变化导致的计算错误
            // 在本系统中权重只在 update 变化，debt 也会随之更新，所以这里通常是不需要的
            // 但为了双重保险可以更新
            holderDividendDebt[holder] = accDividend;
        }
    }

    /**
     * @dev 尝试执行每日燃烧
     * 检查是否到达新的一天（UTC+8），如果是则执行燃烧
     * 支持补执行，最多补7天
     */
    function _tryDailyBurn() internal {
        uint256 currentMorning = _alignToUtc8Morning(block.timestamp);
        if (currentMorning > lastDailyBurnTime && isLpInitialized()) {
            uint256 daysPassed = (currentMorning - lastDailyBurnTime) / 1 days;
            for (uint256 i = 0; i < daysPassed && i < 7; i++) {
                _executeDailyBurn();
            }
            lastDailyBurnTime = currentMorning;
        }
    }
    
    /**
     * @dev 执行每日燃烧
     * 从LP池抽取5%的HAF进行分配：
     * - 1% 给创世节点
     * - 1% 给社区(owner)
     * - 3% 给持币分红池
     * 
     * 直接从LP转移到目标地址，不改变totalSupply
     */
    function _executeDailyBurn() internal {
        uint256 lpHafBalance = getLpHafBalance();
        if (lpHafBalance == 0) return;
        
        // 计算各部分数量
        uint256 genesisAmount = (lpHafBalance * DAILY_BURN_GENESIS_RATE) / TAX_DENOMINATOR;    // 1%
        uint256 communityAmount = (lpHafBalance * DAILY_BURN_COMMUNITY_RATE) / TAX_DENOMINATOR; // 1%
        uint256 holderAmount = (lpHafBalance * DAILY_BURN_HOLDER_RATE) / TAX_DENOMINATOR;       // 3%
        
        // 分发创世节点份额：直接从LP转给每个节点
        if (genesisAmount > 0) {
            uint256 genesisCount = IHashFiMain(defiContract).getActiveGenesisNodesCount();
            if (genesisCount == 0) {
                // 没有创世节点，转到黑洞
                super._update(pancakePair, DEAD_ADDRESS, genesisAmount);
            } else {
                uint256 amountPerNode = genesisAmount / genesisCount;
                for (uint256 i = 0; i < genesisCount; i++) {
                    address node = IHashFiMain(defiContract).getActiveGenesisNodeAt(i);
                    if (node != address(0) && amountPerNode > 0) {
                        super._update(pancakePair, node, amountPerNode);
                    }
                }
            }
        }
        
        // 社区份额：直接从LP转给owner
        if (communityAmount > 0) {
            address communityAddress = IHashFiMain(defiContract).owner();
            super._update(pancakePair, communityAddress, communityAmount);
        }
        
        // 持币分红份额：从LP转到本合约，加入分红池
        if (holderAmount > 0) {
            uint256 totalWeight = _calculateTotalWeight();
            if (totalWeight == 0) {
                // 没有资格持有者，转到黑洞
                super._update(pancakePair, DEAD_ADDRESS, holderAmount);
            } else {
                // 转到本合约用于分红
                super._update(pancakePair, address(this), holderAmount);
                holderDividendPool += holderAmount;
                accDividendPerWeight += (holderAmount * PRICE_PRECISION) / totalWeight;
            }
        }
        
        // 同步LP池储备量（HAF减少导致价格上涨）
        IUniswapV2Pair(pancakePair).sync();
        
        emit DailyBurnExecuted(genesisAmount, communityAmount, holderAmount, block.timestamp);
    }
    
    /**
     * @dev 尝试执行自动销毁
     * 每2小时从LP池销毁0.2%到黑洞地址
     * 支持补执行，最多补12次（24小时）
     */
    function _tryAutoBurn() internal {
        // 如果LP未初始化，直接返回
        if (!isLpInitialized()) return;
        
        // 计算过了多少个2小时间隔
        uint256 intervalsPassed = (block.timestamp - lastAutoBurnTime) / AUTO_BURN_INTERVAL;
        
        // 如果过了至少一个间隔
        if (intervalsPassed > 0) {
            // 补执行遗漏的间隔，最多补12次（24小时）
            for (uint256 i = 0; i < intervalsPassed && i < 12; i++) {
                _executeAutoBurn();
            }
            
            // 更新上次销毁时间（跳过已执行的间隔）
            lastAutoBurnTime = lastAutoBurnTime + (intervalsPassed * AUTO_BURN_INTERVAL);
        }
    }
    
    /**
     * @dev 执行自动销毁
     * 将LP池中0.2%的HAF转移到黑洞地址
     * 
     * 与每日燃烧的区别：
     * - 每日燃烧是真销毁（减少totalSupply）然后重新铸造分配
     * - 自动销毁是转移到黑洞（不减少totalSupply，但计入"已销毁"）
     */
    function _executeAutoBurn() internal {
        // 获取LP池中的HAF余额
        uint256 lpHafBalance = getLpHafBalance();
        // 如果LP池没有HAF，直接返回
        if (lpHafBalance == 0) return;
        
        // 检查销毁限制
        uint256 currentSupply = totalSupply();           // 当前总供应量
        uint256 deadBalance = balanceOf(DEAD_ADDRESS);   // 黑洞地址余额
        uint256 effectiveSupply = currentSupply - deadBalance;  // 有效供应量
        
        // 如果有效供应量已达到最小值，停止销毁
        if (effectiveSupply <= MIN_SUPPLY) return;
        
        // 计算销毁数量（0.2%）
        uint256 burnAmount = (lpHafBalance * AUTO_BURN_RATE) / TAX_DENOMINATOR;
        
        // 如果销毁后会低于最小供应量，调整销毁数量
        if (effectiveSupply - burnAmount < MIN_SUPPLY) {
            burnAmount = effectiveSupply - MIN_SUPPLY;
        }
        
        // 如果销毁数量为0，直接返回
        if (burnAmount == 0) return;
        
        // 从LP池转移到黑洞地址（伪销毁，不减少totalSupply）
        _update(pancakePair, DEAD_ADDRESS, burnAmount);
        
        // 同步LP池储备量（触发价格上涨）
        IUniswapV2Pair(pancakePair).sync();
        
        // 触发自动销毁执行事件
        emit AutoBurnExecuted(burnAmount, block.timestamp);
    }
    
    // ==================== 持币分红机制 ====================
    /**
     * @dev 更新持有者的分红资格状态
     * @param holder 持有者地址
     * 
     * 在每次转账后调用，检查持有者是否跨过365 HAF门槛
     * - 新增资格：余额从<365变为≥365
     * - 移除资格：余额从≥365变为<365
     */
    function _updateHolderStatus(address holder) internal {
        // 排除特殊地址（这些地址不应参与分红）
        if (holder == address(0) ||           // 零地址
            holder == DEAD_ADDRESS ||          // 黑洞地址
            holder == pancakePair ||           // LP池
            holder == address(this) ||         // 本合约
            holder == defiContract) {          // DeFi合约
            return;
        }
        
        // 获取持有者当前余额
        uint256 balance = balanceOf(holder);
        // 判断是否应该有资格（持有≥365 HAF）
        bool shouldBeEligible = balance >= HOLDER_THRESHOLD;
        
        // 如果应该有资格但目前没有，添加到资格列表
        if (shouldBeEligible && !isEligibleHolder[holder]) {
            // 记录在数组中的索引（用于后续高效删除）
            holderIndex[holder] = eligibleHolders.length;
            // 添加到资格列表
            eligibleHolders.push(holder);
            // 标记为有资格
            isEligibleHolder[holder] = true;
            // 设置分红债务为当前累积值（新加入者从此刻开始计算分红）
            holderDividendDebt[holder] = accDividendPerWeight;
        } 
        // 如果不应该有资格但目前有，从资格列表移除
        else if (!shouldBeEligible && isEligibleHolder[holder]) {
            _removeFromEligibleHolders(holder);
        }
    }
    
    /**
     * @dev 从资格持有者列表中移除地址
     * @param holder 要移除的地址
     * 
     * 使用"与最后元素交换"的技巧实现O(1)删除
     */
    function _removeFromEligibleHolders(address holder) internal {
        // 如果不在列表中，直接返回
        if (!isEligibleHolder[holder]) return;
        
        // 获取要移除地址的索引
        uint256 index = holderIndex[holder];
        // 获取数组最后一个元素的索引
        uint256 lastIndex = eligibleHolders.length - 1;
        
        // 如果不是最后一个元素，用最后一个元素替换
        if (index != lastIndex) {
            // 获取最后一个元素
            address lastHolder = eligibleHolders[lastIndex];
            // 用最后一个元素覆盖要删除的位置
            eligibleHolders[index] = lastHolder;
            // 更新最后一个元素的索引记录
            holderIndex[lastHolder] = index;
        }
        
        // 删除数组最后一个元素
        eligibleHolders.pop();
        // 标记为无资格
        isEligibleHolder[holder] = false;
        // 删除索引记录
        delete holderIndex[holder];
    }
    
    /**
     * @dev 计算所有资格持有者的总权重
     * @return 总权重
     *
     * 权重计算：weight = balance / 365（向下取整）
     * 例如：持有730 HAF的地址权重为2，持有400 HAF的地址权重为1
     */
    function _calculateTotalWeight() internal view returns (uint256) {
        uint256 totalWeight = 0;
        
        // 遍历所有资格持有者
        for (uint256 i = 0; i < eligibleHolders.length; i++) {
            address holder = eligibleHolders[i];
            uint256 balance = balanceOf(holder);
            // 如果余额仍然达标（可能已被转出）
            if (balance >= HOLDER_THRESHOLD) {
                // 权重 = 余额 / 365（向下取整）
                totalWeight += balance / HOLDER_THRESHOLD;
            }
        }
        
        return totalWeight;
    }
    
    /**
     * @dev 获取单个持有者的权重
     * @param holder 持有者地址
     * @return 权重值
     */
    function _getHolderWeight(address holder) internal view returns (uint256) {
        uint256 balance = balanceOf(holder);
        // 如果余额不足365，权重为0
        if (balance < HOLDER_THRESHOLD) return 0;
        // 权重 = 余额 / 365
        return balance / HOLDER_THRESHOLD;
    }
    
    /**
     * @dev 获取持有者待领取的分红
     * @param holder 持有者地址
     * @return 待领取分红数量（HAF）
     * 
     * 计算公式：pending = weight * accDividendPerWeight - debt
     */
    function getPendingDividend(address holder) public view returns (uint256) {
        // 如果不是资格持有者，返回0
        if (!isEligibleHolder[holder]) return 0;
        
        // 获取权重
        uint256 weight = _getHolderWeight(holder);
        // 如果权重为0，返回0
        if (weight == 0) return 0;
        
        // 计算累积分红 = 权重 * 每单位权重累积分红
        uint256 accDividend = (weight * accDividendPerWeight) / PRICE_PRECISION;
        // 获取债务（已计算过的分红基准）
        uint256 debt = holderDividendDebt[holder];
        
        // 如果累积分红不大于债务，返回0
        if (accDividend <= debt) return 0;
        // 返回待领取分红 = 累积分红 - 债务
        return accDividend - debt;
    }
    
    /**
     * @dev 领取持币分红 (手动)
     * 虽然有自动分发，用户仍然可以手动调用此函数提前领取
     */
    function claimDividend() external triggerMechanisms {
        uint256 pending = getPendingDividend(msg.sender);
        require(pending > 0, "No dividend to claim");
        _distributeDividend(msg.sender);
        emit HolderDividendClaimed(msg.sender, pending);
    }
    
    // ==================== 安全销毁（带最小供应量检查）====================
    // ==================== 辅助函数 ====================
    /**
     * @dev 将时间戳对齐到UTC+8时区的当日0点
     * @param timestamp 原始UTC时间戳
     * @return 对齐后的时间戳（UTC格式）
     */
    function _alignToUtc8Morning(uint256 timestamp) internal pure returns (uint256) {
        uint256 utc8Time = timestamp + UTC8_OFFSET;
        uint256 dayStart = (utc8Time / 1 days) * 1 days;
        return dayStart - UTC8_OFFSET;
    }
    
    // ==================== 查询函数 ====================
    /**
     * @dev 获取符合分红资格的持有者数量
     */
    function getEligibleHoldersCount() external view returns (uint256) {
        return eligibleHolders.length;
    }
    
    /**
     * @dev 根据索引获取符合分红资格的持有者地址
     * @param index 索引（从0开始）
     */
    function getEligibleHolderAt(uint256 index) external view returns (address) {
        require(index < eligibleHolders.length, "Index out of bounds");
        return eligibleHolders[index];
    }
    
    /**
     * @dev 获取所有符合分红资格持有者的总权重
     */
    function getTotalWeight() external view returns (uint256) {
        return _calculateTotalWeight();
    }

    function getHolderInfo(address holder) external view returns (
        bool eligible,           // 是否有资格
        uint256 weight,          // 权重
        uint256 pendingDividend, // 待领取分红
        uint256 claimedDividend  // 已领取分红
    ) {
        eligible = isEligibleHolder[holder];
        weight = _getHolderWeight(holder);
        pendingDividend = getPendingDividend(holder);
        claimedDividend = holderClaimedDividend[holder];
    }
    
    function getBurnStats() external view returns (
        uint256 totalBurned,     // 已销毁总量
        uint256 effectiveSupply, // 有效供应量
        uint256 minSupply,       // 最小供应量
        bool canStillBurn        // 是否还能继续销毁
    ) {
        // 黑洞地址余额即为已销毁数量
        totalBurned = balanceOf(DEAD_ADDRESS);
        // 有效供应量 = 总供应 - 已销毁
        effectiveSupply = totalSupply() - totalBurned;
        // 最小供应量常量
        minSupply = MIN_SUPPLY;
        // 如果有效供应量大于最小值，还能继续销毁
        canStillBurn = effectiveSupply > MIN_SUPPLY;
    }
    
    function getNextDailyBurnTime() external view returns (uint256) {
        return lastDailyBurnTime + 1 days;
    }

    function getNextAutoBurnTime() external view returns (uint256) {
        return lastAutoBurnTime + AUTO_BURN_INTERVAL;
    }

    function getContractBalance() external view returns (uint256) {
        return balanceOf(address(this));
    }

    function transferFromContract(address to, uint256 amount) external onlyDefi {
        _transfer(address(this), to, amount);
    }

    function triggerMechanismsExternal() external {
        _triggerLazyMechanisms();
    }
    
    function withdrawToDefi(address token, uint256 amount) external onlyDefi {
        if (token == address(this)) {
            _transfer(address(this), defiContract, amount);
        } else {
            IERC20(token).transfer(defiContract, amount);
        }
    }
}

/**
 * @title TaxVault - 税收中转金库
 * @dev 用于接收Swap出来的USDT，规避Uniswap不允许Swap到Token合约自身的限制
 */
contract TaxVault {
    address public immutable owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
       _;
    }

    /**
     * @dev 让owner可以提取里面的所有Token，并返回提取的数量
     */
    function withdrawAllToken(address token, address to) external onlyOwner returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(to, balance);
        }
        return balance;
    }
}
