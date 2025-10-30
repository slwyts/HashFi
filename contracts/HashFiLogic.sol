// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./HashFiStorage.sol";

/**
 * @title HashFiLogic
 * @dev 包含所有内部业务逻辑、计算和状态变更函数。
 * 继承自 HashFiStorage 以访问状态变量。
 */
abstract contract HashFiLogic is HashFiStorage {

    /**
     * @dev 在交易前自动检查并更新HAF价格(懒加载触发)
     */
    modifier autoUpdatePrice() {
        if (autoPriceUpdateEnabled) {
            uint256 daysPassed = (block.timestamp - lastPriceUpdateTime) / TIME_UNIT;
            if (daysPassed > 0) {
                // 计算复利:每天涨千分之一
                for (uint i = 0; i < daysPassed; i++) {
                    uint256 increase = (hafPrice * dailyPriceIncreaseRate) / 1000;
                    hafPrice = hafPrice + increase;
                }
                lastPriceUpdateTime = lastPriceUpdateTime + (daysPassed * TIME_UNIT);
                emit PriceUpdated(hafPrice);
            }
        }
        _;
    }

    /**
     * @dev 结算用户的所有奖励（静态、创世）
     */
    function _settleUserRewards(address _user) internal {
        uint256[] memory orderIds = users[_user].orderIds;
        for (uint i = 0; i < orderIds.length; i++) {
            _settleStaticRewardForOrder(orderIds[i]);
        }

        if (users[_user].isGenesisNode) {
            _settleGenesisRewardForNode(_user);
        }
    }

    /**
     * @dev 结算单个订单的静态收益
     */
    function _settleStaticRewardForOrder(uint256 _orderId) internal {
        Order storage order = orders[_orderId];
        if (order.isCompleted) {
            return;
        }

        uint256 daysPassed = (block.timestamp - order.lastSettleTime) / TIME_UNIT;
        if (daysPassed == 0) return;

        User storage user = users[order.user];
        uint256 baseDailyRate = stakingLevels[order.level].dailyRate; // 70/80/90/100 (万分之一)

        uint256 dailyReleaseUsdt = (order.amount * baseDailyRate) / 10000;
 
        uint256 dailyReleaseHaf = (dailyReleaseUsdt * PRICE_PRECISION) / hafPrice;

        uint256 baseTotalReleaseHaf = dailyReleaseHaf * daysPassed;
        uint256 baseTotalReleaseUsdt = dailyReleaseUsdt * daysPassed;
        
        uint256 actualBaseReleaseHaf = baseTotalReleaseHaf;
        uint256 actualBaseReleaseUsdt = baseTotalReleaseUsdt;
        
        if (order.releasedHaf + baseTotalReleaseHaf >= order.totalQuotaHaf) {
            // 烧伤多余部分
            actualBaseReleaseHaf = order.totalQuotaHaf - order.releasedHaf;
            // 按比例调整USDT额度
            if (baseTotalReleaseHaf > 0) {
                actualBaseReleaseUsdt = (baseTotalReleaseUsdt * actualBaseReleaseHaf) / baseTotalReleaseHaf;
            }
            order.isCompleted = true;
            
            globalStats.totalCompletedOrders = globalStats.totalCompletedOrders + 1;
        }
        
        // 更新已释放的HAF数量和USDT额度（用户实际可得90%）
        uint256 userActualReleaseHaf = (actualBaseReleaseHaf * 90) / 100;
        uint256 userActualReleaseUsdt = (actualBaseReleaseUsdt * 90) / 100;
        order.releasedHaf = order.releasedHaf + userActualReleaseHaf;
        order.releasedQuota = order.releasedQuota + userActualReleaseUsdt;
        
        // 团队加速是额外奖励，基于实际释放的基础部分计算
        uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
        uint256 accelerationReleaseUsdt = 0;
        uint256 accelerationReleaseHaf = 0;
        
        if (accelerationBonus > 0 && !order.isCompleted) {
            // 加速基于实际释放的基础部分
            accelerationReleaseUsdt = (actualBaseReleaseUsdt * accelerationBonus) / 100;
            accelerationReleaseHaf = (actualBaseReleaseHaf * accelerationBonus) / 100;
        }
        
        if (actualBaseReleaseUsdt > 0) {
            uint256 userBasePart = (actualBaseReleaseUsdt * 90) / 100;
            uint256 genesisPart = actualBaseReleaseUsdt - userBasePart; // 10%给创世节点池
            
            if (genesisPart > 0) {
                globalGenesisPool = globalGenesisPool + genesisPart;
                
                // 更新每个节点的累积奖励
                uint256 activeNodesCount = activeGenesisNodes.length;
                if (activeNodesCount > 0) {
                    // accGenesisRewardPerNode += (新增分红 * 1e18) / 节点数
                    accGenesisRewardPerNode = accGenesisRewardPerNode + (genesisPart * 1e18) / activeNodesCount;
                }
            }
            
            // 记录基础静态收益
            uint256 baseStaticHaf = (actualBaseReleaseHaf * 90) / 100;
            _addRewardRecord(order.user, address(0), RewardType.Static, userBasePart, baseStaticHaf);
            
            // 更新用户总静态产出（用于计算分享奖）
            user.totalStaticOutput = user.totalStaticOutput + userBasePart;
            _distributeShareRewards(order.user, userBasePart);
        }
        
        if (accelerationReleaseUsdt > 0) {
            uint256 teamBonusUsdt = (accelerationReleaseUsdt * 90) / 100;
            uint256 teamGenesisUsdt = accelerationReleaseUsdt - teamBonusUsdt; // 10%给创世节点
            
            if (teamGenesisUsdt > 0) {
                globalGenesisPool = globalGenesisPool + teamGenesisUsdt;
                
                // 更新每个节点的累积奖励
                uint256 activeNodesCount = activeGenesisNodes.length;
                if (activeNodesCount > 0) {
                    accGenesisRewardPerNode = accGenesisRewardPerNode + (teamGenesisUsdt * 1e18) / activeNodesCount;
                }
            }
            
            uint256 teamBonusHaf = (accelerationReleaseHaf * 90) / 100;
            _addRewardRecord(order.user, address(0), RewardType.Team, teamBonusUsdt, teamBonusHaf);
        }
    }

    /**
     * @dev 结算创世节点奖励
     * 采用MasterChef类似的机制：accRewardPerNode记录每个节点的累积奖励
     * rewardDebt记录用户已结算的部分
     * 待领取 = accRewardPerNode - rewardDebt
     */
    function _settleGenesisRewardForNode(address _node) internal {
        User storage nodeUser = users[_node];
        uint256 maxDividend = genesisNodeCost * GENESIS_NODE_EXIT_MULTIPLIER;
        
        // 如果已经出局且不在活跃列表，直接返回
        if (nodeUser.genesisDividendsWithdrawn >= maxDividend && !isActiveGenesisNode[_node]) {
            return;
        }

        // 计算待领取金额 = (每节点累积奖励 - 用户奖励债务) / 1e18
        uint256 pending = 0;
        if (accGenesisRewardPerNode > nodeUser.genesisRewardDebt) {
            pending = (accGenesisRewardPerNode - nodeUser.genesisRewardDebt) / 1e18;
        }
        
        if (pending > 0) {
            uint256 actualClaim = pending;
            
            // 检查是否超过3倍上限
            uint256 afterClaimTotal = nodeUser.genesisDividendsWithdrawn + pending;
            if (afterClaimTotal > maxDividend) {
                actualClaim = maxDividend - nodeUser.genesisDividendsWithdrawn;
            }

            // 记录奖励
            if (actualClaim > 0) {
                uint256 actualClaimHaf = (actualClaim * PRICE_PRECISION) / hafPrice;
                _addRewardRecord(_node, address(0), RewardType.Genesis, actualClaim, actualClaimHaf);
            }
            
            // 更新已领取金额
            nodeUser.genesisDividendsWithdrawn = nodeUser.genesisDividendsWithdrawn + actualClaim;
            globalGenesisPool = globalGenesisPool - actualClaim; // 从池子扣除
            
            // 如果达到上限，从活跃列表移除
            if (nodeUser.genesisDividendsWithdrawn >= maxDividend) {
                _removeActiveGenesisNode(_node);
            }
        }
        
        // 更新奖励债务（无论是否领取都要更新，这样下次计算pending才是正确的）
        nodeUser.genesisRewardDebt = accGenesisRewardPerNode;
    }
    
    /**
     * @dev (内部) 将节点从活跃列表中移除
     */
    function _removeActiveGenesisNode(address _node) internal {
        if (!isActiveGenesisNode[_node]) return;
        
        isActiveGenesisNode[_node] = false;
        
        // 从数组中移除
        for (uint i = 0; i < activeGenesisNodes.length; i++) {
            if (activeGenesisNodes[i] == _node) {
                activeGenesisNodes[i] = activeGenesisNodes[activeGenesisNodes.length - 1];
                activeGenesisNodes.pop();
                break;
            }
        }
    }

    /**
     * @dev (内部) 更新用户所有订单的最后结算时间
     */
    function _updateOrderSettleTimes(address _user) internal {
        uint256[] memory orderIds = users[_user].orderIds;
        
        for (uint i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (!order.isCompleted) {
                uint256 daysPassed = (block.timestamp - order.lastSettleTime) / TIME_UNIT;
                if (daysPassed > 0) {
                    order.lastSettleTime = order.lastSettleTime + (daysPassed * TIME_UNIT);
                }
            }
        }
    }
    
    /**
     * @dev (内部) 质押时，更新上级业绩并发放直推奖
     */
    function _updateAncestorsPerformanceAndRewards(address _user, uint256 _amount, uint8 _level) internal {
        address currentUser = _user;
        address referrer = users[currentUser].referrer;

        uint256[] memory directRewardRates = _getDirectRewardRates();
        for (uint i = 0; i < 6 && referrer != address(0); i++) {
            uint8 referrerLevel = getUserHighestLevel(referrer);
            uint256 receivableAmount = _calculateBurnableAmount(_amount, _level, referrerLevel);
            
            // 计算应得奖励
            uint256 fullRewardUsdt = (_amount * directRewardRates[i]) / 100;
            uint256 actualRewardUsdt = (receivableAmount * directRewardRates[i]) / 100;
            
            // 如果发生烧伤（receivableAmount < _amount），记录烧伤的USDT奖励额度
            if (fullRewardUsdt > actualRewardUsdt) {
                uint256 burnedRewardUsdt = fullRewardUsdt - actualRewardUsdt;
                // 烧伤的奖励不发放，直接丢弃（不需要燃烧HAF代币）
                emit RewardBurned(referrer, _user, fullRewardUsdt, actualRewardUsdt, burnedRewardUsdt);
            }
            
            // 发放实际奖励（记录详细来源）
            if(actualRewardUsdt > 0) {
                uint256 rewardHaf = (actualRewardUsdt * PRICE_PRECISION) / hafPrice;
                User storage referrerUser = users[referrer];
                
                // ✅ 在新增奖励前，先更新旧奖励的释放进度
                _updateDirectRewardRelease(referrer);
                
                // 累加新奖励到总额（直推奖DYNAMIC_RELEASE_PERIOD线性释放）
                referrerUser.directRewardTotal = referrerUser.directRewardTotal + rewardHaf;
                
                // ✅ 记录这笔直推奖的详细信息（来源、金额、时间）
                referrerUser.directRewardDetails.push(DirectRewardDetail({
                    fromUser: _user,
                    totalAmount: rewardHaf,
                    releasedAmount: 0,
                    claimedAmount: 0,
                    startTime: block.timestamp
                }));
            }
            
            currentUser = referrer;
            referrer = users[currentUser].referrer;
        }

        currentUser = _user;
        referrer = users[currentUser].referrer;
        while(referrer != address(0)) {
            users[referrer].teamTotalPerformance = users[referrer].teamTotalPerformance + _amount;
            _updateUserTeamLevel(referrer);
            
            currentUser = referrer;
            referrer = users[currentUser].referrer;
        }
    }

    /**
     * @dev 内部函数：更新用户动态奖励的释放进度
     * 遍历所有直推奖详细记录，分别计算每笔的释放进度
     */
    function _updateDirectRewardRelease(address _user) internal {
        User storage user = users[_user];
        
        // 如果没有待释放的奖励，直接返回
        if (user.directRewardTotal <= user.directRewardReleased) {
            user.lastDirectUpdateTime = block.timestamp;
            return;
        }
        
        // 如果是第一次，初始化时间
        if (user.lastDirectUpdateTime == 0) {
            user.lastDirectUpdateTime = block.timestamp;
            return;
        }
        
        // ✅ 遍历所有直推奖详细记录，更新每笔的释放进度
        uint256 totalReleasePeriods = DYNAMIC_RELEASE_PERIOD / TIME_UNIT;
        
        for (uint i = 0; i < user.directRewardDetails.length; i++) {
            DirectRewardDetail storage detail = user.directRewardDetails[i];
            
            // 如果这笔奖励已经全部释放，跳过
            if (detail.releasedAmount >= detail.totalAmount) {
                continue;
            }
            
            // 计算这笔奖励从开始到现在经过的时间单位
            uint256 daysSinceStart = (block.timestamp - detail.startTime) / TIME_UNIT;
            
            // 计算应该释放的总金额
            uint256 shouldReleased;
            if (daysSinceStart >= totalReleasePeriods) {
                // 超过释放周期，全部释放
                shouldReleased = detail.totalAmount;
            } else {
                // 线性释放：每日释放 = 总额 / 总天数
                uint256 dailyRelease = detail.totalAmount / totalReleasePeriods;
                shouldReleased = dailyRelease * daysSinceStart;
                
                // 确保不超过总额
                if (shouldReleased > detail.totalAmount) {
                    shouldReleased = detail.totalAmount;
                }
            }
            
            // 更新这笔记录的已释放金额
            detail.releasedAmount = shouldReleased;
        }
        
        // 重新计算总的已释放金额
        uint256 newTotalReleased = 0;
        for (uint i = 0; i < user.directRewardDetails.length; i++) {
            newTotalReleased = newTotalReleased + user.directRewardDetails[i].releasedAmount;
        }
        user.directRewardReleased = newTotalReleased;
        
        // 更新时间
        user.lastDirectUpdateTime = block.timestamp;
    }
    
    /**
     * @dev (内部) 发放分享奖（基于静态收益的5%）
     */
    function _distributeShareRewards(address _user, uint256 _staticRewardUsdt) internal {
        address currentUser = _user;
        address referrer = users[currentUser].referrer;
        
        for (uint i = 0; i < 10 && referrer != address(0); i++) {
            User storage referrerUser = users[referrer];
            
            // ✅ 计算直接推荐的活跃人数
            uint256 activeDirectCount = 0;
            for (uint j = 0; j < referrerUser.directReferrals.length; j++) {
                if (users[referrerUser.directReferrals[j]].totalStakedAmount > 0) {
                    activeDirectCount++;
                }
            }

            if (activeDirectCount <= i) {
                // 跳过本代，但继续向上查找（上级可能有足够推荐人数）
                currentUser = referrer;
                referrer = users[currentUser].referrer;
                continue;
            }

            // ✅ 分享奖无烧伤机制 - 按静态收益的5%计算
            uint256 rewardUsdt = (_staticRewardUsdt * 5) / 100;

            if(rewardUsdt > 0){
                uint256 rewardHaf = (rewardUsdt * PRICE_PRECISION) / hafPrice;
                
                // ✅ 分享奖立即可提取，直接累加到 shareRewardTotal
                referrerUser.shareRewardTotal = referrerUser.shareRewardTotal + rewardHaf;
                
                // ✅ 记录分享奖（在静态收益结算时记录）
                _addRewardRecord(referrer, _user, RewardType.Share, rewardUsdt, rewardHaf);
            }
            
            currentUser = referrer;
            referrer = users[currentUser].referrer;
        }
    }
    
    /**
     * @dev (内部) 更新用户团队等级
     */
    function _updateUserTeamLevel(address _user) internal {
        User storage user = users[_user];
        if (user.directReferrals.length == 0) return;
        
        uint256 maxPerformance = 0;
        uint256 directReferralsTotalPerformance = 0;
        for(uint i = 0; i < user.directReferrals.length; i++){
            address directChild = user.directReferrals[i];
            uint256 childPerformance = users[directChild].totalStakedAmount + users[directChild].teamTotalPerformance;
            directReferralsTotalPerformance = directReferralsTotalPerformance + childPerformance;
            if(childPerformance > maxPerformance){
                maxPerformance = childPerformance;
            }
        }
        
        uint256 smallAreaPerformance = directReferralsTotalPerformance - maxPerformance;
        uint8 oldLevel = user.teamLevel;
        
        for(uint8 i = 5; i > oldLevel; i--){
            if(smallAreaPerformance >= teamLevels[i].requiredPerformance){
                user.teamLevel = i;
                emit TeamLevelUpdated(_user, oldLevel, i);
                break;
            }
        }
    }
    
    /**
     * @dev (内部) 添加收益记录
     */
    function _addRewardRecord(address _user, address _fromUser, RewardType _type, uint256 _usdtAmount, uint256 _hafAmount) internal {
        users[_user].rewardRecords.push(RewardRecord({
            timestamp: block.timestamp,
            fromUser: _fromUser,
            rewardType: _type,
            usdtAmount: _usdtAmount,
            hafAmount: _hafAmount
        }));
    }

    /**
     * @dev (内部) 从合约金库分发HAF代币
     */
    function _distributeHaf(address _recipient, uint256 _amount) internal virtual {
        // This function will be implemented in the main HashFi contract
        // because it needs access to _transfer (from ERC20)
    }

    /**
     * @dev (内部) (Admin) 从待审核列表中移除
     */
    function _removeFromPendingApplications(address _applicant) internal {
        for (uint i = 0; i < pendingGenesisApplications.length; i++) {
            if (pendingGenesisApplications[i] == _applicant) {
                pendingGenesisApplications[i] = pendingGenesisApplications[pendingGenesisApplications.length - 1];
                pendingGenesisApplications.pop();
                break;
            }
        }
    }

    // --- 内部视图/计算函数 ---

    /**
     * @dev (内部) 视图：计算待领取的静态收益
     */
    function _calculatePendingStatic(address _user) internal view returns (uint256) {
        User storage user = users[_user];
        uint256 total = 0;
        
        for (uint i = 0; i < user.orderIds.length; i++) {
            Order storage order = orders[user.orderIds[i]];
            if (order.isCompleted) continue;
            
            uint256 daysPassed = (block.timestamp - order.lastSettleTime) / TIME_UNIT;
            if (daysPassed == 0) continue;

            uint256 baseDailyRate = stakingLevels[order.level].dailyRate;
            uint256 dailyReleaseUsdt = (order.amount * baseDailyRate) / 10000;
            uint256 dailyReleaseHaf = (dailyReleaseUsdt * PRICE_PRECISION) / hafPrice;
            
            uint256 baseTotalReleaseHaf = dailyReleaseHaf * daysPassed;
            
            uint256 actualReleaseHaf = baseTotalReleaseHaf;
            
            if (order.releasedHaf + baseTotalReleaseHaf >= order.totalQuotaHaf) {
                actualReleaseHaf = order.totalQuotaHaf - order.releasedHaf;
            }
            
            uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
            uint256 accelerationHaf = 0;
            
            if (accelerationBonus > 0) {
                accelerationHaf = (actualReleaseHaf * accelerationBonus) / 100;
            }
            
            uint256 baseHaf = (actualReleaseHaf * 90) / 100;
            uint256 bonusHaf = 0;
            if (accelerationHaf > 0) {
                bonusHaf = (accelerationHaf * 90) / 100;
            }
            
            total = total + baseHaf + bonusHaf;
        }
        
        return total;
    }
    
    /**
     * @dev 内部函数: 计算待领取的动态收益
     */
    function _calculatePendingDynamic(address _user) internal view returns (uint256) {
        User storage user = users[_user];
        
        uint256 pendingDirect = 0;
        uint256 pendingShare = 0;
        
        // 1. 计算直推奖的已释放但未领取部分（线性释放）
        if (user.directRewardTotal > 0) {
            // ✅ 遍历所有直推奖详细记录，计算实时的可领取金额
            uint256 totalReleasePeriods = DYNAMIC_RELEASE_PERIOD / TIME_UNIT;
            
            for (uint i = 0; i < user.directRewardDetails.length; i++) {
                DirectRewardDetail storage detail = user.directRewardDetails[i];
                
                // 计算这笔奖励实时的已释放金额
                uint256 daysSinceStart = (block.timestamp - detail.startTime) / TIME_UNIT;
                uint256 currentReleased;
                
                if (daysSinceStart >= totalReleasePeriods) {
                    currentReleased = detail.totalAmount;
                } else {
                    uint256 dailyRelease = detail.totalAmount / totalReleasePeriods;
                    currentReleased = dailyRelease * daysSinceStart;
                    if (currentReleased > detail.totalAmount) {
                        currentReleased = detail.totalAmount;
                    }
                }
                
                // 计算未领取的部分
                if (currentReleased > detail.claimedAmount) {
                    pendingDirect = pendingDirect + (currentReleased - detail.claimedAmount);
                }
            }
        }
        
        // 2. 计算分享奖的待领取部分（立即可提取）
        if (user.shareRewardTotal > user.shareRewardClaimed) {
            pendingShare = user.shareRewardTotal - user.shareRewardClaimed;
        }
        
        return pendingDirect + pendingShare;
    }
    
    /**
     * @dev (内部) 视图：计算待领取的创世节点收益
     */
    function _calculatePendingGenesis(address _user) internal view returns (uint256) {
        User storage user = users[_user];
        
        if (!user.isGenesisNode) {
            return 0;
        }
        
        uint256 maxDividend = genesisNodeCost * GENESIS_NODE_EXIT_MULTIPLIER;
        if (user.genesisDividendsWithdrawn >= maxDividend) {
            return 0;
        }
        
        // 计算待领取金额 = (每节点累积奖励 - 用户奖励债务) / 1e18
        uint256 pendingUsdt = 0;
        if (accGenesisRewardPerNode > user.genesisRewardDebt) {
            pendingUsdt = (accGenesisRewardPerNode - user.genesisRewardDebt) / 1e18;
        }
        
        // 检查是否超过上限
        if (user.genesisDividendsWithdrawn + pendingUsdt > maxDividend) {
            pendingUsdt = maxDividend - user.genesisDividendsWithdrawn;
        }
        
        return (pendingUsdt * PRICE_PRECISION) / hafPrice;
    }
    
    /**
     * @dev (内部) 辅助：根据金额获取质押等级
     */
    function _getStakingLevelByAmount(uint256 _amount) internal view returns (uint8) {
        for (uint8 i = 1; i <= 4; i++) {
            if (_amount >= stakingLevels[i].minAmount && _amount <= stakingLevels[i].maxAmount) {
                return i;
            }
        }
        return 0;
    }

    /**
     * @dev 获取用户最高等级
     */
    function getUserHighestLevel(address _user) public view returns (uint8) {
        if (_user == owner()) {
            return 4;
        }
        
        if (users[_user].isGenesisNode) {
            return 4;
        }
        
        uint8 maxLevel = 0;
        uint256[] memory orderIds = users[_user].orderIds;
        for (uint i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].level > maxLevel) {
                maxLevel = orders[orderIds[i]].level;
            }
        }
        return maxLevel;
    }

    /**
     * @dev (内部) 辅助：计算烧伤机制
     */
    function _calculateBurnableAmount(uint256 _originalAmount, uint8 _investorLevel, uint8 _referrerLevel) internal view returns (uint256) {
        // 推荐人等级 >= 投资者等级，无烧伤
        if (_referrerLevel >= _investorLevel) {
            return _originalAmount;
        }
        
        // 跨级别烧伤：推荐人只能拿自己等级的最高投资额对应的奖励
        if (_originalAmount <= stakingLevels[_referrerLevel].maxAmount) {
            return _originalAmount;
        }
        return stakingLevels[_referrerLevel].maxAmount;
    }

    /**
     * @dev (内部) 辅助：获取直推奖励费率
     */
    function _getDirectRewardRates() internal pure returns (uint256[] memory) {
        uint256[] memory rates = new uint256[](6);
        rates[0] = 5; rates[1] = 3; rates[2] = 1; rates[3] = 1; rates[4] = 1; rates[5] = 1;
        return rates;
    }
}

