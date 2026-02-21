import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia } from "wagmi/chains";

const projectId =
  typeof import.meta.env.VITE_WALLETCONNECT_PROJECT_ID === "string" &&
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID.length > 0
    ? import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
    : "a9d64e1d0e0e2e8e2e8e2e8e2e8e2e8e"; // placeholder; get one at cloud.walletconnect.com

export const config = getDefaultConfig({
  appName: "Arbi Execution Swap",
  projectId,
  chains: [arbitrumSepolia],
  ssr: false,
});
