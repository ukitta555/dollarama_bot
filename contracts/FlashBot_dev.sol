//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';

import './interfaces/IUniswapV2Pair.sol';
import './interfaces/IWETH.sol';
import './libraries/Decimal.sol';
import './libraries/SafeMath.sol';
import 'hardhat/console.sol';

struct OrderedReserves {
    uint256 a1; // base asset
    uint256 b1;
    uint256 a2;
    uint256 b2;
}

struct ArbitrageInfo {
    address baseToken;
    address quoteToken;
    bool baseTokenSmaller;
    address lowerPool; // pool with lower price, denominated in quote asset
    address higherPool; // pool with higher price, denominated in quote asset
}

struct CallbackData {
    address debtPool;
    address targetPool;
    bool debtTokenSmaller;
    address borrowedToken;
    address debtToken;
    uint256 debtAmount;
    uint256 debtTokenOutAmount;
}

contract FlashBotDev is Ownable {
    using Decimal for Decimal.D256;
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    // ACCESS CONTROL
    // Only the `permissionedPairAddress` may call the `uniswapV2Call` function
    address permissionedPairAddress = address(1);

    // WETH on ETH or WBNB on BSC
    address immutable WETH;

    // AVAILABLE BASE TOKENS
    EnumerableSet.AddressSet baseTokens;

    event Withdrawn(address indexed to, uint256 indexed value);
    event BaseTokenAdded(address indexed token);
    event BaseTokenRemoved(address indexed token);

    constructor(address _WETH) {
        WETH = _WETH;
        baseTokens.add(_WETH);
    }

    receive() external payable {}

    /// @dev Redirect uniswap callback function
    /// The callback function on different DEX are not same, so use a fallback to redirect to uniswapV2Call
    fallback(bytes calldata _input) external returns (bytes memory) {
        (address sender, uint256 amount0, uint256 amount1, bytes memory data) = abi.decode(_input[4:], (address, uint256, uint256, bytes));
        uniswapV2Call(sender, amount0, amount1, data);
    }

    function withdraw() external {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
            emit Withdrawn(owner(), balance);
        }

//        for (uint256 i = 0; i < baseTokens.length(); i++) {
//            address token = baseTokens.at(i);
//            balance = IERC20(token).balanceOf(address(this));
//            if (balance > 0) {
//                // do not use safe transfer here to prevents revert by any shitty token
//                IERC20(token).transfer(owner(), balance);
//            }
//        }
    }

    function addBaseToken(address token) external onlyOwner {
        baseTokens.add(token);
        emit BaseTokenAdded(token);
    }

    function removeBaseToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            // do not use safe transfer to prevents revert by any shitty token
            IERC20(token).transfer(owner(), balance);
        }
        baseTokens.remove(token);
        emit BaseTokenRemoved(token);
    }

    function getBaseTokens() external view returns (address[] memory tokens) {
        uint256 length = baseTokens.length();
        tokens = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            tokens[i] = baseTokens.at(i);
        }
    }

    function baseTokensContains(address token) public view returns (bool) {
        return baseTokens.contains(token);
    }

    /// @notice Do an arbitrage between two Uniswap-like AMM pools
    /// @dev Two pools must contains same token pair
    function flashArbitrage(
        address lowerPool,
        address baseToken,
        uint256 amount0Out,
        uint256 amount1Out,
        bytes calldata data
    ) public {
        // this must be updated every transaction for callback origin authentication
        permissionedPairAddress = lowerPool; // lower price pair
        uint256 balanceBefore = IERC20(baseToken).balanceOf(address(this));

        // borrowing (flash swap) happens here -> will callback to UniswapV2Call
        IUniswapV2Pair(lowerPool).swap(amount0Out, amount1Out, address(this), data);
        uint256 balanceAfter = IERC20(baseToken).balanceOf(address(this));

        require(balanceAfter > balanceBefore, 'Losing money');

        if (baseToken == WETH) {
            IWETH(baseToken).withdraw(balanceAfter);
        }

        permissionedPairAddress = address(1);
    }

