// SPDX-License-Identifier: MIT
// 声明开源许可证为MIT协议

pragma solidity ^0.8.33;
// 指定Solidity编译器版本为0.8.33及以上

// ==================== 外部依赖导入 ====================
// 导入OpenZeppelin的ERC20标准代币实现 - 提供代币的基础功能
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// 导入ERC20接口 - 用于与其他代币合约交互
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// 导入Ownable合约 - 提供所有权管理功能
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
// 导入Uniswap V2工厂接口 - PancakeSwap是Uniswap V2的分叉，接口兼容
import {IUniswapV2Factory} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
// 导入Uniswap V2交易对接口 - 用于操作流动性池
import {IUniswapV2Pair} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

/**
 * @title IHashFiMain接口
 * @dev 定义与HashFi主合约交互所需的函数接口
 * HAF代币需要调用主合约来获取创世节点信息并分发奖励
 */
interface IHashFiMain {
    // 获取主合约的所有者地址 - 用于接收社区份额和卖出税
    function owner() external view returns (address);
    // 获取活跃创世节点的数量 - 用于计算分发
    function getActiveGenesisNodesCount() external view returns (uint256);
    // 根据索引获取活跃创世节点的地址 - 用于遍历分发
    function getActiveGenesisNodeAt(uint256 index) external view returns (address);
    // 分发创世节点奖励(USDT) - 将买入税转换后的USDT分发给创世节点
    function distributeGenesisReward(uint256 usdtAmount) external;
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
 * 7. 持币≥88 HAF可参与分红
 */
contract HAFToken is ERC20, Ownable {
    
    // ==================== 常量定义 ====================
    // 常量在编译时确定，不占用存储槽，节省Gas
    
    // 代币总供应量：2100万枚（含18位小数精度）
    // 1e18表示10的18次方，是ERC20代币的标准精度
    uint256 public constant TOTAL_SUPPLY = 21_000_000 * 1e18;
    
    // 最小供应量：21万枚，通缩销毁的底线
    // 当有效供应量达到此值时，停止所有销毁机制
    uint256 public constant MIN_SUPPLY = 210_000 * 1e18;
    
    // 价格精度：1e18，用于避免整数除法精度丢失
    // 例如：实际价格0.5 USDT 存储为 0.5 * 1e18 = 5e17
    uint256 public constant PRICE_PRECISION = 1e18;
    
    // 持币分红门槛：88枚HAF
    // 持有≥88 HAF的地址才能参与每日3%的持币分红
    uint256 public constant HOLDER_THRESHOLD = 88 * 1e18;
    
    // UTC+8时区偏移量：8小时（秒）
    // 用于将时间对齐到北京时间
    uint256 private constant UTC8_OFFSET = 8 hours;
    
    // ==================== 税率配置 ====================
    // 使用基点(basis points)表示，100基点=1%，更精确
    
    // 买入税率：150基点 = 1.5%
    // 用户从PancakeSwap买入HAF时收取，累积后分发给创世节点
    uint256 private constant BUY_TAX_RATE = 150;
    
    // 卖出税率：150基点 = 1.5%
    // 用户在PancakeSwap卖出HAF时收取，直接转给owner
    uint256 private constant SELL_TAX_RATE = 150;
    
    // 税率计算分母：10000
    // 实际税率 = 税率值 / 10000，例如 150/10000 = 1.5%
    uint256 private constant TAX_DENOMINATOR = 10000;
    
    // ==================== 每日燃烧率配置 ====================
    // 每天UTC+8早8点，从LP池抽取5%的HAF进行分配
    
    // 创世节点份额：100基点 = 1%
    // 以HAF形式直接分发给所有活跃创世节点
    uint256 private constant DAILY_BURN_GENESIS_RATE = 100;
    
    // 社区份额：100基点 = 1%
    // 以HAF形式转给owner地址
    uint256 private constant DAILY_BURN_COMMUNITY_RATE = 100;
    
    // 持币分红份额：300基点 = 3%
    // 按权重分配给持有≥88 HAF的地址
    uint256 private constant DAILY_BURN_HOLDER_RATE = 300;
    
    // ==================== 自动销毁配置 ====================
    // 每2小时自动销毁LP池中0.2%的HAF到黑洞地址
    // 这会减少流通量但不减少totalSupply，造成价格上涨
    
    // 自动销毁率：20基点 = 0.2%
    uint256 private constant AUTO_BURN_RATE = 20;
    
    // 自动销毁间隔：2小时
    uint256 private constant AUTO_BURN_INTERVAL = 2 hours;
    
    // ==================== 买入税分发阈值 ====================
    // 当累积的买入税价值达到365 USDT时，触发分发给创世节点
    // 这样可以减少频繁小额转账的Gas消耗
    uint256 private constant GENESIS_DISTRIBUTE_THRESHOLD = 365 * 1e18;
    
    // ==================== 特殊地址 ====================
    // 黑洞地址（死亡地址）：用于"伪销毁"代币
    // 发送到此地址的代币无法取回，但仍计入totalSupply
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // ==================== 状态变量 - 核心地址 ====================
    // immutable变量在构造函数中设置后不可更改，节省Gas
    
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
    
    // ==================== 状态变量 - 税收追踪 ====================
    // 累积的买入税（HAF数量）
    // 当价值达到365 USDT时，兑换成USDT分发给创世节点
    uint256 internal accumulatedBuyTax;
    
    // ==================== 状态变量 - 时间追踪 ====================
    // 上次执行每日燃烧的时间戳（对齐到UTC+8早8点）
    uint256 internal lastDailyBurnTime;
    
    // 上次执行自动销毁的时间戳
    uint256 internal lastAutoBurnTime;
    
    // ==================== 状态变量 - 持有者追踪 ====================
    // 符合分红资格的持有者地址数组
    // 持有≥88 HAF的地址会被添加到此数组
    address[] internal eligibleHolders;
    
    // 地址是否符合分红资格的映射（快速查找）
    mapping(address => bool) internal isEligibleHolder;
    
    // 持有者在eligibleHolders数组中的索引（用于高效删除）
    mapping(address => uint256) internal holderIndex;
    
    // ==================== 状态变量 - 分红池 ====================
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
    
    // ==================== 状态变量 - LP状态 ====================
    // 已删除 isLpInitialized 状态变量
    // 现在通过 isLpInitialized() 函数检测LP池是否有流动性来判断
    
    // ==================== 状态变量 - 免税地址 ====================
    // 免税地址映射 - 这些地址的转账不收取买入/卖出税
    // 包括：本合约、DeFi合约、黑洞地址、零地址、交易对地址
    mapping(address => bool) public isTaxExempt;
    
    // ==================== 状态变量 - 重入保护 ====================
    // 防止懒加载机制在内部操作时重复触发
    // 使用 transient 存储，每次交易后自动清零，且gas更低
    bool private transient _isExecutingMechanism;
    
    // ==================== 自定义错误 ====================
    // 使用自定义错误比require字符串更节省Gas
    
    // LP池未初始化时调用相关函数抛出此错误
    error LpNotInitialized();
    
    // 传入无效地址（如零地址）时抛出此错误
    error InvalidAddress();
    
    // 尝试销毁超过允许数量时抛出此错误
    error BurnLimitReached();
    
    // ==================== 事件定义 ====================
    // 事件用于记录重要操作，前端可以监听这些事件
    
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
    
    // ==================== 修饰符 ====================
    // 修饰符用于在函数执行前/后添加通用逻辑
    
    /**
     * @dev 触发懒加载机制的修饰符
     * 每次有此修饰符的函数被调用时，会先检查并执行：
     * 1. 每日燃烧（如果到了执行时间）
     * 2. 自动销毁（如果到了执行时间）
     * 这种"懒加载"设计避免了需要外部触发器的问题
     */
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
     * 
     * 初始化流程：
     * 1. 调用父合约构造函数（ERC20设置名称符号，Ownable设置owner）
     * 2. 保存核心地址
     * 3. 设置PancakeSwap地址（优先使用传入参数，否则使用链默认值）
     * 4. 创建HAF/USDT交易对（空池子）
     * 5. 铸造全部代币到本合约
     * 6. 设置免税地址
     * 7. 初始化时间追踪器
     */
    constructor(
        address _usdtToken,        // USDT地址
        address _defiContract,     // DeFi合约地址
        address _factory,          // 工厂地址（0则使用链默认值）
        address _router            // 路由地址（0则使用链默认值）
    ) ERC20("Hash Fi Token", "HAF") Ownable(_defiContract) {
        // ERC20("Hash Fi Token", "HAF") - 设置代币名称和符号
        // Ownable(_defiContract) - 将owner设为DeFi合约
        
        // 保存USDT地址（不可变）
        usdtToken = _usdtToken;
        // 保存DeFi合约地址（不可变）
        defiContract = _defiContract;
        
        // 设置PancakeSwap地址
        // 如果传入了工厂地址，使用传入值；否则根据链ID使用默认值
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
            // 其他网络必须传入工厂地址
            revert("Factory address required for this chain");
        }
        
        // 铸造全部代币(2100万)到本合约地址
        // 这些代币将用于：LP初始化、质押奖励、燃烧分配等
        _mint(address(this), TOTAL_SUPPLY);
        
        // 设置免税地址 - 这些地址的转账不收取买入/卖出税
        isTaxExempt[address(this)] = true;       // 本合约 - 内部转账免税
        isTaxExempt[_defiContract] = true;       // DeFi合约 - 质押相关免税
        isTaxExempt[DEAD_ADDRESS] = true;        // 黑洞地址 - 销毁免税
        isTaxExempt[address(0)] = true;          // 零地址 - 安全起见
        
        // 创建HAF/USDT交易对（空池子）
        // 交易对可以在没有流动性的情况下先创建
        pancakePair = IUniswapV2Factory(pancakeFactory).createPair(address(this), usdtToken);
        // 将交易对设为免税
        isTaxExempt[pancakePair] = true;
        
        // 初始化时间追踪器
        // 将当前时间对齐到UTC+8的当日0点（实际是前一天的UTC 16:00）
        lastDailyBurnTime = _alignToUtc8Morning(block.timestamp);
        // 自动销毁从当前时间开始计算
        lastAutoBurnTime = block.timestamp;
    }
    
