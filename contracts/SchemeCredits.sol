// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IPlanningLock {
    // Interface for PlanningLock contract
}

contract SchemeCredits is ERC1155, Ownable {
    IERC721 public schemeNft;
    IPlanningLock public planningContract;

    // Mapping: schemeId => user => locked amount
    mapping(uint256 => mapping(address => uint256)) public lockedBalance;

    constructor(address initialOwner, address _schemeNft) ERC1155("") Ownable(initialOwner) {
        schemeNft = IERC721(_schemeNft);
    }

    function setPlanningContract(address _planningContract) external onlyOwner {
        planningContract = IPlanningLock(_planningContract);
    }

    function mintCredits(
        uint256 schemeId,
        address to,
        uint256 amount
    ) external onlyOwner {
        _mint(to, schemeId, amount, "");
    }

    function lockCredits(
        uint256 schemeId,
        address user,
        uint256 amount
    ) external {
        require(
            msg.sender == address(planningContract),
            "Only planning contract can lock credits"
        );
        require(
            balanceOf(user, schemeId) >= lockedBalance[schemeId][user] + amount,
            "Insufficient unlocked balance"
        );
        lockedBalance[schemeId][user] += amount;
    }

    function unlockCredits(
        uint256 schemeId,
        address user,
        uint256 amount
    ) external {
        require(
            msg.sender == address(planningContract),
            "Only planning contract can unlock credits"
        );
        require(lockedBalance[schemeId][user] >= amount, "Insufficient locked balance");
        lockedBalance[schemeId][user] -= amount;
    }

    function burnLockedCredits(
        uint256 schemeId,
        address user,
        uint256 amount
    ) external {
        require(
            msg.sender == address(planningContract),
            "Only planning contract can burn locked credits"
        );
        require(lockedBalance[schemeId][user] >= amount, "Insufficient locked balance");
        lockedBalance[schemeId][user] -= amount;
        _burn(user, schemeId, amount);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        // Only check locked balance for transfers (not mints or burns)
        if (from != address(0) && from != to) {
            for (uint256 i = 0; i < ids.length; i++) {
                uint256 id = ids[i];
                uint256 amount = values[i];
                require(
                    balanceOf(from, id) - lockedBalance[id][from] >= amount,
                    "Cannot transfer locked credits"
                );
            }
        }

        super._update(from, to, ids, values);
    }
}


