// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./SchemeCredits.sol";
import "./SchemeNFT.sol";

contract PlanningLock {
    enum ApplicationStatus {
        PENDING,
        APPROVED,
        REJECTED
    }

    struct Application {
        address developer;
        bytes32 catchmentHash; // keccak256("SOLENT")
        uint256[] schemeIds;
        uint256[] amounts; // ERC-1155 units per scheme
        ApplicationStatus status;
    }

    SchemeNFT public schemeNft;
    SchemeCredits public schemeCredits;

    mapping(uint256 => Application) public applications;
    uint256 public nextApplicationId;

    event ApplicationSubmitted(
        uint256 indexed applicationId,
        address indexed developer,
        bytes32 catchmentHash,
        uint256[] schemeIds,
        uint256[] amounts
    );

    event ApplicationApproved(uint256 indexed applicationId);
    event ApplicationRejected(uint256 indexed applicationId);

    constructor(address _schemeNft, address _schemeCredits) {
        schemeNft = SchemeNFT(_schemeNft);
        schemeCredits = SchemeCredits(_schemeCredits);
        nextApplicationId = 1;
    }

    function submitApplication(
        address developer,
        uint256[] memory schemeIds,
        uint256[] memory amounts,
        bytes32 requiredCatchment
    ) external returns (uint256) {
        require(developer != address(0), "Invalid developer address");
        require(schemeIds.length == amounts.length, "Arrays length mismatch");
        require(schemeIds.length > 0, "Must include at least one scheme");

        // Validate each scheme and lock credits
        for (uint256 i = 0; i < schemeIds.length; i++) {
            uint256 schemeId = schemeIds[i];
            
            // Read catchment from SchemeNFT
            string memory schemeCatchment = schemeNft.getSchemeCatchment(schemeId);
            require(
                keccak256(bytes(schemeCatchment)) == requiredCatchment,
                "Scheme catchment mismatch"
            );
            
            // Lock credits for this scheme
            schemeCredits.lockCredits(schemeId, developer, amounts[i]);
        }

        uint256 applicationId = nextApplicationId;
        nextApplicationId++;

        applications[applicationId] = Application({
            developer: developer,
            catchmentHash: requiredCatchment,
            schemeIds: schemeIds,
            amounts: amounts,
            status: ApplicationStatus.PENDING
        });

        emit ApplicationSubmitted(
            applicationId,
            developer,
            requiredCatchment,
            schemeIds,
            amounts
        );

        return applicationId;
    }

    function approveApplication(uint256 appId) external {
        Application storage app = applications[appId];
        require(app.developer != address(0), "Application does not exist");
        require(
            app.status == ApplicationStatus.PENDING,
            "Application not pending"
        );

        // Burn locked credits and reduce remaining tonnes for each scheme
        for (uint256 i = 0; i < app.schemeIds.length; i++) {
            uint256 schemeId = app.schemeIds[i];
            uint256 amount = app.amounts[i];
            
            // Burn the locked credits (exactly the amount submitted)
            schemeCredits.burnLockedCredits(schemeId, app.developer, amount);
            
            // Calculate tonnes to reduce (amount is in credits, 1 tonne = 100,000 credits)
            // For partial tonnes, we need to reduce by the fractional amount
            // Since reduceRemainingTonnes takes uint256, we'll reduce by whole tonnes
            // and track the remainder separately if needed
            // For now, we'll only reduce whole tonnes to avoid precision issues
            uint256 wholeTonnes = amount / 100000;
            
            // Reduce remaining tonnes in SchemeNFT (only whole tonnes)
            if (wholeTonnes > 0) {
                schemeNft.reduceRemainingTonnes(schemeId, wholeTonnes);
            }
            // Note: Partial tonnes (< 100,000 credits) are burned but don't reduce remainingTonnes
            // This is acceptable as the credits are permanently removed
        }

        app.status = ApplicationStatus.APPROVED;
        emit ApplicationApproved(appId);
    }

    function rejectApplication(uint256 appId) external {
        Application storage app = applications[appId];
        require(app.developer != address(0), "Application does not exist");
        require(
            app.status == ApplicationStatus.PENDING,
            "Application not pending"
        );

        // Unlock credits for each scheme
        for (uint256 i = 0; i < app.schemeIds.length; i++) {
            uint256 schemeId = app.schemeIds[i];
            uint256 amount = app.amounts[i];
            
            // Unlock the credits
            schemeCredits.unlockCredits(schemeId, app.developer, amount);
        }

        app.status = ApplicationStatus.REJECTED;
        emit ApplicationRejected(appId);
    }

    // Helper function to read arrays from struct (Solidity doesn't auto-generate getters for arrays)
    function getApplicationSchemeIds(uint256 appId) external view returns (uint256[] memory) {
        return applications[appId].schemeIds;
    }

    function getApplicationAmounts(uint256 appId) external view returns (uint256[] memory) {
        return applications[appId].amounts;
    }
}