    // ==================== LP状态检测 ====================
    /**
     * @dev 检测LP池是否已初始化（有流动性）
     * @return true: LP池中有HAF和USDT，false: LP池为空
     * 
     * 通过检测LP池中的HAF余额来判断是否有流动性
     * 比使用状态变量更可靠，因为直接反映链上实际状态
     */
    function isLpInitialized() public view returns (bool) {
        // 检查LP池中是否有HAF（有HAF就认为已初始化）
        return balanceOf(pancakePair) > 0;
    }
    
    // ==================== 流动性管理 ====================
    /**
     * @dev 添加流动性到LP池
     * @param _usdtAmount USDT数量
     * @param _hafAmount HAF数量
     * 
     * 可以同时添加两种代币，也可以只添加一种
     * 首次添加流动性后，税收和燃烧机制将激活
     * 
     * 注意：
     * - 只添加USDT会使HAF价格上涨
     * - 只添加HAF会使HAF价格下跌
     * - 首次添加需要同时添加两种代币来设定初始价格
     */
    function addLiquidity(uint256 _usdtAmount, uint256 _hafAmount) external onlyOwner {
        // 至少需要添加一种代币
        require(_usdtAmount > 0 || _hafAmount > 0, "Invalid amounts");
        
        // 如果有USDT，从owner转入交易对
        if (_usdtAmount > 0) {
            IERC20(usdtToken).transferFrom(owner(), pancakePair, _usdtAmount);
        }
        // 如果有HAF，从本合约转入交易对
        if (_hafAmount > 0) {
            _transfer(address(this), pancakePair, _hafAmount);
        }
        
        // 同步储备量，触发价格更新
        IUniswapV2Pair(pancakePair).sync();
    }
    
