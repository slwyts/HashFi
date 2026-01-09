// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IHAFToken} from "./HAFToken.sol";


abstract contract HashFiStorage is Ownable {

    IERC20 internal usdtToken;
    IHAFToken public hafToken;

    uint256 internal constant PRICE_PRECISION = 1e18;
    uint256 internal constant GENESIS_NODE_EXIT_MULTIPLIER = 3;

    error InvalidAddress();
    error InvalidAmount();
    error ReferrerAlreadyBound();
    error ReferrerNotExist();
    error CannotReferSelf();
    error MustBindReferrer();
    error InvalidStakingAmount();
    error AlreadyGenesisNode();
    error ApplicationPending();
    error NoRewards();
    error BelowMinimum();
    error AddressNotSet();
    error InsufficientBalance();
    error InvalidOrder();
    error AlreadyProcessed();
    error NoPendingApplication();
    error NotGenesisNode();
    error InvalidLevel();
    error InvalidFeeRate();
    error LpNotInitialized();

    enum RewardType { Static, Direct, Share, Team, Genesis }
    enum BtcWithdrawalStatus { Pending, Approved, Rejected }

    struct RewardRecord {
        uint256 timestamp;
        address fromUser;
        RewardType rewardType;
        uint256 usdtAmount;
        uint256 hafAmount;
    }

    struct HashPowerRecord {
        uint256 timestamp;
        uint256 hashPower;
    }

    struct DailyBtcOutput {
        uint256 date;
        uint256 btcAmount;
        uint256 totalHashPower;
    }

    struct BtcWithdrawalOrder {
        uint256 orderId;
        address user;
        string btcAddress;
        uint256 amount;
        uint256 timestamp;
        BtcWithdrawalStatus status;
    }

    struct UserHashPower {
        HashPowerRecord[] records;
        uint256 totalMinedBtc;
        uint256 withdrawnBtc;
        uint256 lastSettleDate;
        string btcWithdrawalAddress;
    }
    
    struct WithdrawRecord {
        uint256 timestamp;
        uint256 hafAmount;
        uint256 fee;
    }

    struct DirectRewardDetail {
        address fromUser;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 claimedAmount;
        uint256 startTime;
    }

    struct User {
        address referrer;
        uint8 teamLevel;
        uint256 totalStakedAmount;
        uint256 teamTotalPerformance;
        address[] directReferrals;
        uint256[] orderIds;

        bool isGenesisNode;
        uint256 genesisDividendsWithdrawn;
        uint256 genesisRewardDebt;

        uint256 directRewardTotal;
        uint256 directRewardReleased;
        uint256 lastDirectUpdateTime;
        uint256 directRewardClaimed;
        DirectRewardDetail[] directRewardDetails;

        uint256 shareRewardTotal;
        uint256 shareRewardClaimed;

        uint256 totalStaticOutput;
        
        RewardRecord[] rewardRecords;
        WithdrawRecord[] withdrawRecords;
    }

    struct Order {
        uint256 id;
        address user;
        uint8 level;
        uint256 amount;
        uint256 totalQuota;
        uint256 releasedQuota;
        uint256 totalQuotaHaf;
        uint256 releasedHaf;
        uint256 startTime;
        uint256 lastSettleTime;
        bool isCompleted;
    }

    struct StakingLevelInfo {
        uint256 minAmount;
        uint256 maxAmount;
        uint256 multiplier;
        uint256 dailyRate;
    }

    struct TeamLevelInfo {
        uint256 requiredPerformance;
        uint256 accelerationBonus;
    }
    
    struct GlobalStatistics {
        uint256 totalDepositedUsdt;
        uint256 totalWithdrawnHaf;
        uint256 totalFeeCollectedHaf;
        uint256 totalHafDistributed;
        uint256 totalActiveUsers;
        uint256 totalCompletedOrders;
    }

    struct TeamMemberInfo {
        address memberAddress;
        uint8 teamLevel;
        uint256 totalStakedAmount;
        uint256 teamTotalPerformance;
    }

    mapping(address => User) public users;
    Order[] public orders;
    uint256 internal constant UTC8_OFFSET = 8 hours;
    uint256 internal constant BTC_PRECISION = 1e8;
    mapping(address => UserHashPower) internal userHashPowers;

    mapping(uint256 => DailyBtcOutput) public dailyBtcOutputs;
    
    BtcWithdrawalOrder[] public btcWithdrawalOrders;
    
    uint256 public minBtcWithdrawal = 0.001 * 1e8;
    uint256 private constant BTC_WITHDRAWAL_FEE_RATE = 5;
    uint256 public globalTotalHashPower;

    // hafPrice removed - now use hafToken.getPrice()
    uint256 public withdrawalFeeRate = 5;

    // Removed: swapFeeRate, lastPriceUpdateTime, dailyPriceIncreaseRate, autoPriceUpdateEnabled
    
    uint256 public TIME_UNIT;
    uint256 public DYNAMIC_RELEASE_PERIOD;

    mapping(uint8 => StakingLevelInfo) public stakingLevels;
    TeamLevelInfo[] public teamLevels;

    uint256 public genesisNodeCost = 5000 * 1e18;
    uint256 public globalGenesisPool;
    uint256 public accGenesisRewardPerNode;
    uint256 internal totalGenesisShares;
    address[] internal genesisNodes;
    address[] internal activeGenesisNodes;
    address[] internal pendingGenesisApplications;
    mapping(address => bool) public genesisNodeApplications; 
    mapping(address => bool) public isActiveGenesisNode;
    
    GlobalStatistics public globalStats;
}
