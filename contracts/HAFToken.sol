// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IUniswapV2Factory} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Pair} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

interface IHashFiMain {
    function owner() external view returns (address);
    function getActiveGenesisNodesCount() external view returns (uint256);
    function getActiveGenesisNodeAt(uint256 index) external view returns (address);
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
    function withdrawToDefi(address token, uint256 amount) external;
    function advancedFeaturesEnabled() external view returns (bool);
    function setAdvancedFeaturesEnabled(bool enabled) external;
}
contract HAFToken is ERC20, ERC20Permit {
    uint256 public constant TOTAL_SUPPLY = 21_000_000 * 1e18;
    uint256 public constant MIN_SUPPLY = 210_000 * 1e18;
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public constant HOLDER_THRESHOLD = 365 * 1e18;
    uint256 private constant UTC8_OFFSET = 8 hours;
    uint256 private constant BUY_TAX_RATE = 150;
    uint256 private constant SELL_TAX_RATE = 150;
    uint256 private constant TAX_DENOMINATOR = 10000;
    uint256 private constant DAILY_BURN_GENESIS_RATE = 100;
    uint256 private constant DAILY_BURN_COMMUNITY_RATE = 100;
    uint256 private constant DAILY_BURN_HOLDER_RATE = 300;
    uint256 private constant AUTO_BURN_RATE = 20;
    uint256 private constant AUTO_BURN_INTERVAL = 2 hours;
    uint256 private constant MIN_HOLD_DURATION = 24 hours;
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    address public immutable defiContract;
    address internal immutable usdtToken;
    address public pancakePair;
    address public pancakeFactory;
    address public pancakeRouter;
    TaxVault public taxVault;
    uint256 internal accumulatedBuyTax;
    uint256 internal lastDailyBurnTime;
    uint256 internal lastAutoBurnTime;
    address[] internal eligibleHolders;
    mapping(address => bool) internal isEligibleHolder;
    mapping(address => uint256) internal holderIndex;
    uint256 internal holderDividendPool;
    uint256 internal accDividendPerWeight;
    mapping(address => uint256) internal holderDividendDebt;
    mapping(address => uint256) internal holderClaimedDividend;
    mapping(address => bool) public isTaxExempt;
    mapping(address => uint256) internal holderThresholdTimestamp;
    uint256 public processIndex;
    uint256 public constant PROCESS_GAS_LIMIT = 6000000;
    bool private transient _isExecutingMechanism;
    bool public advancedFeaturesEnabled = true;
    error LpNotInitialized();
    error InvalidAddress();
    error BurnLimitReached();
    error OnlyDefiContract();
    event DailyBurnExecuted(
        uint256 genesisAmount,
        uint256 communityAmount,
        uint256 holderAmount,
        uint256 timestamp
    );
    event AutoBurnExecuted(
        uint256 amount,
        uint256 timestamp
    );
    event BuyTaxDistributed(
        uint256 hafAmount,
        uint256 usdtValue
    );
    event SellTaxCollected(
        uint256 amount,
        address to
    );
    event HolderDividendClaimed(
        address indexed holder,
        uint256 amount
    );
    event LpInitialized(
        address pair,
        uint256 hafAmount,
        uint256 usdtAmount
    );
    event PriceUpdated(
        uint256 newPrice
    );
    event AdvancedFeaturesToggled(
        bool enabled,
        uint256 timestamp
    );
    modifier onlyDefi() {
        if (msg.sender != defiContract) revert OnlyDefiContract();
        _;
    }
    modifier triggerMechanisms() {
        _triggerLazyMechanisms();
        _;
    }
    constructor(
        address _usdtToken,
        address _defiContract,
        address _factory,
        address _router
    ) ERC20("HashFi", "HAF") ERC20Permit("HashFi") {
        usdtToken = _usdtToken;
        defiContract = _defiContract;
        if (_factory != address(0)) {
            pancakeFactory = _factory;
            pancakeRouter = _router;
        } else if (block.chainid == 56) {
            pancakeFactory = 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73;
            pancakeRouter = 0x10ED43C718714eb63d5aA57B78B54704E256024E;
        } else if (block.chainid == 97) {
            pancakeFactory = 0x6725F303b657a9451d8BA641348b6761A6CC7a17;
            pancakeRouter = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;
        } else {
            revert("Factory address required for this chain");
        }
        _mint(address(this), TOTAL_SUPPLY);
        taxVault = new TaxVault();
        isTaxExempt[address(this)] = true;
        isTaxExempt[address(taxVault)] = true;
        isTaxExempt[_defiContract] = true;
        isTaxExempt[DEAD_ADDRESS] = true;
        isTaxExempt[address(0)] = true;
        pancakePair = IUniswapV2Factory(pancakeFactory).createPair(address(this), usdtToken);
        lastDailyBurnTime = _alignToUtc8Morning(block.timestamp);
        lastAutoBurnTime = block.timestamp;
    }

    function isLpInitialized() public view returns (bool) {
        return balanceOf(pancakePair) > 0;
    }
    
    function addLiquidity(uint256 _usdtAmount, uint256 _hafAmount) external onlyDefi {
        require(_usdtAmount > 0 || _hafAmount > 0, "Invalid amounts");
        
        if (_usdtAmount > 0) {
            IERC20(usdtToken).transferFrom(defiContract, pancakePair, _usdtAmount);
        }
        if (_hafAmount > 0) {
            uint256 hafBalance = balanceOf(address(this));
            if (hafBalance >= _hafAmount) {
                _transfer(address(this), pancakePair, _hafAmount);
            } else {
                if (hafBalance > 0) {
                    _transfer(address(this), pancakePair, hafBalance);
                }
                uint256 shortage = _hafAmount - hafBalance;
                transferFrom(defiContract, pancakePair, shortage);
            }
        }

        if (_usdtAmount > 0 && _hafAmount > 0) {
            IUniswapV2Pair(pancakePair).mint(address(this));
        } else {
            IUniswapV2Pair(pancakePair).sync();
        }
    }

    function getPrice() public view returns (uint256) {
        if (!isLpInitialized()) {
            return 0 * PRICE_PRECISION;
        }
        IUniswapV2Pair pair = IUniswapV2Pair(pancakePair);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        address token0 = pair.token0();
        if (token0 == address(this)) {
            return (uint256(reserve1) * PRICE_PRECISION) / uint256(reserve0);
        } else {
            return (uint256(reserve0) * PRICE_PRECISION) / uint256(reserve1);
        }
    }

    function getLpHafBalance() public view returns (uint256) {
        if (pancakePair == address(0)) return 0;
        return balanceOf(pancakePair);
    }

    function getLpUsdtBalance() public view returns (uint256) {
        if (pancakePair == address(0)) return 0;
        return IERC20(usdtToken).balanceOf(pancakePair);
    }

    function _update(address from, address to, uint256 amount) internal virtual override {
        if (!advancedFeaturesEnabled) {
            super._update(from, to, amount);
            return;
        }

        if (from != pancakePair && to != pancakePair) {
            _triggerLazyMechanisms();
        }

        bool takeTax = true;
        
        if (isTaxExempt[from] || isTaxExempt[to]) {
            takeTax = false;
        }
        
        if (from != pancakePair && to != pancakePair) {
            takeTax = false;
        }
        
        uint256 taxAmount = 0;
        
        if (takeTax && isLpInitialized()) {
            if (from == pancakePair) {
                taxAmount = (amount * BUY_TAX_RATE) / TAX_DENOMINATOR;
                if (taxAmount > 0) {
                    accumulatedBuyTax += taxAmount;
                    super._update(from, address(this), taxAmount);
                }
            } else if (to == pancakePair) {
                taxAmount = (amount * SELL_TAX_RATE) / TAX_DENOMINATOR;
                if (taxAmount > 0) {
                    address defiOwner = IHashFiMain(defiContract).owner();
                    super._update(from, defiOwner, taxAmount);
                    emit SellTaxCollected(taxAmount, defiOwner);
                }
            }
        }
        
        uint256 transferAmount = amount - taxAmount;
        super._update(from, to, transferAmount);
        
        _updateHolderStatus(from);
        _updateHolderStatus(to);
    }
    
    function _checkAndDistributeBuyTax() internal {
        uint256 genesisCount = IHashFiMain(defiContract).getActiveGenesisNodesCount();
        
        if (genesisCount == 0) return;
        uint256 price = getPrice();
        uint256 taxValueUsdt = (accumulatedBuyTax * price) / PRICE_PRECISION;
        uint256 threshold = genesisCount * 1e18;
        if (taxValueUsdt >= threshold) {
            uint256 hafToSwap = accumulatedBuyTax;
            uint256 usdtReceived = _swapHafToUsdt(hafToSwap);
            if (usdtReceived > 0) {
                uint256 amountPerNode = usdtReceived / genesisCount;
                for (uint256 i = 0; i < genesisCount; i++) {
                    address node = IHashFiMain(defiContract).getActiveGenesisNodeAt(i);
                    if (node != address(0) && amountPerNode > 0) {
                        IERC20(usdtToken).transfer(node, amountPerNode);
                    }
                }
                
                emit BuyTaxDistributed(hafToSwap, usdtReceived);
            }
            accumulatedBuyTax = 0;
        }
    }
    
    function _swapHafToUsdt(uint256 _hafAmount) internal returns (uint256) {
        if (_hafAmount == 0 || pancakePair == address(0)) return 0;
        IUniswapV2Pair pair = IUniswapV2Pair(pancakePair);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        address token0 = pair.token0();
        uint256 hafReserve;
        uint256 usdtReserve;
        if (token0 == address(this)) {
            hafReserve = uint256(reserve0);
            usdtReserve = uint256(reserve1);
        } else {
            hafReserve = uint256(reserve1);
            usdtReserve = uint256(reserve0);
        }
        uint256 amountInWithFee = _hafAmount * 9975;
        uint256 numerator = amountInWithFee * usdtReserve;
        uint256 denominator = hafReserve * 10000 + amountInWithFee;
        uint256 usdtOut = numerator / denominator;
        if (usdtOut > 0) {
            usdtOut = (usdtOut * 9990) / 10000;
        }
        if (usdtOut == 0) return 0;
        _transfer(address(this), pancakePair, _hafAmount);
        if (token0 == address(this)) {
            pair.swap(0, usdtOut, address(taxVault), new bytes(0));
        } else {
            pair.swap(usdtOut, 0, address(taxVault), new bytes(0));
        }
        uint256 actualUsdtReceived = taxVault.withdrawAllToken(usdtToken, address(this));
        return actualUsdtReceived;
    }
    
    function _triggerLazyMechanisms() internal {
        if (!advancedFeaturesEnabled) return;
        if (_isExecutingMechanism) return;
        _isExecutingMechanism = true;
        _tryDailyBurn();
        _tryAutoBurn();
        _checkAndDistributeBuyTax();
        _processDividends(PROCESS_GAS_LIMIT);
        _isExecutingMechanism = false;
    }

    function _processDividends(uint256 gasLimit) internal {
        uint256 shareholderCount = eligibleHolders.length;
        if (shareholderCount == 0) return;
        uint256 gasUsed = 0;
        uint256 gasLeft = gasleft();
        uint256 iterations = 0;
        uint256 currentProcessIndex = processIndex;
        while (gasUsed < gasLimit && iterations < shareholderCount) {
            if (currentProcessIndex >= shareholderCount) {
                currentProcessIndex = 0;
            }
            address shareholder = eligibleHolders[currentProcessIndex];
            _distributeDividend(shareholder);
            currentProcessIndex++;
            iterations++;
            uint256 newGasLeft = gasleft();
            if (gasLeft > newGasLeft) {
                gasUsed += (gasLeft - newGasLeft);
            }
            gasLeft = newGasLeft;
        }
        processIndex = currentProcessIndex;
    }

    function _distributeDividend(address holder) internal {
        if (!isEligibleHolder[holder]) return;
        uint256 weight = _getHolderWeight(holder);
        if (weight == 0) return;
        uint256 accDividend = (weight * accDividendPerWeight) / PRICE_PRECISION;
        uint256 debt = holderDividendDebt[holder];
        if (accDividend > debt) {
            uint256 pending = accDividend - debt;
            holderDividendDebt[holder] = accDividend;
            if (pending > 0) {
                if (holderDividendPool >= pending) {
                    holderDividendPool -= pending;
                } else {
                    pending = holderDividendPool;
                    holderDividendPool = 0;
                }
                if (pending > 0) {
                    holderClaimedDividend[holder] += pending;
                    _transfer(address(this), holder, pending);
                }
            }
        } else {
            holderDividendDebt[holder] = accDividend;
        }
    }

    function _tryDailyBurn() internal {
        uint256 currentMorning = _alignToUtc8Morning(block.timestamp);
        if (currentMorning > lastDailyBurnTime && isLpInitialized()) {
            uint256 daysPassed = (currentMorning - lastDailyBurnTime) / 1 days;
            for (uint256 i = 0; i < daysPassed && i < 7; i++) {
                _executeDailyBurn();
            }
            lastDailyBurnTime = currentMorning;
        }
    }
    
    function _executeDailyBurn() internal {
        uint256 lpHafBalance = getLpHafBalance();
        if (lpHafBalance == 0) return;
        uint256 genesisAmount = (lpHafBalance * DAILY_BURN_GENESIS_RATE) / TAX_DENOMINATOR;
        uint256 communityAmount = (lpHafBalance * DAILY_BURN_COMMUNITY_RATE) / TAX_DENOMINATOR;
        uint256 holderAmount = (lpHafBalance * DAILY_BURN_HOLDER_RATE) / TAX_DENOMINATOR;
        
        if (genesisAmount > 0) {
            uint256 genesisCount = IHashFiMain(defiContract).getActiveGenesisNodesCount();
            if (genesisCount == 0) {
                super._update(pancakePair, DEAD_ADDRESS, genesisAmount);
            } else {
                uint256 amountPerNode = genesisAmount / genesisCount;
                for (uint256 i = 0; i < genesisCount; i++) {
                    address node = IHashFiMain(defiContract).getActiveGenesisNodeAt(i);
                    if (node != address(0) && amountPerNode > 0) {
                        super._update(pancakePair, node, amountPerNode);
                    }
                }
            }
        }
        
        if (communityAmount > 0) {
            address communityAddress = IHashFiMain(defiContract).owner();
            super._update(pancakePair, communityAddress, communityAmount);
        }
        
        if (holderAmount > 0) {
            uint256 totalWeight = _calculateTotalWeight();
            if (totalWeight == 0) {
                super._update(pancakePair, DEAD_ADDRESS, holderAmount);
            } else {
                super._update(pancakePair, address(this), holderAmount);
                holderDividendPool += holderAmount;
                accDividendPerWeight += (holderAmount * PRICE_PRECISION) / totalWeight;
            }
        }
        
        IUniswapV2Pair(pancakePair).sync();
        
        emit DailyBurnExecuted(genesisAmount, communityAmount, holderAmount, block.timestamp);
    }
    
    function _tryAutoBurn() internal {
        if (!isLpInitialized()) return;
        
        uint256 intervalsPassed = (block.timestamp - lastAutoBurnTime) / AUTO_BURN_INTERVAL;
        
        if (intervalsPassed > 0) {
            for (uint256 i = 0; i < intervalsPassed && i < 12; i++) {
                _executeAutoBurn();
            }
            
            lastAutoBurnTime = lastAutoBurnTime + (intervalsPassed * AUTO_BURN_INTERVAL);
        }
    }
    
    function _executeAutoBurn() internal {
        uint256 lpHafBalance = getLpHafBalance();
        if (lpHafBalance == 0) return;
        
        uint256 currentSupply = totalSupply();
        uint256 deadBalance = balanceOf(DEAD_ADDRESS);
        uint256 effectiveSupply = currentSupply - deadBalance;
        
        if (effectiveSupply <= MIN_SUPPLY) return;
        
        uint256 burnAmount = (lpHafBalance * AUTO_BURN_RATE) / TAX_DENOMINATOR;
        
        if (effectiveSupply - burnAmount < MIN_SUPPLY) {
            burnAmount = effectiveSupply - MIN_SUPPLY;
        }
        
        if (burnAmount == 0) return;
        
        _update(pancakePair, DEAD_ADDRESS, burnAmount);
        
        IUniswapV2Pair(pancakePair).sync();
        
        emit AutoBurnExecuted(burnAmount, block.timestamp);
    }
    
    function _updateHolderStatus(address holder) internal {
        if (holder == address(0) ||
            holder == DEAD_ADDRESS ||
            holder == pancakePair ||
            holder == address(this) ||
            holder == defiContract) {
            return;
        }
        
        uint256 balance = balanceOf(holder);
        bool meetsThreshold = balance >= HOLDER_THRESHOLD;

        if (!meetsThreshold) {
            if (isEligibleHolder[holder]) {
                _removeFromEligibleHolders(holder);
            }
            if (holderThresholdTimestamp[holder] != 0) {
                holderThresholdTimestamp[holder] = 0;
            }
            return;
        }

        uint256 startTimestamp = holderThresholdTimestamp[holder];

        if (startTimestamp == 0) {
            holderThresholdTimestamp[holder] = block.timestamp;
            return;
        }

        if (block.timestamp - startTimestamp < MIN_HOLD_DURATION) {
            return;
        }

        if (!isEligibleHolder[holder]) {
            holderIndex[holder] = eligibleHolders.length;
            eligibleHolders.push(holder);
            isEligibleHolder[holder] = true;
            holderDividendDebt[holder] = accDividendPerWeight;
        }
    }
    
    function _removeFromEligibleHolders(address holder) internal {
        if (!isEligibleHolder[holder]) return;
        
        uint256 index = holderIndex[holder];
        uint256 lastIndex = eligibleHolders.length - 1;
        
        if (index != lastIndex) {
            address lastHolder = eligibleHolders[lastIndex];
            eligibleHolders[index] = lastHolder;
            holderIndex[lastHolder] = index;
        }
        
        eligibleHolders.pop();
        isEligibleHolder[holder] = false;
        delete holderIndex[holder];
        delete holderThresholdTimestamp[holder];
    }
    
    
    function _calculateTotalWeight() internal view returns (uint256) {
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < eligibleHolders.length; i++) {
            address holder = eligibleHolders[i];
            uint256 balance = balanceOf(holder);
            if (balance >= HOLDER_THRESHOLD) {
                totalWeight += balance / HOLDER_THRESHOLD;
            }
        }
        
        return totalWeight;
    }
    
    function _getHolderWeight(address holder) internal view returns (uint256) {
        uint256 balance = balanceOf(holder);
        if (balance < HOLDER_THRESHOLD) return 0;
        return balance / HOLDER_THRESHOLD;
    }
    
    function getPendingDividend(address holder) public view returns (uint256) {
        if (!isEligibleHolder[holder]) return 0;
        
        uint256 weight = _getHolderWeight(holder);
        if (weight == 0) return 0;
        
        uint256 accDividend = (weight * accDividendPerWeight) / PRICE_PRECISION;
        uint256 debt = holderDividendDebt[holder];
        
        if (accDividend <= debt) return 0;
        return accDividend - debt;
    }
    
    function claimDividend() external triggerMechanisms {
        uint256 pending = getPendingDividend(msg.sender);
        require(pending > 0, "No dividend to claim");
        _distributeDividend(msg.sender);
        emit HolderDividendClaimed(msg.sender, pending);
    }
    
    function _alignToUtc8Morning(uint256 timestamp) internal pure returns (uint256) {
        uint256 utc8Time = timestamp + UTC8_OFFSET;
        uint256 dayStart = (utc8Time / 1 days) * 1 days;
        return dayStart - UTC8_OFFSET;
    }
    
    function getEligibleHoldersCount() external view returns (uint256) {
        return eligibleHolders.length;
    }
    
    function getEligibleHolderAt(uint256 index) external view returns (address) {
        require(index < eligibleHolders.length, "Index out of bounds");
        return eligibleHolders[index];
    }
    
    function getTotalWeight() external view returns (uint256) {
        return _calculateTotalWeight();
    }

    function getHolderInfo(address holder) external view returns (
        bool eligible,
        uint256 weight,
        uint256 pendingDividend,
        uint256 claimedDividend
    ) {
        eligible = isEligibleHolder[holder];
        weight = _getHolderWeight(holder);
        pendingDividend = getPendingDividend(holder);
        claimedDividend = holderClaimedDividend[holder];
    }
    
    function getBurnStats() external view returns (
        uint256 totalBurned,
        uint256 effectiveSupply,
        uint256 minSupply,
        bool canStillBurn
    ) {
        totalBurned = balanceOf(DEAD_ADDRESS);
        effectiveSupply = totalSupply() - totalBurned;
        minSupply = MIN_SUPPLY;
        canStillBurn = effectiveSupply > MIN_SUPPLY;
    }
    
    function getNextDailyBurnTime() external view returns (uint256) {
        return lastDailyBurnTime + 1 days;
    }

    function getNextAutoBurnTime() external view returns (uint256) {
        return lastAutoBurnTime + AUTO_BURN_INTERVAL;
    }

    function getContractBalance() external view returns (uint256) {
        return balanceOf(address(this));
    }

    function transferFromContract(address to, uint256 amount) external onlyDefi {
        _transfer(address(this), to, amount);
    }

    function triggerMechanismsExternal() external {
        _triggerLazyMechanisms();
    }

    function setAdvancedFeaturesEnabled(bool enabled) external onlyDefi {
        advancedFeaturesEnabled = enabled;
        emit AdvancedFeaturesToggled(enabled, block.timestamp);
    }
    
    function withdrawToDefi(address token, uint256 amount) external onlyDefi {
        if (token == address(this)) {
            super._update(address(this), defiContract, amount);
        } else {
            IERC20(token).transfer(defiContract, amount);
        }
    }
}

contract TaxVault {
    address public immutable owner;
    constructor() {
        owner = msg.sender;
    }
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
       _;
    }
    function withdrawAllToken(address token, address to) external onlyOwner returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(to, balance);
        }
        return balance;
    }
}