    /**
     * @dev 获取HAF当前价格（以USDT计价）
     * @return 价格，乘以PRICE_PRECISION (1e18)
     * 
     * 价格计算公式：价格 = USDT储备量 / HAF储备量
     * 返回值示例：0.1 USDT/HAF 返回 0.1 * 1e18 = 1e17
     */
    function getPrice() public view returns (uint256) {
        // 如果LP未初始化或交易对不存在，返回默认价格1:1
        if (!isLpInitialized()) {
            return 1 * PRICE_PRECISION;
        }
        
        // 获取交易对合约实例
        IUniswapV2Pair pair = IUniswapV2Pair(pancakePair);
        // 获取交易对的储备量
        // reserve0: token0的储备量
        // reserve1: token1的储备量
        // 第三个返回值是上次更新时间，这里不需要
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        
        // 如果任一储备为0，返回默认价格（避免除以零）
        if (reserve0 == 0 || reserve1 == 0) {
            return 1 * PRICE_PRECISION;
        }
        
        // 获取token0的地址
        // Uniswap按地址大小排序，地址小的是token0
        address token0 = pair.token0();
        
        // 根据代币顺序计算价格
        if (token0 == address(this)) {
            // 如果HAF是token0，USDT是token1
            // 价格 = USDT储备量 / HAF储备量 = reserve1 / reserve0
            return (uint256(reserve1) * PRICE_PRECISION) / uint256(reserve0);
        } else {
            // 如果USDT是token0，HAF是token1
            // 价格 = USDT储备量 / HAF储备量 = reserve0 / reserve1
            return (uint256(reserve0) * PRICE_PRECISION) / uint256(reserve1);
        }
    }
    
