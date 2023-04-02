//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

abstract contract IWETH {
    mapping (address => uint)                       public  balanceOf;
    function deposit() virtual external payable;
    function transfer(address to, uint value) virtual external returns (bool);
    function withdraw(uint) virtual external;
}
