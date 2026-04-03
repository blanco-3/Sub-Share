// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title SubShareVault
/// @notice Trustless subscription cost-sharing vault.
///         Members deposit their share upfront. Creator pays the subscription
///         out of pocket each month and claims reimbursement from the vault.
///         No one can withdraw arbitrarily — only the exact monthly price,
///         only after creator certifies payment, only for each month once.
contract SubShareVault {
    // ─── Immutables ───────────────────────────────────────────────────────────
    IERC20 public immutable usdc;
    address public immutable creator;
    string  public name;
    uint256 public immutable monthlyPrice;    // USDC (6 decimals)
    uint256 public immutable nMembers;        // total seats including creator
    uint256 public immutable duration;        // months
    uint256 public immutable depositPerPerson; // monthlyPrice * duration / nMembers

    // ─── State ────────────────────────────────────────────────────────────────
    address[] public memberList;
    mapping(address => bool) public isMember;
    mapping(address => bool) public hasDeposited;
    uint256 public depositedCount;

    bool    public isActive;
    uint256 public activatedAt;

    uint256 public monthsClaimed;
    mapping(uint256 => bool) public monthClaimed; // month (1-indexed) => claimed

    // ─── Events ───────────────────────────────────────────────────────────────
    event MemberJoined(address indexed member);
    event Deposited(address indexed member, uint256 amount);
    event VaultActivated(uint256 timestamp);
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
        require(_nMembers >= 2,      "Min 2 members");
        require(_duration  >= 1,     "Min 1 month");
        require(_monthlyPrice > 0,   "Price must be > 0");

        usdc          = IERC20(_usdc);
        name          = _name;
        monthlyPrice  = _monthlyPrice;
        nMembers      = _nMembers;
        duration      = _duration;
        depositPerPerson = (_monthlyPrice * _duration + _nMembers - 1) / _nMembers;
        creator       = _creator;

        // Creator is automatically member #1
        memberList.push(_creator);
        isMember[_creator] = true;
        emit MemberJoined(_creator);
    }

    // ─── Join (before vault active) ───────────────────────────────────────────
    /// @notice Join the vault. Must then call deposit() to lock funds.
    function join() external {
        require(!isActive,                         "Vault already active");
        require(!isMember[msg.sender],             "Already a member");
        require(memberList.length < nMembers,      "Vault is full");

        memberList.push(msg.sender);
        isMember[msg.sender] = true;
        emit MemberJoined(msg.sender);
    }

    // ─── Deposit ──────────────────────────────────────────────────────────────
    /// @notice Lock your share. Requires prior USDC approval of depositPerPerson.
    ///         Vault activates automatically when all members have deposited.
    function deposit() external {
        require(isMember[msg.sender],          "Not a member: call join() first");
        require(!hasDeposited[msg.sender],     "Already deposited");
        require(!isActive,                     "Vault already active");

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

    // ─── Claim monthly reimbursement ──────────────────────────────────────────
    /// @notice Creator calls this after paying for the subscription out of pocket.
    ///         Releases exactly monthlyPrice USDC to creator.
    ///         Each month can only be claimed once, and only up to duration.
    /// @param month 1-indexed month number (1 = first month, etc.)
    function claimMonthlyPayment(uint256 month) external {
        require(msg.sender == creator,             "Only creator");
        require(isActive,                          "Vault not active");
        require(month >= 1 && month <= duration,   "Month out of range");
        require(!monthClaimed[month],              "Month already claimed");

        monthClaimed[month] = true;
        monthsClaimed++;

        bool ok = usdc.transfer(creator, monthlyPrice);
        require(ok, "USDC transfer failed");

        emit PaymentClaimed(month, monthlyPrice, creator);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────
    function getMemberCount() external view returns (uint256) {
        return memberList.length;
    }

    function getVaultBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /// @notice Returns all core vault info in one call (reduces RPC calls)
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

    function getMember(uint256 index) external view returns (address) {
        return memberList[index];
    }
}
