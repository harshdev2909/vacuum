import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useBalance,
  useBlock,
  useChainId,
  useDisconnect,
  useReadContract,
  useSignTypedData,
  useWriteContract,
} from "wagmi";
import { formatEther, formatUnits, getAddress, parseEther, parseUnits, zeroAddress } from "viem";
import { EXECUTION_ROUTER_ABI } from "./abi";
import { ERC20_ABI } from "./abis/erc20";
import { REFERRAL_REGISTRY_ABI } from "./abis/referral";
import { WALLET_AUTH_ABI } from "./abis/walletAuth";
import { FEE_MANAGER_ABI } from "./abis/feeManager";
import { VAULT_ABI } from "./abis/vault";
import {
  ARBITRUM_SEPOLIA,
  DEFAULT_ROUTER,
  ROUTER_WITH_WRAP,
  REFERRAL_REGISTRY,
  WALLET_AUTH,
  FEE_MANAGER,
  VAULT,
  STRATEGY_NFT,
  STRATEGY_REGISTRY,
  STRATEGY_SUBSCRIPTION_MANAGER,
  STRATEGY_MARKETPLACE,
  ROYALTY_DISTRIBUTOR,
  RISK_GUARD,
  POLICY_ENGINE,
  TREASURY_AUTOMATION_CONTROLLER,
  BUYBACK_MODULE,
  GOVERNANCE_EXECUTOR_ADAPTER,
} from "./constants";
import {
  STRATEGY_NFT_ABI,
  STRATEGY_REGISTRY_ABI,
  STRATEGY_SUBSCRIPTION_ABI,
  STRATEGY_MARKETPLACE_ABI,
  ROYALTY_DISTRIBUTOR_ABI,
} from "./abis/phase3";
import {
  RISK_GUARD_ABI,
  POLICY_ENGINE_ABI,
  TREASURY_AUTOMATION_CONTROLLER_ABI,
  BUYBACK_MODULE_ABI,
  GOVERNANCE_EXECUTOR_ADAPTER_ABI,
} from "./abis/phase4";
import { TxStatusModal } from "./components/TxStatusModal";
import "./App.css";

