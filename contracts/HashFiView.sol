// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./HashFiLogic.sol";

/**
 * @title HashFiView
 * @dev 包含所有面向公众的只读(view/pure)函数。
 * 继承自 HashFiLogic 以访问内部计算函数和状态。
 */
abstract contract HashFiView is HashFiLogic {

    /**
     * @dev 获取用户信息
     */
    function getUserInfo(address _user) external view returns (User memory, uint8, uint256, uint256) {
        User storage u = users[_user];
        uint8 highestLevel = getUserHighestLevel(_user);
        
        uint256 maxP = 0;
        uint256 totalP = 0;
        for(uint i = 0; i < u.directReferrals.length; i++){
            address child = u.directReferrals[i];
            uint256 p = users[child].totalStakedAmount + users[child].teamTotalPerformance;
            totalP = totalP + p;
            if(p > maxP) maxP = p;
        }
        uint256 smallAreaP = totalP - maxP;

        return (u, highestLevel, totalP, smallAreaP);
    }
    
    /**
     * @dev 获取订单信息
     */
    function getOrderInfo(uint256 _orderId) external view returns (Order memory) {
        return orders[_orderId];
    }
    
    /**
     * @dev 获取用户可领取的总奖励
     */
    function getClaimableRewards(address _user) public view returns (uint256 pendingStatic, uint256 pendingDynamic, uint256 pendingGenesis) {
        pendingStatic = _calculatePendingStatic(_user);
        pendingDynamic = _calculatePendingDynamic(_user);
        pendingGenesis = _calculatePendingGenesis(_user);
    }
    
    /**
     * @dev 获取用户的所有订单
     */
    function getUserOrders(address _user) external view returns (Order[] memory) {
        uint256[] memory orderIds = users[_user].orderIds;
        Order[] memory userOrders = new Order[](orderIds.length);
        for(uint i = 0; i < orderIds.length; i++) {
            userOrders[i] = orders[orderIds[i]];
        }
        return userOrders;
    }
    
    /**
     * @dev 获取用户收益记录（全部返回）
     */
    function getUserRewardRecords(address _user) external view returns (RewardRecord[] memory) {
        return users[_user].rewardRecords;
    }
    
    /**
     * @dev 获取用户的直接推荐列表
     */
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
    
    /**
     * @dev 获取某个订单的待释放静态收益(不结算,纯计算)
     */
    function getOrderPendingReward(uint256 _orderId) external view returns (uint256 pendingUsdt, uint256 pendingHaf) {
        Order storage order = orders[_orderId];
        if (order.isCompleted) {
            return (0, 0);
        }

        User storage user = users[order.user];
        // ✅ 按天数计算
        uint256 daysPassed = (block.timestamp - order.lastSettleTime) / TIME_UNIT;
        if (daysPassed == 0) return (0, 0);

        // ✅ 基础释放：按投资额计算USDT额度，再转换为HAF
        uint256 baseDailyRate = stakingLevels[order.level].dailyRate;
        uint256 dailyReleaseUsdt = (order.amount * baseDailyRate) / 10000;
        uint256 dailyReleaseHaf = (dailyReleaseUsdt * PRICE_PRECISION) / hafPrice;
        
        uint256 baseTotalReleaseHaf = dailyReleaseHaf * daysPassed;
        uint256 baseTotalReleaseUsdt = dailyReleaseUsdt * daysPassed;
        
        // 检查HAF数量是否超过总额度
        uint256 actualReleaseHaf = baseTotalReleaseHaf;
        uint256 actualReleaseUsdt = baseTotalReleaseUsdt;
        
        if (order.releasedHaf + baseTotalReleaseHaf >= order.totalQuotaHaf) {
            actualReleaseHaf = order.totalQuotaHaf - order.releasedHaf;
            if (baseTotalReleaseHaf > 0) {
                actualReleaseUsdt = (baseTotalReleaseUsdt * actualReleaseHaf) / baseTotalReleaseHaf;
            }
        }
        
        // 团队加速是额外奖励
        uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
        uint256 accelerationHaf = 0;
        uint256 accelerationUsdt = 0;
        
        if (accelerationBonus > 0) {
            accelerationHaf = (actualReleaseHaf * accelerationBonus) / 100;
            accelerationUsdt = (actualReleaseUsdt * accelerationBonus) / 100;
        }

        // 计算总USDT和HAF（基础90% + 加速90%）
        uint256 userPartUsdt = (actualReleaseUsdt * 90) / 100;
        uint256 accelerationPartUsdt = 0;
        if (accelerationUsdt > 0) {
            accelerationPartUsdt = (accelerationUsdt * 90) / 100;
        }
        
        uint256 userPartHaf = (actualReleaseHaf * 90) / 100;
        uint256 accelerationPartHaf = 0;
        if (accelerationHaf > 0) {
            accelerationPartHaf = (accelerationHaf * 90) / 100;
        }
        
        pendingUsdt = userPartUsdt + accelerationPartUsdt;
        pendingHaf = userPartHaf + accelerationPartHaf;
        
        return (pendingUsdt, pendingHaf);
    }
    
    /**
     * @dev 获取用户的推荐人统计(按等级分类)
     */
    function getUserReferralStats(address _user) external view returns (
        uint256 totalReferrals,
        uint256 bronzeCount,
        uint256 silverCount,
        uint256 goldCount,
        uint256 diamondCount
    ) {
        address[] memory directReferrals = users[_user].directReferrals;
        totalReferrals = directReferrals.length;
        
        for (uint i = 0; i < directReferrals.length; i++) {
            uint8 level = getUserHighestLevel(directReferrals[i]);
            if (level == 1) bronzeCount++;
            else if (level == 2) silverCount++;
            else if (level == 3) goldCount++;
            else if (level == 4) diamondCount++;
        }
        
        return (totalReferrals, bronzeCount, silverCount, goldCount, diamondCount);
    }
    
    /**
     * @dev 获取用户团队业绩详情
     */
    function getTeamPerformanceDetails(address _user) external view returns (
        uint256 totalPerformance,
        uint256 largestArea,
        uint256 smallArea,
        uint256 directReferralsCount
    ) {
        User storage user = users[_user];
        directReferralsCount = user.directReferrals.length;
        
        uint256 maxP = 0;
        uint256 totalP = 0;
        for(uint i = 0; i < user.directReferrals.length; i++){
            address child = user.directReferrals[i];
            uint256 p = users[child].totalStakedAmount + users[child].teamTotalPerformance;
            totalP = totalP + p;
            if(p > maxP) maxP = p;
        }
        
        return (user.teamTotalPerformance, maxP, totalP - maxP, directReferralsCount);
    }
    
    /**
     * @dev 获取全局统计数据
     */
    function getGlobalStats() external view returns (
        uint256 totalStakedUsdt,
        uint256 totalOrders,
        uint256 totalGenesisNodesCount,
        uint256 currentHafPrice,
        uint256 contractUsdtBalance,
        uint256 contractHafBalance,
        GlobalStatistics memory statistics
    ) {
        totalOrders = orders.length;
        totalGenesisNodesCount = genesisNodes.length;
        currentHafPrice = hafPrice;
        contractUsdtBalance = usdtToken.balanceOf(address(this));
        contractHafBalance = IERC20(address(this)).balanceOf(address(this)); // 使用 IERC20 接口
        
        // 计算当前活跃质押金额(未完成订单)
        uint256 activeStakedUsdt = 0;
        for (uint i = 0; i < orders.length; i++) {
            if (!orders[i].isCompleted) {
                activeStakedUsdt = activeStakedUsdt + orders[i].amount;
            }
        }
        
        statistics = globalStats;
        
        return (activeStakedUsdt, totalOrders, totalGenesisNodesCount, currentHafPrice, contractUsdtBalance, contractHafBalance, statistics);
    }

    /**
     * @dev 检查地址是否有待审核的申请
     */
    function isApplicationPending(address _user) external view returns (bool) {
        return genesisNodeApplications[_user];
    }
    
    /**
     * @dev 获取活跃创世节点列表
     */
    function getActiveGenesisNodes() external view returns (address[] memory) {
        return activeGenesisNodes;
    }
    
    /**
     * @dev 获取所有创世节点（包括已出局的）
     */
    function getAllGenesisNodes() external view returns (address[] memory) {
        return genesisNodes;
    }

    // ========================================
    // 算力中心查询功能
    // ========================================

    /**
     * @dev 获取用户算力信息
     * @return hashPower 当前算力（整数T）
     * @return totalMined 累计挖矿BTC（8位精度）
     * @return available 可提现BTC（8位精度）
     * @return btcAddress BTC地址
     */
    function getUserHashPowerInfo(address _user) external view returns (
        uint256 hashPower,
        uint256 totalMined,
        uint256 available,
        string memory btcAddress
    ) {
        UserHashPower storage userHP = userHashPowers[_user];
        hashPower = _getCurrentHashPower(_user);
        totalMined = userHP.totalMinedBtc;
        btcAddress = userHP.btcWithdrawalAddress;
        available = _calcAvailableBtc(_user);
    }

    /**
     * @dev 计算可提现BTC
     */
    function _calcAvailableBtc(address _user) internal view returns (uint256) {
        UserHashPower storage userHP = userHashPowers[_user];
        uint256 todayDate = _alignToUtc8Date(block.timestamp);
        uint256 pending = 0;
        
        if (userHP.lastSettleDate > 0 && userHP.lastSettleDate < todayDate) {
            for (uint256 date = userHP.lastSettleDate; date < todayDate; date += 1 days) {
                DailyBtcOutput storage day = dailyBtcOutputs[date];
                if (day.btcAmount > 0 && day.totalHashPower > 0) {
                    uint256 userPower = _getUserHashPowerAtDate(_user, date);
                    if (userPower > 0) {
                        pending += (day.btcAmount * userPower) / day.totalHashPower;
                    }
                }
            }
        }
        return userHP.totalMinedBtc + pending - userHP.withdrawnBtc;
    }

    /**
     * @dev 获取BTC提现订单
     * @param _user 地址过滤：
     *              - address(0)：返回所有订单（管理员用）
     *              - address(1)：返回待审核订单（管理员用）
     *              - 其他地址：返回该用户的订单
     */
    function getBtcWithdrawalOrders(address _user) external view returns (BtcWithdrawalOrder[] memory) {
        if (_user == address(0)) {
            // 返回所有订单
            return btcWithdrawalOrders;
        } else if (_user == address(1)) {
            // 返回待审核订单
            uint256 count = 0;
            for (uint i = 0; i < btcWithdrawalOrders.length; i++) {
                if (btcWithdrawalOrders[i].status == BtcWithdrawalStatus.Pending) count++;
            }
            
            BtcWithdrawalOrder[] memory pending = new BtcWithdrawalOrder[](count);
            uint256 index = 0;
            for (uint i = 0; i < btcWithdrawalOrders.length; i++) {
                if (btcWithdrawalOrders[i].status == BtcWithdrawalStatus.Pending) {
                    pending[index++] = btcWithdrawalOrders[i];
                }
            }
            return pending;
        } else {
            // 返回指定用户的订单
            uint256 count = 0;
            for (uint i = 0; i < btcWithdrawalOrders.length; i++) {
                if (btcWithdrawalOrders[i].user == _user) count++;
            }
            
            BtcWithdrawalOrder[] memory userOrders = new BtcWithdrawalOrder[](count);
            uint256 index = 0;
            for (uint i = 0; i < btcWithdrawalOrders.length; i++) {
                if (btcWithdrawalOrders[i].user == _user) {
                    userOrders[index++] = btcWithdrawalOrders[i];
                }
            }
            return userOrders;
        }
    }
}

