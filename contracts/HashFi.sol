// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title HashFi
 * @dev HashFi生态系统的核心智能合约（集成HAF代币）。
 * @notice 新版合约采用用户驱动的结算模式，优化了Gas消耗并修复了所有已知逻辑漏洞。
 */
contract HashFi is ERC20, Ownable, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    // --- 外部合约依赖 ---
    IERC20 public usdtToken;

    // --- 事件 ---
    event Staked(address indexed user, uint256 orderId, uint256 amount, uint8 level);
    event ReferrerBound(address indexed user, address indexed referrer);
    event Withdrawn(address indexed user, uint256 hafAmount, uint256 fee);
    event GenesisNodeApplied(address indexed user);
    event RewardsClaimed(address indexed user, uint256 staticRewards, uint256 dynamicRewards, uint256 genesisRewards);
    event PriceUpdated(uint256 newPrice);
    event Swapped(address indexed user, address indexed fromToken, address indexed toToken, uint256 fromAmount, uint256 toAmount);

    // 详细的收益记录事件
    enum RewardType { Static, Direct, Share, Team }
    event RewardDistributed(address indexed user, address indexed fromUser, RewardType rewardType, uint256 usdtAmount, uint256 hafAmount);


    // --- 数据结构 ---
    
    // 用于存储收益记录的结构体
    struct RewardRecord {
        uint256 timestamp;
        address fromUser;
        RewardType rewardType;
        uint256 usdtAmount;
        uint256 hafAmount;
    }

    struct User {
        address referrer;
        uint8 teamLevel; // V0-V5
        uint256 totalStakedAmount; // 个人总投资额
        uint256 teamTotalPerformance; // 个人伞下总业绩 (用于给上级计算小区业绩)
        address[] directReferrals; // 直接推荐的用户列表
        uint256[] orderIds; // 用户的订单ID列表

        bool isGenesisNode;
        uint256 genesisDividendsWithdrawn; // 已领取的创世节点分红 (USDT本位)

        // 动态奖励 (直推奖+分享奖)
        uint256 dynamicRewardTotal; // 累计获得的动态总奖励 (HAF本位)
        uint256 dynamicRewardReleased; // 已释放的动态奖励 (HAF本位)
        uint256 dynamicRewardStartTime; // 第一个动态奖励的开始时间
        uint256 dynamicRewardClaimed; // 已领取的动态奖励 (HAF本位)

        // 分享奖相关
        uint256 totalStaticOutput; // 个人所有订单累计产出的总静态收益 (USDT本位)
        
        // 收益记录
        RewardRecord[] rewardRecords;
    }

    struct Order {
        uint256 id;
        address user;
        uint8 level; // 1:青铜, 2:白银, 3:黄金, 4:钻石
        uint256 amount; // 质押的USDT数量 (18位小数)
        uint256 totalQuota; // 总释放额度 (USDT本位)
        uint256 releasedQuota; // 已释放额度 (USDT本位)
        uint256 startTime;
        uint256 lastSettleTime; // 上次结算收益的时间
        bool isCompleted;
    }

    struct StakingLevelInfo {
        uint256 minAmount;
        uint256 maxAmount;
        uint256 multiplier; // 出局倍数 (例如, 1.5倍 存为 150)
        uint256 dailyRate; // 日利率 (例如, 0.7% 存为 70, 单位: 万分之一)
    }

    struct TeamLevelInfo {
        uint256 requiredPerformance; // 达成需要的小区业绩 (USDT本位)
        uint256 accelerationBonus; // 静态收益加速释放比例 (%)
    }
    
    // 团队成员信息结构体
    struct TeamMemberInfo {
        address memberAddress;
        uint8 teamLevel;
        uint256 totalStakedAmount;
        uint256 teamTotalPerformance;
    }


    // --- 状态变量 ---

    mapping(address => User) public users;
    Order[] public orders;

    // 价格与费用
    uint256 public hafPrice; // HAF的USDT价格, 使用6位小数精度 (例如, 1.5 USDT 表示为 1500000)
    uint256 public constant PRICE_PRECISION = 1e6;
    uint256 public withdrawalFeeRate = 5; // 提现手续费率, 5%
    uint256 public swapFeeRate = 1; // 闪兑手续费, 1%

    // 配置信息
    mapping(uint8 => StakingLevelInfo) public stakingLevels;
    TeamLevelInfo[] public teamLevels; // index 0-5对应 V0-V5

    // 创世节点
    uint256 public genesisNodeCost = 5000 * 1e18;
    uint256 public constant GENESIS_NODE_EXIT_MULTIPLIER = 3;
    uint256 public globalGenesisPool; // 全局创世节点分红池 (USDT本位)
    uint256 public totalGenesisShares; // 总分红权数 (用于计算每份分红)
    address[] public genesisNodes;

    // --- 构造函数 ---
    constructor(address _usdtAddress, address _initialOwner) ERC20("Hash Fi Token", "HAF") Ownable(_initialOwner) {
        usdtToken = IERC20(_usdtAddress);
        hafPrice = 1 * PRICE_PRECISION; // 初始价格: 1 HAF = 1 USDT

        // 初始化质押级别
        stakingLevels[1] = StakingLevelInfo(100 * 1e18, 499 * 1e18, 150, 70);
        stakingLevels[2] = StakingLevelInfo(500 * 1e18, 999 * 1e18, 200, 80);
        stakingLevels[3] = StakingLevelInfo(1000 * 1e18, 2999 * 1e18, 250, 90);
        stakingLevels[4] = StakingLevelInfo(3000 * 1e18, type(uint256).max, 300, 100);

        // 初始化团队级别 (V0 - V5)
        teamLevels.push(TeamLevelInfo(0, 0)); // V0
        teamLevels.push(TeamLevelInfo(5000 * 1e18, 5)); // V1
        teamLevels.push(TeamLevelInfo(20000 * 1e18, 10)); // V2
        teamLevels.push(TeamLevelInfo(100000 * 1e18, 15)); // V3
        teamLevels.push(TeamLevelInfo(300000 * 1e18, 20)); // V4
        teamLevels.push(TeamLevelInfo(1000000 * 1e18, 25));// V5
    }

    // --- 用户核心功能 ---

    function bindReferrer(address _referrer) external whenNotPaused {
        User storage user = users[msg.sender];
        require(user.referrer == address(0), "Referrer already bound");
        require(users[_referrer].totalStakedAmount > 0, "Referrer does not exist");
        require(_referrer != msg.sender, "Cannot refer yourself");
        user.referrer = _referrer;
        users[_referrer].directReferrals.push(msg.sender);
        emit ReferrerBound(msg.sender, _referrer);
    }

    function stake(uint256 _amount) external nonReentrant whenNotPaused {
        require(users[msg.sender].referrer != address(0), "Must bind a referrer first");
        uint8 level = _getStakingLevelByAmount(_amount);
        require(level > 0, "Invalid staking amount");

        // 先结算该用户的所有待计算收益
        _settleUserRewards(msg.sender);

        usdtToken.transferFrom(msg.sender, address(this), _amount);

        uint256 orderId = orders.length;
        uint256 quota = _amount.mul(stakingLevels[level].multiplier).div(100);
        
        orders.push(Order(orderId, msg.sender, level, _amount, quota, 0, block.timestamp, block.timestamp, false));
        User storage user = users[msg.sender];
        user.orderIds.push(orderId);
        user.totalStakedAmount = user.totalStakedAmount.add(_amount);

        // 更新上级团队业绩并分发动态奖励
        _updateAncestorsPerformanceAndRewards(msg.sender, _amount, level);
        emit Staked(msg.sender, orderId, _amount, level);
    }

    function applyForGenesisNode() external whenNotPaused {
        User storage user = users[msg.sender];
        require(user.totalStakedAmount > 0, "User must stake first");
        require(!user.isGenesisNode, "Already a genesis node");

        usdtToken.transferFrom(msg.sender, address(this), genesisNodeCost);
        
        user.isGenesisNode = true;
        genesisNodes.push(msg.sender);
        // 初始权重为3倍成本
        totalGenesisShares = totalGenesisShares.add(genesisNodeCost.mul(GENESIS_NODE_EXIT_MULTIPLIER));

        emit GenesisNodeApplied(msg.sender);
    }

    function withdraw() external nonReentrant whenNotPaused {
        // 1. 结算该用户的所有待发收益
        _settleUserRewards(msg.sender);
        // 2. 计算可领取的总HAF
        (uint256 pendingStaticHaf, uint256 pendingDynamicHaf, uint256 pendingGenesisHaf) = getClaimableRewards(msg.sender);
        uint256 totalClaimableHaf = pendingStaticHaf.add(pendingDynamicHaf).add(pendingGenesisHaf);
        require(totalClaimableHaf > 0, "No rewards to withdraw");

        // 3. 更新用户已领取记录
        User storage user = users[msg.sender];
        // 静态收益直接在_settleUserRewards中累加到HAF余额, 这里通过 balanceOf 获取
        // 动态收益
        user.dynamicRewardClaimed = user.dynamicRewardClaimed.add(pendingDynamicHaf);
        // 创世节点分红
        // `genesisDividendsWithdrawn`在_settleUserRewards中已更新, 这里无需操作

        // 4. 计算手续费并铸造代币
        uint256 fee = totalClaimableHaf.mul(withdrawalFeeRate).div(100);
        uint256 amountAfterFee = totalClaimableHaf.sub(fee);
        
        _mint(msg.sender, amountAfterFee);

        emit Withdrawn(msg.sender, amountAfterFee, fee);
    }
    
    // --- 闪兑功能 ---
    function swapUsdtToHaf(uint256 _usdtAmount) external nonReentrant whenNotPaused {
        require(_usdtAmount > 0, "USDT amount must be positive");
        usdtToken.transferFrom(msg.sender, address(this), _usdtAmount);
        
        uint256 hafAmount = _usdtAmount.mul(PRICE_PRECISION).div(hafPrice);
        uint256 fee = hafAmount.mul(swapFeeRate).div(100);
        uint256 finalHafAmount = hafAmount.sub(fee);
        
        _mint(msg.sender, finalHafAmount);
        
        emit Swapped(msg.sender, address(usdtToken), address(this), _usdtAmount, finalHafAmount);
    }

    function swapHafToUsdt(uint256 _hafAmount) external nonReentrant whenNotPaused {
        require(_hafAmount > 0, "HAF amount must be positive");
        _burn(msg.sender, _hafAmount);
        
        uint256 usdtAmount = _hafAmount.mul(hafPrice).div(PRICE_PRECISION);
        uint256 fee = usdtAmount.mul(swapFeeRate).div(100);
        uint256 finalUsdtAmount = usdtAmount.sub(fee);
        
        require(usdtToken.balanceOf(address(this)) >= finalUsdtAmount, "Insufficient USDT in contract");
        usdtToken.transfer(msg.sender, finalUsdtAmount);
        
        emit Swapped(msg.sender, address(this), address(usdtToken), _hafAmount, finalUsdtAmount);
    }

    
    // --- 结算核心逻辑 (用户驱动) ---

    function _settleUserRewards(address _user) internal {
        // 1. 结算静态收益
        uint256[] memory orderIds = users[_user].orderIds;
        for (uint i = 0; i < orderIds.length; i++) {
            _settleStaticRewardForOrder(orderIds[i]);
        }

        // 2. 结算创世节点分红
        if (users[_user].isGenesisNode) {
            _settleGenesisRewardForNode(_user);
        }
    }

    function _settleStaticRewardForOrder(uint256 _orderId) internal {
        Order storage order = orders[_orderId];
        if (order.isCompleted) {
            return;
        }

        uint256 timeElapsed = block.timestamp.sub(order.lastSettleTime);
        if (timeElapsed == 0) return;

        User storage user = users[order.user];
        uint256 baseDailyRate = stakingLevels[order.level].dailyRate;
        uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
        uint256 actualDailyRate = baseDailyRate.mul(uint256(100).add(accelerationBonus)).div(100);
        
        // 计算产生的USDT本位收益
        uint256 rewardUsdt = order.amount.mul(actualDailyRate).mul(timeElapsed).div(10000).div(1 days);
        
        // 检查是否出局
        if (order.releasedQuota.add(rewardUsdt) >= order.totalQuota) {
            rewardUsdt = order.totalQuota.sub(order.releasedQuota);
            order.isCompleted = true;
        }

        order.releasedQuota = order.releasedQuota.add(rewardUsdt);
        order.lastSettleTime = block.timestamp;

        if (rewardUsdt > 0) {
            // 90% 给用户，10% 进创世分红池
            uint256 userPart = rewardUsdt.mul(90).div(100);
            uint256 genesisPart = rewardUsdt.sub(userPart);
            
            // 累加到分红池, 更新总权重
            if (genesisPart > 0) {
                globalGenesisPool = globalGenesisPool.add(genesisPart);
                totalGenesisShares = totalGenesisShares.add(genesisPart);
            }
            
            // 为用户增加HAF余额 (注意：这里是直接增加到HAF余额, 而不是一个单独的变量)
            uint256 userRewardHaf = userPart.mul(PRICE_PRECISION).div(hafPrice);
            _mint(order.user, userRewardHaf); // 直接铸造给用户

            // 记录静态收益
            _addRewardRecord(order.user, address(0), RewardType.Static, userPart, userRewardHaf);

            // 更新用户个人总静态产出，用于分享奖计算
            user.totalStaticOutput = user.totalStaticOutput.add(userPart);
            // 向上递归更新分享奖
            _distributeShareRewards(order.user, userPart);
        }
    }
    
    function _settleGenesisRewardForNode(address _node) internal {
        User storage nodeUser = users[_node];
        uint256 maxDividend = genesisNodeCost.mul(GENESIS_NODE_EXIT_MULTIPLIER);
        if (nodeUser.genesisDividendsWithdrawn >= maxDividend) return;

        uint256 nodeShare = genesisNodeCost.mul(GENESIS_NODE_EXIT_MULTIPLIER).sub(nodeUser.genesisDividendsWithdrawn);
        if (totalGenesisShares == 0) return;
        
        uint256 claimableUsdt = globalGenesisPool.mul(nodeShare).div(totalGenesisShares);

        if (claimableUsdt > 0) {
            uint256 actualClaim = claimableUsdt;
            if (nodeUser.genesisDividendsWithdrawn.add(claimableUsdt) > maxDividend) {
                actualClaim = maxDividend.sub(nodeUser.genesisDividendsWithdrawn);
            }

            nodeUser.genesisDividendsWithdrawn = nodeUser.genesisDividendsWithdrawn.add(actualClaim);
            globalGenesisPool = globalGenesisPool.sub(actualClaim);
            totalGenesisShares = totalGenesisShares.sub(actualClaim);
            
            uint256 rewardHaf = actualClaim.mul(PRICE_PRECISION).div(hafPrice);
            _mint(_node, rewardHaf); // 直接铸造给用户
        }
    }
    
    // --- 动态奖励逻辑 ---

    function _updateAncestorsPerformanceAndRewards(address _user, uint256 _amount, uint8 _level) internal {
        address currentUser = _user;
        address referrer = users[currentUser].referrer;

        // --- 直推奖 (最高6代) ---
        uint256[] memory directRewardRates = _getDirectRewardRates();
        for (uint i = 0; i < 6 && referrer != address(0); i++) {
            // 计算烧伤
            uint256 receivableAmount = _calculateBurnableAmount(_amount, _level, _getUserHighestLevel(referrer));
            uint256 rewardUsdt = receivableAmount.mul(directRewardRates[i]).div(100);
            
            if(rewardUsdt > 0) {
                uint256 rewardHaf = rewardUsdt.mul(PRICE_PRECISION).div(hafPrice);
                User storage referrerUser = users[referrer];
                referrerUser.dynamicRewardTotal = referrerUser.dynamicRewardTotal.add(rewardHaf);
                if (referrerUser.dynamicRewardStartTime == 0) {
                    referrerUser.dynamicRewardStartTime = block.timestamp;
                }
                // 记录直推收益
                _addRewardRecord(referrer, _user, RewardType.Direct, rewardUsdt, rewardHaf);

            }
            
            currentUser = referrer;
            referrer = users[currentUser].referrer;
        }

        // --- 团队业绩更新 ---
        currentUser = _user;
        referrer = users[currentUser].referrer;
        while(referrer != address(0)) {
            users[referrer].teamTotalPerformance = users[referrer].teamTotalPerformance.add(_amount);
            _updateUserTeamLevel(referrer);
            
            currentUser = referrer;
            referrer = users[currentUser].referrer;
        }
    }

    function _distributeShareRewards(address _user, uint256 _staticRewardUsdt) internal {
        address currentUser = _user;
        address referrer = users[currentUser].referrer;

        // --- 分享奖 (最高10代) ---
        for (uint i = 0; i < 10 && referrer != address(0); i++) {
            User storage referrerUser = users[referrer];
            // 拿满10代条件：直推人数 >= 代数
            if (referrerUser.directReferrals.length > i) {
                uint256 rewardUsdt = _staticRewardUsdt.mul(5).div(100);
                // 分享奖烧伤 (与直推奖逻辑一致)
                uint8 userLevel = _getUserHighestLevel(_user);
                uint8 referrerLevel = _getUserHighestLevel(referrer);
                uint256 burnableBase = _calculateBurnableAmount(users[_user].totalStakedAmount, userLevel, referrerLevel);
                // 这里我们假设分享奖的烧伤基数是触发者总投资额，而不是本次静态收益
                if(users[_user].totalStakedAmount > burnableBase){
                    // 按比例减少
                    rewardUsdt = rewardUsdt.mul(burnableBase).div(users[_user].totalStakedAmount);
                }

                if(rewardUsdt > 0){
                    uint256 rewardHaf = rewardUsdt.mul(PRICE_PRECISION).div(hafPrice);
                    referrerUser.dynamicRewardTotal = referrerUser.dynamicRewardTotal.add(rewardHaf);
                    if (referrerUser.dynamicRewardStartTime == 0) {
                        referrerUser.dynamicRewardStartTime = block.timestamp;
                    }
                    // 记录分享收益
                    _addRewardRecord(referrer, _user, RewardType.Share, rewardUsdt, rewardHaf);
                }
            } else {
                break; // 不满足拿代数条件，停止向上查找
            }
            
            currentUser = referrer;
            referrer = users[currentUser].referrer;
        }
    }
    
    // --- 团队等级更新 ---

    function _updateUserTeamLevel(address _user) internal {
        User storage user = users[_user];
        if (user.directReferrals.length == 0) return;
        
        uint256 maxPerformance = 0;
        // 团队总业绩包含自身投资额，需要减去
        uint256 directReferralsTotalPerformance = 0;
        for(uint i = 0; i < user.directReferrals.length; i++){
            address directChild = user.directReferrals[i];
            uint256 childPerformance = users[directChild].totalStakedAmount.add(users[directChild].teamTotalPerformance);
            directReferralsTotalPerformance = directReferralsTotalPerformance.add(childPerformance);
            if(childPerformance > maxPerformance){
                maxPerformance = childPerformance;
            }
        }
        
        uint256 smallAreaPerformance = directReferralsTotalPerformance.sub(maxPerformance);
        // 从最高级别开始检查
        for(uint8 i = 5; i > user.teamLevel; i--){
            if(smallAreaPerformance >= teamLevels[i].requiredPerformance){
                user.teamLevel = i;
                break;
            }
        }
    }
    
    // 内部函数，用于添加收益记录
    function _addRewardRecord(address _user, address _fromUser, RewardType _type, uint256 _usdtAmount, uint256 _hafAmount) internal {
        users[_user].rewardRecords.push(RewardRecord(
            block.timestamp,
            _fromUser,
            _type,
            _usdtAmount,
            _hafAmount
        ));
        emit RewardDistributed(_user, _fromUser, _type, _usdtAmount, _hafAmount);
    }


    // --- 视图函数 (View Functions for Frontend) ---
    
    function getUserInfo(address _user) external view returns (User memory, uint8, uint256, uint256) {
        User storage u = users[_user];
        uint8 highestLevel = _getUserHighestLevel(_user);
        
        // 计算小区业绩
        uint256 maxP = 0;
        uint256 totalP = 0;
        for(uint i = 0; i < u.directReferrals.length; i++){
            address child = u.directReferrals[i];
            uint256 p = users[child].totalStakedAmount.add(users[child].teamTotalPerformance);
            totalP = totalP.add(p);
            if(p > maxP) maxP = p;
        }
        uint256 smallAreaP = totalP.sub(maxP);

        return (u, highestLevel, totalP, smallAreaP);
    }
    
    function getOrderInfo(uint256 _orderId) external view returns (Order memory) {
        return orders[_orderId];
    }
    
    function getClaimableRewards(address _user) public view returns (uint256 pendingStatic, uint256 pendingDynamic, uint256 pendingGenesis) {
        // 1. 静态收益 (已直接mint到余额, 这里返回0, 前端直接读balanceOf)
        pendingStatic = 0;
        // 2. 动态收益 (直推+分享)
        User storage user = users[_user];
        if (user.dynamicRewardTotal > user.dynamicRewardClaimed) {
             uint256 timeSinceStart = block.timestamp.sub(user.dynamicRewardStartTime);
             uint256 totalReleased = user.dynamicRewardTotal.mul(timeSinceStart).div(100 days);
             if (totalReleased > user.dynamicRewardTotal) {
                 totalReleased = user.dynamicRewardTotal;
             }
             if (totalReleased > user.dynamicRewardClaimed) {
                pendingDynamic = totalReleased.sub(user.dynamicRewardClaimed);
             }
        }

        // 3. 创世节点分红 (已直接mint到余额, 这里返回0, 前端直接读balanceOf)
        pendingGenesis = 0;
    }
    
    function getUserOrders(address _user) external view returns (Order[] memory) {
        uint256[] memory orderIds = users[_user].orderIds;
        Order[] memory userOrders = new Order[](orderIds.length);
        for(uint i = 0; i < orderIds.length; i++) {
            userOrders[i] = orders[orderIds[i]];
        }
        return userOrders;
    }
    
    // 获取用户收益记录
    function getRewardRecords(address _user) external view returns (RewardRecord[] memory) {
        return users[_user].rewardRecords;
    }
    
    // 获取团队成员详细信息
    function getDirectReferrals(address _user) external view returns (TeamMemberInfo[] memory) {
        address[] memory directReferrals = users[_user].directReferrals;
        TeamMemberInfo[] memory members = new TeamMemberInfo[](directReferrals.length);

        for (uint i = 0; i < directReferrals.length; i++) {
            User storage member = users[directReferrals[i]];
            members[i] = TeamMemberInfo(
                directReferrals[i],
                member.teamLevel,
                member.totalStakedAmount,
                member.teamTotalPerformance
            );
        }
        return members;
    }

    
    // --- 辅助与内部函数 ---

    function _getStakingLevelByAmount(uint256 _amount) internal view returns (uint8) {
        for (uint8 i = 1; i <= 4; i++) {
            if (_amount >= stakingLevels[i].minAmount && _amount <= stakingLevels[i].maxAmount) {
                return i;
            }
        }
        return 0;
    }

    function _getUserHighestLevel(address _user) internal view returns (uint8) {
        uint8 maxLevel = 0;
        uint256[] memory orderIds = users[_user].orderIds;
        for (uint i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].level > maxLevel) {
                maxLevel = orders[orderIds[i]].level;
            }
        }
        return maxLevel;
    }

    function _calculateBurnableAmount(uint256 _originalAmount, uint8 _investorLevel, uint8 _referrerLevel) internal view returns (uint256) {
        if (_referrerLevel >= _investorLevel || _referrerLevel == 4) {
            return _originalAmount;
        }
        // 如果投资额小于等于推荐人级别的最高投资额，也不烧伤
        if (_originalAmount <= stakingLevels[_referrerLevel].maxAmount) {
            return _originalAmount;
        }
        // 否则，按推荐人级别的最高投资额作为奖励基数
        return stakingLevels[_referrerLevel].maxAmount;
    }

    function _getDirectRewardRates() internal pure returns (uint256[] memory) {
        uint256[] memory rates = new uint256[](6);
        rates[0] = 5; rates[1] = 3; rates[2] = 1; rates[3] = 1; rates[4] = 1; rates[5] = 1;
        return rates;
    }

    // --- 后台管理函数 ---

    function setHafPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Price must be positive");
        hafPrice = _newPrice;
        emit PriceUpdated(_newPrice);
    }

    function setWithdrawalFee(uint256 _newFeeRate) external onlyOwner {
        require(_newFeeRate <= 100, "Fee rate cannot exceed 100%");
        withdrawalFeeRate = _newFeeRate;
    }
    
    // 紧急暂停/恢复功能
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // 管理员提取资金功能
    function emergencyWithdrawToken(address _tokenAddress, uint256 _amount) external onlyOwner {
        require(_tokenAddress != address(0), "Token address cannot be zero");
        IERC20 token = IERC20(_tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(_amount > 0, "Amount must be greater than zero");
        require(balance >= _amount, "Insufficient token balance in contract");
        
        token.transfer(owner(), _amount);
    }
}