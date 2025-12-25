// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import "./HashFiStorage.sol";

abstract contract HashFiLogic is HashFiStorage {

    modifier autoUpdatePrice() {
        if (autoPriceUpdateEnabled) {
            uint256 daysPassed = (block.timestamp - lastPriceUpdateTime) / TIME_UNIT;
            if (daysPassed > 0) {
                for (uint i = 0; i < daysPassed; i++) {
                    uint256 increase = (hafPrice * dailyPriceIncreaseRate) / 1000;
                    hafPrice = hafPrice + increase;
                }
                lastPriceUpdateTime = lastPriceUpdateTime + (daysPassed * TIME_UNIT);
            }
        }
        _;
    }

    function _settleUserRewards(address _user) internal {
        uint256[] memory orderIds = users[_user].orderIds;
        for (uint i = 0; i < orderIds.length; i++) {
            _settleStaticRewardForOrder(orderIds[i]);
        }

        if (users[_user].isGenesisNode) {
            _settleGenesisRewardForNode(_user);
        }
    }

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
            actualBaseReleaseHaf = order.totalQuotaHaf - order.releasedHaf;
            if (baseTotalReleaseHaf > 0) {
                actualBaseReleaseUsdt = (baseTotalReleaseUsdt * actualBaseReleaseHaf) / baseTotalReleaseHaf;
            }
            order.isCompleted = true;
            
            globalStats.totalCompletedOrders = globalStats.totalCompletedOrders + 1;
        }
        
        uint256 userActualReleaseHaf = (actualBaseReleaseHaf * 90) / 100;
        uint256 userActualReleaseUsdt = (actualBaseReleaseUsdt * 90) / 100;
        order.releasedHaf = order.releasedHaf + userActualReleaseHaf;
        order.releasedQuota = order.releasedQuota + userActualReleaseUsdt;
        
        uint256 accelerationBonus = teamLevels[user.teamLevel].accelerationBonus;
        uint256 accelerationReleaseUsdt = 0;
        uint256 accelerationReleaseHaf = 0;
        
        if (accelerationBonus > 0 && !order.isCompleted) {
            accelerationReleaseUsdt = (actualBaseReleaseUsdt * accelerationBonus) / 100;
            accelerationReleaseHaf = (actualBaseReleaseHaf * accelerationBonus) / 100;
        }
        
        if (actualBaseReleaseUsdt > 0) {
            uint256 userBasePart = (actualBaseReleaseUsdt * 90) / 100;
            uint256 genesisPart = actualBaseReleaseUsdt - userBasePart;
            
            if (genesisPart > 0) {
                globalGenesisPool = globalGenesisPool + genesisPart;
                
                uint256 activeNodesCount = activeGenesisNodes.length;
                if (activeNodesCount > 0) {
                    accGenesisRewardPerNode = accGenesisRewardPerNode + (genesisPart * 1e18) / activeNodesCount;
                }
            }
            
            uint256 baseStaticHaf = (actualBaseReleaseHaf * 90) / 100;
            _addRewardRecord(order.user, address(0), RewardType.Static, userBasePart, baseStaticHaf);
            
            user.totalStaticOutput = user.totalStaticOutput + userBasePart;
            _distributeShareRewards(order.user, userBasePart);
        }
        
        if (accelerationReleaseUsdt > 0) {
            uint256 teamBonusUsdt = (accelerationReleaseUsdt * 90) / 100;
            uint256 teamGenesisUsdt = accelerationReleaseUsdt - teamBonusUsdt; // 10%给创世节点
            
            if (teamGenesisUsdt > 0) {
                globalGenesisPool = globalGenesisPool + teamGenesisUsdt;
                
                uint256 activeNodesCount = activeGenesisNodes.length;
                if (activeNodesCount > 0) {
                    accGenesisRewardPerNode = accGenesisRewardPerNode + (teamGenesisUsdt * 1e18) / activeNodesCount;
                }
            }
            
            uint256 teamBonusHaf = (accelerationReleaseHaf * 90) / 100;
            _addRewardRecord(order.user, address(0), RewardType.Team, teamBonusUsdt, teamBonusHaf);
        }
    }

    function _settleGenesisRewardForNode(address _node) internal {
        User storage nodeUser = users[_node];
        uint256 maxDividend = genesisNodeCost * GENESIS_NODE_EXIT_MULTIPLIER;
        
        if (nodeUser.genesisDividendsWithdrawn >= maxDividend && !isActiveGenesisNode[_node]) {
            return;
        }

        uint256 pending = 0;
        if (accGenesisRewardPerNode > nodeUser.genesisRewardDebt) {
            pending = (accGenesisRewardPerNode - nodeUser.genesisRewardDebt) / 1e18;
        }
        
        if (pending > 0) {
            uint256 actualClaim = pending;
            
            uint256 afterClaimTotal = nodeUser.genesisDividendsWithdrawn + pending;
            if (afterClaimTotal > maxDividend) {
                actualClaim = maxDividend - nodeUser.genesisDividendsWithdrawn;
            }

            if (actualClaim > 0) {
                uint256 actualClaimHaf = (actualClaim * PRICE_PRECISION) / hafPrice;
                _addRewardRecord(_node, address(0), RewardType.Genesis, actualClaim, actualClaimHaf);
            }
            
            nodeUser.genesisDividendsWithdrawn = nodeUser.genesisDividendsWithdrawn + actualClaim;
            globalGenesisPool = globalGenesisPool - actualClaim;
            
            if (nodeUser.genesisDividendsWithdrawn >= maxDividend) {
                _removeActiveGenesisNode(_node);
            }
        }
        
        nodeUser.genesisRewardDebt = accGenesisRewardPerNode;
    }

    function _removeActiveGenesisNode(address _node) internal {
        if (!isActiveGenesisNode[_node]) return;
        
        isActiveGenesisNode[_node] = false;
        
        for (uint i = 0; i < activeGenesisNodes.length; i++) {
            if (activeGenesisNodes[i] == _node) {
                activeGenesisNodes[i] = activeGenesisNodes[activeGenesisNodes.length - 1];
                activeGenesisNodes.pop();
                break;
            }
        }
    }

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

    function _updateAncestorsPerformanceAndRewards(address _user, uint256 _amount, uint8 _level) internal {
        address currentUser = _user;
        address referrer = users[currentUser].referrer;

        uint256[] memory directRewardRates = _getDirectRewardRates();
        for (uint i = 0; i < 6 && referrer != address(0); i++) {
            uint8 referrerLevel = getUserHighestLevel(referrer);
            uint256 receivableAmount = _calculateBurnableAmount(_amount, _level, referrerLevel);
            uint256 actualRewardUsdt = (receivableAmount * directRewardRates[i]) / 100;
            
            if(actualRewardUsdt > 0) {
                uint256 rewardHaf = (actualRewardUsdt * PRICE_PRECISION) / hafPrice;
                User storage referrerUser = users[referrer];
                
                _updateDirectRewardRelease(referrer);
                
                referrerUser.directRewardTotal = referrerUser.directRewardTotal + rewardHaf;
                
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

    function _updateDirectRewardRelease(address _user) internal {
        User storage user = users[_user];
        
        if (user.directRewardTotal <= user.directRewardReleased) {
            user.lastDirectUpdateTime = block.timestamp;
            return;
        }
        
        if (user.lastDirectUpdateTime == 0) {
            user.lastDirectUpdateTime = block.timestamp;
            return;
        }
        
        uint256 totalReleasePeriods = DYNAMIC_RELEASE_PERIOD / TIME_UNIT;
        
        for (uint i = 0; i < user.directRewardDetails.length; i++) {
            DirectRewardDetail storage detail = user.directRewardDetails[i];
            
            if (detail.releasedAmount >= detail.totalAmount) {
                continue;
            }
            
            uint256 daysSinceStart = (block.timestamp - detail.startTime) / TIME_UNIT;
            
            uint256 shouldReleased;
            if (daysSinceStart >= totalReleasePeriods) {
                shouldReleased = detail.totalAmount;
            } else {
                uint256 dailyRelease = detail.totalAmount / totalReleasePeriods;
                shouldReleased = dailyRelease * daysSinceStart;
                
                if (shouldReleased > detail.totalAmount) {
                    shouldReleased = detail.totalAmount;
                }
            }
            
            detail.releasedAmount = shouldReleased;
        }
        
        uint256 newTotalReleased = 0;
        for (uint i = 0; i < user.directRewardDetails.length; i++) {
            newTotalReleased = newTotalReleased + user.directRewardDetails[i].releasedAmount;
        }
        user.directRewardReleased = newTotalReleased;
        user.lastDirectUpdateTime = block.timestamp;
    }

    function _distributeShareRewards(address _user, uint256 _staticRewardUsdt) internal {
        address currentUser = _user;
        address referrer = users[currentUser].referrer;
        
        for (uint i = 0; i < 10 && referrer != address(0); i++) {
            User storage referrerUser = users[referrer];
            
            uint256 activeDirectCount = 0;
            for (uint j = 0; j < referrerUser.directReferrals.length; j++) {
                if (users[referrerUser.directReferrals[j]].totalStakedAmount > 0) {
                    activeDirectCount++;
                }
            }

            if (activeDirectCount < (i + 1)) {
                currentUser = referrer;
                referrer = users[currentUser].referrer;
                continue;
            }

            uint256 rewardUsdt = (_staticRewardUsdt * 5) / 100;

            if(rewardUsdt > 0){
                uint256 rewardHaf = (rewardUsdt * PRICE_PRECISION) / hafPrice;
                referrerUser.shareRewardTotal = referrerUser.shareRewardTotal + rewardHaf;
                _addRewardRecord(referrer, _user, RewardType.Share, rewardUsdt, rewardHaf);
            }
            
            currentUser = referrer;
            referrer = users[currentUser].referrer;
        }
    }

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
                break;
            }
        }
    }

    function _addRewardRecord(address _user, address _fromUser, RewardType _type, uint256 _usdtAmount, uint256 _hafAmount) internal {
        users[_user].rewardRecords.push(RewardRecord({
            timestamp: block.timestamp,
            fromUser: _fromUser,
            rewardType: _type,
            usdtAmount: _usdtAmount,
            hafAmount: _hafAmount
        }));
    }

    function _distributeHaf(address _recipient, uint256 _amount) internal virtual {
        // This function will be implemented in the main HashFi contract
        // because it needs access to _transfer (from ERC20)
    }

    function _removeFromPendingApplications(address _applicant) internal {
        for (uint i = 0; i < pendingGenesisApplications.length; i++) {
            if (pendingGenesisApplications[i] == _applicant) {
                pendingGenesisApplications[i] = pendingGenesisApplications[pendingGenesisApplications.length - 1];
                pendingGenesisApplications.pop();
                break;
            }
        }
    }

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

    function _calculatePendingDynamic(address _user) internal view returns (uint256) {
        User storage user = users[_user];
        
        uint256 pendingDirect = 0;
        uint256 pendingShare = 0;
        
        if (user.directRewardTotal > 0) {
            uint256 totalReleasePeriods = DYNAMIC_RELEASE_PERIOD / TIME_UNIT;
            
            for (uint i = 0; i < user.directRewardDetails.length; i++) {
                DirectRewardDetail storage detail = user.directRewardDetails[i];
                
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
                
                if (currentReleased > detail.claimedAmount) {
                    pendingDirect = pendingDirect + (currentReleased - detail.claimedAmount);
                }
            }
        }
        
        if (user.shareRewardTotal > user.shareRewardClaimed) {
            pendingShare = user.shareRewardTotal - user.shareRewardClaimed;
        }
        
        return pendingDirect + pendingShare;
    }

    function _calculatePendingGenesis(address _user) internal view returns (uint256) {
        User storage user = users[_user];
        
        if (!user.isGenesisNode) {
            return 0;
        }
        
        uint256 maxDividend = genesisNodeCost * GENESIS_NODE_EXIT_MULTIPLIER;
        if (user.genesisDividendsWithdrawn >= maxDividend) {
            return 0;
        }
        
        uint256 pendingUsdt = 0;
        if (accGenesisRewardPerNode > user.genesisRewardDebt) {
            pendingUsdt = (accGenesisRewardPerNode - user.genesisRewardDebt) / 1e18;
        }
        
        if (user.genesisDividendsWithdrawn + pendingUsdt > maxDividend) {
            pendingUsdt = maxDividend - user.genesisDividendsWithdrawn;
        }
        
        return (pendingUsdt * PRICE_PRECISION) / hafPrice;
    }

    function _getStakingLevelByAmount(uint256 _amount) internal view returns (uint8) {
        for (uint8 i = 1; i <= 4; i++) {
            if (_amount >= stakingLevels[i].minAmount && _amount <= stakingLevels[i].maxAmount) {
                return i;
            }
        }
        return 0;
    }

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

    function _calculateBurnableAmount(uint256 _originalAmount, uint8 _investorLevel, uint8 _referrerLevel) internal view returns (uint256) {
        if (_referrerLevel >= _investorLevel) {
            return _originalAmount;
        }
        
        if (_originalAmount <= stakingLevels[_referrerLevel].maxAmount) {
            return _originalAmount;
        }
        return stakingLevels[_referrerLevel].maxAmount;
    }

    function _getDirectRewardRates() internal pure returns (uint256[] memory) {
        uint256[] memory rates = new uint256[](6);
        rates[0] = 5; rates[1] = 3; rates[2] = 1; rates[3] = 1; rates[4] = 1; rates[5] = 1;
        return rates;
    }

    function _alignToUtc8Date(uint256 timestamp) internal pure returns (uint256) {
        uint256 utc8Time = timestamp + UTC8_OFFSET;
        return (utc8Time / 1 days) * 1 days - UTC8_OFFSET;
    }

    function _getCurrentHashPower(address _user) internal view returns (uint256) {
        HashPowerRecord[] storage records = userHashPowers[_user].records;
        if (records.length == 0) {
            return 0;
        }
        return records[records.length - 1].hashPower;
    }

    function _getUserHashPowerAtDate(address _user, uint256 _date) internal view returns (uint256) {
        HashPowerRecord[] storage records = userHashPowers[_user].records;
        if (records.length == 0) {
            return 0;
        }

        if (_date < records[0].timestamp) {
            return 0;
        }

        uint256 left = 0;
        uint256 right = records.length - 1;
        uint256 result = 0;

        while (left <= right) {
            uint256 mid = (left + right) / 2;
            if (records[mid].timestamp <= _date) {
                result = records[mid].hashPower;
                left = mid + 1;
            } else {
                if (mid == 0) break;
                right = mid - 1;
            }
        }

        return result;
    }

    function _calculateTotalHashPowerAtDate(uint256 /* _date */) internal view returns (uint256) {
        return globalTotalHashPower;
    }

    function _updateGlobalHashPower(int256 _delta) internal {
        if (_delta >= 0) {
            globalTotalHashPower += uint256(uint256(_delta));
        } else {
            globalTotalHashPower -= uint256(uint256(-_delta));
        }
    }

    function _settleBtcRewards(address _user) internal {
        UserHashPower storage userHP = userHashPowers[_user];
        uint256 todayDate = _alignToUtc8Date(block.timestamp);
        
        if (userHP.lastSettleDate == 0) {
            userHP.lastSettleDate = todayDate;
            return;
        }
        if (userHP.lastSettleDate >= todayDate) return;

        uint256 totalReward = 0;
        for (uint256 date = userHP.lastSettleDate; date < todayDate; date += 1 days) {
            DailyBtcOutput storage dayOutput = dailyBtcOutputs[date];
            if (dayOutput.btcAmount == 0 || dayOutput.totalHashPower == 0) continue;

            uint256 userHashPower = _getUserHashPowerAtDate(_user, date);
            if (userHashPower == 0) continue;

            totalReward = totalReward + (dayOutput.btcAmount * userHashPower) / dayOutput.totalHashPower;
        }

        if (totalReward > 0) {
            userHP.totalMinedBtc = userHP.totalMinedBtc + totalReward;
        }
        userHP.lastSettleDate = todayDate;
    }

    function _updateHashPower(address _user, int256 _delta) internal {
        UserHashPower storage userHP = userHashPowers[_user];
        uint256 today = _alignToUtc8Date(block.timestamp);
        uint256 currentPower = _getCurrentHashPower(_user);
        
        uint256 newPower = _delta >= 0 
            ? currentPower + uint256(uint256(_delta))
            : currentPower - uint256(uint256(-_delta));

        _updateGlobalHashPower(_delta);

        if (userHP.records.length > 0 && userHP.records[userHP.records.length - 1].timestamp == today) {
            userHP.records[userHP.records.length - 1].hashPower = newPower;
        } else {
            userHP.records.push(HashPowerRecord(today, newPower));
        }
    }
}

