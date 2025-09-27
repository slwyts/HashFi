// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./HAFToken.sol";

/**
 * @title HashFi
 * @dev HashFi生态系统的核心智能合约，处理质押、奖励、推荐和团队奖金等所有业务逻辑。
 */
contract HashFi is Ownable {
    // --- 事件 ---
    event Staked(address indexed user, uint256 orderId, uint256 amount, uint8 level);
    event ReferrerBound(address indexed user, address indexed referrer);
    event Withdrawn(address indexed user, uint256 hafAmount, uint256 fee);
    event GenesisNodeApplied(address indexed user);
    event RewardDistributed(address indexed user, uint256 hafAmount, string rewardType);
    event PriceUpdated(uint256 newPrice);

    // --- 数据结构 ---
    
    // 用户信息结构体
    struct User {
        address referrer; // 推荐人地址
        uint256 totalStakedAmount; // 个人总投资额
        address[] directReferrals; // 直接推荐的用户地址列表
        mapping(uint256 => bool) referrals; // 用于快速查找推荐关系
        uint256[] orders; // 用户的订单ID列表
        bool isGenesisNode; // 是否是创世节点
        uint256 genesisNodeActivationTime; // 成为创世节点的时间
        uint256 genesisDividendsWithdrawn; // 已领取的创世节点分红
        mapping(string => uint256) rewards; // 用于存储各种奖励（静态、动态等）
    }

    // 质押订单结构体
    struct Order {
        uint256 id; // 订单ID
        address user; // 所属用户地址
        uint8 level; // 质押级别 1:青铜, 2:白银, 3:黄金, 4:钻石
        uint256 amount; // 质押的USDT数量
        uint256 totalQuota; // 总释放额度 (USDT本位)
        uint256 releasedQuota; // 已释放额度 (USDT本位)
        uint256 startTime; // 订单开始时间
        bool isCompleted; // 订单是否已出局
        uint256 lastRewardTime; // 上次计算收益的时间
    }

    // 质押级别配置
    struct StakingLevelInfo {
        uint256 minAmount; // 最小投资额
        uint256 maxAmount; // 最大投资额
        uint256 multiplier; // 出局倍数 (例如, 1.5倍 存为 150)
        uint256 dailyRate;  // 日利率 (例如, 0.7% 存为 70, 单位: 万分之)
    }
    
    // --- 状态变量 ---
    IERC20 public usdtToken; // USDT代币合约接口
    HAFToken public hafToken; // HAF代币合约接口

    mapping(address => User) public users; // 地址到用户信息的映射
    address[] public userList; // 所有用户地址列表，便于遍历
    Order[] public orders; // 所有订单列表

    // 价格与费用
    uint256 public hafPrice; // HAF的USDT价格, 使用6位小数精度 (例如, 1.5 USDT 表示为 1500000)
    uint256 public constant PRICE_PRECISION = 1e6;
    uint256 public withdrawalFeeRate = 5; // 提现手续费率, 5%

    // 质押级别配置
    mapping(uint8 => StakingLevelInfo) public stakingLevels;
    
    // 创世节点
    uint256 public genesisNodeCost = 5000 * 1e18; // 成为创世节点的费用 (5000 USDT)
    uint256 public constant GENESIS_NODE_EXIT_MULTIPLIER = 3; // 创世节点出局倍数
    uint256 public totalGenesisDividendsPool; // 创世节点总分红池 (USDT本位)
    address[] public genesisNodes; // 所有创世节点地址列表

    // 团队奖配置
    struct TeamLevelInfo {
        uint256 requiredPerformance; // 达成需要的小区业绩 (USDT本位)
        uint256 accelerationBonus;   // 静态收益加速释放比例 (%)
    }
    TeamLevelInfo[] public teamLevels;
    
    // --- 构造函数 ---
    constructor(address _usdtAddress, address _hafTokenAddress, address _initialOwner) Ownable(_initialOwner) {
        usdtToken = IERC20(_usdtAddress);
        hafToken = HAFToken(_hafTokenAddress);
        hafPrice = 1 * PRICE_PRECISION; // 初始价格: 1 HAF = 1 USDT

        // 初始化质押级别 (根据开发文档)
        stakingLevels[1] = StakingLevelInfo(100 * 1e18, 499 * 1e18, 150, 70);   // 青铜
        stakingLevels[2] = StakingLevelInfo(500 * 1e18, 999 * 1e18, 200, 80);   // 白银
        stakingLevels[3] = StakingLevelInfo(1000 * 1e18, 2999 * 1e18, 250, 90);  // 黄金
        stakingLevels[4] = StakingLevelInfo(3000 * 1e18, type(uint256).max, 300, 100); // 钻石

        // 初始化团队级别 (根据开发文档)
        teamLevels.push(TeamLevelInfo(5000 * 1e18, 5));   // V1
        teamLevels.push(TeamLevelInfo(20000 * 1e18, 10));  // V2
        teamLevels.push(TeamLevelInfo(100000 * 1e18, 15)); // V3
        teamLevels.push(TeamLevelInfo(300000 * 1e18, 20)); // V4
        teamLevels.push(TeamLevelInfo(1000000 * 1e18, 25));// V5
    }

    // --- 用户外部调用函数 ---

    /**
     * @dev 绑定推荐人。必须在首次质押前调用。
     * @param _referrer 推荐人的地址。
     */
    function bindReferrer(address _referrer) external {
        require(users[msg.sender].referrer == address(0), unicode"用户已经绑定过推荐人");
        require(users[_referrer].referrer != address(0) || genesisNodes.length == 0, unicode"推荐人不存在"); // 允许第一个用户无需推荐人
        require(_referrer != msg.sender, unicode"不能推荐自己");

        if (users[msg.sender].referrer == address(0)) {
            userList.push(msg.sender);
        }

        users[msg.sender].referrer = _referrer;
        users[_referrer].directReferrals.push(msg.sender);
        
        emit ReferrerBound(msg.sender, _referrer);
    }
    
    /**
     * @dev 用户进行质押投资。
     * @param _amount 投资的USDT数量。
     */
    function stake(uint256 _amount) external {
        require(users[msg.sender].referrer != address(0), unicode"必须先绑定推荐人");
        uint8 level = _getStakingLevelByAmount(_amount);
        require(level > 0, unicode"投资金额不符合任何级别要求");

        // 转移用户USDT到合约
        usdtToken.transferFrom(msg.sender, address(this), _amount);

        // 创建新订单
        uint256 orderId = orders.length;
        uint256 quota = (_amount * stakingLevels[level].multiplier) / 100;
        
        orders.push(Order(orderId, msg.sender, level, _amount, quota, 0, block.timestamp, false, block.timestamp));
        users[msg.sender].orders.push(orderId);
        users[msg.sender].totalStakedAmount += _amount;

        // 分发动态奖励
        _distributeDynamicRewards(msg.sender, _amount);

        emit Staked(msg.sender, orderId, _amount, level);
    }

    /**
     * @dev 用户申请成为创世节点。
     */
    function applyForGenesisNode() external {
        require(users[msg.sender].referrer != address(0), unicode"用户不存在");
        require(!users[msg.sender].isGenesisNode, unicode"您已经是创世节点");

        usdtToken.transferFrom(msg.sender, address(this), genesisNodeCost);
        
        users[msg.sender].isGenesisNode = true;
        users[msg.sender].genesisNodeActivationTime = block.timestamp;
        genesisNodes.push(msg.sender);

        emit GenesisNodeApplied(msg.sender);
    }

    /**
     * @dev 提取所有可用的HAF奖励。
     */
    function withdraw() external {
        // 计算并更新用户的最新静态收益
        _updateUserStaticRewards(msg.sender);

        uint256 totalReward = users[msg.sender].rewards["static"] + users[msg.sender].rewards["direct"] + users[msg.sender].rewards["share"] + users[msg.sender].rewards["genesis"];
        require(totalReward > 0, unicode"没有可提取的奖励");

        // 计算手续费
        uint256 fee = (totalReward * withdrawalFeeRate) / 100;
        uint256 amountAfterFee = totalReward - fee;
        
        // 清零用户奖励余额
        users[msg.sender].rewards["static"] = 0;
        users[msg.sender].rewards["direct"] = 0;
        users[msg.sender].rewards["share"] = 0;
        users[msg.sender].rewards["genesis"] = 0;
        
        // 铸造HAF代币给用户
        hafToken.mint(msg.sender, amountAfterFee);
        // 手续费可以销毁或转入国库
        // hafToken.burn(address(this), fee);

        emit Withdrawn(msg.sender, amountAfterFee, fee);
    }

    // --- 内部核心逻辑函数 ---

    /**
     * @dev 分发动态奖励（直推奖、分享奖）。
     */
    function _distributeDynamicRewards(address _user, uint256 _amount) internal {
        address currentUser = _user;
        address referrer = users[currentUser].referrer;
        
        // --- 1. 直推奖 (最高6代) ---
        uint256[] memory directRewardRates = new uint256[](6);
        directRewardRates[0] = 5; directRewardRates[1] = 3; directRewardRates[2] = 1; directRewardRates[3] = 1; directRewardRates[4] = 1; directRewardRates[5] = 1;

        for (uint i = 0; i < 6 && referrer != address(0); i++) {
            // 计算烧伤
            uint256 receivableAmount = _calculateBurnableAmount(_amount, _getUserHighestLevel(_user), _getUserHighestLevel(referrer));
            uint256 rewardUsdt = receivableAmount.mul(directRewardRates[i]).div(100);
            uint256 rewardHaf = rewardUsdt.mul(PRICE_PRECISION).div(hafPrice);

            // 线性释放，这里简化为立即到账，实际可存入一个待释放结构中
            users[referrer].rewards["direct"] += rewardHaf;
            emit RewardDistributed(referrer, rewardHaf, "direct");

            currentUser = referrer;
            referrer = users[currentUser].referrer;
        }

        // --- 2. 分享奖 (最高10代) ---
        // 分享奖逻辑较为复杂，需要读取被推荐人的静态收益，建议在每日结算时一并处理以节省gas
    }

    /**
     * @dev 计算烧伤机制下的有效奖励基数。
     */
    function _calculateBurnableAmount(uint256 _originalAmount, uint8 _investorLevel, uint8 _referrerLevel) internal view returns (uint256) {
        if (_referrerLevel >= _investorLevel || _referrerLevel == 4) { // 推荐人级别更高、或同级、或推荐人是钻石，不烧伤
            return _originalAmount;
        }
        // 否则，按推荐人级别的最高投资额作为奖励基数
        return stakingLevels[_referrerLevel].maxAmount;
    }

    /**
     * @dev 获取一个用户所有订单中的最高质押级别。
     */
    function _getUserHighestLevel(address _user) internal view returns (uint8) {
        uint8 maxLevel = 0;
        for (uint i = 0; i < users[_user].orders.length; i++) {
            Order storage order = orders[users[_user].orders[i]];
            if (order.level > maxLevel) {
                maxLevel = order.level;
            }
        }
        return maxLevel;
    }
    
    /**
     * @dev 根据投资金额返回对应的质押级别ID。
     */
    function _getStakingLevelByAmount(uint256 _amount) internal view returns (uint8) {
        for (uint8 i = 1; i <= 4; i++) {
            if (_amount >= stakingLevels[i].minAmount && _amount <= stakingLevels[i].maxAmount) {
                return i;
            }
        }
        return 0; // 金额不符合任何级别
    }

    /**
     * @dev 更新一个用户所有未完成订单的静态收益。
     */
    function _updateUserStaticRewards(address _user) internal {
         for (uint i = 0; i < users[_user].orders.length; i++) {
            Order storage order = orders[users[_user].orders[i]];
            if (!order.isCompleted) {
                uint256 passedDays = (block.timestamp - order.lastRewardTime) / 1 days;
                if (passedDays > 0) {
                    // 计算总的待释放USDT
                    uint256 dailyReleaseUsdt = (order.amount * stakingLevels[order.level].dailyRate) / 10000;
                    uint256 totalReleaseUsdt = dailyReleaseUsdt * passedDays;
                    
                    // 检查是否会超出总额度
                    if (order.releasedQuota + totalReleaseUsdt >= order.totalQuota) {
                        totalReleaseUsdt = order.totalQuota - order.releasedQuota;
                        order.isCompleted = true;
                    }

                    // 10% 进入创世节点池
                    uint256 genesisCut = (totalReleaseUsdt * 10) / 100;
                    totalGenesisDividendsPool += genesisCut;
                    
                    // 90% 给用户
                    uint256 userRewardUsdt = totalReleaseUsdt - genesisCut;
                    
                    // 换算成HAF
                    uint256 userRewardHaf = (userRewardUsdt * PRICE_PRECISION) / hafPrice;
                    users[_user].rewards["static"] += userRewardHaf;
                    emit RewardDistributed(_user, userRewardHaf, "static");

                    // 更新订单状态
                    order.releasedQuota += totalReleaseUsdt;
                    order.lastRewardTime = block.timestamp;
                }
            }
        }
    }


    // --- 后台管理函数 ---

    /**
     * @dev 设置HAF代币的价格。
     * @param _newPrice 新的价格 (需要乘以精度 PRICE_PRECISION)。
     */
    function setHafPrice(uint256 _newPrice) external onlyOwner {
        hafPrice = _newPrice;
        emit PriceUpdated(_newPrice);
    }

    /**
     * @dev 设置提现手续费率。
     * @param _newFeeRate 新的费率 (例如 5% 传入 5)。
     */
    function setWithdrawalFee(uint256 _newFeeRate) external onlyOwner {
        require(_newFeeRate <= 100, unicode"费率不能超过100%");
        withdrawalFeeRate = _newFeeRate;
    }

    /**
     * @dev [重要] 项目方每日调用的结算函数，用于处理创世节点分红。
     * 静态收益在用户提现或下次质押时触发更新，以分散gas。
     */
    function dailySettlement() external onlyOwner {
        // 1. 遍历所有用户，更新他们的静态收益，这样分红池的钱就齐了
        for(uint i=0; i < userList.length; i++){
            _updateUserStaticRewards(userList[i]);
        }

        // 2. 分发创世节点分红
        if (totalGenesisDividendsPool > 0 && genesisNodes.length > 0) {
            uint256 sharePerNode = totalGenesisDividendsPool.div(genesisNodes.length);
            for (uint i = 0; i < genesisNodes.length; i++) {
                 address node = genesisNodes[i];
                 uint256 maxDividend = genesisNodeCost.mul(GENESIS_NODE_EXIT_MULTIPLIER);
                 if(users[node].genesisDividendsWithdrawn < maxDividend){
                    
                    uint256 actualShare = sharePerNode;
                    // 防止最后一笔分红超出3倍
                    if(users[node].genesisDividendsWithdrawn.add(sharePerNode) > maxDividend){
                        actualShare = maxDividend.sub(users[node].genesisDividendsWithdrawn);
                    }
                    
                    users[node].genesisDividendsWithdrawn += actualShare;
                    
                    // 换算成HAF
                    uint256 rewardHaf = (actualShare * PRICE_PRECISION) / hafPrice;
                    users[node].rewards["genesis"] += rewardHaf;
                    emit RewardDistributed(node, rewardHaf, "genesis");
                 }
            }
            totalGenesisDividendsPool = 0; // 清空分红池
        }
    }
}