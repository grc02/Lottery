// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

error Lottery__NotEnoughETH();

contract Lottery {
    uint256 private immutable i_entranceFee;
    address[] internal s_participants;

    constructor(uint256 entranceFee) {
        i_entranceFee = entranceFee;
    }

    function enterLottery() external payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__NotEnoughETH();
        }
        s_participants.push(msg.sender);
    }

    function pickWinner() external {}

    function getEntranceFee() external view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) external view returns (address) {
        return s_participants[index];
    }
}
