// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SchemeNFT is ERC721, Ownable {
    struct SchemeInfo {
        string name; // "Solent Wetland Scheme A"
        string catchment; // e.g. "SOLENT"
        string location; // free text / coordinates
        uint256 originalTonnes; // e.g. 50
        uint256 remainingTonnes; // decremented as credits are burned
        string ipfsCid; // IPFS CID of agreement/docs
        string sha256Hash; // SHA-256 hash of the archived agreement file
    }

    mapping(uint256 => SchemeInfo) public schemes;
    uint256 private _nextTokenId;

    // Address of the PlanningLock contract allowed to update remaining tonnes
    address public planningContract;

    modifier onlyPlanning() {
        require(msg.sender == planningContract, "Only planning contract");
        _;
    }

    constructor(address initialOwner) ERC721("SchemeNFT", "SCHEME") Ownable(initialOwner) {
        _nextTokenId = 1;
    }

    function setPlanningContract(address _planningContract) external onlyOwner {
        planningContract = _planningContract;
    }

    function mintScheme(
        string memory name,
        string memory catchment,
        string memory location,
        uint256 originalTonnes,
        string memory ipfsCid,
        string memory sha256Hash,
        address recipient
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        schemes[tokenId] = SchemeInfo({
            name: name,
            catchment: catchment,
            location: location,
            originalTonnes: originalTonnes,
            remainingTonnes: originalTonnes,
            ipfsCid: ipfsCid,
            sha256Hash: sha256Hash
        });

        // Mint to the landowner (recipient), but regulator (contract owner) retains oversight
        _safeMint(recipient, tokenId);

        return tokenId;
    }

    function reduceRemainingTonnes(uint256 tokenId, uint256 tonnesToReduce) external onlyPlanning {
        require(
            _ownerOf(tokenId) != address(0),
            "Scheme does not exist"
        );
        require(
            schemes[tokenId].remainingTonnes >= tonnesToReduce,
            "Insufficient remaining tonnes"
        );
        // Note: In production, consider restricting this to PlanningLock contract
        schemes[tokenId].remainingTonnes -= tonnesToReduce;
    }

    // Helper function to get catchment for a scheme
    function getSchemeCatchment(uint256 tokenId) external view returns (string memory) {
        return schemes[tokenId].catchment;
    }
}

