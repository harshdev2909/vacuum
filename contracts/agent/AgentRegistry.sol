// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IAgentRegistry } from "./IAgentRegistry.sol";

/// @title AgentRegistry
/// @notice Register agent, store metadata, creator, active status. Emit AgentRegistered.
contract AgentRegistry is Ownable, IAgentRegistry {
    error AgentRegistry__ZeroId();
    error AgentRegistry__NotCreator();
    error AgentRegistry__AlreadyRegistered();
    error AgentRegistry__NotFound();

    mapping(bytes32 => Agent) private _agents;
    bytes32[] private _agentIds;

    constructor(address owner_) Ownable(owner_) { }

    function registerAgent(bytes32 agentId_, string calldata metadataURI_) external override returns (bool) {
        if (agentId_ == bytes32(0)) revert AgentRegistry__ZeroId();
        if (_agents[agentId_].creator != address(0)) revert AgentRegistry__AlreadyRegistered();
        _agents[agentId_] = Agent({
            agentId: agentId_,
            creator: msg.sender,
            metadataURI: metadataURI_,
            active: true,
            registeredAt: block.timestamp
        });
        _agentIds.push(agentId_);
        emit AgentRegistered(agentId_, msg.sender, metadataURI_, true);
        return true;
    }

    function updateAgent(bytes32 agentId_, string calldata metadataURI_, bool active_) external override {
        if (_agents[agentId_].creator == address(0)) revert AgentRegistry__NotFound();
        if (_agents[agentId_].creator != msg.sender) revert AgentRegistry__NotCreator();
        _agents[agentId_].metadataURI = metadataURI_;
        _agents[agentId_].active = active_;
        emit AgentUpdated(agentId_, metadataURI_, active_);
    }

    function deactivateAgent(bytes32 agentId_) external override {
        if (_agents[agentId_].creator == address(0)) revert AgentRegistry__NotFound();
        if (_agents[agentId_].creator != msg.sender && msg.sender != owner()) revert AgentRegistry__NotCreator();
        _agents[agentId_].active = false;
        emit AgentDeactivated(agentId_);
    }

    function getAgent(bytes32 agentId_) external view override returns (IAgentRegistry.Agent memory) {
        Agent storage a = _agents[agentId_];
        return IAgentRegistry.Agent(a.agentId, a.creator, a.metadataURI, a.active, a.registeredAt);
    }

    function isActive(bytes32 agentId_) external view override returns (bool) {
        return _agents[agentId_].active && _agents[agentId_].creator != address(0);
    }

    function creatorOf(bytes32 agentId_) external view override returns (address) {
        return _agents[agentId_].creator;
    }

    function getAgentIds() external view returns (bytes32[] memory) {
        return _agentIds;
    }
}
