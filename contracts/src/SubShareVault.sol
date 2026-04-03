// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
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
    // ─── Immutables ───────────────────────────────────────────────────────────
    IERC20  public immutable usdc;
    address public immutable creator;
    string  public name;
    uint256 public immutable monthlyPrice;     // USDC (6 decimals)
    uint256 public immutable nMembers;         // total seats including creator
    uint256 public immutable duration;         // months
    uint256 public immutable depositPerPerson; // ceil(monthlyPrice * duration / nMembers)

    uint256 public constant APPROVAL_GRACE = 7 days;

    // ─── State ────────────────────────────────────────────────────────────────
    address[] public memberList;
    mapping(address => bool) public isMember;
    mapping(address => bool) public hasDeposited;
    uint256 public depositedCount;

    bool    public isActive;
    uint256 public activatedAt;

    uint256 public monthsClaimed;
    mapping(uint256 => bool)    public monthClaimed;
    mapping(uint256 => mapping(address => bool)) public hasApproved; // month => member => voted
    mapping(uint256 => uint256) public approvalCount;                // month => total votes
    mapping(uint256 => uint256) public firstApprovalAt;              // month => first vote timestamp

    // ─── Events ───────────────────────────────────────────────────────────────
    event MemberJoined(address indexed member);
    event Deposited(address indexed member, uint256 amount);
    event VaultActivated(uint256 timestamp);
    event PaymentApproved(uint256 indexed month, address indexed voter, uint256 totalApprovals);
    event PaymentClaimed(uint256 indexed month, uint256 amount, address creator);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _usdc,
        string memory _name,
        uint256 _monthlyPrice,
        uint256 _nMembers,
        uint256 _duration,
        address _creator
    ) {
        require(_nMembers >= 2,    "Min 2 members");
        require(_duration  >= 1,   "Min 1 month");
        require(_monthlyPrice > 0, "Price must be > 0");

        usdc             = IERC20(_usdc);
        name             = _name;
        monthlyPrice     = _monthlyPrice;
        nMembers         = _nMembers;
        duration         = _duration;
        depositPerPerson = (_monthlyPrice * _duration + _nMembers - 1) / _nMembers;
        creator          = _creator;

        memberList.push(_creator);
        isMember[_creator] = true;
        emit MemberJoined(_creator);
    }

    // ─── Join (before vault active) ───────────────────────────────────────────
    function join() external {
        require(!isActive,                    "Vault already active");
        require(!isMember[msg.sender],        "Already a member");
        require(memberList.length < nMembers, "Vault is full");

        memberList.push(msg.sender);
        isMember[msg.sender] = true;
        emit MemberJoined(msg.sender);
    }

    // ─── Deposit ──────────────────────────────────────────────────────────────
    /// @notice Lock your share. Vault activates when all members deposit.
    function deposit() external {
        require(isMember[msg.sender],      "Not a member: call join() first");
        require(!hasDeposited[msg.sender], "Already deposited");
        require(!isActive,                 "Vault already active");

        bool ok = usdc.transferFrom(msg.sender, address(this), depositPerPerson);
        require(ok, "USDC transfer failed");

        hasDeposited[msg.sender] = true;
        depositedCount++;
        emit Deposited(msg.sender, depositPerPerson);

        if (depositedCount == nMembers) {
            isActive    = true;
            activatedAt = block.timestamp;
            emit VaultActivated(block.timestamp);
        }
    }

    // ─── n-of-n vote to approve monthly payment ───────────────────────────────
    /// @notice Call this to confirm the subscription was delivered this month.
    ///         When ALL n members approve, USDC is automatically sent to creator.
    /// @param month 1-indexed month number
    function approvePayment(uint256 month) external {
        require(isMember[msg.sender],            "Not a member");
        require(isActive,                        "Vault not active");
        require(month >= 1 && month <= duration, "Month out of range");
        require(!monthClaimed[month],            "Already claimed");
        require(!hasApproved[month][msg.sender], "Already voted this month");

        if (approvalCount[month] == 0) {
            firstApprovalAt[month] = block.timestamp;
        }

        hasApproved[month][msg.sender] = true;
        approvalCount[month]++;
        emit PaymentApproved(month, msg.sender, approvalCount[month]);

        // Auto-release when ALL members approve (n-of-n)
        if (approvalCount[month] == nMembers) {
            _releasePayment(month);
        }
    }

    /// @notice Deadlock escape hatch: after APPROVAL_GRACE since first vote,
    ///         creator can claim with (n-1) approvals. Prevents permanent lockup
    ///         from inactive/lost wallet.
    function claimAfterGrace(uint256 month) external {
        require(msg.sender == creator,                "Only creator");
        require(isActive,                             "Vault not active");
        require(month >= 1 && month <= duration,      "Month out of range");
        require(!monthClaimed[month],                 "Already claimed");
        require(approvalCount[month] >= nMembers - 1, "Need at least n-1 approvals");
        require(firstApprovalAt[month] > 0,           "No approvals yet");
        require(
            block.timestamp >= firstApprovalAt[month] + APPROVAL_GRACE,
            "Grace period not elapsed"
        );
        _releasePayment(month);
    }

    function _releasePayment(uint256 month) internal {
        monthClaimed[month] = true;
        monthsClaimed++;
        bool ok = usdc.transfer(creator, monthlyPrice);
        require(ok, "USDC transfer failed");
        emit PaymentClaimed(month, monthlyPrice, creator);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────
    function getMemberCount() external view returns (uint256) { return memberList.length; }
    function getVaultBalance() external view returns (uint256) { return usdc.balanceOf(address(this)); }
    function getMember(uint256 index) external view returns (address) { return memberList[index]; }

    function getMonthStatus(uint256 month) external view returns (
        bool claimed,
        uint256 approvals,
        bool callerHasApproved,
        uint256 graceAvailableAt
    ) {
        uint256 grace = firstApprovalAt[month] > 0
            ? firstApprovalAt[month] + APPROVAL_GRACE
            : 0;
        return (
            monthClaimed[month],
            approvalCount[month],
            hasApproved[month][msg.sender],
            grace
        );
    }

    function getInfo() external view returns (
        string memory  _name,
        uint256 _monthlyPrice,
        uint256 _nMembers,
        uint256 _duration,
        uint256 _depositPerPerson,
        bool    _isActive,
        uint256 _depositedCount,
        uint256 _monthsClaimed,
        address _creator,
        uint256 _balance
    ) {
        return (
            name, monthlyPrice, nMembers, duration, depositPerPerson,
            isActive, depositedCount, monthsClaimed, creator,
            usdc.balanceOf(address(this))
        );
    }
}