    /**
     * @dev 获取LP池中的HAF余额
     * @return LP池持有的HAF数量
     */
    function getLpHafBalance() public view returns (uint256) {
        // 如果交易对不存在，返回0
        if (pancakePair == address(0)) return 0;
        // 返回交易对地址持有的HAF余额
        return balanceOf(pancakePair);
    }
    
    /**
     * @dev 获取LP池中的USDT余额
     * @return LP池持有的USDT数量
     */
    function getLpUsdtBalance() public view returns (uint256) {
        // 如果交易对不存在，返回0
        if (pancakePair == address(0)) return 0;
        // 返回交易对地址持有的USDT余额
        return IERC20(usdtToken).balanceOf(pancakePair);
    }
    
    // ==================== 带税转账逻辑 ====================
    /**
     * @dev 重写ERC20的_update函数 - 核心转账逻辑
     * @param from 发送方地址
     * @param to 接收方地址
     * @param amount 转账数量
     * 
     * _update是ERC20内部所有转账的入口（transfer、transferFrom、mint、burn都会调用）
     * 通过重写此函数，我们可以在每次转账时：
     * 1. 触发懒加载机制（每日燃烧、自动销毁）
     * 2. 收取买入/卖出税
     * 3. 更新持有者分红资格
     */
    function _update(address from, address to, uint256 amount) internal virtual override triggerMechanisms {
        // 如果转账数量为0，直接调用父合约处理
        if (amount == 0) {
            super._update(from, to, amount);
            return;
        }
        
        // 默认需要收税
        bool takeTax = true;
        
        // 检查免税地址 - 如果发送方或接收方是免税地址，不收税
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
                    // 检查是否达到分发阈值
                    _checkAndDistributeBuyTax();
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
        
        // 更新发送方和接收方的持币分红资格
        // 如果余额变化导致跨过88 HAF门槛，会自动添加/移除资格
        _updateHolderStatus(from);
        _updateHolderStatus(to);
    }
    
    // ==================== 买入税分发 ====================
    /**
     * @dev 检查并分发买入税给创世节点
     * 
     * 工作流程：
     * 1. 计算累积买入税的USDT价值
     * 2. 如果价值≥365 USDT，触发分发
     * 3. 将HAF兑换成USDT
     * 4. 通知DeFi合约分发给创世节点
     */
    function _checkAndDistributeBuyTax() internal {
        // 获取当前HAF价格（USDT计价）
        uint256 price = getPrice();
        // 计算累积买入税的USDT价值
        uint256 taxValueUsdt = (accumulatedBuyTax * price) / PRICE_PRECISION;
        
        // 如果达到分发阈值（365 USDT）
        if (taxValueUsdt >= GENESIS_DISTRIBUTE_THRESHOLD) {
            // 获取活跃创世节点数量
            uint256 genesisCount = IHashFiMain(defiContract).getActiveGenesisNodesCount();
            
            // 如果有活跃创世节点
            if (genesisCount > 0) {
                // 将累积的HAF兑换成USDT
                uint256 hafToSwap = accumulatedBuyTax;
                // 执行HAF→USDT兑换
                uint256 usdtReceived = _swapHafToUsdt(hafToSwap);
                
                // 如果成功获得USDT
                if (usdtReceived > 0) {
                    // 将USDT转给DeFi合约
                    IERC20(usdtToken).transfer(defiContract, usdtReceived);
                    // 通知DeFi合约分发创世节点奖励
                    IHashFiMain(defiContract).distributeGenesisReward(usdtReceived);
                    
                    // 触发买入税分发事件
                    emit BuyTaxDistributed(hafToSwap, usdtReceived);
                }
                
                // 清零累积买入税
                accumulatedBuyTax = 0;
            }
        }
    }
    
