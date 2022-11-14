// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

error Lottery__NotEnoughETH();

contract Lottery is VRFConsumerBaseV2 {
    uint256 private immutable i_entranceFee;
    address[] internal s_participants;

    event lotteryEntered(address indexed participant);

    constructor(uint256 entranceFee, address VRFCordinatorV2)
        VRFConsumerBaseV2(VRFCordinatorV2)
    {
        i_entranceFee = entranceFee;
    }

    function enterLottery() external payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__NotEnoughETH();
        }
        s_participants.push(msg.sender);
        emit lotteryEntered(msg.sender);
    }

    function requestRandomWinner() external {}

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {}

    function getEntranceFee() external view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) external view returns (address) {
        return s_participants[index];
    }
}
