// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./HashFiAdmin.sol";
import "./HashFiView.sol";

contract HashFi is HashFiAdmin, HashFiView, ERC20, ReentrancyGuard, Pausable {

    constructor(address _usdtAddress, address _initialOwner) 
        ERC20("Hash Fi Token", "HAF") 
        Ownable(_initialOwner) 
    {
        _mint(address(this), TOTAL_SUPPLY);

        usdtToken = IERC20(_usdtAddress);
        hafPrice = 1 * PRICE_PRECISION;
        lastPriceUpdateTime = block.timestamp;


        TIME_UNIT = 1 days; // 主网: 1天
        DYNAMIC_RELEASE_PERIOD = 100 days; // 主网: 100天


        stakingLevels[1] = StakingLevelInfo(100 * 1e18, 499 * 1e18, 150, 70);
        stakingLevels[2] = StakingLevelInfo(500 * 1e18, 999 * 1e18, 200, 80);
        stakingLevels[3] = StakingLevelInfo(1000 * 1e18, 2999 * 1e18, 250, 90);
        stakingLevels[4] = StakingLevelInfo(3000 * 1e18, type(uint256).max, 300, 100);

        teamLevels.push(TeamLevelInfo(0, 0)); // V0
        teamLevels.push(TeamLevelInfo(5000 * 1e18, 5)); // V1
        teamLevels.push(TeamLevelInfo(20000 * 1e18, 10)); // V2
        teamLevels.push(TeamLevelInfo(100000 * 1e18, 15)); // V3
        teamLevels.push(TeamLevelInfo(300000 * 1e18, 20)); // V4
        teamLevels.push(TeamLevelInfo(1000000 * 1e18, 25));// V5
    }

    function bindReferrer(address _referrer) external whenNotPaused {
        User storage user = users[msg.sender];
        if (user.referrer != address(0)) revert ReferrerAlreadyBound();
        
        if (msg.sender == owner()) {
            user.referrer = address(0x0000000000000000000000000000000000000001);
            return;
        }

        if (users[_referrer].totalStakedAmount == 0 || _referrer == address(0)) revert ReferrerNotExist();
        if (_referrer == msg.sender) revert CannotReferSelf();
        user.referrer = _referrer;
        users[_referrer].directReferrals.push(msg.sender);
    }


    function stake(uint256 _amount) external nonReentrant whenNotPaused autoUpdatePrice {
        if (users[msg.sender].referrer == address(0)) revert MustBindReferrer();
        uint8 level = _getStakingLevelByAmount(_amount);
        if (level == 0) revert InvalidStakingAmount();

        usdtToken.transferFrom(msg.sender, address(this), _amount);

        uint256 orderId = orders.length;
        uint256 baseQuota = (_amount * stakingLevels[level].multiplier) / 100;
        
        uint256 quota = (baseQuota * 90) / 100;
        uint256 quotaHaf = (quota * PRICE_PRECISION) / hafPrice;
        
        orders.push(Order(orderId, msg.sender, level, _amount, quota, 0, quotaHaf, 0, block.timestamp, block.timestamp, false));
        User storage user = users[msg.sender];
        user.orderIds.push(orderId);
        user.totalStakedAmount = user.totalStakedAmount + _amount;

        globalStats.totalDepositedUsdt = globalStats.totalDepositedUsdt + _amount;
        if (user.orderIds.length == 1) {
            globalStats.totalActiveUsers = globalStats.totalActiveUsers + 1;
        }

        _updateAncestorsPerformanceAndRewards(msg.sender, _amount, level);
    }

    function applyForGenesisNode() external nonReentrant whenNotPaused {
        User storage user = users[msg.sender];
        if (user.isGenesisNode) revert AlreadyGenesisNode();
        if (genesisNodeApplications[msg.sender]) revert ApplicationPending();

        usdtToken.transferFrom(msg.sender, address(this), genesisNodeCost);
        
        genesisNodeApplications[msg.sender] = true;
        pendingGenesisApplications.push(msg.sender);
    }

    function withdraw() external nonReentrant whenNotPaused autoUpdatePrice {
        _updateDirectRewardRelease(msg.sender);
        (uint256 pendingStaticHaf, uint256 pendingDynamicHaf, uint256 pendingGenesisHaf) = getClaimableRewards(msg.sender);
        
        _settleUserRewards(msg.sender);
        uint256 totalClaimableHaf = pendingStaticHaf + pendingDynamicHaf + pendingGenesisHaf;
        if (totalClaimableHaf == 0) revert NoRewards();

        User storage user = users[msg.sender];
        
        uint256 totalPendingDirect = 0;
        if (user.directRewardTotal > user.directRewardClaimed) {
            if (user.directRewardReleased > user.directRewardClaimed) {
                for (uint i = 0; i < user.directRewardDetails.length; i++) {
                    DirectRewardDetail storage detail = user.directRewardDetails[i];
                    
                    if (detail.releasedAmount > detail.claimedAmount) {
                        uint256 claimFromThis = detail.releasedAmount - detail.claimedAmount;
                        
                        uint256 usdtAmount = (claimFromThis * hafPrice) / PRICE_PRECISION;
                        _addRewardRecord(msg.sender, detail.fromUser, RewardType.Direct, usdtAmount, claimFromThis);
                        
                        detail.claimedAmount = detail.releasedAmount;
                        totalPendingDirect = totalPendingDirect + claimFromThis;
                    }
                }
            }
        }
        
        uint256 pendingShare = 0;
        if (user.shareRewardTotal > user.shareRewardClaimed) {
            pendingShare = user.shareRewardTotal - user.shareRewardClaimed;
        }
        
        user.directRewardClaimed = user.directRewardClaimed + totalPendingDirect;
        user.shareRewardClaimed = user.shareRewardClaimed + pendingShare;
       
        uint256 fee = (totalClaimableHaf * withdrawalFeeRate) / 100;
        uint256 amountAfterFee = totalClaimableHaf - fee;
        
        _updateOrderSettleTimes(msg.sender);

        _distributeHaf(msg.sender, amountAfterFee);

        globalStats.totalWithdrawnHaf = globalStats.totalWithdrawnHaf + amountAfterFee;
        globalStats.totalFeeCollectedHaf = globalStats.totalFeeCollectedHaf + fee;

        user.withdrawRecords.push(WithdrawRecord({
            timestamp: block.timestamp,
            hafAmount: amountAfterFee,
            fee: fee
        }));
    }

    function swap(address _tokenIn, uint256 _amountIn) external nonReentrant whenNotPaused autoUpdatePrice {
        if (_amountIn == 0) revert InvalidAmount();
        
        address _tokenOut;
        uint256 _amountOut;

        if (_tokenIn == address(usdtToken)) {
            _tokenOut = address(this);
            
            usdtToken.transferFrom(msg.sender, address(this), _amountIn);
            
            uint256 hafAmount = (_amountIn * PRICE_PRECISION) / hafPrice;
            uint256 fee = (hafAmount * swapFeeRate) / 100;
            _amountOut = hafAmount - fee;
            
            _distributeHaf(msg.sender, _amountOut);

        } else if (_tokenIn == address(this)) {
            _tokenOut = address(usdtToken);

            _transfer(msg.sender, address(this), _amountIn);
            
            uint256 usdtAmount = (_amountIn * hafPrice) / PRICE_PRECISION;
            uint256 fee = (usdtAmount * swapFeeRate) / 100;
            _amountOut = usdtAmount - fee;
            
            if (usdtToken.balanceOf(address(this)) < _amountOut) revert InsufficientBalance();
            usdtToken.transfer(msg.sender, _amountOut);
            
        } else {
            revert("Invalid swap token");
        }
    }

    function _distributeHaf(address _recipient, uint256 _amount) internal override {
        uint256 treasuryBalance = balanceOf(address(this));
        if (treasuryBalance < _amount) revert InsufficientBalance();
        _transfer(address(this), _recipient, _amount);
        globalStats.totalHafDistributed = globalStats.totalHafDistributed + _amount;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setBtcAddress(string calldata _addr) external whenNotPaused {
        if (bytes(_addr).length == 0) revert InvalidAddress();
        userHashPowers[msg.sender].btcWithdrawalAddress = _addr;
    }

    function withdrawBtc(uint256 _amount) external nonReentrant whenNotPaused {
        if (_amount < minBtcWithdrawal) revert BelowMinimum();
        if (bytes(userHashPowers[msg.sender].btcWithdrawalAddress).length == 0) revert AddressNotSet();
        
        _settleBtcRewards(msg.sender);
        UserHashPower storage userHP = userHashPowers[msg.sender];
        
        uint256 available = _calcAvailableBtc(msg.sender);
        if (available < _amount) revert InsufficientBalance();
        
        
        uint256 orderId = btcWithdrawalOrders.length;
        btcWithdrawalOrders.push(BtcWithdrawalOrder(
            orderId,
            msg.sender,
            userHP.btcWithdrawalAddress,
            _amount,
            block.timestamp,
            BtcWithdrawalStatus.Pending
        ));
    }
}

