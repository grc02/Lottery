// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

/* Errors */
error Lottery__NotEnoughETH();
error Lottery__TransferFailed();
error Lottery__NotOpen();
error Lottery__checkUpkeepNotCalled(
    uint256 lotteryState,
    uint256 currentTimeStamp,
    uint256 numOfParticipants,
    uint256 contractBalance
);

/**@title Lottery Contract
 * @author Georgi Chonkov
 * @notice This contract is for creating a sample lottery contract
 * @dev This implements the Chainlink VRF Version 2 and Chainlink Automation
 */
contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface {
    /* Type declarations */
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    /* State variables */
    // Chainlink variables
    uint256 private immutable i_entranceFee;
    VRFCoordinatorV2Interface private immutable i_VRFCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint256 public immutable i_interval;

    // Lottery contract variables
    address[] internal s_participants;
    uint256 public s_lastTimeStamp;
    address private s_latestWinner;
    LotteryState private s_lotteryState;

    /* Events */
    event lotteryEntered(address indexed participant);
    event upkeepPerformed(uint256 indexed requestedId);
    event winnerPicked(address indexed latestWinner);

    /* Functions */
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
        i_interval = interval;
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
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = (s_lotteryState == LotteryState(0));
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasParticipants = (s_participants.length > 0);
        bool hasBalance = (address(this).balance > 0);
        upkeepNeeded = (isOpen && timePassed && hasParticipants && hasBalance);
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        if ((block.timestamp - s_lastTimeStamp) > i_interval) {
            s_lastTimeStamp = block.timestamp;
        }

        (bool isUpkeepCalled, ) = checkUpkeep("");

        if (isUpkeepCalled) {
            revert Lottery__checkUpkeepNotCalled(
                uint256(s_lotteryState),
                block.timestamp,
                s_participants.length,
                address(this).balance
            );
        }

        s_lotteryState = LotteryState.CALCULATING;
        uint256 requestId = i_VRFCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit upkeepPerformed(requestId);
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
        s_lastTimeStamp = block.timestamp;

        (bool success, ) = payable(winner).call{value: address(this).balance}(
            ""
        );
        if (!success) {
            revert Lottery__TransferFailed();
        }
        emit winnerPicked(winner);
    }

    /* Getter Functions */
    function getEntranceFee() external view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) external view returns (address) {
        return s_participants[index];
    }

    function getLatestWinner() external view returns (address) {
        return s_latestWinner;
    }

    function getLotteryState() external view returns (LotteryState) {
        return s_lotteryState;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_participants.length;
    }
}
