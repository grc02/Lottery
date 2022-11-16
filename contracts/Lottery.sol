// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

error Lottery__NotEnoughETH();
error Lottery__TransferFailed();
error Lottery__NotOpen();

contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface {
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    uint256 private immutable i_entranceFee;
    address[] internal s_participants;
    VRFCoordinatorV2Interface private immutable i_VRFCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint256 public s_lastTimeStamp;
    uint256 public s_interval;
    address private s_latestWinner;
    LotteryState private s_lotteryState;

    event lotteryEntered(address indexed participant);
    event randomnessRequested(uint256 indexed requestedId);
    event winnerPicked(address indexed latestWinner);

    constructor(
        address VRFCordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(VRFCordinatorV2) {
        i_entranceFee = entranceFee;
        i_VRFCoordinator = VRFCoordinatorV2Interface(VRFCordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_interval = interval;
        s_lastTimeStamp = block.timestamp;
        s_lotteryState = LotteryState.OPEN;
    }

    function enterLottery() external payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__NotEnoughETH();
        }

        if (s_lotteryState != LotteryState(0)) {
            revert Lottery__NotOpen();
        }
        s_participants.push(msg.sender);
        emit lotteryEntered(msg.sender);
    }

    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        upkeepNeeded = (block.timestamp - s_lastTimeStamp) > s_interval;
    }

    function requestRandomWinner() external {
        s_lotteryState = LotteryState.CALCULATING;
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
        s_lotteryState = LotteryState.OPEN;
        s_participants = new address[](0);

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

    function getLatestWinner() external view returns (address) {
        return s_latestWinner;
    }
}