type OutputToken = "WETH" | "USDC";
type TabId = "swap" | "vault" | "strategy" | "dao" | "referral" | "delegate" | "agent" | "protocol";

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("swap");
  const routerAddress = DEFAULT_ROUTER;
  const [amountEth, setAmountEth] = useState("0.001");
  const [outputToken, setOutputToken] = useState<OutputToken>("USDC");
  const [referrerAddress, setReferrerAddress] = useState("");
  const [delegateAddress, setDelegateAddress] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [delegateAmountEth, setDelegateAmountEth] = useState("0.001");
  const [delegateOutputToken, setDelegateOutputToken] = useState<OutputToken>("USDC");
  const [lastDelegateTxHash, setLastDelegateTxHash] = useState<string | null>(null);
  const [lastDelegateResult, setLastDelegateResult] = useState<string>("");
  const delegateExecutionPendingRef = useRef(false);
  const [withdrawToken, setWithdrawToken] = useState<"WETH" | "USDC">("WETH");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [treasurySnapshotBefore, setTreasurySnapshotBefore] = useState<{
    eth: string;
    weth: string;
    usdc: string;
  } | null>(null);
  const [lastWithdrawTxHash, setLastWithdrawTxHash] = useState<string | null>(null);
  const withdrawPendingRef = useRef(false);
  const claimPendingRef = useRef(false);
  const [claimToken, setClaimToken] = useState<"WETH" | "USDC">("WETH");
  const [balancesBefore, setBalancesBefore] = useState<{
    eth: string;
    weth: string;
    usdc: string;
    referrerWeth?: string;
    referrerUsdc?: string;
  } | null>(null);
  const [vaultDepositAmount, setVaultDepositAmount] = useState("");
  const [vaultWithdrawAmount, setVaultWithdrawAmount] = useState("");
  const [vaultRedeemAmount, setVaultRedeemAmount] = useState("");
  const [subTokenId, setSubTokenId] = useState("");
  const [subDurationDays, setSubDurationDays] = useState("30");
  const [subAmount, setSubAmount] = useState("");
  const [listTokenId, setListTokenId] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [buyTokenId, setBuyTokenId] = useState("");
  const [affiliateAddress, setAffiliateAddress] = useState("");
  const [lookupStrategyAddress, setLookupStrategyAddress] = useState("");
  const [regStrategy] = useState(VAULT);
  const [regCreator, setRegCreator] = useState("");
  const [regStrategyType, setRegStrategyType] = useState<"0" | "1">("0");
  const [regRiskLevel, setRegRiskLevel] = useState("0");
  const [regPerfHash, setRegPerfHash] = useState("");
  const [regMetadataURI, setRegMetadataURI] = useState("");
  const DAO_DAILY_SPEND_OPTIONS = ["0.1", "0.25", "0.5", "1", "2", "5", "10"] as const;
  const DAO_SLIPPAGE_BPS_OPTIONS = ["10", "50", "100", "200", "500"] as const;
  const [daoMaxDailySpend, setDaoMaxDailySpend] = useState<string>(DAO_DAILY_SPEND_OPTIONS[3]); // 1 ETH
  const [daoMaxSlippageBps, setDaoMaxSlippageBps] = useState<string>(DAO_SLIPPAGE_BPS_OPTIONS[2]); // 100 bps
  const [daoRuleIdHex, setDaoRuleIdHex] = useState("");
  const [daoRuleIdDropdown, setDaoRuleIdDropdown] = useState<string>(""); // "" = custom, else selected rule id
  const [daoTriggerPayload, setDaoTriggerPayload] = useState("");
  const [daoAdapterExecutor, setDaoAdapterExecutor] = useState(TREASURY_AUTOMATION_CONTROLLER);
  const [txModalAction, setTxModalAction] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const isCorrectChain = chainId === ARBITRUM_SEPOLIA.chainId;
  const { data: block } = useBlock({ blockTag: "pending" });
  const baseFee = block?.baseFeePerGas ?? 0n;
  // Arbitrum L2: cap gas to avoid RPC/baseFee quirks causing 40k+ ETH fee display (max 2 gwei on Arbitrum Sepolia)
  const ARB_GAS_CAP = 2n * 10n ** 9n; // 2 gwei
  const rawMaxFeePerGas = baseFee > 0n ? (baseFee * 150n) / 100n + 10n ** 9n : 100n * 10n ** 9n;
  const maxFeePerGas = isCorrectChain && rawMaxFeePerGas > ARB_GAS_CAP ? ARB_GAS_CAP : rawMaxFeePerGas;
  const rawStrategyMax = baseFee > 0n ? (baseFee * 110n) / 100n + 5n * 10n ** 8n : 30n * 10n ** 9n;
  const strategyMaxFeePerGas = isCorrectChain && rawStrategyMax > ARB_GAS_CAP ? ARB_GAS_CAP : rawStrategyMax;
  const strategyPriorityFee = 5n * 10n ** 8n; // 0.5 gwei
  const rawMarketplaceMax = baseFee > 0n ? (baseFee * 120n) / 100n + 10n ** 8n : 50n * 10n ** 9n;
  const marketplaceMaxFeePerGas = isCorrectChain && rawMarketplaceMax > ARB_GAS_CAP ? ARB_GAS_CAP : rawMarketplaceMax;
  const marketplacePriorityFee = 10n ** 8n;

  const routerAddressChecksummed =
    routerAddress.trim() && /^0x[a-fA-F0-9]{40}$/.test(routerAddress.trim())
      ? (() => {
          try {
            return getAddress(routerAddress.trim());
          } catch {
            return null;
          }
        })()
      : null;

  const { data: nonce = 0n } = useReadContract({
    address: routerAddressChecksummed ?? undefined,
    abi: EXECUTION_ROUTER_ABI,
    functionName: "executionNonces",
    args: address ? [address] : undefined,
  });

  const { data: routerWeth } = useReadContract({
    address: routerAddressChecksummed ?? undefined,
    abi: EXECUTION_ROUTER_ABI,
    functionName: "weth",
  });
  const expectedWeth = getAddress(ARBITRUM_SEPOLIA.weth);
  const routerWethMismatch =
    routerWeth != null && expectedWeth != null && routerWeth.toLowerCase() !== expectedWeth.toLowerCase();

  const {
    writeContract,
    isPending: isSwapPending,
    data: txHash,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { data: myReferrer } = useReadContract({
    address: REFERRAL_REGISTRY as `0x${string}`,
    abi: REFERRAL_REGISTRY_ABI,
    functionName: "referrerOf",
    args: address ? [address] : undefined,
  });
  const claimTokenAddress = claimToken === "WETH" ? ARBITRUM_SEPOLIA.weth : ARBITRUM_SEPOLIA.usdc;
  const claimTokenAddressChecksummed = getAddress(claimTokenAddress);
  const referralRegistryAddress = REFERRAL_REGISTRY as `0x${string}`;
  const usdcForEarnings = getAddress(ARBITRUM_SEPOLIA.usdc);
  const wethForEarnings = getAddress(ARBITRUM_SEPOLIA.weth);
  const { data: referralEarnings = 0n, refetch: refetchReferralEarnings } = useReadContract({
    address: referralRegistryAddress,
    abi: REFERRAL_REGISTRY_ABI,
    functionName: "earnings",
    args: address ? [address, claimTokenAddressChecksummed] : undefined,
    chainId: ARBITRUM_SEPOLIA.chainId,
  });
  const { data: referrerEarningsWeth = 0n } = useReadContract({
    address: referralRegistryAddress,
    abi: REFERRAL_REGISTRY_ABI,
    functionName: "earnings",
    args: myReferrer && myReferrer !== zeroAddress ? [myReferrer, wethForEarnings] : undefined,
    chainId: ARBITRUM_SEPOLIA.chainId,
  });
  const { data: referrerEarningsUsdc = 0n } = useReadContract({
    address: referralRegistryAddress,
    abi: REFERRAL_REGISTRY_ABI,
    functionName: "earnings",
    args: myReferrer && myReferrer !== zeroAddress ? [myReferrer, usdcForEarnings] : undefined,
    chainId: ARBITRUM_SEPOLIA.chainId,
  });
  const { data: myEarningsWeth = 0n, refetch: refetchMyEarningsWeth, isError: isMyEarningsWethError } = useReadContract({
    address: referralRegistryAddress,
    abi: REFERRAL_REGISTRY_ABI,
    functionName: "earnings",
    args: address ? [address, wethForEarnings] : undefined,
    chainId: ARBITRUM_SEPOLIA.chainId,
  });
  const { data: myEarningsUsdc = 0n, refetch: refetchMyEarningsUsdc, isError: isMyEarningsUsdcError } = useReadContract({
    address: referralRegistryAddress,
    abi: REFERRAL_REGISTRY_ABI,
    functionName: "earnings",
    args: address ? [address, usdcForEarnings] : undefined,
    chainId: ARBITRUM_SEPOLIA.chainId,
  });
  const refetchAllEarnings = () => {
    refetchReferralEarnings();
    refetchMyEarningsWeth();
    refetchMyEarningsUsdc();
  };

  const wethContractAddress = getAddress(ARBITRUM_SEPOLIA.weth) as `0x${string}`;
  const usdcContractAddress = getAddress(ARBITRUM_SEPOLIA.usdc) as `0x${string}`;
  const { data: wethBalance, refetch: refetchWethBalance } = useReadContract({
    address: wethContractAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });
  const { data: usdcBalanceRaw, refetch: refetchUsdcBalance } = useReadContract({
    address: usdcContractAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });
  const usdcBalance = usdcBalanceRaw ?? 0n;
  const { data: referrerWethBalance } = useReadContract({
    address: wethContractAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: myReferrer && myReferrer !== zeroAddress ? [myReferrer] : undefined,
  });
  const { data: referrerUsdcBalance } = useReadContract({
    address: usdcContractAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: myReferrer && myReferrer !== zeroAddress ? [myReferrer] : undefined,
  });

  const delegateChecksummed =
    delegateAddress.trim() && /^0x[a-fA-F0-9]{40}$/.test(delegateAddress.trim())
      ? (() => {
          try {
            return getAddress(delegateAddress.trim());
          } catch {
            return null;
          }
        })()
      : null;
  const { data: isDelegateAuthorized } = useReadContract({
    address: WALLET_AUTH as `0x${string}`,
    abi: WALLET_AUTH_ABI,
    functionName: "isAuthorized",
    args: address && delegateChecksummed ? [address, delegateChecksummed] : undefined,
  });
  const { data: walletAuthNonce = 0n } = useReadContract({
    address: WALLET_AUTH as `0x${string}`,
    abi: WALLET_AUTH_ABI,
    functionName: "nonces",
    args: address ? [address] : undefined,
  });

  const ownerAddressChecksummed =
    ownerAddress.trim() && /^0x[a-fA-F0-9]{40}$/.test(ownerAddress.trim())
      ? (() => {
          try {
            return getAddress(ownerAddress.trim());
          } catch {
            return null;
          }
        })()
      : null;
  const { data: ownerExecutionNonce = 0n } = useReadContract({
    address: routerAddressChecksummed ?? undefined,
    abi: EXECUTION_ROUTER_ABI,
    functionName: "executionNonces",
    args: ownerAddressChecksummed ? [ownerAddressChecksummed] : undefined,
  });
  const { data: isAuthorizedForOwner } = useReadContract({
    address: WALLET_AUTH as `0x${string}`,
    abi: WALLET_AUTH_ABI,
    functionName: "isAuthorized",
    args: ownerAddressChecksummed && address ? [ownerAddressChecksummed, address] : undefined,
  });
  const { data: ownerWalletAuthNonce = 0n } = useReadContract({
    address: WALLET_AUTH as `0x${string}`,
    abi: WALLET_AUTH_ABI,
    functionName: "nonces",
    args: ownerAddressChecksummed ? [ownerAddressChecksummed] : undefined,
  });

  const { signTypedDataAsync } = useSignTypedData();

  const { data: protocolFeeBps } = useReadContract({
    address: FEE_MANAGER as `0x${string}`,
    abi: FEE_MANAGER_ABI,
    functionName: "protocolFeeBps",
  });
  const { data: referralSplitBps } = useReadContract({
    address: FEE_MANAGER as `0x${string}`,
    abi: FEE_MANAGER_ABI,
    functionName: "referralSplitBps",
  });
  const { data: treasuryAddress } = useReadContract({
    address: FEE_MANAGER as `0x${string}`,
    abi: FEE_MANAGER_ABI,
    functionName: "treasury",
  });
  const treasuryAddressHex = (treasuryAddress != null ? treasuryAddress : undefined) as `0x${string}` | undefined;
  const { data: totalFeesWeth = 0n } = useReadContract({
    address: FEE_MANAGER as `0x${string}`,
    abi: FEE_MANAGER_ABI,
    functionName: "totalFeesCollected",
    args: [getAddress(ARBITRUM_SEPOLIA.weth)],
  });
  const { data: totalFeesUsdc = 0n } = useReadContract({
    address: FEE_MANAGER as `0x${string}`,
    abi: FEE_MANAGER_ABI,
    functionName: "totalFeesCollected",
    args: [getAddress(ARBITRUM_SEPOLIA.usdc)],
  });
  const feeManagerAddressHex = FEE_MANAGER as `0x${string}`;
  const { data: feeManagerWethBalance = 0n } = useReadContract({
    address: getAddress(ARBITRUM_SEPOLIA.weth) as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [feeManagerAddressHex],
  });
  const { data: feeManagerUsdcBalance = 0n } = useReadContract({
    address: getAddress(ARBITRUM_SEPOLIA.usdc) as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [feeManagerAddressHex],
  });
  const { data: treasuryEthBalance } = useBalance({ address: treasuryAddressHex });
  const { data: treasuryWethBalance = 0n } = useReadContract({
    address: getAddress(ARBITRUM_SEPOLIA.weth) as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: treasuryAddressHex ? [treasuryAddressHex] : undefined,
  });
  const { data: treasuryUsdcBalance = 0n } = useReadContract({
    address: getAddress(ARBITRUM_SEPOLIA.usdc) as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: treasuryAddressHex ? [treasuryAddressHex] : undefined,
  });

  const vaultAddress = VAULT as `0x${string}`;
  const { data: vaultAssetAddress } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "asset",
  });
  const vaultAsset = (vaultAssetAddress != null ? getAddress(vaultAssetAddress) : getAddress(ARBITRUM_SEPOLIA.usdc)) as `0x${string}`;
  const { data: vaultTotalAssets = 0n } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "totalAssets",
  });
  const { data: vaultTotalSupply = 0n } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "totalSupply",
  });
  const { data: vaultUserShares = 0n, refetch: refetchVaultUserShares } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });
  const { data: vaultUserAssets = 0n } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "convertToAssets",
    args: vaultUserShares !== undefined ? [vaultUserShares] : undefined,
  });
  const { data: vaultMaxDeposit = 0n } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "maxDeposit",
    args: address ? [address] : undefined,
  });
  const { data: vaultDepositCap = 0n } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "depositCap",
  });
  const { data: vaultPerformanceFeeBps = 0n } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "performanceFeeBps",
  });
  const { data: vaultWithdrawalFeeBps = 0n } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "withdrawalFeeBps",
  });
  const { data: vaultStrategyActive = false } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "strategyActive",
  });
  const { data: vaultPaused = false } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "paused",
  });
  const { data: vaultSymbol = "vUSDC" } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "symbol",
  });
  const { data: vaultAssetAllowance = 0n, refetch: refetchVaultAssetAllowance } = useReadContract({
    address: vaultAsset,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, vaultAddress] : undefined,
  });

  const strategyNftAddress = STRATEGY_NFT as `0x${string}`;
  const subscriptionManagerAddress = STRATEGY_SUBSCRIPTION_MANAGER as `0x${string}`;
  const marketplaceAddress = STRATEGY_MARKETPLACE as `0x${string}`;
  const royaltyDistributorAddress = ROYALTY_DISTRIBUTOR as `0x${string}`;
  const usdcAddress = getAddress(ARBITRUM_SEPOLIA.usdc) as `0x${string}`;
  const { data: strategyNftBalance = 0n } = useReadContract({
    address: strategyNftAddress,
    abi: STRATEGY_NFT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });
  const subTokenIdNum = subTokenId.trim() ? (() => { try { return BigInt(subTokenId.trim()); } catch { return null; } })() : null;
  const { data: subscriptionExpiry = 0n } = useReadContract({
    address: subscriptionManagerAddress,
    abi: STRATEGY_SUBSCRIPTION_ABI,
    functionName: "subscriptionExpiry",
    args: address && subTokenIdNum != null ? [address, subTokenIdNum] : undefined,
  });
  const buyTokenIdNum = buyTokenId.trim() ? (() => { try { return BigInt(buyTokenId.trim()); } catch { return null; } })() : null;
  const { data: listingData } = useReadContract({
    address: marketplaceAddress,
    abi: STRATEGY_MARKETPLACE_ABI,
    functionName: "getListing",
    args: buyTokenIdNum != null ? [buyTokenIdNum] : undefined,
  });
  const [listingSeller, listingPaymentToken, listingPrice] = listingData ?? [undefined, undefined, undefined];
  const { data: royaltyClaimableUsdc = 0n } = useReadContract({
    address: royaltyDistributorAddress,
    abi: ROYALTY_DISTRIBUTOR_ABI,
    functionName: "claimable",
    args: address ? [address, usdcAddress] : undefined,
  });
  const { data: usdcAllowanceSubscription = 0n } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, subscriptionManagerAddress] : undefined,
  });
  const { data: nftApprovedForMarketplace } = useReadContract({
    address: strategyNftAddress,
    abi: STRATEGY_NFT_ABI,
    functionName: "isApprovedForAll",
    args: address ? [address, marketplaceAddress] : undefined,
  });
  const lookupStrategyChecksummed = (() => {
    if (!lookupStrategyAddress.trim() || !/^0x[a-fA-F0-9]{40}$/.test(lookupStrategyAddress.trim())) return null;
    try { return getAddress(lookupStrategyAddress.trim()) as `0x${string}`; } catch { return null; }
  })();
  const { data: lookedUpTokenId } = useReadContract({
    address: STRATEGY_REGISTRY as `0x${string}`,
    abi: STRATEGY_REGISTRY_ABI,
    functionName: "getTokenId",
    args: lookupStrategyChecksummed ? [lookupStrategyChecksummed] : undefined,
  });
  const registryAddress = STRATEGY_REGISTRY as `0x${string}`;
  const { data: registryOwner } = useReadContract({
    address: registryAddress,
    abi: STRATEGY_REGISTRY_ABI,
    functionName: "owner",
  });
  const isRegistryOwner = address != null && registryOwner != null && address.toLowerCase() === (registryOwner as string).toLowerCase();
  const listingPaymentTokenAddress = (listingPaymentToken != null && listingPaymentToken !== zeroAddress ? listingPaymentToken : undefined) as `0x${string}` | undefined;
  const { data: buyPaymentAllowance = 0n } = useReadContract({
    address: listingPaymentTokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, marketplaceAddress] : undefined,
  });

  const riskGuardAddress = RISK_GUARD as `0x${string}`;
  const policyEngineAddress = POLICY_ENGINE as `0x${string}`;
  const controllerAddress = TREASURY_AUTOMATION_CONTROLLER as `0x${string}`;
  const buybackModuleAddress = BUYBACK_MODULE as `0x${string}`;
  const adapterAddress = GOVERNANCE_EXECUTOR_ADAPTER as `0x${string}`;
  const { data: riskGuardMaxDailySpend = 0n } = useReadContract({ address: riskGuardAddress, abi: RISK_GUARD_ABI, functionName: "maxDailySpend" });
  const { data: riskGuardMaxSlippageBps = 0n } = useReadContract({ address: riskGuardAddress, abi: RISK_GUARD_ABI, functionName: "maxSlippageBps" });
  const { data: riskGuardCurrentDaySpend = 0n } = useReadContract({ address: riskGuardAddress, abi: RISK_GUARD_ABI, functionName: "getCurrentDaySpend" });
  const { data: riskGuardOwner } = useReadContract({ address: riskGuardAddress, abi: RISK_GUARD_ABI, functionName: "owner" });
  const { data: riskGuardPaused = false } = useReadContract({ address: riskGuardAddress, abi: RISK_GUARD_ABI, functionName: "paused" });
  const { data: policyRuleIds = [] } = useReadContract({ address: policyEngineAddress, abi: POLICY_ENGINE_ABI, functionName: "getRuleIds" });
  useReadContract({ address: policyEngineAddress, abi: POLICY_ENGINE_ABI, functionName: "owner" });
  const { data: controllerTreasury } = useReadContract({ address: controllerAddress, abi: TREASURY_AUTOMATION_CONTROLLER_ABI, functionName: "treasury" });
  const { data: controllerExposureUsdc = 0n } = useReadContract({ address: controllerAddress, abi: TREASURY_AUTOMATION_CONTROLLER_ABI, functionName: "exposureByToken", args: [usdcAddress] });
  const { data: controllerExposureWeth = 0n } = useReadContract({ address: controllerAddress, abi: TREASURY_AUTOMATION_CONTROLLER_ABI, functionName: "exposureByToken", args: [getAddress(ARBITRUM_SEPOLIA.weth) as `0x${string}`] });
  const { data: controllerOwner } = useReadContract({ address: controllerAddress, abi: TREASURY_AUTOMATION_CONTROLLER_ABI, functionName: "owner" });
  const { data: buybackScheduleIds = [] } = useReadContract({ address: buybackModuleAddress, abi: BUYBACK_MODULE_ABI, functionName: "getScheduleIds" });
  const { data: buybackModuleOwner } = useReadContract({ address: buybackModuleAddress, abi: BUYBACK_MODULE_ABI, functionName: "owner" });
  const { data: adapterExecutor } = useReadContract({ address: adapterAddress, abi: GOVERNANCE_EXECUTOR_ADAPTER_ABI, functionName: "executor" });
  const { data: adapterOwner } = useReadContract({ address: adapterAddress, abi: GOVERNANCE_EXECUTOR_ADAPTER_ABI, functionName: "owner" });
  const isRiskGuardOwner = address != null && riskGuardOwner != null && address.toLowerCase() === (riskGuardOwner as string).toLowerCase();
  const isControllerOwner = address != null && controllerOwner != null && address.toLowerCase() === (controllerOwner as string).toLowerCase();
  const isBuybackModuleOwner = address != null && buybackModuleOwner != null && address.toLowerCase() === (buybackModuleOwner as string).toLowerCase();
  const isAdapterOwner = address != null && adapterOwner != null && address.toLowerCase() === (adapterOwner as string).toLowerCase();

  const tokenOutAddress = outputToken === "WETH" ? ARBITRUM_SEPOLIA.weth : ARBITRUM_SEPOLIA.usdc;
  const isWrap = outputToken === "WETH";
  const swapParams = useMemo(() => {
    if (!address || !routerAddressChecksummed) return null;
    try {
      const amountInWei = parseEther(amountEth);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      return {
        params: {
          tokenIn: getAddress(ARBITRUM_SEPOLIA.weth),
          tokenOut: getAddress(tokenOutAddress),
          fee: 3000,
          recipient: routerAddressChecksummed,
          amountIn: amountInWei,
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n,
        },
        deadline,
        beneficiary: zeroAddress,
        minAmountOutAfterFee: 0n,
        nonce,
        value: amountInWei,
      };
    } catch {
      return null;
    }
  }, [address, routerAddressChecksummed, amountEth, nonce, tokenOutAddress]);

  const delegateTokenOut = delegateOutputToken === "WETH" ? ARBITRUM_SEPOLIA.weth : ARBITRUM_SEPOLIA.usdc;
  const delegateSwapParams = useMemo(() => {
    if (!ownerAddressChecksummed || !routerAddressChecksummed || !address) return null;
    try {
      const amountInWei = parseEther(delegateAmountEth);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      return {
        params: {
          tokenIn: getAddress(ARBITRUM_SEPOLIA.weth),
          tokenOut: getAddress(delegateTokenOut),
          fee: 3000,
          recipient: routerAddressChecksummed,
          amountIn: amountInWei,
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n,
        },
        deadline,
        beneficiary: ownerAddressChecksummed,
        minAmountOutAfterFee: 0n,
        nonce: ownerExecutionNonce,
        value: amountInWei,
      };
    } catch {
      return null;
    }
  }, [address, ownerAddressChecksummed, routerAddressChecksummed, delegateAmountEth, delegateOutputToken, ownerExecutionNonce, delegateTokenOut]);

  useEffect(() => {
    if (txHash && delegateExecutionPendingRef.current) {
      setLastDelegateTxHash(txHash);
      setLastDelegateResult("Submitted successfully. Trade executed on behalf of owner.");
      delegateExecutionPendingRef.current = false;
    }
  }, [txHash]);
  useEffect(() => {
    if (writeError && delegateExecutionPendingRef.current) {
      setLastDelegateResult(`Failed: ${(writeError as Error).message?.slice(0, 80) ?? String(writeError)}`);
      delegateExecutionPendingRef.current = false;
    }
  }, [writeError]);
  useEffect(() => {
    if (txHash && withdrawPendingRef.current) {
      setLastWithdrawTxHash(txHash);
      withdrawPendingRef.current = false;
    }
  }, [txHash]);
  useEffect(() => {
    if (!txHash || !claimPendingRef.current) return;
    claimPendingRef.current = false;
    refetchUsdcBalance();
    refetchWethBalance();
    refetchReferralEarnings();
    refetchMyEarningsWeth();
    refetchMyEarningsUsdc();
    const t = setTimeout(() => {
      refetchUsdcBalance();
      refetchWethBalance();
      refetchReferralEarnings();
      refetchMyEarningsWeth();
      refetchMyEarningsUsdc();
    }, 3000);
    return () => clearTimeout(t);
  }, [txHash]);

  useEffect(() => {
    if (!txHash) return;
    refetchVaultUserShares();
    refetchVaultAssetAllowance();
    refetchUsdcBalance();
    const t = setTimeout(() => {
      refetchVaultUserShares();
      refetchVaultAssetAllowance();
      refetchUsdcBalance();
    }, 2000);
    return () => clearTimeout(t);
  }, [txHash]);

  const withdrawFeesToTreasury = () => {
    const tokenAddress =
      withdrawToken === "WETH" ? getAddress(ARBITRUM_SEPOLIA.weth) : getAddress(ARBITRUM_SEPOLIA.usdc);
    const decimals = withdrawToken === "WETH" ? 18 : 6;
    const maxAvailable = withdrawToken === "WETH" ? feeManagerWethBalance : feeManagerUsdcBalance;
    let amount: bigint;
    try {
      amount = decimals === 18 ? parseEther(withdrawAmount) : parseUnits(withdrawAmount, 6);
    } catch {
      return;
    }
    if (amount <= 0n) return;
    if (amount > maxAvailable) return; // would revert with ERC20: transfer amount exceeds balance
    setTreasurySnapshotBefore({
      eth: treasuryEthBalance?.value != null ? formatEther(treasuryEthBalance.value) : "0",
      weth: formatEther(treasuryWethBalance),
      usdc: formatUnits(treasuryUsdcBalance, 6),
    });
    withdrawPendingRef.current = true;
    setTxModalAction("Withdraw fees to treasury");
    resetWrite();
    writeContract({
      address: FEE_MANAGER as `0x${string}`,
      abi: FEE_MANAGER_ABI,
      functionName: "withdrawToTreasury",
      args: [tokenAddress, amount],
      gas: 300000n,
      maxFeePerGas,
      maxPriorityFeePerGas: maxFeePerGas > 10n ? maxFeePerGas / 10n : 10n ** 8n,
    });
  };

  const registerReferrer = () => {
    if (!address || !referrerAddress.trim()) return;
    try {
      const referrer = getAddress(referrerAddress.trim());
      if (referrer === address) return;
      setTxModalAction("Register referrer");
      resetWrite();
      writeContract({
        address: REFERRAL_REGISTRY as `0x${string}`,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: "registerReferrer",
        args: [referrer],
        maxFeePerGas,
        maxPriorityFeePerGas: maxFeePerGas / 10n,
      });
    } catch {
      // invalid address
    }
  };

  const claimReferralRewards = () => {
    if (!address) return;
    claimPendingRef.current = true;
    setTxModalAction("Claim referral rewards");
    resetWrite();
    writeContract({
      address: REFERRAL_REGISTRY as `0x${string}`,
      abi: REFERRAL_REGISTRY_ABI,
      functionName: "claimRewards",
      args: [claimTokenAddressChecksummed, zeroAddress],
      maxFeePerGas,
      maxPriorityFeePerGas: maxFeePerGas / 10n,
    });
  };

  const authorizeDelegate = async () => {
    if (!address || !delegateChecksummed) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = walletAuthNonce;
    const domain = {
      name: "ArbiExecutionLayer",
      version: "1",
      chainId: ARBITRUM_SEPOLIA.chainId,
      verifyingContract: getAddress(WALLET_AUTH) as `0x${string}`,
    };
    const types = {
      DelegateAuthorization: [
        { name: "owner", type: "address" },
        { name: "delegate", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const message = { owner: address, delegate: delegateChecksummed, nonce, deadline };
    try {
      const signature = await signTypedDataAsync({ domain, types, primaryType: "DelegateAuthorization", message });
      setTxModalAction("Authorize delegate");
      resetWrite();
      writeContract({
        address: WALLET_AUTH as `0x${string}`,
        abi: WALLET_AUTH_ABI,
        functionName: "authorizeDelegate",
        args: [address, delegateChecksummed, deadline, signature as `0x${string}`],
        maxFeePerGas,
        maxPriorityFeePerGas: maxFeePerGas / 10n,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const revokeDelegate = () => {
    if (!delegateChecksummed) return;
    setTxModalAction("Revoke delegate");
    resetWrite();
    writeContract({
      address: WALLET_AUTH as `0x${string}`,
      abi: WALLET_AUTH_ABI,
      functionName: "revokeDelegate",
      args: [delegateChecksummed],
      maxFeePerGas,
      maxPriorityFeePerGas: maxFeePerGas / 10n,
    });
  };

  const executeAsDelegate = () => {
    if (!delegateSwapParams || !routerAddressChecksummed || !ownerAddressChecksummed) return;
    delegateExecutionPendingRef.current = true;
    setLastDelegateResult("Pending...");
    setTxModalAction("Execute as delegate");
    resetWrite();
    writeContract({
      address: routerAddressChecksummed,
      abi: EXECUTION_ROUTER_ABI,
      functionName: "executeExactInputSingle",
      args: [
        delegateSwapParams.params,
        delegateSwapParams.deadline,
        delegateSwapParams.beneficiary,
        delegateSwapParams.minAmountOutAfterFee,
        delegateSwapParams.nonce,
      ],
      value: delegateSwapParams.value,
      gas: 800000n,
      maxFeePerGas,
      maxPriorityFeePerGas: maxFeePerGas / 10n,
    });
  };

  const recordBalancesBefore = () => {
    const eth = ethBalance?.value != null ? formatEther(ethBalance.value) : "0";
    const weth = wethBalance != null ? formatEther(wethBalance) : "0";
    const usdc = formatUnits(usdcBalance, 6);
    const refWeth = referrerWethBalance != null ? formatEther(referrerWethBalance) : undefined;
    const refUsdc = referrerUsdcBalance != null ? formatUnits(referrerUsdcBalance, 6) : undefined;
    setBalancesBefore({ eth, weth, usdc, referrerWeth: refWeth, referrerUsdc: refUsdc });
  };

  const executeSwap = () => {
    if (!swapParams || !routerAddressChecksummed) return;
    setTxModalAction("Execute swap");
    resetWrite();
    writeContract({
      address: routerAddressChecksummed,
      abi: EXECUTION_ROUTER_ABI,
      functionName: "executeExactInputSingle",
      args: [
        swapParams.params,
        swapParams.deadline,
        swapParams.beneficiary,
        swapParams.minAmountOutAfterFee,
        swapParams.nonce,
      ],
      value: swapParams.value,
      gas: 800000n,
      maxFeePerGas,
      maxPriorityFeePerGas: maxFeePerGas / 10n,
    });
  };

  const approveVaultAsset = () => {
    if (!address || !vaultAddress) return;
    try {
      const amount = parseUnits(vaultDepositAmount || "0", 6);
      if (amount <= 0n) return;
      setTxModalAction("Approve vault asset");
      resetWrite();
      writeContract({
        address: vaultAsset,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [vaultAddress, amount],
        maxFeePerGas,
        maxPriorityFeePerGas: maxFeePerGas / 10n,
      });
    } catch {
      // invalid amount
    }
  };

  const vaultDeposit = () => {
    if (!address || !vaultAddress) return;
    try {
      const assets = parseUnits(vaultDepositAmount || "0", 6);
      if (assets <= 0n) return;
      setTxModalAction("Vault deposit");
      resetWrite();
      writeContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [assets, address],
        maxFeePerGas,
        maxPriorityFeePerGas: maxFeePerGas / 10n,
      });
    } catch {
      // invalid amount
    }
  };

  const vaultWithdraw = () => {
    if (!address || !vaultAddress) return;
    try {
      const assets = parseUnits(vaultWithdrawAmount || "0", 6);
      if (assets <= 0n) return;
      setTxModalAction("Vault withdraw");
      resetWrite();
      writeContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "withdraw",
        args: [assets, address, address],
        maxFeePerGas,
        maxPriorityFeePerGas: maxFeePerGas / 10n,
      });
    } catch {
      // invalid amount
    }
  };

  const vaultRedeem = () => {
    if (!address || !vaultAddress) return;
    try {
      const shares = parseUnits(vaultRedeemAmount || "0", 6);
      if (shares <= 0n) return;
      setTxModalAction("Vault redeem");
      resetWrite();
      writeContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "redeem",
        args: [shares, address, address],
        maxFeePerGas,
        maxPriorityFeePerGas: maxFeePerGas / 10n,
      });
    } catch {
      // invalid amount
    }
  };

  const vaultHarvest = () => {
    if (!vaultAddress) return;
    setTxModalAction("Vault harvest");
    resetWrite();
    writeContract({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: "harvest",
      maxFeePerGas,
      maxPriorityFeePerGas: maxFeePerGas / 10n,
    });
  };

  const approveUsdcForSubscription = () => {
    if (!address) return;
    try {
      const amount = parseUnits(subAmount || "0", 6);
      if (amount <= 0n) return;
      setTxModalAction("Approve USDC for subscription");
      resetWrite();
      writeContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [subscriptionManagerAddress, amount],
        maxFeePerGas: strategyMaxFeePerGas,
        maxPriorityFeePerGas: strategyPriorityFee,
      });
    } catch {
      // invalid amount
    }
  };

  const subscribeStrategy = () => {
    if (!address || subTokenIdNum == null) return;
    try {
      const durationSeconds = BigInt(Math.floor(Number(subDurationDays) * 86400));
      const amount = parseUnits(subAmount || "0", 6);
      if (durationSeconds <= 0n || amount <= 0n) return;
      setTxModalAction("Subscribe to strategy");
      resetWrite();
      writeContract({
        address: subscriptionManagerAddress,
        abi: STRATEGY_SUBSCRIPTION_ABI,
        functionName: "subscribe",
        args: [subTokenIdNum, durationSeconds, usdcAddress, amount],
        maxFeePerGas: strategyMaxFeePerGas,
        maxPriorityFeePerGas: strategyPriorityFee,
      });
    } catch {
      // invalid
    }
  };

  const approveNftForMarketplace = () => {
    if (!address) return;
    setTxModalAction("Approve NFT for marketplace");
    resetWrite();
    writeContract({
      address: strategyNftAddress,
      abi: STRATEGY_NFT_ABI,
      functionName: "setApprovalForAll",
      args: [marketplaceAddress, true],
      maxFeePerGas: strategyMaxFeePerGas,
      maxPriorityFeePerGas: strategyPriorityFee,
    });
  };

  const listStrategyNft = () => {
    if (!address || listTokenId.trim() === "" || listPrice.trim() === "") return;
    try {
      const tokenId = BigInt(listTokenId.trim());
      const price = parseUnits(listPrice.trim(), 6);
      if (price <= 0n) return;
      setTxModalAction("List strategy NFT");
      resetWrite();
      writeContract({
        address: marketplaceAddress,
        abi: STRATEGY_MARKETPLACE_ABI,
        functionName: "list",
        args: [tokenId, usdcAddress, price],
        maxFeePerGas: strategyMaxFeePerGas,
        maxPriorityFeePerGas: strategyPriorityFee,
      });
    } catch {
      // invalid
    }
  };

  const cancelStrategyListing = () => {
    if (!address || listTokenId.trim() === "") return;
    try {
      const tokenId = BigInt(listTokenId.trim());
      setTxModalAction("Cancel strategy listing");
      resetWrite();
      writeContract({
        address: marketplaceAddress,
        abi: STRATEGY_MARKETPLACE_ABI,
        functionName: "cancelListing",
        args: [tokenId],
        maxFeePerGas: strategyMaxFeePerGas,
        maxPriorityFeePerGas: strategyPriorityFee,
      });
    } catch {
      // invalid
    }
  };

  const approvePaymentForBuy = () => {
    if (!address || listingPrice == null || !listingPaymentTokenAddress) return;
    setTxModalAction("Approve payment for buy");
    resetWrite();
    writeContract({
      address: listingPaymentTokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [marketplaceAddress, listingPrice],
      gas: 100000n,
      maxFeePerGas: marketplaceMaxFeePerGas,
      maxPriorityFeePerGas: marketplacePriorityFee,
    });
  };

  const buyStrategyNft = () => {
    if (!address || buyTokenIdNum == null) return;
    const affiliate = affiliateAddress.trim() && /^0x[a-fA-F0-9]{40}$/.test(affiliateAddress.trim())
      ? getAddress(affiliateAddress.trim()) as `0x${string}`
      : zeroAddress;
    setTxModalAction("Buy strategy NFT");
    resetWrite();
    writeContract({
      address: marketplaceAddress,
      abi: STRATEGY_MARKETPLACE_ABI,
      functionName: "buy",
      args: [buyTokenIdNum, affiliate],
      gas: 500000n,
      maxFeePerGas: marketplaceMaxFeePerGas,
      maxPriorityFeePerGas: marketplacePriorityFee,
    });
  };

  const claimRoyalties = () => {
    if (!address) return;
    setTxModalAction("Claim royalties");
    resetWrite();
    writeContract({
      address: royaltyDistributorAddress,
      abi: ROYALTY_DISTRIBUTOR_ABI,
      functionName: "claim",
      args: [usdcAddress],
      maxFeePerGas: strategyMaxFeePerGas,
      maxPriorityFeePerGas: strategyPriorityFee,
    });
  };

  const registerStrategy = () => {
    if (!address || !isRegistryOwner) return;
    try {
      const strategyAddr = getAddress(regStrategy.trim()) as `0x${string}`;
      const creatorAddr = getAddress(regCreator.trim()) as `0x${string}`;
      const strategyType = Number(regStrategyType) as 0 | 1;
      const riskLevel = Number(regRiskLevel);
      if (riskLevel < 0 || riskLevel > 255) return;
      let perfHash: `0x${string}`;
      const h = regPerfHash.trim().replace(/^0x/, "");
      if (/^[0-9a-fA-F]{1,64}$/.test(h)) {
        perfHash = (`0x${h.padEnd(64, "0").slice(0, 64)}` as `0x${string}`);
      } else return;
      const metadataURI = regMetadataURI.trim() || " ";
      setTxModalAction("Register strategy");
      resetWrite();
      writeContract({
        address: registryAddress,
        abi: STRATEGY_REGISTRY_ABI,
        functionName: "register",
        args: [strategyAddr, creatorAddr, strategyType, riskLevel, perfHash, metadataURI],
        maxFeePerGas: strategyMaxFeePerGas,
        maxPriorityFeePerGas: strategyPriorityFee,
      });
    } catch {
      // invalid input
    }
  };

  const daoSetMaxDailySpend = () => {
    try {
      const amount = parseEther(daoMaxDailySpend || "0");
      if (amount === 0n) return;
      setTxModalAction("Set max daily spend");
      resetWrite();
      writeContract({ address: riskGuardAddress, abi: RISK_GUARD_ABI, functionName: "setMaxDailySpend", args: [amount], maxFeePerGas: strategyMaxFeePerGas, maxPriorityFeePerGas: strategyPriorityFee });
    } catch { /* invalid */ }
  };
  const daoSetMaxSlippageBps = () => {
    try {
      const bps = BigInt(daoMaxSlippageBps || "0");
      if (bps === 0n) return;
      setTxModalAction("Set max slippage");
      resetWrite();
      writeContract({ address: riskGuardAddress, abi: RISK_GUARD_ABI, functionName: "setMaxSlippageBps", args: [bps], maxFeePerGas: strategyMaxFeePerGas, maxPriorityFeePerGas: strategyPriorityFee });
    } catch { /* invalid */ }
  };
  const daoRiskGuardPause = () => {
    setTxModalAction("Pause RiskGuard");
    resetWrite();
    writeContract({ address: riskGuardAddress, abi: RISK_GUARD_ABI, functionName: "pause", maxFeePerGas: strategyMaxFeePerGas, maxPriorityFeePerGas: strategyPriorityFee });
  };
  const daoRiskGuardUnpause = () => {
    setTxModalAction("Unpause RiskGuard");
    resetWrite();
    writeContract({ address: riskGuardAddress, abi: RISK_GUARD_ABI, functionName: "unpause", maxFeePerGas: strategyMaxFeePerGas, maxPriorityFeePerGas: strategyPriorityFee });
  };
  const daoTriggerRule = () => {
    const effectiveRuleId = (daoRuleIdDropdown || daoRuleIdHex).trim();
    if (!effectiveRuleId) return;
    try {
      const ruleId = effectiveRuleId.startsWith("0x") ? (effectiveRuleId as `0x${string}`) : (`0x${effectiveRuleId.padStart(64, "0").slice(-64)}` as `0x${string}`);
      const payload = daoTriggerPayload.trim().startsWith("0x") ? (daoTriggerPayload.trim() as `0x${string}`) : ("0x" as `0x${string}`);
      setTxModalAction("Trigger rule");
      resetWrite();
      writeContract({ address: policyEngineAddress, abi: POLICY_ENGINE_ABI, functionName: "triggerRule", args: [ruleId, payload], maxFeePerGas: strategyMaxFeePerGas, maxPriorityFeePerGas: strategyPriorityFee });
    } catch { /* invalid */ }
  };
  const daoSetAdapterExecutor = () => {
    try {
      const executor = getAddress(daoAdapterExecutor.trim()) as `0x${string}`;
      setTxModalAction("Set adapter executor");
      resetWrite();
      writeContract({ address: adapterAddress, abi: GOVERNANCE_EXECUTOR_ADAPTER_ABI, functionName: "setExecutor", args: [executor], maxFeePerGas: strategyMaxFeePerGas, maxPriorityFeePerGas: strategyPriorityFee });
    } catch { /* invalid */ }
  };

  const status = useMemo(() => {
    if (writeError) {
      const msg =
        (writeError as { shortMessage?: string }).shortMessage ??
        (writeError as Error).message ??
        String(writeError);
      return `Failed: ${msg}`;
    }
    if (isSwapPending) return "Confirm in Rainbow...";
    if (txHash) return "Swap submitted.";
    return "";
  }, [writeError, isSwapPending, txHash]);

  const txModalStatus: "pending" | "success" | "error" =
    isSwapPending ? "pending" : writeError ? "error" : txHash ? "success" : "pending";
  const txModalError =
    writeError != null
      ? (writeError as { shortMessage?: string }).shortMessage ??
        (writeError as Error).message ??
        String(writeError)
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 bg-[#0a0a0f] text-zinc-100">
      <h1 className="mb-1 text-2xl font-bold text-white">Vacuum</h1>
      <p className="mb-2 text-sm text-zinc-400">Arbitrum Sepolia · Swap, vault, strategies &amp; more</p>
      <p className="mb-6 text-xs">
        <Link to="/how" className="text-[#22d3ee] hover:underline">How to use</Link>
        {" · "}
        <Link to="/why" className="text-[#22d3ee] hover:underline">Why we&apos;re the fastest</Link>
      </p>

      {!isConnected ? (
        <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-6 text-center">
          <p className="mb-4 text-zinc-300">Connect your wallet to use the app.</p>
          <ConnectButton />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="text-zinc-400">Account</span>
              <span className="ml-1 font-mono text-white">{`${address?.slice(0, 6)}...${address?.slice(-4)}`}</span>
            </div>
            <button
              type="button"
              className="rounded-lg border border-[#1e1e2e] bg-[#12121a] px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              onClick={() => disconnect()}
            >
              Disconnect
            </button>
          </div>
          {!isCorrectChain && (
            <p className="mb-4 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Switch to Arbitrum Sepolia in your wallet (Rainbow).
            </p>
          )}
          <div className="mb-6 flex flex-wrap gap-1">
            {(["swap", "vault", "strategy", "dao", "referral", "delegate", "agent", "protocol"] as TabId[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activeTab === tab
                    ? "bg-[#0891b2] text-white"
                    : "border border-[#1e1e2e] bg-[#12121a] text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {activeTab === "swap" && (
          <>
          {routerWethMismatch && (
            <p className="status error">
              This router was deployed with a different WETH address. You get &quot;transfer amount exceeds balance&quot; because the contract tries to pull WETH from your wallet instead of using the ETH you send. Redeploy ExecutionRouter (run deploy on Arbitrum Sepolia with current scripts) and use the new router address here.
            </p>
          )}
          {isWrap && routerAddressChecksummed && routerAddressChecksummed.toLowerCase() !== ROUTER_WITH_WRAP.toLowerCase() && (
            <p className="status error">
              For ETH→WETH wrap use router: <code>{ROUTER_WITH_WRAP}</code>. The address you have may be an old deployment.
            </p>
          )}
          <div className="field">
            <label>ExecutionRouter address</label>
            <p className="value font-mono text-sm text-zinc-400 break-all">{DEFAULT_ROUTER}</p>
            <p className="text-xs text-zinc-500 mt-1">Locked</p>
          </div>
          <div className="field">
            <label>Output token</label>
            <select
              value={outputToken}
              onChange={(e) => setOutputToken(e.target.value as OutputToken)}
              className="select"
            >
              <option value="USDC">USDC</option>
              <option value="WETH">WETH (wrap)</option>
            </select>
          </div>
          <div className="field">
            <label>Amount (ETH)</label>
            <input
              type="text"
              value={amountEth}
              onChange={(e) => setAmountEth(e.target.value)}
              placeholder="0.001"
            />
          </div>
          <div className="status input-summary">
            <strong>Input we send:</strong> value = {amountEth} ETH · tokenIn = WETH · tokenOut = {outputToken} · amountIn = {amountEth} ETH · nonce = {String(nonce)}
          </div>
          <button
            className="btn primary"
            onClick={executeSwap}
            disabled={
              !routerAddressChecksummed ||
              !isCorrectChain ||
              !swapParams ||
              isSwapPending ||
              routerWethMismatch ||
              (isWrap && routerAddressChecksummed.toLowerCase() !== ROUTER_WITH_WRAP.toLowerCase())
            }
          >
            {isSwapPending ? "Confirm in Rainbow…" : "Execute Swap"}
          </button>
          </>
          )}
          {activeTab === "vault" && (
            <div className="panel">
              <h3>USDC Vault (ERC-4626)</h3>
              <p className="sub">Deposit USDC, receive {String(vaultSymbol)} shares. Withdraw or redeem anytime.</p>
              <div className="field">
                <label>Vault stats</label>
                <div className="row">
                  <span className="label">Total assets (USDC)</span>
                  <span className="value">{formatUnits(vaultTotalAssets, 6)}</span>
                </div>
                <div className="row">
                  <span className="label">Total supply ({vaultSymbol})</span>
                  <span className="value">{formatUnits(vaultTotalSupply, 6)}</span>
                </div>
                <div className="row">
                  <span className="label">Deposit cap</span>
                  <span className="value">{formatUnits(vaultDepositCap, 6)} USDC</span>
                </div>
                <div className="row">
                  <span className="label">Performance fee / Withdrawal fee</span>
                  <span className="value">{Number(vaultPerformanceFeeBps) / 100}% / {Number(vaultWithdrawalFeeBps) / 100}%</span>
                </div>
                {vaultStrategyActive && <div className="row"><span className="label">Strategy</span><span className="value">Active</span></div>}
                {vaultPaused && <p className="status error">Vault is paused</p>}
              </div>
              {address && (
                <>
                  <div className="field">
                    <label>Your position</label>
                    <div className="row">
                      <span className="label">USDC balance</span>
                      <span className="value">{formatUnits(usdcBalance, 6)}</span>
                    </div>
                    <div className="row">
                      <span className="label">Your {vaultSymbol} shares</span>
                      <span className="value">{formatUnits(vaultUserShares, 6)}</span>
                    </div>
                    <div className="row">
                      <span className="label">Your share value (USDC)</span>
                      <span className="value">{formatUnits(vaultUserAssets, 6)}</span>
                    </div>
                  </div>
                  <div className="field">
                    <label>Deposit USDC</label>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={vaultDepositAmount}
                      onChange={(e) => setVaultDepositAmount(e.target.value)}
                    />
                    <p className="hint">Allowance: {formatUnits(vaultAssetAllowance, 6)} USDC</p>
                    <div className="row row-actions">
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={approveVaultAsset}
                        disabled={isSwapPending || !vaultDepositAmount}
                      >
                        Approve USDC
                      </button>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={vaultDeposit}
                        disabled={isSwapPending || vaultPaused || !vaultDepositAmount}
                      >
                        Deposit
                      </button>
                    </div>
                    {vaultMaxDeposit < 2n ** 256n - 1n && (
                      <p className="hint">Max deposit: {formatUnits(vaultMaxDeposit, 6)} USDC</p>
                    )}
                  </div>
                  <div className="field">
                    <label>Withdraw (USDC amount)</label>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={vaultWithdrawAmount}
                      onChange={(e) => setVaultWithdrawAmount(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn primary"
                      onClick={vaultWithdraw}
                      disabled={isSwapPending || vaultPaused || !vaultWithdrawAmount}
                    >
                      Withdraw
                    </button>
                  </div>
                  <div className="field">
                    <label>Redeem (share amount)</label>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={vaultRedeemAmount}
                      onChange={(e) => setVaultRedeemAmount(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn primary"
                      onClick={vaultRedeem}
                      disabled={isSwapPending || vaultPaused || !vaultRedeemAmount}
                    >
                      Redeem
                    </button>
                  </div>
                  {vaultStrategyActive && (
                    <div className="field">
                      <button type="button" className="btn secondary" onClick={vaultHarvest} disabled={isSwapPending || vaultPaused}>
                        Harvest (claim rewards → performance fee → reinvest)
                      </button>
                    </div>
                  )}
                  <p className="value small">Vault: {VAULT}</p>
                </>
              )}
            </div>
          )}
          {activeTab === "strategy" && (
            <div className="panel">
              <h3>Strategy NFT &amp; Marketplace</h3>
              <p className="sub">Subscribe to strategies, list or buy Strategy NFTs. Claim creator royalties.</p>
              {address && (
                <>
                  <div className="field">
                    <label>Register strategy (owner only)</label>
                    <p className="hint">Mints a Strategy NFT to the creator. Only the registry owner can call this.</p>
                    <input placeholder="Strategy contract address (0x...)" value={regStrategy} readOnly className="cursor-not-allowed opacity-90" aria-label="Strategy contract address (locked)" />
                    <input placeholder="Creator address (NFT recipient, 0x...)" value={regCreator} onChange={(e) => setRegCreator(e.target.value)} />
                    <div className="row">
                      <label className="label">Strategy type</label>
                      <select value={regStrategyType} onChange={(e) => setRegStrategyType(e.target.value as "0" | "1")} className="select">
                        <option value="0">Vault</option>
                        <option value="1">Execution</option>
                      </select>
                    </div>
                    <input placeholder="Risk level (0–255)" type="text" value={regRiskLevel} onChange={(e) => setRegRiskLevel(e.target.value)} />
                    <input placeholder="Performance metrics hash (0x + 64 hex)" value={regPerfHash} onChange={(e) => setRegPerfHash(e.target.value)} />
                    <input placeholder="Metadata URI (string)" value={regMetadataURI} onChange={(e) => setRegMetadataURI(e.target.value)} />
                    {!isRegistryOwner && <p className="status">Only the registry owner can register. Connect as owner to enable.</p>}
                    <button type="button" className="btn primary" onClick={registerStrategy} disabled={isSwapPending || !isRegistryOwner || !regStrategy.trim() || !regCreator.trim()}>
                      Register strategy
                    </button>
                  </div>
                  <div className="field">
                    <label>Get token ID from strategy address</label>
                    <p className="hint">Token IDs come from: (1) Registering a strategy (creator gets the NFT), or (2) Buying on the marketplace. If you know the strategy contract address, look it up below.</p>
                    <input placeholder="Strategy contract address (0x...)" value={lookupStrategyAddress} onChange={(e) => setLookupStrategyAddress(e.target.value)} />
                    {lookedUpTokenId != null && lookedUpTokenId !== 0n && (
                      <div className="row">
                        <span className="label">Token ID</span>
                        <span className="value">{String(lookedUpTokenId)}</span>
                        <button type="button" className="btn btn-sm secondary" onClick={() => setSubTokenId(String(lookedUpTokenId))}>Use for Subscribe</button>
                        <button type="button" className="btn btn-sm secondary" onClick={() => setListTokenId(String(lookedUpTokenId))}>Use for List</button>
                        <button type="button" className="btn btn-sm secondary" onClick={() => setBuyTokenId(String(lookedUpTokenId))}>Use for Buy</button>
                      </div>
                    )}
                    {lookupStrategyChecksummed != null && lookedUpTokenId === 0n && <p className="hint">No registered strategy for this address.</p>}
                  </div>
                  <div className="field">
                    <label>My Strategy NFTs</label>
                    <div className="row">
                      <span className="label">Balance</span>
                      <span className="value">{String(strategyNftBalance)}</span>
                    </div>
                    <p className="hint">Enter a token ID above (lookup) or below to subscribe, list, or check listing.</p>
                  </div>
                  <div className="field">
                    <label>Subscribe (USDC)</label>
                    <input placeholder="Strategy token ID" value={subTokenId} onChange={(e) => setSubTokenId(e.target.value)} />
                    <input placeholder="Duration (days)" type="text" value={subDurationDays} onChange={(e) => setSubDurationDays(e.target.value)} />
                    <input placeholder="Amount (USDC)" type="text" value={subAmount} onChange={(e) => setSubAmount(e.target.value)} />
                    {subTokenIdNum != null && subscriptionExpiry > 0n && (
                      <p className="hint">Expiry: {new Date(Number(subscriptionExpiry) * 1000).toISOString()}</p>
                    )}
                    <p className="hint">Allowance: {formatUnits(usdcAllowanceSubscription, 6)} USDC</p>
                    <div className="row row-actions">
                      <button type="button" className="btn secondary" onClick={approveUsdcForSubscription} disabled={isSwapPending || !subAmount}>Approve USDC</button>
                      <button type="button" className="btn primary" onClick={subscribeStrategy} disabled={isSwapPending || !subTokenId || !subAmount || !subDurationDays}>Subscribe</button>
                    </div>
                  </div>
                  <div className="field">
                    <label>List for sale (USDC)</label>
                    <input placeholder="Your token ID" value={listTokenId} onChange={(e) => setListTokenId(e.target.value)} />
                    <input placeholder="Price (USDC)" type="text" value={listPrice} onChange={(e) => setListPrice(e.target.value)} />
                    <p className="hint">Approve marketplace to transfer your NFT before listing. After listing, a buyer can purchase and the NFT will transfer.</p>
                    <div className="row row-actions">
                      <button type="button" className="btn secondary" onClick={approveNftForMarketplace} disabled={isSwapPending || nftApprovedForMarketplace}>Approve NFT</button>
                      <button type="button" className="btn primary" onClick={listStrategyNft} disabled={isSwapPending || !listTokenId || !listPrice}>List</button>
                      <button type="button" className="btn secondary" onClick={cancelStrategyListing} disabled={isSwapPending || !listTokenId}>Cancel listing</button>
                    </div>
                  </div>
                  <div className="field">
                    <label>Buy from marketplace</label>
                    <input placeholder="Token ID" value={buyTokenId} onChange={(e) => setBuyTokenId(e.target.value)} />
                    <input placeholder="Affiliate (optional)" value={affiliateAddress} onChange={(e) => setAffiliateAddress(e.target.value)} />
                    {listingSeller != null && listingSeller !== zeroAddress && listingPrice != null && (
                      <div className="row">
                        <span className="label">Listing</span>
                        <span className="value">Price: {formatUnits(listingPrice, 6)} (your allowance: {formatUnits(buyPaymentAllowance, 6)})</span>
                      </div>
                    )}
                    <p className="hint">If Buy reverts: (1) Approve the payment token for at least the listing price and have enough balance. (2) The seller must have approved the Strategy NFT to the marketplace when they listed (they use &quot;Approve NFT&quot; in the List section).</p>
                    <div className="row row-actions">
                      <button type="button" className="btn secondary" onClick={approvePaymentForBuy} disabled={isSwapPending || !listingPrice || listingPrice === 0n || !listingPaymentTokenAddress}>Approve payment</button>
                      <button type="button" className="btn primary" onClick={buyStrategyNft} disabled={isSwapPending || !buyTokenId || (listingPrice != null && buyPaymentAllowance < listingPrice)}>Buy</button>
                    </div>
                  </div>
                  <div className="field">
                    <label>Royalties</label>
                    <div className="row">
                      <span className="label">Claimable (USDC)</span>
                      <span className="value">{formatUnits(royaltyClaimableUsdc, 6)}</span>
                    </div>
                    <button type="button" className="btn primary" onClick={claimRoyalties} disabled={isSwapPending || royaltyClaimableUsdc === 0n}>Claim</button>
                  </div>
                  <p className="value small">Strategy NFT: {STRATEGY_NFT} · Marketplace: {STRATEGY_MARKETPLACE}</p>
                </>
              )}
              {!address && <p className="status">Connect wallet to view and manage Strategy NFTs.</p>}
            </div>
          )}
          {activeTab === "dao" && (
            <div className="panel">
              <h3>DAO Automation</h3>
              <p className="sub">RiskGuard, PolicyEngine, Treasury Controller, Buyback, Governance Adapter.</p>
              <div className="field">
                <label>RiskGuard</label>
                <div className="row"><span className="label">Max daily spend</span><span className="value">{formatEther(riskGuardMaxDailySpend)} ETH</span></div>
                <div className="row"><span className="label">Max slippage</span><span className="value">{String(riskGuardMaxSlippageBps)} bps</span></div>
                <div className="row"><span className="label">Today&apos;s spend</span><span className="value">{formatEther(riskGuardCurrentDaySpend)} ETH</span></div>
                <div className="row"><span className="label">Paused</span><span className="value">{riskGuardPaused ? "Yes" : "No"}</span></div>
                {address && isRiskGuardOwner && (
                  <>
                    <div className="row">
                      <label className="label">Max daily spend (ETH)</label>
                      <select value={daoMaxDailySpend} onChange={(e) => setDaoMaxDailySpend(e.target.value)} className="select">
                        {DAO_DAILY_SPEND_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt} ETH</option>
                        ))}
                      </select>
                    </div>
                    <div className="row">
                      <label className="label">Max slippage (bps)</label>
                      <select value={daoMaxSlippageBps} onChange={(e) => setDaoMaxSlippageBps(e.target.value)} className="select">
                        {DAO_SLIPPAGE_BPS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt} bps</option>
                        ))}
                      </select>
                    </div>
                    <div className="row row-actions">
                      <button type="button" className="btn secondary" onClick={daoSetMaxDailySpend} disabled={isSwapPending || !daoMaxDailySpend}>Set daily spend</button>
                      <button type="button" className="btn secondary" onClick={daoSetMaxSlippageBps} disabled={isSwapPending || !daoMaxSlippageBps}>Set slippage</button>
                      <button type="button" className="btn secondary" onClick={riskGuardPaused ? daoRiskGuardUnpause : daoRiskGuardPause} disabled={isSwapPending}>{riskGuardPaused ? "Unpause" : "Pause"}</button>
                    </div>
                  </>
                )}
              </div>
              <div className="field">
                <label>PolicyEngine</label>
                <div className="row"><span className="label">Rules</span><span className="value">{(policyRuleIds as string[]).length}</span></div>
                {address && (
                  <>
                    <div className="row">
                      <label className="label">Rule ID</label>
                      <select value={daoRuleIdDropdown} onChange={(e) => { const v = e.target.value; setDaoRuleIdDropdown(v); if (v !== "") setDaoRuleIdHex(v); }} className="select">
                        <option value="">Custom (enter below)</option>
                        {(policyRuleIds as string[]).map((ruleId) => (
                          <option key={ruleId} value={ruleId}>{`${ruleId.slice(0, 10)}...${ruleId.slice(-8)}`}</option>
                        ))}
                      </select>
                    </div>
                    {daoRuleIdDropdown === "" && (
                      <input placeholder="Rule ID (0x...64 hex)" value={daoRuleIdHex} onChange={(e) => { setDaoRuleIdHex(e.target.value); setDaoRuleIdDropdown(""); }} />
                    )}
                    <input placeholder="Payload (0x or leave empty)" value={daoTriggerPayload} onChange={(e) => setDaoTriggerPayload(e.target.value)} />
                    <button type="button" className="btn secondary" onClick={daoTriggerRule} disabled={isSwapPending || !(daoRuleIdDropdown || daoRuleIdHex).trim()}>Trigger rule</button>
                  </>
                )}
              </div>
              <div className="field">
                <label>TreasuryAutomationController</label>
                <div className="row"><span className="label">Treasury</span><span className="value">{(controllerTreasury as string)?.slice(0, 10)}…</span></div>
                <div className="row"><span className="label">Exposure USDC</span><span className="value">{formatUnits(controllerExposureUsdc, 6)}</span></div>
                <div className="row"><span className="label">Exposure WETH</span><span className="value">{formatEther(controllerExposureWeth)}</span></div>
                {isControllerOwner && <p className="hint">You are the controller owner. Execute automated swap / vault harvest from the controller contract directly (e.g. via block explorer).</p>}
                {!isControllerOwner && <p className="hint">Owner can execute automated swap and vault harvest from the controller.</p>}
              </div>
              <div className="field">
                <label>BuybackModule</label>
                <div className="row"><span className="label">Schedules</span><span className="value">{(buybackScheduleIds as string[]).length}</span></div>
                {isBuybackModuleOwner && <p className="hint">You are the buyback module owner. Create/cancel schedules and execute chunks via the contract.</p>}
                {!isBuybackModuleOwner && <p className="hint">Owner can create/cancel schedules and execute buyback chunks.</p>}
              </div>
              <div className="field">
                <label>GovernanceExecutorAdapter</label>
                <div className="row"><span className="label">Executor</span><span className="value">{(adapterExecutor as string)?.slice(0, 10)}…</span></div>
                {address && isAdapterOwner && (
                  <>
                    <div className="row">
                      <label className="label">Executor</label>
                      <select value={daoAdapterExecutor} onChange={(e) => setDaoAdapterExecutor(e.target.value)} className="select">
                        <option value={TREASURY_AUTOMATION_CONTROLLER}>Treasury Automation Controller ({TREASURY_AUTOMATION_CONTROLLER.slice(0, 6)}...{TREASURY_AUTOMATION_CONTROLLER.slice(-4)})</option>
                      </select>
                    </div>
                    <button type="button" className="btn secondary" onClick={daoSetAdapterExecutor} disabled={isSwapPending || !daoAdapterExecutor.trim()}>Set executor</button>
                  </>
                )}
              </div>
              <p className="value small">RiskGuard: {RISK_GUARD} · Controller: {TREASURY_AUTOMATION_CONTROLLER}</p>
            </div>
          )}
          {activeTab === "referral" && (
            <div className="panel">
              <h3>Referral</h3>
              <div className="flow-section">
                <button type="button" className="btn secondary btn-sm" onClick={recordBalancesBefore}>
                  Record balances (before)
                </button>
              </div>
              <div className="balances-box">
                <h4>Balances</h4>
                <table className="balances-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>ETH</th>
                      <th>WETH</th>
                      <th>USDC</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>You (before)</strong></td>
                      <td>{balancesBefore?.eth ?? "—"}</td>
                      <td>{balancesBefore?.weth ?? "—"}</td>
                      <td>{balancesBefore?.usdc ?? "—"}</td>
                    </tr>
                    <tr>
                      <td><strong>You (after)</strong></td>
                      <td>{ethBalance?.value != null ? formatEther(ethBalance.value) : "—"}</td>
                      <td>{wethBalance != null ? formatEther(wethBalance) : "—"}</td>
                      <td>{formatUnits(usdcBalance, 6)}</td>
                    </tr>
                    {myReferrer && myReferrer !== zeroAddress && (
                      <>
                        <tr>
                          <td><strong>Referrer {myReferrer.slice(0, 8)}… (before)</strong></td>
                          <td>—</td>
                          <td>{balancesBefore?.referrerWeth ?? "—"}</td>
                          <td>{balancesBefore?.referrerUsdc ?? "—"}</td>
                        </tr>
                        <tr>
                          <td><strong>Referrer (after)</strong></td>
                          <td>—</td>
                          <td>{referrerWethBalance != null ? formatEther(referrerWethBalance) : "—"}</td>
                          <td>{referrerUsdcBalance != null ? formatUnits(referrerUsdcBalance, 6) : "—"}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flow-section">
                <strong>1. Register referral</strong>
                <p className="value">Your referrer: {myReferrer && myReferrer !== zeroAddress ? `${myReferrer.slice(0, 10)}…` : "None"}</p>
                <input
                  value={referrerAddress}
                  onChange={(e) => setReferrerAddress(e.target.value)}
                  placeholder="Referrer 0x..."
                />
                {(() => {
                  let referrerIsSelf = false;
                  let validReferrerAddress = false;
                  if (referrerAddress.trim()) {
                    try {
                      const refAddr = getAddress(referrerAddress.trim());
                      validReferrerAddress = true;
                      if (address) referrerIsSelf = refAddr === address;
                    } catch {
                      // invalid address
                    }
                  }
                  const alreadyHasReferrer = myReferrer != null && myReferrer !== zeroAddress;
                  const canRegister =
                    isConnected &&
                    isCorrectChain &&
                    validReferrerAddress &&
                    !isSwapPending &&
                    !alreadyHasReferrer &&
                    !referrerIsSelf;
                  return (
                    <>
                      {!isConnected && <p className="hint">Connect your wallet first.</p>}
                      {isConnected && !isCorrectChain && <p className="hint">Switch to Arbitrum Sepolia.</p>}
                      {referrerAddress.trim() && !validReferrerAddress && <p className="hint">Enter a valid 0x address.</p>}
                      {referrerIsSelf && <p className="hint">Referrer cannot be your own address.</p>}
                      {alreadyHasReferrer && <p className="hint">You already have a referrer registered.</p>}
                      <button
                        type="button"
                        className="btn primary"
                        onClick={registerReferrer}
                        disabled={!canRegister}
                      >
                        Register referrer
                      </button>
                    </>
                  );
                })()}
              </div>
              <div className="flow-section">
                <strong>2. Execute swap with referral</strong>
                <p className="hint">Swap sends a share of the fee to your referrer. Use the same wallet that registered a referrer above.</p>
                <button type="button" className="btn primary" onClick={() => setActiveTab("swap")}>
                  Go to Swap tab →
                </button>
                <p className="value">Or execute here: output {outputToken}, amount {amountEth} ETH</p>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => { executeSwap(); }}
                  disabled={!routerAddressChecksummed || !isCorrectChain || !swapParams || isSwapPending || routerWethMismatch}
                >
                  Execute swap (with referral)
                </button>
              </div>
              <div className="flow-section">
                <strong>3. Check referral reward balance</strong>
                <p className="value">Referrer {myReferrer && myReferrer !== zeroAddress ? myReferrer.slice(0, 12) + "…" : "(set in step 1)"} unclaimed: WETH {formatEther(referrerEarningsWeth)}, USDC {formatUnits(referrerEarningsUsdc, 6)}</p>
                <p className="value">Your earnings (if you are a referrer): WETH {formatEther(myEarningsWeth)}, USDC {formatUnits(myEarningsUsdc, 6)}</p>
              </div>
              <div className="flow-section">
                <strong>4. Claim reward</strong>
                <p className="hint">Connect as the referrer wallet to claim. Rewards are credited when someone you referred does a swap.</p>
                {(isMyEarningsWethError || isMyEarningsUsdcError) && (
                  <p className="status hint">Could not load earnings. Check that you are on Arbitrum Sepolia and click Refresh.</p>
                )}
                <p className="value">Your unclaimed rewards: <strong>WETH {formatEther(myEarningsWeth)}</strong> · <strong>USDC {formatUnits(myEarningsUsdc, 6)}</strong></p>
                <button type="button" className="btn secondary btn-sm" onClick={refetchAllEarnings}>Refresh rewards</button>
                <select value={claimToken} onChange={(e) => setClaimToken(e.target.value as "WETH" | "USDC")} className="select">
                  <option value="WETH">WETH</option>
                  <option value="USDC">USDC</option>
                </select>
                <p className="value">Claiming {claimToken}: {claimToken === "WETH" ? formatEther(referralEarnings) : formatUnits(referralEarnings, 6)} available</p>
                <button
                  type="button"
                  className="btn primary"
                  onClick={claimReferralRewards}
                  disabled={referralEarnings === 0n || isSwapPending}
                >
                  Claim {claimToken}
                </button>
                <p className="value small">Registry: {REFERRAL_REGISTRY.slice(0, 10)}… · USDC: {usdcForEarnings.slice(0, 10)}…</p>
              </div>
              <div className="flow-section">
                <strong>5. Balances before / after</strong>
                <p className="hint">Use &quot;Record balances (before)&quot; at the top, then run steps 1–4. Above table shows before (snapshot) vs after (live).</p>
              </div>
            </div>
          )}
          {activeTab === "delegate" && (
            <div className="panel">
              <h3>Delegate</h3>
              <div className="flow-section">
                <strong>1. Sign EIP-712 authorization</strong>
                <p className="hint">As owner: sign to authorize a delegate. Your wallet will prompt for EIP-712 typed data signature.</p>
                <label>Delegate address</label>
                <input
                  value={delegateAddress}
                  onChange={(e) => setDelegateAddress(e.target.value)}
                  placeholder="0x..."
                />
                {delegateChecksummed && (
                  <p className="value">Authorized: {isDelegateAuthorized ? "Yes" : "No"}</p>
                )}
                <button
                  type="button"
                  className="btn primary"
                  onClick={authorizeDelegate}
                  disabled={!delegateChecksummed || isSwapPending}
                >
                  Sign &amp; authorize delegate (EIP-712)
                </button>
                <button
                  type="button"
                  className="btn secondary btn-sm"
                  onClick={revokeDelegate}
                  disabled={!delegateChecksummed || !isDelegateAuthorized || isSwapPending}
                >
                  Revoke delegate
                </button>
              </div>
              <div className="flow-section">
                <strong>2. Delegate execution</strong>
                <p className="hint">Delegate is now authorized. Owner&apos;s WalletAuth nonce (replay protection): {String(walletAuthNonce)}. Each new authorization increments it.</p>
                <p className="value">Delegate {delegateChecksummed ? delegateChecksummed.slice(0, 12) + "…" : "—"} can execute on behalf of owner.</p>
              </div>
              <div className="flow-section">
                <strong>3. Execute trade as delegate</strong>
                <p className="hint">Connect as the delegate wallet. Enter the owner (beneficiary) address. Delegate pays ETH; owner receives output.</p>
                <label>Owner (beneficiary) address</label>
                <input
                  value={ownerAddress}
                  onChange={(e) => setOwnerAddress(e.target.value)}
                  placeholder="0x..."
                />
                <label>Amount (ETH)</label>
                <input
                  type="text"
                  value={delegateAmountEth}
                  onChange={(e) => setDelegateAmountEth(e.target.value)}
                  placeholder="0.001"
                />
                <select value={delegateOutputToken} onChange={(e) => setDelegateOutputToken(e.target.value as OutputToken)} className="select">
                  <option value="USDC">USDC</option>
                  <option value="WETH">WETH (wrap)</option>
                </select>
                <p className="value">Owner execution nonce: {String(ownerExecutionNonce)}. Authorized for this owner: {ownerAddressChecksummed && address ? (isAuthorizedForOwner ? "Yes" : "No") : "—"}</p>
                <button
                  type="button"
                  className="btn primary"
                  onClick={executeAsDelegate}
                  disabled={
                    !routerAddressChecksummed ||
                    !ownerAddressChecksummed ||
                    !delegateSwapParams ||
                    isSwapPending ||
                    routerWethMismatch ||
                    !isAuthorizedForOwner
                  }
                >
                  Execute trade as delegate
                </button>
              </div>
              <div className="flow-section">
                <strong>4. Verify replay protection</strong>
                <p className="hint">WalletAuth uses nonces: each DelegateAuthorization uses current nonce and increments it. Reusing the same signature fails (nonce already used).</p>
                <p className="value">Your WalletAuth nonce: {String(walletAuthNonce)}</p>
                {ownerAddressChecksummed && (
                  <p className="value">Owner&apos;s WalletAuth nonce: {String(ownerWalletAuthNonce)}</p>
                )}
              </div>
              <div className="flow-section">
                <strong>5. Print execution result</strong>
                <p className="value">{lastDelegateResult || "—"}</p>
                {lastDelegateTxHash && (
                  <a href={`${ARBITRUM_SEPOLIA.explorer}/tx/${lastDelegateTxHash}`} target="_blank" rel="noreferrer" className="link">
                    View tx on Explorer
                  </a>
                )}
              </div>
            </div>
          )}
          {activeTab === "agent" && (
            <div className="panel">
              <h3>Agents</h3>
              <p className="sub">Non-custodial automation: strategy, vault, and DAO agents use the SDK and respect RiskGuard and PolicyEngine. They never hold your keys.</p>

              <div className="flow-section">
                <strong>Docs &amp; SDK</strong>
                <p className="hint">Agent registry (register, stake, subscribe, claim revenue) and automation framework.</p>
                <ul className="mb-2 list-inside list-disc text-sm text-zinc-400">
                  <li><Link to="/docs/sdk/agents" className="text-[#22d3ee] hover:underline">SDK: Agents</Link> — registerAgent, getAgentMetadata, stakeAgent, subscribeToAgent, claimAgentRevenue</li>
                  <li><Link to="/docs/guides/examples" className="text-[#22d3ee] hover:underline">Guides: Examples</Link> — code samples including agent registration</li>
                </ul>
              </div>

              <div className="flow-section">
                <strong>Run automation agents</strong>
                <p className="hint">StrategyAgent, VaultAgent, and DaoAutomationAgent run in Node or Docker. They call the SDK with your signer; set env and run from the repo.</p>
                <div className="field">
                  <label>Environment</label>
                  <p className="value small font-mono">RPC_URL, CHAIN_ID, PRIVATE_KEY, DRY_RUN, LOG_LEVEL</p>
                  <p className="value small">Optional: RULE_ID, VAULT_ADDRESS, STRATEGY_TOKEN_ID</p>
                </div>
                <div className="field">
                  <label>Quick run (from repo root)</label>
                  <p className="value small font-mono break-all">docker build -f packages/agent/Dockerfile .</p>
                  <p className="value small mt-1">Or: PRIVATE_KEY=0x... npx ts-node packages/agent/examples/SimpleBuybackBot.ts</p>
                </div>
              </div>

              <div className="flow-section">
                <strong>Agent contracts</strong>
                <p className="hint">Deployed on Arbitrum Sepolia; use SDK or integrate when ready.</p>
                <div className="row"><span className="label">AgentRegistry</span><span className="value small font-mono">0xC9C3…f80d</span></div>
                <div className="row"><span className="label">AgentRevenueDistributor</span><span className="value small font-mono">0x5FeA…4136</span></div>
                <div className="row"><span className="label">AgentSubscriptionManager</span><span className="value small font-mono">0x37b4…F2f9</span></div>
              </div>
            </div>
          )}
          {activeTab === "protocol" && (
            <div className="panel">
              <h3>Protocol info</h3>
              <div className="row"><span className="label">Protocol fee</span><span className="value">{protocolFeeBps != null ? Number(protocolFeeBps) / 100 : "—"}%</span></div>
              <div className="row"><span className="label">Referral split (of fee)</span><span className="value">{referralSplitBps != null ? Number(referralSplitBps) / 100 : "—"}%</span></div>
              <div className="row"><span className="label">Treasury</span><span className="value small" style={{ wordBreak: "break-all" }}>{treasuryAddress ? String(treasuryAddress) : "—"}</span></div>

              <div className="flow-section">
                <strong>1. FeeManager balances</strong>
                <p className="hint">Cumulative fees recorded (for display): WETH {formatEther(totalFeesWeth)}, USDC {formatUnits(totalFeesUsdc, 6)}. Swap fees are sent <strong>directly to the treasury</strong> on each trade. The FeeManager contract only holds tokens if someone sent them to it; that balance is what you can withdraw below.</p>
                <div className="row"><span className="label">FeeManager WETH balance</span><span className="value">{formatEther(feeManagerWethBalance)}</span></div>
                <div className="row"><span className="label">FeeManager USDC balance</span><span className="value">{formatUnits(feeManagerUsdcBalance, 6)}</span></div>
              </div>

              <div className="flow-section">
                <strong>2. Withdraw fees to treasury</strong>
                <p className="hint">Send tokens <strong>held by the FeeManager contract</strong> to the treasury. Only FeeManager owner can call this. No approval needed — you are moving the contract&apos;s own balance.</p>
                <select value={withdrawToken} onChange={(e) => setWithdrawToken(e.target.value as "WETH" | "USDC")} className="select">
                  <option value="WETH">WETH</option>
                  <option value="USDC">USDC</option>
                </select>
                <label>Amount {withdrawToken === "WETH" ? "(WETH)" : "(USDC)"} — available in FeeManager: {withdrawToken === "WETH" ? formatEther(feeManagerWethBalance) : formatUnits(feeManagerUsdcBalance, 6)}</label>
                <div className="row" style={{ gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={withdrawToken === "WETH" ? formatEther(feeManagerWethBalance) : formatUnits(feeManagerUsdcBalance, 6)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm secondary"
                    onClick={() => setWithdrawAmount(withdrawToken === "WETH" ? formatEther(feeManagerWethBalance) : formatUnits(feeManagerUsdcBalance, 6))}
                  >
                    Max
                  </button>
                </div>
                {(() => {
                  let parsed: bigint | null = null;
                  try {
                    parsed = withdrawToken === "WETH" ? parseEther(withdrawAmount) : parseUnits(withdrawAmount, 6);
                  } catch {
                    /* invalid */
                  }
                  const maxAvail = withdrawToken === "WETH" ? feeManagerWethBalance : feeManagerUsdcBalance;
                  const exceeds = parsed != null && parsed > 0n && parsed > maxAvail;
                  return exceeds ? <p className="status">Amount exceeds FeeManager balance. Use Max or enter a smaller amount.</p> : null;
                })()}
                <button
                  type="button"
                  className="btn primary"
                  onClick={withdrawFeesToTreasury}
                  disabled={
                    !withdrawAmount.trim() ||
                    isSwapPending ||
                    (() => {
                      try {
                        const amt = withdrawToken === "WETH" ? parseEther(withdrawAmount) : parseUnits(withdrawAmount, 6);
                        const maxAvail = withdrawToken === "WETH" ? feeManagerWethBalance : feeManagerUsdcBalance;
                        return amt <= 0n || amt > maxAvail;
                      } catch {
                        return true;
                      }
                    })()
                  }
                >
                  Withdraw to treasury
                </button>
              </div>

              <div className="flow-section">
                <strong>3. Print treasury balance change</strong>
                <p className="hint">Before = snapshot when withdraw was submitted; After = current treasury balances; Change = difference.</p>
                {treasurySnapshotBefore && (
                  <>
                    <div className="row"><span className="label">Before (snapshot)</span><span className="value">ETH {treasurySnapshotBefore.eth} · WETH {treasurySnapshotBefore.weth} · USDC {treasurySnapshotBefore.usdc}</span></div>
                    <div className="row"><span className="label">After (current)</span><span className="value">ETH {treasuryEthBalance != null ? formatEther(treasuryEthBalance.value) : "—"} · WETH {formatEther(treasuryWethBalance)} · USDC {formatUnits(treasuryUsdcBalance, 6)}</span></div>
                    <div className="row">
                      <span className="label">Change</span>
                      <span className="value">
                        WETH {(() => {
                          const before = parseFloat(treasurySnapshotBefore.weth);
                          const after = parseFloat(formatEther(treasuryWethBalance));
                          const d = after - before;
                          return d >= 0 ? `+${d}` : d;
                        })()}
                        {" · "}
                        USDC {(() => {
                          const before = parseFloat(treasurySnapshotBefore.usdc);
                          const after = parseFloat(formatUnits(treasuryUsdcBalance, 6));
                          const d = after - before;
                          return d >= 0 ? `+${d}` : d;
                        })()}
                      </span>
                    </div>
                  </>
                )}
                {!treasurySnapshotBefore && <p className="value">Submit a withdraw above to see balance change.</p>}
                {lastWithdrawTxHash && (
                  <a href={`${ARBITRUM_SEPOLIA.explorer}/tx/${lastWithdrawTxHash}`} target="_blank" rel="noreferrer" className="link">View withdraw tx</a>
                )}
              </div>

              <div className="field">
                <label>Contract addresses</label>
                <p className="value small">Treasury: {treasuryAddress ?? "—"}</p>
                <p className="value small">Router: {DEFAULT_ROUTER}</p>
                <p className="value small">Referral: {REFERRAL_REGISTRY}</p>
                <p className="value small">WalletAuth: {WALLET_AUTH}</p>
                <p className="value small">FeeManager: {FEE_MANAGER}</p>
              </div>
            </div>
          )}
        </>
      )}

      {status && <p className="status">{status}</p>}
      {writeError && (
        <p className="status hint">
          {String(writeError).includes("transfer amount exceeds balance")
            ? "Router was deployed with a different WETH. Redeploy ExecutionRouter on Arbitrum Sepolia and use the new address."
            : "Common causes: InvalidNonce (refresh), ExecutionRouter__Slippage, or no WETH/ARB liquidity on Arbitrum Sepolia."}
        </p>
      )}
      {txHash && (
        <a
          href={`${ARBITRUM_SEPOLIA.explorer}/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="link"
        >
          View on Explorer
        </a>
      )}

      <TxStatusModal
        open={txModalAction != null}
        onClose={() => setTxModalAction(null)}
        actionLabel={txModalAction ?? ""}
        status={txModalStatus}
        txHash={txHash ?? undefined}
        errorMessage={txModalError}
        explorerBaseUrl={ARBITRUM_SEPOLIA.explorer}
      />
    </div>
  );
}

export default App;
