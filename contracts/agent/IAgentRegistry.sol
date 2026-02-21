// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentRegistry
/// @notice SDK-compatible interface for agent registration and metadata
interface IAgentRegistry {
    event AgentRegistered(bytes32 indexed agentId, address indexed creator, string metadataURI, bool active);
    event AgentUpdated(bytes32 indexed agentId, string metadataURI, bool active);
    event AgentDeactivated(bytes32 indexed agentId);

    struct Agent {
        bytes32 agentId;
        address creator;
        string metadataURI;
        bool active;
        uint256 registeredAt;
    }

    function registerAgent(bytes32 agentId_, string calldata metadataURI_) external returns (bool);
    function updateAgent(bytes32 agentId_, string calldata metadataURI_, bool active_) external;
    function deactivateAgent(bytes32 agentId_) external;
    function getAgent(bytes32 agentId_) external view returns (Agent memory);
    function isActive(bytes32 agentId_) external view returns (bool);
    function creatorOf(bytes32 agentId_) external view returns (address);
}