    /**
     * @dev 将HAF兑换成USDT（内部函数）
     * @param _hafAmount 要兑换的HAF数量
     * @return 获得的USDT数量
     * 
     * 使用恒定乘积公式计算输出：
     * amountOut = (amountIn * 9975 * reserveOut) / (reserveIn * 10000 + amountIn * 9975)
     * 其中9975/10000代表扣除0.25%手续费（PancakeSwap标准）
     * 
     * 注意：这是简化实现，生产环境应使用Router合约
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
        // PancakeSwap手续费是0.25%，所以乘以9975/10000
        uint256 amountInWithFee = _hafAmount * 9975;
        // 分子 = 输入量(含手续费) * USDT储备量
        uint256 numerator = amountInWithFee * usdtReserve;
        // 分母 = HAF储备量 * 10000 + 输入量(含手续费)
        uint256 denominator = hafReserve * 10000 + amountInWithFee;
        // 计算USDT输出量
        uint256 usdtOut = numerator / denominator;
        
        // 如果输出为0，返回0
        if (usdtOut == 0) return 0;
        
        // 将HAF转入交易对
        _transfer(address(this), pancakePair, _hafAmount);
        
        // 同步交易对储备量
        // 注意：这里实际上只是同步，并没有真正执行swap
        // 完整的swap需要调用pair的swap函数
        if (token0 == address(this)) {
            IUniswapV2Pair(pancakePair).sync();
        } else {
            IUniswapV2Pair(pancakePair).sync();
        }
        
        // 注意：这是简化实现
        // 实际生产环境中应该使用Router的swapExactTokensForTokens
        // 这里直接返回计算值，实际USDT需要从LP取出
        
        return usdtOut;
    }
    
    // ==================== 懒加载机制 ====================
    /**
     * @dev 触发所有懒加载机制
     * 每次转账时通过triggerMechanisms修饰符自动调用
     * 
     * 懒加载设计的好处：
     * 1. 不需要外部定时触发器（如Chainlink Keeper）
     * 2. 用户交互时自动执行，节省运营成本
     * 3. 即使长时间无交互，下次交互时会补执行
     */
    function _triggerLazyMechanisms() internal {
        // 防止重入：如果正在执行机制，直接返回
        if (_isExecutingMechanism) return;
        
        // 设置标志
        _isExecutingMechanism = true;
        
        // 尝试执行每日燃烧（UTC+8早8点）
        _tryDailyBurn();
        // 尝试执行自动销毁（每2小时）
        _tryAutoBurn();
        
        // 重置标志
        _isExecutingMechanism = false;
    }

    /**
     * @dev 尝试执行每日燃烧
     * 检查是否到达新的一天（UTC+8），如果是则执行燃烧
     * 支持补执行，最多补7天
     */
    function _tryDailyBurn() internal {
        // 获取当前UTC+8的当日0点时间戳
        uint256 currentMorning = _alignToUtc8Morning(block.timestamp);
        
        // 如果当前时间的"当日0点"大于上次燃烧时间，且LP已初始化
        if (currentMorning > lastDailyBurnTime && isLpInitialized()) {
            // 计算过了多少天
            uint256 daysPassed = (currentMorning - lastDailyBurnTime) / 1 days;
            
            // 补执行遗漏的天数，最多补7天
            // 这样即使合约7天没有交互，下次交互也能补上
            for (uint256 i = 0; i < daysPassed && i < 7; i++) {
                _executeDailyBurn();
            }
            
            // 更新上次燃烧时间为当前的"当日0点"
            lastDailyBurnTime = currentMorning;
        }
    }
    
