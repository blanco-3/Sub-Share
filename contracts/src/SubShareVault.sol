// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

library Reclaim {
    struct ClaimInfo {
        string provider;
        string parameters;
        string context;
    }

    struct CompleteClaimData {
        bytes32 identifier;
        address owner;
        uint32 timestampS;
        uint32 epoch;
    }

    struct SignedClaim {
        CompleteClaimData claim;
        bytes[] signatures;
    }

    struct Proof {
        ClaimInfo claimInfo;
        SignedClaim signedClaim;
    }
}

interface IReclaimVerifier {
    function verifyProof(Reclaim.Proof memory proof) external;
}

/// @title SubShareVault v2 — n-of-n Multisig Payment Release
/// @notice Trustless subscription cost-sharing vault.
///         Members deposit upfront. Creator pays the subscription each month.
///         Payment is released ONLY when ALL members vote to approve it,
///         eliminating unilateral withdrawal by the creator.
///
/// Game theory:
///   - Creator has no incentive to not pay (no approval = no reimbursement)
///   - Members have no incentive to block (blocking = lose deposit + lose service)
///   - Malicious member blocking: loses their own deposit, gains nothing
///   - Colluding majority impossible: requires ALL members (n-of-n)
///
/// Deadlock mitigation:
///   After APPROVAL_GRACE (7 days) from first vote, creator can release with (n-1) approvals.
///   Prevents permanent deadlock from inactive/lost wallets.
contract SubShareVault {
    IERC20 public immutable usdc;
    address public immutable creator;
    string public name;
    uint256 public immutable monthlyPrice;     // USDC (6 decimals)
    uint256 public immutable nMembers;         // total seats including creator
    uint256 public immutable duration;         // months
    uint256 public immutable depositPerPerson; // ceil(monthlyPrice * duration / nMembers)

    uint256 public constant APPROVAL_GRACE = 7 days;
    uint256 public constant MONTH_DURATION = 30 days;

    address public reclaimVerifier;
    string public reclaimProviderId;

    address[] public memberList;
    mapping(address => bool) public isMember;
    mapping(address => bool) public hasDeposited;
    uint256 public depositedCount;

    bool public isActive;
    uint256 public activatedAt;

    uint256 public monthsClaimed;
    mapping(uint256 => bool) public monthClaimed;
    mapping(uint256 => bool) public monthClaimedViaProof;
    mapping(uint256 => mapping(address => bool)) public hasApproved; // month => member => voted
    mapping(uint256 => uint256) public approvalCount;                // month => total votes
    mapping(uint256 => uint256) public firstApprovalAt;              // month => first vote timestamp
    mapping(bytes32 => bool) public usedProofs;                      // proof identifier => used (replay guard)

    event MemberJoined(address indexed member);
    event Deposited(address indexed member, uint256 amount);
    event VaultActivated(uint256 timestamp);
    event PaymentApproved(uint256 indexed month, address indexed voter, uint256 totalApprovals);
    event PaymentClaimed(uint256 indexed month, uint256 amount, address creator);
    event PaymentClaimedViaProof(uint256 indexed month, address indexed creator);

    constructor(
        address _usdc,
        string memory _name,
        uint256 _monthlyPrice,
        uint256 _nMembers,
        uint256 _duration,
        address _creator,
        address _reclaimVerifier,
        string memory _reclaimProviderId
    ) {
        require(_nMembers >= 2, "Min 2 members");
        require(_duration >= 1, "Min 1 month");
        require(_monthlyPrice > 0, "Price must be > 0");
        require(_reclaimVerifier != address(0), "Invalid verifier");
        require(bytes(_reclaimProviderId).length > 0, "Missing provider");

        usdc = IERC20(_usdc);
        name = _name;
        monthlyPrice = _monthlyPrice;
        nMembers = _nMembers;
        duration = _duration;
        depositPerPerson = (_monthlyPrice * _duration + _nMembers - 1) / _nMembers;
        creator = _creator;
        reclaimVerifier = _reclaimVerifier;
        reclaimProviderId = _reclaimProviderId;

        memberList.push(_creator);
        isMember[_creator] = true;
        emit MemberJoined(_creator);
    }

    function join() external {
        require(!isActive, "Vault already active");
        require(!isMember[msg.sender], "Already a member");
        require(memberList.length < nMembers, "Vault is full");

        memberList.push(msg.sender);
        isMember[msg.sender] = true;
        emit MemberJoined(msg.sender);
    }

    /// @notice Lock your share. Vault activates when all members deposit.
    function deposit() external {
        require(isMember[msg.sender], "Not a member: call join() first");
        require(!hasDeposited[msg.sender], "Already deposited");
        require(!isActive, "Vault already active");

        bool ok = usdc.transferFrom(msg.sender, address(this), depositPerPerson);
        require(ok, "USDC transfer failed");

        hasDeposited[msg.sender] = true;
        depositedCount++;
        emit Deposited(msg.sender, depositPerPerson);

        if (depositedCount == nMembers) {
            isActive = true;
            activatedAt = block.timestamp;
            emit VaultActivated(block.timestamp);
        }
    }

    /// @notice Call this to confirm the subscription was delivered this month.
    ///         When ALL n members approve, USDC is automatically sent to creator.
    /// @param month 1-indexed month number
    function approvePayment(uint256 month) external {
        require(isMember[msg.sender], "Not a member");
        require(isActive, "Vault not active");
        require(month >= 1 && month <= duration, "Month out of range");
        require(month <= getCurrentUnlockedMonth(), "Month still timelocked");
        require(!monthClaimed[month], "Already claimed");
        require(!hasApproved[month][msg.sender], "Already voted this month");

        if (approvalCount[month] == 0) {
            firstApprovalAt[month] = block.timestamp;
        }

        hasApproved[month][msg.sender] = true;
        approvalCount[month]++;
        emit PaymentApproved(month, msg.sender, approvalCount[month]);

        if (approvalCount[month] == nMembers) {
            _releasePayment(month);
        }
    }

    /// @notice Deadlock escape hatch: after APPROVAL_GRACE since first vote,
    ///         creator can claim with (n-1) approvals. Prevents permanent lockup
    ///         from inactive/lost wallet.
    function claimAfterGrace(uint256 month) external {
        require(msg.sender == creator, "Only creator");
        require(isActive, "Vault not active");
        require(month >= 1 && month <= duration, "Month out of range");
        require(month <= getCurrentUnlockedMonth(), "Month still timelocked");
        require(!monthClaimed[month], "Already claimed");
        require(approvalCount[month] >= nMembers - 1, "Need at least n-1 approvals");
        require(firstApprovalAt[month] > 0, "No approvals yet");
        require(
            block.timestamp >= firstApprovalAt[month] + APPROVAL_GRACE,
            "Grace period not elapsed"
        );
        _releasePayment(month);
    }

    /// @notice Creator submits a Reclaim proof and bypasses the multisig vote
    ///         when the signed extracted parameters prove a matching Claude invoice.
    function claimWithProof(Reclaim.Proof calldata proof, uint256 month) external {
        require(msg.sender == creator, "Only creator");
        require(isActive, "Vault not active");
        require(month >= 1 && month <= duration, "Month out of range");
        require(month <= getCurrentUnlockedMonth(), "Month still timelocked");
        require(!monthClaimed[month], "Already claimed");

        bytes32 proofId = proof.signedClaim.claim.identifier;
        require(!usedProofs[proofId], "Proof already used");

        IReclaimVerifier(reclaimVerifier).verifyProof(proof);

        require(_equals(proof.claimInfo.provider, reclaimProviderId), "Invalid provider");
        require(_proofTargetsThisVaultAndMonth(proof.claimInfo.context, month), "Proof not bound to vault/month");

        string memory extractedParameters = _extractJsonObject(
            proof.claimInfo.context,
            "\"extractedParameters\""
        );
        require(bytes(extractedParameters).length > 0, "Missing extracted params");
        require(_contains(extractedParameters, "Claude"), "Missing Claude plan");
        require(_containsExpectedAmount(extractedParameters), "Amount mismatch");

        usedProofs[proofId] = true;
        monthClaimedViaProof[month] = true;
        _releasePayment(month);
        emit PaymentClaimedViaProof(month, creator);
    }

    function _releasePayment(uint256 month) internal {
        monthClaimed[month] = true;
        monthsClaimed++;
        bool ok = usdc.transfer(creator, monthlyPrice);
        require(ok, "USDC transfer failed");
        emit PaymentClaimed(month, monthlyPrice, creator);
    }

    function getMemberCount() external view returns (uint256) {
        return memberList.length;
    }

    function getVaultBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function getMember(uint256 index) external view returns (address) {
        return memberList[index];
    }

    function getCurrentUnlockedMonth() public view returns (uint256) {
        if (!isActive) {
            return 0;
        }

        uint256 unlocked = ((block.timestamp - activatedAt) / MONTH_DURATION) + 1;
        if (unlocked > duration) {
            return duration;
        }
        return unlocked;
    }

    function getMonthUnlockTime(uint256 month) external view returns (uint256) {
        require(month >= 1 && month <= duration, "Month out of range");
        if (!isActive) {
            return 0;
        }
        return activatedAt + ((month - 1) * MONTH_DURATION);
    }

    function getMonthStatus(
        uint256 month
    )
        external
        view
        returns (bool claimed, uint256 approvals, bool callerHasApproved, uint256 graceAvailableAt)
    {
        uint256 grace = firstApprovalAt[month] > 0 ? firstApprovalAt[month] + APPROVAL_GRACE : 0;
        return (
            monthClaimed[month],
            approvalCount[month],
            hasApproved[month][msg.sender],
            grace
        );
    }

    function getInfo() external view returns (
        string memory _name,
        uint256 _monthlyPrice,
        uint256 _nMembers,
        uint256 _duration,
        uint256 _depositPerPerson,
        bool _isActive,
        uint256 _depositedCount,
        uint256 _monthsClaimed,
        address _creator,
        uint256 _balance
    ) {
        return (
            name,
            monthlyPrice,
            nMembers,
            duration,
            depositPerPerson,
            isActive,
            depositedCount,
            monthsClaimed,
            creator,
            usdc.balanceOf(address(this))
        );
    }

    // Reclaim signs the entire context string, so the extracted parameters embedded
    // inside context can be checked on-chain without trusting frontend-only data.
    function _extractJsonObject(
        string memory data,
        string memory key
    ) internal pure returns (string memory) {
        bytes memory dataBytes = bytes(data);
        bytes memory keyBytes = bytes(key);
        if (dataBytes.length < keyBytes.length) {
            return "";
        }

        for (uint256 i = 0; i <= dataBytes.length - keyBytes.length; i++) {
            if (!_matchesAt(dataBytes, keyBytes, i)) {
                continue;
            }

            uint256 cursor = i + keyBytes.length;
            while (cursor < dataBytes.length && _isJsonSpacer(dataBytes[cursor])) {
                cursor++;
            }
            if (cursor >= dataBytes.length || dataBytes[cursor] != bytes1(0x3A)) {
                return "";
            }

            cursor++;
            while (cursor < dataBytes.length && _isJsonSpacer(dataBytes[cursor])) {
                cursor++;
            }
            if (cursor >= dataBytes.length || dataBytes[cursor] != bytes1(0x7B)) {
                return "";
            }

            uint256 start = cursor;
            uint256 depth = 0;
            bool inString = false;
            bool escaped = false;

            for (; cursor < dataBytes.length; cursor++) {
                bytes1 char = dataBytes[cursor];

                if (inString) {
                    if (escaped) {
                        escaped = false;
                    } else if (char == bytes1(0x5C)) {
                        escaped = true;
                    } else if (char == bytes1(0x22)) {
                        inString = false;
                    }
                    continue;
                }

                if (char == bytes1(0x22)) {
                    inString = true;
                } else if (char == bytes1(0x7B)) {
                    depth++;
                } else if (char == bytes1(0x7D)) {
                    depth--;
                    if (depth == 0) {
                        return _slice(dataBytes, start, cursor + 1);
                    }
                }
            }

            return "";
        }

        return "";
    }

    function _proofTargetsThisVaultAndMonth(
        string memory context,
        uint256 month
    ) internal view returns (bool) {
        string memory contextAddress = _extractJsonString(context, "\"contextAddress\"");
        string memory contextMessage = _extractJsonString(context, "\"contextMessage\"");

        if (!_equals(contextAddress, _addressToString(address(this)))) {
            return false;
        }

        return _contains(contextMessage, string.concat("month:", _uintToString(month)));
    }

    function _extractJsonString(
        string memory data,
        string memory key
    ) internal pure returns (string memory) {
        bytes memory dataBytes = bytes(data);
        bytes memory keyBytes = bytes(key);
        if (dataBytes.length < keyBytes.length) {
            return "";
        }

        for (uint256 i = 0; i <= dataBytes.length - keyBytes.length; i++) {
            if (!_matchesAt(dataBytes, keyBytes, i)) {
                continue;
            }

            uint256 cursor = i + keyBytes.length;
            while (cursor < dataBytes.length && _isJsonSpacer(dataBytes[cursor])) {
                cursor++;
            }
            if (cursor >= dataBytes.length || dataBytes[cursor] != bytes1(0x3A)) {
                return "";
            }

            cursor++;
            while (cursor < dataBytes.length && _isJsonSpacer(dataBytes[cursor])) {
                cursor++;
            }
            if (cursor >= dataBytes.length || dataBytes[cursor] != bytes1(0x22)) {
                return "";
            }

            cursor++;
            uint256 start = cursor;
            bool escaped = false;

            for (; cursor < dataBytes.length; cursor++) {
                bytes1 char = dataBytes[cursor];
                if (escaped) {
                    escaped = false;
                    continue;
                }
                if (char == bytes1(0x5C)) {
                    escaped = true;
                    continue;
                }
                if (char == bytes1(0x22)) {
                    return _slice(dataBytes, start, cursor);
                }
            }

            return "";
        }

        return "";
    }

    function _containsExpectedAmount(string memory haystack) internal view returns (bool) {
        uint256 wholeUnits = monthlyPrice / 1e6;
        uint256 cents = (monthlyPrice % 1e6) / 1e4;
        uint256 stripeMinorUnits = monthlyPrice / 1e4;

        if (cents == 0) {
            string memory wholeString = _uintToString(wholeUnits);
            return
                _containsNumberToken(haystack, wholeString) ||
                _containsNumberToken(haystack, string.concat(wholeString, ".00")) ||
                _containsNumberToken(haystack, _uintToString(stripeMinorUnits));
        }

        string memory twoDecimalString = string.concat(
            _uintToString(wholeUnits),
            ".",
            _twoDigitString(cents)
        );
        if (_containsNumberToken(haystack, twoDecimalString)) {
            return true;
        }

        if (cents % 10 == 0) {
            string memory oneDecimalString = string.concat(
                _uintToString(wholeUnits),
                ".",
                _uintToString(cents / 10)
            );
            if (_containsNumberToken(haystack, oneDecimalString)) {
                return true;
            }
        }

        if (_containsNumberToken(haystack, _uintToString(stripeMinorUnits))) {
            return true;
        }

        return false;
    }

    function _containsNumberToken(
        string memory haystack,
        string memory needle
    ) internal pure returns (bool) {
        bytes memory haystackBytes = bytes(haystack);
        bytes memory needleBytes = bytes(needle);
        if (needleBytes.length == 0 || haystackBytes.length < needleBytes.length) {
            return false;
        }

        for (uint256 i = 0; i <= haystackBytes.length - needleBytes.length; i++) {
            if (!_matchesAt(haystackBytes, needleBytes, i)) {
                continue;
            }

            bool leftBoundary = i == 0 || !_isNumberChar(haystackBytes[i - 1]);
            bool rightBoundary = i + needleBytes.length == haystackBytes.length ||
                !_isNumberChar(haystackBytes[i + needleBytes.length]);

            if (leftBoundary && rightBoundary) {
                return true;
            }
        }

        return false;
    }

    function _contains(string memory haystack, string memory needle) internal pure returns (bool) {
        bytes memory haystackBytes = bytes(haystack);
        bytes memory needleBytes = bytes(needle);
        if (needleBytes.length == 0 || haystackBytes.length < needleBytes.length) {
            return false;
        }

        for (uint256 i = 0; i <= haystackBytes.length - needleBytes.length; i++) {
            if (_matchesAt(haystackBytes, needleBytes, i)) {
                return true;
            }
        }

        return false;
    }

    function _matchesAt(
        bytes memory data,
        bytes memory needle,
        uint256 start
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < needle.length; i++) {
            if (data[start + i] != needle[i]) {
                return false;
            }
        }
        return true;
    }

    function _slice(
        bytes memory data,
        uint256 start,
        uint256 endExclusive
    ) internal pure returns (string memory) {
        bytes memory result = new bytes(endExclusive - start);
        for (uint256 i = start; i < endExclusive; i++) {
            result[i - start] = data[i];
        }
        return string(result);
    }

    function _equals(string memory left, string memory right) internal pure returns (bool) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }

    function _isJsonSpacer(bytes1 char) internal pure returns (bool) {
        return
            char == bytes1(0x20) ||
            char == bytes1(0x09) ||
            char == bytes1(0x0A) ||
            char == bytes1(0x0D);
    }

    function _isNumberChar(bytes1 char) internal pure returns (bool) {
        return (char >= bytes1(0x30) && char <= bytes1(0x39)) || char == bytes1(0x2E);
    }

    function _twoDigitString(uint256 value) internal pure returns (string memory) {
        if (value < 10) {
            return string.concat("0", _uintToString(value));
        }
        return _uintToString(value);
    }

    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }

        uint256 digits = 0;
        uint256 temp = value;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }

    function _addressToString(address account) internal pure returns (string memory) {
        bytes20 data = bytes20(account);
        bytes16 alphabet = 0x30313233343536373839616263646566;

        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}
