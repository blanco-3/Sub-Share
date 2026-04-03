// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SubShareVault.sol";

contract MockUSDC is IERC20 {
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(balanceOf[from] >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");

        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockReclaimVerifier is IReclaimVerifier {
    bool public shouldRevert;

    function setShouldRevert(bool value) external {
        shouldRevert = value;
    }

    function verifyProof(Reclaim.Proof memory) external override {
        require(!shouldRevert, "invalid proof");
    }
}

contract SubShareVaultTest is Test {
    address internal constant CREATOR = address(0xA11CE);
    address internal constant MEMBER = address(0xB0B);

    uint256 internal constant MONTHLY_PRICE = 20_000_000;
    uint256 internal constant DURATION = 3;
    string internal constant PROVIDER_ID = "stripe-claude-provider";

    MockUSDC internal usdc;
    MockReclaimVerifier internal verifier;
    SubShareVault internal vault;

    function setUp() public {
        usdc = new MockUSDC();
        verifier = new MockReclaimVerifier();
        vault = new SubShareVault(
            address(usdc),
            "Claude Pro",
            MONTHLY_PRICE,
            2,
            DURATION,
            CREATOR,
            address(verifier),
            PROVIDER_ID
        );

        vm.prank(MEMBER);
        vault.join();

        uint256 depositAmount = vault.depositPerPerson();
        usdc.mint(CREATOR, depositAmount);
        usdc.mint(MEMBER, depositAmount);

        vm.prank(CREATOR);
        usdc.approve(address(vault), depositAmount);
        vm.prank(MEMBER);
        usdc.approve(address(vault), depositAmount);

        vm.prank(CREATOR);
        vault.deposit();
        vm.prank(MEMBER);
        vault.deposit();
    }

    function testDepositRequiresFullTeamBeforeAnyDeposit() public {
        SubShareVault partialVault = new SubShareVault(
            address(usdc),
            "Claude Pro",
            MONTHLY_PRICE,
            3,
            DURATION,
            CREATOR,
            address(verifier),
            PROVIDER_ID
        );

        uint256 depositAmount = partialVault.depositPerPerson();
        usdc.mint(CREATOR, depositAmount);
        vm.prank(CREATOR);
        usdc.approve(address(partialVault), depositAmount);

        vm.prank(CREATOR);
        vm.expectRevert("Team not full yet");
        partialVault.deposit();
    }

    function testClaimWithProofReleasesPaymentWhenReceiptMatches() public {
        uint256 creatorBalanceBefore = usdc.balanceOf(CREATOR);

        vm.prank(CREATOR);
        vault.claimWithProof(
            _proof(PROVIDER_ID, _context("Claude Pro", "20.00"), keccak256("proof-1")),
            1
        );

        assertEq(usdc.balanceOf(CREATOR), creatorBalanceBefore + MONTHLY_PRICE);
        assertTrue(vault.monthClaimed(1));
        assertEq(vault.monthsClaimed(), 1);
        assertTrue(vault.usedProofs(keccak256("proof-1")));
    }

    function testClaimWithProofAcceptsWholeDollarAmount() public {
        vm.prank(CREATOR);
        vault.claimWithProof(
            _proof(PROVIDER_ID, _context("Claude Pro", "20"), keccak256("proof-2")),
            1
        );

        assertTrue(vault.monthClaimed(1));
    }

    function testClaimWithProofAcceptsStripeMinorUnitAmount() public {
        vm.prank(CREATOR);
        vault.claimWithProof(
            _proof(PROVIDER_ID, _context("Claude Pro", "2000"), keccak256("proof-2b")),
            1
        );

        assertTrue(vault.monthClaimed(1));
    }

    function testClaimWithProofRejectsWrongProvider() public {
        vm.prank(CREATOR);
        vm.expectRevert("Invalid provider");
        vault.claimWithProof(
            _proof("other-provider", _context("Claude Pro", "20.00"), keccak256("proof-3")),
            1
        );
    }

    function testClaimWithProofRejectsMissingClaudePlan() public {
        vm.prank(CREATOR);
        vm.expectRevert("Missing Claude plan");
        vault.claimWithProof(
            _proof(PROVIDER_ID, _context("ChatGPT Plus", "20.00"), keccak256("proof-4")),
            1
        );
    }

    function testClaimWithProofRejectsAmountMismatch() public {
        vm.prank(CREATOR);
        vm.expectRevert("Amount mismatch");
        vault.claimWithProof(
            _proof(PROVIDER_ID, _context("Claude Pro", "30.00"), keccak256("proof-5")),
            1
        );
    }

    function testClaimWithProofRejectsLockedFutureMonth() public {
        vm.prank(CREATOR);
        vm.expectRevert("Month still timelocked");
        vault.claimWithProof(
            _proof(PROVIDER_ID, _context("Claude Pro", "20.00"), keccak256("proof-6")),
            2
        );
    }

    function testFutureMonthUnlocksAfterThirtyDays() public {
        vm.warp(block.timestamp + 30 days);

        vm.prank(CREATOR);
        vault.claimWithProof(
            _proof(PROVIDER_ID, _context("Claude Pro", "20.00"), keccak256("proof-7")),
            2
        );

        assertTrue(vault.monthClaimed(2));
    }

    function _proof(
        string memory providerId,
        string memory context,
        bytes32 identifier
    ) internal pure returns (Reclaim.Proof memory proof) {
        bytes[] memory signatures = new bytes[](1);
        signatures[0] = hex"01";

        proof.claimInfo = Reclaim.ClaimInfo({
            provider: providerId,
            parameters: "{}",
            context: context
        });
        proof.signedClaim = Reclaim.SignedClaim({
            claim: Reclaim.CompleteClaimData({
                identifier: identifier,
                owner: CREATOR,
                timestampS: 1,
                epoch: 1
            }),
            signatures: signatures
        });
    }

    function _context(
        string memory plan,
        string memory amount
    ) internal pure returns (string memory) {
        return string.concat(
            "{\"contextAddress\":\"0x0\",\"contextMessage\":\"sub-share\",\"extractedParameters\":",
            "{\"plan\":\"",
            plan,
            "\",\"amount\":\"",
            amount,
            "\"}}"
        );
    }
}