    /**
     * @dev 执行每日燃烧
     * 从LP池抽取5%的HAF进行分配：
     * - 1% (DAILY_BURN_GENESIS_RATE) 给创世节点
     * - 1% (DAILY_BURN_COMMUNITY_RATE) 给社区(owner)
     * - 3% (DAILY_BURN_HOLDER_RATE) 给持币分红池
     */
    function _executeDailyBurn() internal {
        // 获取LP池中的HAF余额
        uint256 lpHafBalance = getLpHafBalance();
        // 如果LP池没有HAF，直接返回
        if (lpHafBalance == 0) return;
        
        // 检查是否还能继续燃烧（有效供应量是否高于最小值）
        uint256 currentSupply = totalSupply();           // 当前总供应量
        uint256 deadBalance = balanceOf(DEAD_ADDRESS);   // 黑洞地址余额（已"销毁"）
        uint256 effectiveSupply = currentSupply - deadBalance;  // 有效供应量
        
        // 如果有效供应量已达到最小值，停止燃烧
        if (effectiveSupply <= MIN_SUPPLY) return;
        
        // 计算各部分的燃烧数量
        uint256 genesisAmount = (lpHafBalance * DAILY_BURN_GENESIS_RATE) / TAX_DENOMINATOR;    // 1%给创世节点
        uint256 communityAmount = (lpHafBalance * DAILY_BURN_COMMUNITY_RATE) / TAX_DENOMINATOR; // 1%给社区
        uint256 holderAmount = (lpHafBalance * DAILY_BURN_HOLDER_RATE) / TAX_DENOMINATOR;       // 3%给持币分红
        
        // 计算总燃烧量
        uint256 totalBurn = genesisAmount + communityAmount + holderAmount;
        
        // 如果燃烧后会低于最小供应量，按比例调整
        if (effectiveSupply - totalBurn < MIN_SUPPLY) {
            // 计算最大可燃烧量
            uint256 maxBurn = effectiveSupply - MIN_SUPPLY;
            // 计算调整比例
            uint256 ratio = (maxBurn * PRICE_PRECISION) / totalBurn;
            // 按比例缩减各部分
            genesisAmount = (genesisAmount * ratio) / PRICE_PRECISION;
            communityAmount = (communityAmount * ratio) / PRICE_PRECISION;
            holderAmount = (holderAmount * ratio) / PRICE_PRECISION;
            totalBurn = genesisAmount + communityAmount + holderAmount;
        }
        
        // 如果总燃烧量为0，直接返回
        if (totalBurn == 0) return;
        
        // 从LP池销毁HAF（真销毁，减少totalSupply）
        _burnFromLp(totalBurn);
        
        // 分发创世节点份额
        if (genesisAmount > 0) {
            // 铸造等量HAF给所有活跃创世节点
            _distributeToGenesisNodes(genesisAmount);
        }
        
        // 社区份额转给owner
        if (communityAmount > 0) {
            // 获取DeFi合约的owner地址
            address communityAddress = IHashFiMain(defiContract).owner();
            // 铸造HAF给owner
            _mint(communityAddress, communityAmount);
        }
        
        // 持币分红份额加入分红池
        if (holderAmount > 0) {
            // 将HAF加入持币分红池，等待用户领取
            _addToHolderDividendPool(holderAmount);
        }
        
        // 同步LP池储备量（销毁后需要更新）
        // 这会导致HAF价格上涨（USDT不变，HAF减少）
        IUniswapV2Pair(pancakePair).sync();
        
        // 触发每日燃烧执行事件
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
        
        // 从LP池转移到黑洞地址（伪销毁）
        _burnFromLpToDead(burnAmount);
        
        // 同步LP池储备量（触发价格上涨）
        IUniswapV2Pair(pancakePair).sync();
        
        // 触发自动销毁执行事件
        emit AutoBurnExecuted(burnAmount, block.timestamp);
    }
    
    /**
     * @dev 从LP池销毁HAF（真销毁）
     * @param amount 销毁数量
     * 
     * 调用ERC20的_burn函数，会减少totalSupply
     */
    function _burnFromLp(uint256 amount) internal {
        // 调用安全销毁函数（带最小供应量检查）
        _safeBurn(pancakePair, amount);
    }
    
    /**
     * @dev 从LP池转移到黑洞地址（伪销毁）
     * @param amount 转移数量
     * 
     * 不减少totalSupply，但转入黑洞的代币无法取出
     * 通过effectiveSupply = totalSupply - deadBalance计算有效供应
     */
    function _burnFromLpToDead(uint256 amount) internal {
        // 直接从LP转到黑洞地址
        _update(pancakePair, DEAD_ADDRESS, amount);
    }
    
    // ==================== 创世节点分发 ====================
    /**
     * @dev 将HAF平均分发给所有活跃创世节点
     * @param hafAmount 要分发的HAF总量
     * 
     * 如果没有活跃创世节点，则销毁到黑洞地址
     */
    function _distributeToGenesisNodes(uint256 hafAmount) internal {
        // 获取活跃创世节点数量
        uint256 genesisCount = IHashFiMain(defiContract).getActiveGenesisNodesCount();
        
        // 如果没有创世节点，销毁到黑洞
        if (genesisCount == 0) {
            _mint(DEAD_ADDRESS, hafAmount);
            return;
        }
        
        // 计算每个节点的份额
        uint256 amountPerNode = hafAmount / genesisCount;
        
        // 遍历所有创世节点进行分发
        for (uint256 i = 0; i < genesisCount; i++) {
            // 通过DeFi合约获取节点地址
            address node = IHashFiMain(defiContract).getActiveGenesisNodeAt(i);
            // 如果地址有效，铸造HAF给该节点
            if (node != address(0)) {
                _mint(node, amountPerNode);
            }
        }
    }
    
