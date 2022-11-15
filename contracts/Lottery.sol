// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

error Lottery__NotEnoughETH();
error Lottery__TransferFailed();

contract Lottery is VRFConsumerBaseV2 {
    uint256 private immutable i_entranceFee;
    address[] internal s_participants;
    VRFCoordinatorV2Interface private immutable i_VRFCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    address private s_latestWinner;

    event lotteryEntered(address indexed participant);
    event randomnessRequested(uint256 indexed requestedId);
    event winnerPicked(address indexed latestWinner);

    constructor(
        address VRFCordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(VRFCordinatorV2) {
        i_entranceFee = entranceFee;
        i_VRFCoordinator = VRFCoordinatorV2Interface(VRFCordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
    }

    function enterLottery() external payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__NotEnoughETH();
        }
        s_participants.push(msg.sender);
        emit lotteryEntered(msg.sender);
    }

    function requestRandomWinner() external {
        uint256 requestId = i_VRFCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit randomnessRequested(requestId);
    }

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        uint256 winnerIndex = randomWords[0] % s_participants.length;
        address winner = s_participants[winnerIndex];
        s_latestWinner = winner;

        (bool success, ) = payable(winner).call{value: address(this).balance}(
            ""
        );
        if (!success) {
            revert Lottery__TransferFailed();
        }
        emit winnerPicked(winner);
    }

    function getEntranceFee() external view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) external view returns (address) {
        return s_participants[index];
    }
}
