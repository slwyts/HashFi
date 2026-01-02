// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {HashFiLogic} from "./HashFiLogic.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract HashFiAdmin is HashFiLogic {

    function approveGenesisNode(address _applicant) external onlyOwner {
        if (!genesisNodeApplications[_applicant]) revert NoPendingApplication();
        User storage user = users[_applicant];
        if (user.isGenesisNode) revert AlreadyGenesisNode();
        
        genesisNodeApplications[_applicant] = false;
        _removeFromPendingApplications(_applicant);
        
        user.isGenesisNode = true;
        genesisNodes.push(_applicant);
        
        activeGenesisNodes.push(_applicant);
        isActiveGenesisNode[_applicant] = true;
        
        user.genesisRewardDebt = accGenesisRewardPerNode;
    }
    
    function rejectGenesisNode(address _applicant) external onlyOwner {
        if (!genesisNodeApplications[_applicant]) revert NoPendingApplication();
        
        genesisNodeApplications[_applicant] = false;
        _removeFromPendingApplications(_applicant);
    }

    // function setHafPrice(uint256 _newPrice) external onlyOwner {
    //     if (_newPrice == 0) revert InvalidAmount();
    //     hafPrice = _newPrice;
    //     lastPriceUpdateTime = block.timestamp;
    // }

    // function setDailyPriceIncreaseRate(uint256 _rate) external onlyOwner {
    //     if (_rate > 100) revert InvalidFeeRate();
    //     dailyPriceIncreaseRate = _rate;
    // }

    // function setAutoPriceUpdate(bool _enabled) external onlyOwner {
    //     autoPriceUpdateEnabled = _enabled;
    // }

    function setWithdrawalFee(uint256 _newFeeRate) external onlyOwner {
        if (_newFeeRate > 100) revert InvalidFeeRate();
        withdrawalFeeRate = _newFeeRate;
    }

    function setGenesisNodeCost(uint256 _newCost) external onlyOwner {
        if (_newCost == 0) revert InvalidAmount();
        genesisNodeCost = _newCost;
    }

    // function setSwapFee(uint256 _newFeeRate) external onlyOwner {
    //     if (_newFeeRate > 100) revert InvalidFeeRate();
    //     swapFeeRate = _newFeeRate;
    // }

    function forceSettleUser(address _user) external onlyOwner {
        _settleUserRewards(_user);
    }

    function setUserTeamLevel(address _user, uint8 _level) external onlyOwner {
        if (_level > 5) revert InvalidLevel();
        users[_user].teamLevel = _level;
    }
    
    function emergencyWithdrawToken(address _tokenAddress, uint256 _amount) external onlyOwner {
        IERC20 token = IERC20(_tokenAddress);
        token.transfer(owner(), _amount);
    }

    function getAllGenesisNodesInfo() external view onlyOwner returns (
        address[] memory nodes,
        uint256[] memory totalDividends,
        uint256[] memory withdrawn
    ) {
        uint256 length = genesisNodes.length;
        nodes = new address[](length);
        totalDividends = new uint256[](length);
        withdrawn = new uint256[](length);
        
        uint256 maxDividend = genesisNodeCost * GENESIS_NODE_EXIT_MULTIPLIER;
        
        for (uint i = 0; i < length; i++) {
            nodes[i] = genesisNodes[i];
            totalDividends[i] = maxDividend;
            withdrawn[i] = users[genesisNodes[i]].genesisDividendsWithdrawn;
        }
        
        return (nodes, totalDividends, withdrawn);
    }

    function getPendingGenesisApplications() external view onlyOwner returns (address[] memory) {
        return pendingGenesisApplications;
    }

    function updateHashPower(address _user, int256 _delta) external onlyOwner {
        if (_user == address(0)) revert InvalidAddress();
        _settleBtcRewards(_user);
        _updateHashPower(_user, _delta);
    }

    function setDailyBtcOutput(uint256 _date, uint256 _btcAmount) external onlyOwner {
        uint256 alignedDate = _alignToUtc8Date(_date);
        uint256 totalHashPower = _calculateTotalHashPowerAtDate(alignedDate);
        dailyBtcOutputs[alignedDate] = DailyBtcOutput(alignedDate, _btcAmount, totalHashPower);
    }

    function processBtcWithdrawal(uint256 _orderId, bool _approved) external onlyOwner {
        if (_orderId >= btcWithdrawalOrders.length) revert InvalidOrder();
        BtcWithdrawalOrder storage order = btcWithdrawalOrders[_orderId];
        if (order.status != BtcWithdrawalStatus.Pending) revert AlreadyProcessed();
        
        if (_approved) {
            order.status = BtcWithdrawalStatus.Approved;
            userHashPowers[order.user].withdrawnBtc += order.amount;
        } else {
            order.status = BtcWithdrawalStatus.Rejected;
        }
    }

    function setMinBtcWithdrawal(uint256 _minAmount) external onlyOwner {
        if (_minAmount == 0) revert InvalidAmount();
        minBtcWithdrawal = _minAmount;
    }

}