    // ==================== 持币分红机制 ====================
    /**
     * @dev 更新持有者的分红资格状态
     * @param holder 持有者地址
     * 
     * 在每次转账后调用，检查持有者是否跨过88 HAF门槛
     * - 新增资格：余额从<88变为≥88
     * - 移除资格：余额从≥88变为<88
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
        // 判断是否应该有资格（持有≥88 HAF）
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
     * @dev 将HAF添加到持币分红池
     * @param amount 要添加的HAF数量
     * 
     * 使用累积器模式：
     * accDividendPerWeight += amount / totalWeight
     * 这样每个持有者的待领取分红 = weight * accDividendPerWeight - debt
     */
    function _addToHolderDividendPool(uint256 amount) internal {
        // 计算当前所有资格持有者的总权重
        uint256 totalWeight = _calculateTotalWeight();
        
        // 如果没有资格持有者，销毁到黑洞
        if (totalWeight == 0) {
            _mint(DEAD_ADDRESS, amount);
            return;
        }
        
        // 铸造HAF到本合约用于分发
        _mint(address(this), amount);
        // 增加分红池总量
        holderDividendPool += amount;
        // 更新每单位权重的累积分红
        accDividendPerWeight += (amount * PRICE_PRECISION) / totalWeight;
    }
    
