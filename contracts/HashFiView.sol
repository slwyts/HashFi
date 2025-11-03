// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./HashFiLogic.sol";

abstract contract HashFiView is HashFiLogic {

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

    function getOrderInfo(uint256 _orderId) external view returns (Order memory) {
        return orders[_orderId];
    }

    function getClaimableRewards(address _user) public view returns (uint256 pendingStatic, uint256 pendingDynamic, uint256 pendingGenesis) {
        pendingStatic = _calculatePendingStatic(_user);
        pendingDynamic = _calculatePendingDynamic(_user);
        pendingGenesis = _calculatePendingGenesis(_user);
    }

    function getUserOrders(address _user) external view returns (Order[] memory) {
        uint256[] memory orderIds = users[_user].orderIds;
        Order[] memory userOrders = new Order[](orderIds.length);
        for(uint i = 0; i < orderIds.length; i++) {
            userOrders[i] = orders[orderIds[i]];
        }
        return userOrders;
    }

    function getUserRewardRecords(address _user) external view returns (RewardRecord[] memory) {
        return users[_user].rewardRecords;
    }

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

    function getOrderPendingReward(uint256 _orderId) external view returns (uint256 pendingUsdt, uint256 pendingHaf) {
        Order storage order = orders[_orderId];
        if (order.isCompleted) {
            return (0, 0);
        }

        User storage user = users[order.user];
        uint256 daysPassed = (block.timestamp - order.lastSettleTime) / TIME_UNIT;
        if (daysPassed == 0) return (0, 0);

        uint256 baseDailyRate = stakingLevels[order.level].dailyRate;
        uint256 dailyReleaseUsdt = (order.amount * baseDailyRate) / 10000;
        uint256 dailyReleaseHaf = (dailyReleaseUsdt * PRICE_PRECISION) / hafPrice;
        
        uint256 baseTotalReleaseHaf = dailyReleaseHaf * daysPassed;
        uint256 baseTotalReleaseUsdt = dailyReleaseUsdt * daysPassed;
        
        uint256 actualReleaseHaf = baseTotalReleaseHaf;
        uint256 actualReleaseUsdt = baseTotalReleaseUsdt;
        
        if (order.releasedHaf + baseTotalReleaseHaf >= order.totalQuotaHaf) {
            actualReleaseHaf = order.totalQuotaHaf - order.releasedHaf;
            if (baseTotalReleaseHaf > 0) {
                actualReleaseUsdt = (baseTotalReleaseUsdt * actualReleaseHaf) / baseTotalReleaseHaf;
            }
        }
        
        uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
        uint256 accelerationHaf = 0;
        uint256 accelerationUsdt = 0;
        
        if (accelerationBonus > 0) {
            accelerationHaf = (actualReleaseHaf * accelerationBonus) / 100;
            accelerationUsdt = (actualReleaseUsdt * accelerationBonus) / 100;
        }

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
        contractHafBalance = IERC20(address(this)).balanceOf(address(this));
        
        uint256 activeStakedUsdt = 0;
        for (uint i = 0; i < orders.length; i++) {
            if (!orders[i].isCompleted) {
                activeStakedUsdt = activeStakedUsdt + orders[i].amount;
            }
        }
        
        statistics = globalStats;
        
        return (activeStakedUsdt, totalOrders, totalGenesisNodesCount, currentHafPrice, contractUsdtBalance, contractHafBalance, statistics);
    }

    function isApplicationPending(address _user) external view returns (bool) {
        return genesisNodeApplications[_user];
    }

    function getActiveGenesisNodes() external view returns (address[] memory) {
        return activeGenesisNodes;
    }

    function getAllGenesisNodes() external view returns (address[] memory) {
        return genesisNodes;
    }

    function getUserHashPowerInfo(address _user) external view returns (
        uint256 hashPower,
        uint256 totalMined,
        uint256 available,
        uint256 withdrawn,
        string memory btcAddress
    ) {
        UserHashPower storage userHP = userHashPowers[_user];
        hashPower = _getCurrentHashPower(_user);
        totalMined = userHP.totalMinedBtc;
        withdrawn = userHP.withdrawnBtc;
        btcAddress = userHP.btcWithdrawalAddress;
        available = _calcAvailableBtc(_user);
    }

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

    function getBtcWithdrawalOrders(address _user) external view returns (BtcWithdrawalOrder[] memory) {
        if (_user == address(0)) {
            return btcWithdrawalOrders;
        } else if (_user == address(1)) {
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