//    function estimateGasCostArbitrage(address pool0, address pool1) internal returns (uint256) {
//        uint256 gasStart = gasleft();
//        flashArbitrage(pool0, pool1);
//        uint256 gasEnd = gasleft();
//        uint256 gasUsed = gasStart - gasEnd;
//        return gasUsed;
//    }

    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes memory data
    ) public {
        // access control
        require(msg.sender == permissionedPairAddress, 'Non permissioned address call');
        require(sender == address(this), 'Not from this contract');

        uint256 borrowedAmount = amount0 > 0 ? amount0 : amount1;
        CallbackData memory info = abi.decode(data, (CallbackData));

        IERC20(info.borrowedToken).safeTransfer(info.targetPool, borrowedAmount);

        (uint256 amount0Out, uint256 amount1Out) =
            info.debtTokenSmaller ? (info.debtTokenOutAmount, uint256(0)) : (uint256(0), info.debtTokenOutAmount);
        // ordinary swap -> $$$ done here
        IUniswapV2Pair(info.targetPool).swap(amount0Out, amount1Out, address(this), new bytes(0));
        // pay your debt
        IERC20(info.debtToken).safeTransfer(info.debtPool, info.debtAmount);
    }

    /// @dev find solution of quadratic equation: ax^2 + bx + c = 0, only return the positive solution
    // method 1, qudratic formula with naive Newton's method on sqrt
    function calcSolutionForQuadratic(
        int256 a,
        int256 b,
        int256 c
    ) internal pure returns (int256 x1, int256 x2) {
        int256 m = b**2 - 4 * a * c;
        // m < 0 leads to complex number
        require(m >= 0, 'Complex number');

        int256 sqrtM = int256(sqrt(uint256(m)));
        x1 = (-b + sqrtM) / (2 * a);
        x2 = (-b - sqrtM) / (2 * a);
    }

    // method 1, qudratic formula with naive Newton's method on sqrt, functions combined
    function calcSolutionForQuadratic2(
        int256 a,
        int256 b,
        int256 c
    ) internal pure returns (int256 x1, int256 x2) {
        int256 m = b**2 - 4 * a * c;
        // m < 0 leads to complex number
        require(m >= 0, 'Complex number');

        uint256 n = uint256(m);
        assert(n > 1);

        // The scale factor is a crude way to turn everything into integer calcs.
        // Actually do (n * 10 ^ 4) ^ (1/2)
        uint256 _n = n * 10**6;
        uint256 res = _n;

        uint256 xi;
        while (true) {
            xi = (res + _n / res) / 2;
            // don't need be too precise to save gas
            if (res - xi < 1000) {
                break;
            }
            res = xi;
        }
        int256 sqrtM = int256(res = res / 10**3);
        x1 = (-b + sqrtM) / (2 * a);
        x2 = (-b - sqrtM) / (2 * a);
    }

    function calcSolutionForQuadraticABDK(
        int256 a,
        int256 b,
        int256 c
    ) internal pure returns (int256 x1, int256 x2) {
        int256 m = b * b - 4 * a * c;
        // m < 0 leads to complex number
        require(m >= 0, 'Complex number');

        assert(m > 1);

        int256 sqrtM = int256(sqrt2(uint256(m)));

        x1 = (-b + sqrtM) / (2 * a);
        x2 = (-b - sqrtM) / (2 * a);
    }

    function calcSolutionForQuadraticABDK2(
        int256 a,
        int256 b,
        int256 c
    ) internal pure returns (int256 x1, int256 x2) {
        int256 m = b * b - 4 * a * c;
        // m < 0 leads to complex number
        require(m >= 0, 'Complex number');

        int256 sqrtM = 0;
        unchecked {
            uint256 x = uint256(m);
            if (x == 0) sqrtM = 0;
            else {
                uint256 xx = x;
                uint256 r = 1;
                if (xx >= 0x100000000000000000000000000000000) { xx >>= 128; r <<= 64; }
                if (xx >= 0x10000000000000000) { xx >>= 64; r <<= 32; }
                if (xx >= 0x100000000) { xx >>= 32; r <<= 16; }
                if (xx >= 0x10000) { xx >>= 16; r <<= 8; }
                if (xx >= 0x100) { xx >>= 8; r <<= 4; }
                if (xx >= 0x10) { xx >>= 4; r <<= 2; }
                if (xx >= 0x4) { r <<= 1; }
                r = (r + x / r) >> 1;
                r = (r + x / r) >> 1;
                r = (r + x / r) >> 1;
                r = (r + x / r) >> 1;
                r = (r + x / r) >> 1;
                r = (r + x / r) >> 1;
                r = (r + x / r) >> 1; // Seven iterations should be enough
                uint256 r1 = x / r;
                sqrtM = int256(r < r1 ? r : r1);
            }
        }

        x1 = (-b + sqrtM) / (2 * a);
        x2 = (-b - sqrtM) / (2 * a);
    }

    /// @dev Newton’s method for caculating square root of n
    function sqrt(uint256 n) internal pure returns (uint256 res) {
        assert(n > 1);

        // The scale factor is a crude way to turn everything into integer calcs.
        // Actually do (n * 10 ^ 4) ^ (1/2)
        uint256 _n = n * 10**6;
        uint256 c = _n;
        res = _n;

        uint256 xi;
        while (true) {
            xi = (res + c / res) / 2;
            // don't need be too precise to save gas
            if (res - xi < 1000) {
                break;
            }
            res = xi;
        }
        res = res / 10**3;
    }

    function sqrt2(uint256 x) internal pure returns (uint256) {
        unchecked {
            if (x == 0) return 0;
            else {
                uint256 xx = x;
                uint256 r = 1;
                if (xx >= 0x100000000000000000000000000000000) { xx >>= 128; r <<= 64; }
                if (xx >= 0x10000000000000000) { xx >>= 64; r <<= 32; }
                if (xx >= 0x100000000) { xx >>= 32; r <<= 16; }
                if (xx >= 0x10000) { xx >>= 16; r <<= 8; }
                if (xx >= 0x100) { xx >>= 8; r <<= 4; }
                if (xx >= 0x10) { xx >>= 4; r <<= 2; }
                if (xx >= 0x4) { r <<= 1; }
                r = (r + x / r) >> 1;
                r = (r + x / r) >> 1;
                r = (r + x / r) >> 1;
                r = (r + x / r) >> 1;
                r = (r + x / r) >> 1;
                r = (r + x / r) >> 1;
                r = (r + x / r) >> 1; // Seven iterations should be enough
                uint256 r1 = x / r;
                return r < r1 ? r : r1;
            }
        }
    }

    function estimateGasCostQuadratic1(int256 a, int256 b, int256 c) internal view returns (uint256) {
        uint256 gasStart = gasleft();
        calcSolutionForQuadratic(a, b, c);
        uint256 gasEnd = gasleft();
        uint256 gasUsed = gasStart - gasEnd;
        return gasUsed;
    }

    function estimateGasCostQuadratic2(int256 a, int256 b, int256 c) internal view returns (uint256) {
        uint256 gasStart = gasleft();
        calcSolutionForQuadratic2(a, b, c);
        uint256 gasEnd = gasleft();
        uint256 gasUsed = gasStart - gasEnd;
        return gasUsed;
    }

    function estimateGasCostABDK(int256 a, int256 b, int256 c) internal view returns (uint256) {
        uint256 gasStart = gasleft();
        calcSolutionForQuadraticABDK(a, b, c);
        uint256 gasEnd = gasleft();
        uint256 gasUsed = gasStart - gasEnd;
        return gasUsed;
    }

    function estimateGasCostABDK2(int256 a, int256 b, int256 c) internal view returns (uint256) {
        uint256 gasStart = gasleft();
        calcSolutionForQuadraticABDK2(a, b, c);
        uint256 gasEnd = gasleft();
        uint256 gasUsed = gasStart - gasEnd;
        return gasUsed;
    }

    // copy from UniswapV2Library
    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountIn) {
        require(amountOut > 0, 'UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        uint256 numerator = reserveIn.mul(amountOut).mul(1000);
        uint256 denominator = reserveOut.sub(amountOut).mul(997);
        amountIn = (numerator / denominator).add(1);
    }

    // copy from UniswapV2Library
    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        uint256 amountInWithFee = amountIn.mul(997);
        uint256 numerator = amountInWithFee.mul(reserveOut);
        uint256 denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }
}