    /**
     * @dev 计算所有资格持有者的总权重
     * @return 总权重
     * 
     * 权重计算：weight = balance / 88（向下取整）
     * 例如：持有176 HAF的地址权重为2，持有100 HAF的地址权重为1
     */
    function _calculateTotalWeight() internal view returns (uint256) {
        uint256 totalWeight = 0;
        
        // 遍历所有资格持有者
        for (uint256 i = 0; i < eligibleHolders.length; i++) {
            address holder = eligibleHolders[i];
            uint256 balance = balanceOf(holder);
            // 如果余额仍然达标（可能已被转出）
            if (balance >= HOLDER_THRESHOLD) {
                // 权重 = 余额 / 88（向下取整）
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
        // 如果余额不足88，权重为0
        if (balance < HOLDER_THRESHOLD) return 0;
        // 权重 = 余额 / 88
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
     * @dev 领取持币分红
     * 任何资格持有者都可以调用此函数领取累积的分红
     */
    function claimDividend() external triggerMechanisms {
        // 获取待领取分红
        uint256 pending = getPendingDividend(msg.sender);
        // 要求有分红可领
        require(pending > 0, "No dividend to claim");
        
        // 更新分红债务（重置为当前累积值）
        holderDividendDebt[msg.sender] = ((_getHolderWeight(msg.sender)) * accDividendPerWeight) / PRICE_PRECISION;
        // 记录已领取分红（用于统计）
        holderClaimedDividend[msg.sender] += pending;
        // 减少分红池
        holderDividendPool -= pending;
        
        // 将分红HAF转给用户
        _transfer(address(this), msg.sender, pending);
        
        // 触发分红领取事件
        emit HolderDividendClaimed(msg.sender, pending);
    }
    
    // ==================== 安全销毁（带最小供应量检查）====================
    /**
     * @dev 安全销毁函数，确保不会低于最小供应量
     * @param account 要销毁代币的账户
     * @param amount 请求销毁的数量
     * @return actualBurn 实际销毁的数量
     * 
     * 如果请求销毁量会导致有效供应低于MIN_SUPPLY，
     * 则只销毁到MIN_SUPPLY为止
     */
    function _safeBurn(address account, uint256 amount) internal returns (uint256) {
        // 获取当前总供应量
        uint256 currentSupply = totalSupply();
        // 获取黑洞地址余额（已"销毁"的数量）
        uint256 deadBalance = balanceOf(DEAD_ADDRESS);
        // 计算有效供应量 = 总供应 - 黑洞余额
        uint256 effectiveSupply = currentSupply - deadBalance;
        
        // 如果有效供应量已达到最小值，不执行销毁
        if (effectiveSupply <= MIN_SUPPLY) {
            return 0;
        }
        
        // 计算最大可销毁数量
        uint256 maxBurn = effectiveSupply - MIN_SUPPLY;
        // 实际销毁数量取请求值和最大值的较小者
        uint256 actualBurn = amount > maxBurn ? maxBurn : amount;
        
        // 执行销毁
        if (actualBurn > 0) {
            // 调用ERC20的_burn函数，减少账户余额和totalSupply
            _burn(account, actualBurn);
        }
        
        return actualBurn;
    }
    
    // ==================== 辅助函数 ====================
    /**
     * @dev 将时间戳对齐到UTC+8时区的当日0点
     * @param timestamp 原始UTC时间戳
     * @return 对齐后的时间戳（UTC格式）
     * 
     * 例如：
     * UTC时间 2024-01-15 01:00:00 (timestamp)
     * 转换为UTC+8: 2024-01-15 09:00:00
     * 对齐到当日0点: 2024-01-15 00:00:00 (UTC+8)
     * 转换回UTC: 2024-01-14 16:00:00
     */
    function _alignToUtc8Morning(uint256 timestamp) internal pure returns (uint256) {
        // 加上8小时偏移，转换为UTC+8时间
        uint256 utc8Time = timestamp + UTC8_OFFSET;
        // 整除1天再乘以1天，对齐到当日0点
        uint256 dayStart = (utc8Time / 1 days) * 1 days;
        // 减去偏移，转换回UTC时间
        return dayStart - UTC8_OFFSET;
    }
    
    // ==================== 管理函数 ====================
    /**
     * @dev 设置地址的免税状态（仅Owner可调用）
     * @param account 目标地址
     * @param exempt 是否免税
     */
    function setTaxExempt(address account, bool exempt) external onlyOwner {
        isTaxExempt[account] = exempt;
    }
    
    // 已删除 setPancakeAddresses 和 setPancakePair
    // 原因：Token的owner是DeFi合约，这些函数没有实际意义
    // 工厂和路由地址现在通过构造函数传入，交易对在构造函数中创建
    
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
    
    /**
     * @dev 获取持有者的完整分红信息
     * @param holder 持有者地址
     * @return eligible 是否有分红资格
     * @return weight 分红权重
     * @return pendingDividend 待领取分红（HAF）
     * @return claimedDividend 已领取分红总额（HAF）
     */
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
    
    /**
     * @dev 获取销毁统计信息
     * @return totalBurned 已销毁（转入黑洞）的总量
     * @return effectiveSupply 有效供应量 = totalSupply - totalBurned
     * @return minSupply 最小供应量（销毁底线）
     * @return canStillBurn 是否还能继续销毁
     */
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
    
    /**
     * @dev 获取下次每日燃烧时间
     * @return 下次燃烧的时间戳（UTC+8次日0点）
     */
    function getNextDailyBurnTime() external view returns (uint256) {
        return lastDailyBurnTime + 1 days;
    }
    
    /**
     * @dev 获取下次自动销毁时间
     * @return 下次自动销毁的时间戳
     */
    function getNextAutoBurnTime() external view returns (uint256) {
        return lastAutoBurnTime + AUTO_BURN_INTERVAL;
    }
    
    // ==================== DeFi合约接口 ====================
    /**
     * @dev 从本合约转出HAF（仅owner可调用）
     * @param to 接收地址
     * @param amount 转账数量
     * 
     * DeFi合约通过此函数给用户发放质押奖励等
     */
    function transferFromContract(address to, uint256 amount) external onlyOwner {
        _transfer(address(this), to, amount);
    }
    
    /**
     * @dev 获取本合约持有的HAF余额
     * @return 本合约的HAF余额
     * 
     * 用于DeFi合约检查可用的奖励池余额
     */
    function getContractBalance() external view returns (uint256) {
        return balanceOf(address(this));
    }
    
    /**
     * @dev 外部触发懒加载机制
     * 
     * DeFi合约在stake等操作时调用此函数
     * 确保即使没有HAF转账，燃烧机制也能被触发
     */
    function triggerMechanismsExternal() external {
        _triggerLazyMechanisms();
    }
    
    /**
     * @dev 从本合约提取资产到DeFi合约（仅owner可调用）
     * @param token 代币地址（address(this)表示HAF）
     * @param amount 提取数量
     * 
     * 用于DeFi合约的emergencyWithdrawToken功能
     * 当DeFi合约余额不足时，从本合约补充
     */
    function withdrawToDefi(address token, uint256 amount) external onlyOwner {
        if (token == address(this)) {
            // 提取HAF
            _transfer(address(this), owner(), amount);
        } else {
            // 提取其他ERC20代币（如意外收到的）
            IERC20(token).transfer(owner(), amount);
        }
    }
}
