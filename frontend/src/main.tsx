import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./wagmi";
import "./index.css";
import { AppLayout } from "./components/AppLayout";
import { DocLayout } from "./components/docs/DocLayout";
import { Landing } from "./pages/Landing";
import { HowToUse } from "./pages/HowToUse";
import { WhyFastest } from "./pages/WhyFastest";
import { DocsOverview } from "./pages/docs/DocsOverview";
import { GettingStarted } from "./pages/docs/GettingStarted";
import { SdkOverview } from "./pages/docs/SdkOverview";
import { SdkExecution } from "./pages/docs/SdkExecution";
import { SdkVaults } from "./pages/docs/SdkVaults";
import { SdkStrategies } from "./pages/docs/SdkStrategies";
import { SdkDao } from "./pages/docs/SdkDao";
import { SdkAgents } from "./pages/docs/SdkAgents";
import { GuidesExamples } from "./pages/docs/GuidesExamples";
import { DocsErrors } from "./pages/docs/DocsErrors";
import { DocsSecurity } from "./pages/docs/DocsSecurity";
import { DocsContractToContract } from "./pages/docs/DocsContractToContract";
import { DocsExecutionEngine } from "./pages/docs/DocsExecutionEngine";
import { DocsRunLocally } from "./pages/docs/DocsRunLocally";
import { Memo } from "./pages/Memo";
import App from "./App.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<App />} />
              </Route>
              <Route path="/how" element={<AppLayout />}>
                <Route index element={<HowToUse />} />
              </Route>
              <Route path="/why" element={<AppLayout />}>
                <Route index element={<WhyFastest />} />
              </Route>
              <Route path="/memo" element={<Memo />} />
              <Route path="/docs" element={<AppLayout />}>
                <Route element={<DocLayout />}>
                  <Route index element={<DocsOverview />} />
                  <Route path="getting-started" element={<GettingStarted />} />
                  <Route path="sdk/overview" element={<SdkOverview />} />
                  <Route path="sdk/execution" element={<SdkExecution />} />
                  <Route path="sdk/vaults" element={<SdkVaults />} />
                  <Route path="sdk/strategies" element={<SdkStrategies />} />
                  <Route path="sdk/dao" element={<SdkDao />} />
                  <Route path="sdk/agents" element={<SdkAgents />} />
                  <Route path="guides/examples" element={<GuidesExamples />} />
                  <Route path="contract-to-contract" element={<DocsContractToContract />} />
                  <Route path="execution-engine" element={<DocsExecutionEngine />} />
                  <Route path="run-locally" element={<DocsRunLocally />} />
                  <Route path="errors" element={<DocsErrors />} />
                  <Route path="security" element={<DocsSecurity />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
