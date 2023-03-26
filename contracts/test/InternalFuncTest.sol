//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma abicoder v2;

import '../FlashBot_dev.sol';

contract InternalFuncTest is FlashBotDev {
    constructor(address _WETH) FlashBotDev(_WETH) {}

    function _calcBorrowAmount(OrderedReserves memory reserves) public pure returns (uint256) {
        return calcBorrowAmount(reserves);
    }

    function _calcSolutionForQuadratic(
        int256 a,
        int256 b,
        int256 c
    ) public pure returns (int256, int256) {
        return calcSolutionForQuadratic(a, b, c);
    }

    function _sqrt(uint256 n) public pure returns (uint256) {
        return sqrt(n);
    }

    function _sqrt2(uint256 n) public pure returns (uint256) {
        return sqrt2(n);
    }

    function _calcSolutionForQuadratic2(
        int256 a,
        int256 b,
        int256 c
    ) public pure returns (int256, int256) {
        return calcSolutionForQuadratic2(a, b, c);
    }

    function _calcSolutionForQuadraticABDK(
        int256 a,
        int256 b,
        int256 c
    ) public pure returns (int256, int256) {
        return calcSolutionForQuadraticABDK(a, b, c);
    }

    function _calcSolutionForQuadraticABDK2(
        int256 a,
        int256 b,
        int256 c
    ) public pure returns (int256, int256) {
        return calcSolutionForQuadraticABDK2(a, b, c);
    }

    function _estimateGasCostQuadratic1(
        int256 a,
        int256 b,
        int256 c
    ) public view returns (uint256) {
        return estimateGasCostQuadratic1(a, b, c);
    }

    function _estimateGasCostQuadratic2(
        int256 a,
        int256 b,
        int256 c
    ) public view returns (uint256) {
        return estimateGasCostQuadratic2(a, b, c);
    }

    function _estimateGasCostABDK(
        int256 a,
        int256 b,
        int256 c
    ) public view returns (uint256) {
        return estimateGasCostABDK(a, b, c);
    }

    function _estimateGasCostABDK2(
        int256 a,
        int256 b,
        int256 c
    ) public view returns (uint256) {
        return estimateGasCostABDK2(a, b, c);
    }

    function _isbaseTokenSmaller(address pool0, address pool1)
    public
    view
    returns (
        bool baseSmaller,
        address baseToken,
        address quoteToken
    ) {
        (baseSmaller, baseToken, quoteToken) = isbaseTokenSmaller(pool0, pool1);
    }

    function _estimateGasCostArbitrage(address pool0, address pool1) public returns (uint256) {
        return estimateGasCostArbitrage(pool0, pool1);
    }

    function _getOrderedReserves(
        address pool0,
        address pool1,
        bool baseTokenSmaller
    )
    public
    view
    returns (
        address poolWithLowerPrice,
        address poolWithHigherPrice,
        OrderedReserves memory orderedReserves
    )
    {
        (poolWithLowerPrice, poolWithHigherPrice, orderedReserves) =
            getOrderedReserves(pool0, pool1, baseTokenSmaller);
    }
}
