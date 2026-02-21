import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const ARBITRUM_SEPOLIA_RPC = process.env.ARBITRUM_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const ARBITRUM_ONE_RPC = process.env.ARBITRUM_ONE_RPC_URL ?? "https://arb1.arbitrum.io/rpc";
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "0xed4e6b41de24695c30bc93a35e4f2cfe200e099987e3165cc5c0b40571ca8fed";
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY ?? "ETG5DC8CPZIRKVWWS5AFKDSH4GJPPYXDKI";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: process.env.FORK_MAINNET === "1" ? 42161 : 421614,
      forking: {
        url: process.env.FORK_MAINNET === "1" ? ARBITRUM_ONE_RPC : ARBITRUM_SEPOLIA_RPC,
        blockNumber: process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER, 10) : undefined,
      },
      ...(process.env.FORK_MAINNET === "1" && PRIVATE_KEY
        ? {
            // First 4 signers: [owner, treasury, user, referrer]; user (index 2) = your .env wallet
            accounts: [
              { privateKey: "0x0000000000000000000000000000000000000000000000000000000000000001", balance: "10000000000000000000000" },
              { privateKey: "0x0000000000000000000000000000000000000000000000000000000000000002", balance: "10000000000000000000000" },
              { privateKey: PRIVATE_KEY, balance: "10000000000000000000000" },
              { privateKey: "0x0000000000000000000000000000000000000000000000000000000000000003", balance: "10000000000000000000000" },
            ],
          }
        : {
            accounts: {
              count: 20,
              accountsBalance: "10000000000000000000000",
            },
          }),
    },
    "arbitrum-sepolia": {
      url: ARBITRUM_SEPOLIA_RPC,
      chainId: 421614,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    "arbitrum-one": {
      url: ARBITRUM_ONE_RPC,
      chainId: 42161,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      // When node was started with FORK_MAINNET=1, use same 4 accounts so deploy/swap work
      ...(process.env.FORK_MAINNET === "1" && PRIVATE_KEY
        ? {
            accounts: [
              "0x0000000000000000000000000000000000000000000000000000000000000001",
              "0x0000000000000000000000000000000000000000000000000000000000000002",
              PRIVATE_KEY,
              "0x0000000000000000000000000000000000000000000000000000000000000003",
            ],
          }
        : {
            accounts: { mnemonic: "test test test test test test test test test test test junk", count: 20 },
          }),
    },
  },
  etherscan: {
  
    apiKey: process.env.ETHERSCAN_API_KEY ?? process.env.ARBISCAN_API_KEY ?? ARBISCAN_API_KEY,
    customChains: [
      {
        network: "arbitrum-sepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://sepolia.arbiscan.io",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
