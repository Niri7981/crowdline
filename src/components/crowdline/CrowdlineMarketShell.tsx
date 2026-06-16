"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Flame,
  LogOut,
  RefreshCw,
  Search,
  Trophy,
  Wallet,
} from "lucide-react";

const categories = [
  { href: "/", icon: Flame, label: "热门" },
  { href: "/", icon: Trophy, label: "世界杯", active: true },
  { href: "/", icon: BarChart3, label: "成交量" },
  { href: "/", icon: Clock3, label: "即将锁定" },
];

const SOLANA_RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";

type SolanaPublicKey = {
  toString: () => string;
};

type SolanaProvider = {
  isPhantom?: boolean;
  publicKey?: SolanaPublicKey | null;
  connect: () => Promise<{
    publicKey: SolanaPublicKey;
  }>;
  disconnect?: () => Promise<void>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
};

type EthereumProvider = {
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  request: <TResponse = unknown>(args: {
    method: string;
    params?: unknown[];
  }) => Promise<TResponse>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
};

type WalletKind = "phantom" | "metamask";

type ConnectedWallet = {
  address: string;
  balanceLabel: string;
  kind: WalletKind;
  networkLabel: string;
  providerLabel: string;
};

type SolanaBalanceResponse = {
  result?: {
    value?: number;
  };
};

const evmChainInfo: Record<string, { networkLabel: string; symbol: string }> = {
  "0x1": { networkLabel: "Ethereum", symbol: "ETH" },
  "0x5": { networkLabel: "Goerli", symbol: "ETH" },
  "0xaa36a7": { networkLabel: "Sepolia", symbol: "ETH" },
  "0xa": { networkLabel: "Optimism", symbol: "ETH" },
  "0x89": { networkLabel: "Polygon", symbol: "POL" },
  "0xa4b1": { networkLabel: "Arbitrum", symbol: "ETH" },
  "0x2105": { networkLabel: "Base", symbol: "ETH" },
};

function getSolanaProvider() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const browserWindow = window as Window & {
    phantom?: { solana?: SolanaProvider };
    solana?: SolanaProvider;
  };

  return browserWindow.phantom?.solana ?? browserWindow.solana;
}

function getEthereumProvider() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum;

  return provider?.isMetaMask
    ? provider
    : provider?.providers?.find((item) => item.isMetaMask) ?? provider;
}

function formatWalletAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function normalizeAccounts(accounts: unknown) {
  if (!Array.isArray(accounts)) {
    return [];
  }

  return accounts.filter((account): account is string => typeof account === "string");
}

function formatSolBalance(lamports: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  }).format(lamports / 1_000_000_000)} SOL`;
}

function formatEvmBalance(hexBalance: string, symbol: string) {
  const wei = BigInt(hexBalance);
  const divisor = BigInt("1000000000000000000");
  const whole = wei / divisor;
  const fraction = wei % divisor;
  const decimal = fraction.toString().padStart(18, "0").slice(0, 4);
  const trimmedDecimal = decimal.replace(/0+$/, "");

  return `${whole.toString()}${trimmedDecimal ? `.${trimmedDecimal}` : ""} ${symbol}`;
}

function getWalletRequestError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Wallet request was cancelled or rejected.";
}

async function fetchSolanaBalance(address: string) {
  const response = await fetch(SOLANA_RPC_ENDPOINT, {
    body: JSON.stringify({
      id: "crowdline-wallet-balance",
      jsonrpc: "2.0",
      method: "getBalance",
      params: [address],
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json()) as SolanaBalanceResponse;
  const lamports = payload.result?.value;

  return typeof lamports === "number" ? formatSolBalance(lamports) : "Balance unavailable";
}

async function buildPhantomWallet(address: string): Promise<ConnectedWallet> {
  return {
    address,
    balanceLabel: await fetchSolanaBalance(address),
    kind: "phantom",
    networkLabel: "Solana Mainnet",
    providerLabel: "Phantom",
  };
}

async function buildMetaMaskWallet(address: string): Promise<ConnectedWallet> {
  const ethereum = getEthereumProvider();

  if (!ethereum) {
    throw new Error("MetaMask provider is not available.");
  }

  const chainId = await ethereum.request<string>({ method: "eth_chainId" });
  const chain =
    evmChainInfo[chainId.toLowerCase()] ??
    {
      networkLabel: `EVM chain ${Number.parseInt(chainId, 16)}`,
      symbol: "Native",
    };
  const hexBalance = await ethereum.request<string>({
    method: "eth_getBalance",
    params: [address, "latest"],
  });

  return {
    address,
    balanceLabel: formatEvmBalance(hexBalance, chain.symbol),
    kind: "metamask",
    networkLabel: chain.networkLabel,
    providerLabel: "MetaMask",
  };
}

export function CrowdlineTopNav() {
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(
    null,
  );
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const [isWalletBusy, setIsWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [didCopyWallet, setDidCopyWallet] = useState(false);
  const connectedKindRef = useRef<WalletKind | null>(null);
  const walletMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    connectedKindRef.current = connectedWallet?.kind ?? null;
  }, [connectedWallet]);

  useEffect(() => {
    function closeWalletMenu(event: MouseEvent) {
      if (!walletMenuRef.current?.contains(event.target as Node)) {
        setIsWalletMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeWalletMenu);

    return () => {
      document.removeEventListener("mousedown", closeWalletMenu);
    };
  }, []);

  useEffect(() => {
    const solana = getSolanaProvider();
    const ethereum = getEthereumProvider();

    async function handleSolanaAccountChanged(value?: unknown) {
      if (connectedKindRef.current !== "phantom") {
        return;
      }

      if (!value || typeof (value as SolanaPublicKey).toString !== "function") {
        setConnectedWallet(null);
        return;
      }

      setConnectedWallet(await buildPhantomWallet((value as SolanaPublicKey).toString()));
    }

    function handleSolanaDisconnect() {
      if (connectedKindRef.current === "phantom") {
        setConnectedWallet(null);
      }
    }

    async function handleEthereumAccountsChanged(value?: unknown) {
      if (connectedKindRef.current !== "metamask") {
        return;
      }

      const accounts = normalizeAccounts(value);

      setConnectedWallet(
        accounts[0] ? await buildMetaMaskWallet(accounts[0]) : null,
      );
    }

    async function handleEthereumChainChanged() {
      if (connectedKindRef.current !== "metamask" || !connectedWallet?.address) {
        return;
      }

      setConnectedWallet(await buildMetaMaskWallet(connectedWallet.address));
    }

    solana?.on?.("accountChanged", handleSolanaAccountChanged);
    solana?.on?.("disconnect", handleSolanaDisconnect);
    ethereum?.on?.("accountsChanged", handleEthereumAccountsChanged);
    ethereum?.on?.("chainChanged", handleEthereumChainChanged);

    return () => {
      solana?.off?.("accountChanged", handleSolanaAccountChanged);
      solana?.off?.("disconnect", handleSolanaDisconnect);
      ethereum?.removeListener?.("accountsChanged", handleEthereumAccountsChanged);
      ethereum?.removeListener?.("chainChanged", handleEthereumChainChanged);
    };
  }, [connectedWallet?.address]);

  async function connectPhantomWallet() {
    const solana = getSolanaProvider();

    if (!solana?.isPhantom) {
      setWalletError("没有检测到 Phantom 扩展。");
      return;
    }

    try {
      setIsWalletBusy(true);
      setWalletError(null);
      const response = await solana.connect();
      setConnectedWallet(await buildPhantomWallet(response.publicKey.toString()));
      setIsWalletMenuOpen(true);
    } catch (error) {
      setWalletError(getWalletRequestError(error));
    } finally {
      setIsWalletBusy(false);
    }
  }

  async function connectMetaMaskWallet() {
    const ethereum = getEthereumProvider();

    if (!ethereum?.isMetaMask) {
      setWalletError("没有检测到 MetaMask 扩展。");
      return;
    }

    try {
      setIsWalletBusy(true);
      setWalletError(null);
      const accounts = normalizeAccounts(
        await ethereum.request({ method: "eth_requestAccounts" }),
      );

      if (!accounts[0]) {
        throw new Error("No account returned from MetaMask.");
      }

      setConnectedWallet(await buildMetaMaskWallet(accounts[0]));
      setIsWalletMenuOpen(true);
    } catch (error) {
      setWalletError(getWalletRequestError(error));
    } finally {
      setIsWalletBusy(false);
    }
  }

  async function refreshConnectedWallet() {
    if (!connectedWallet) {
      return;
    }

    try {
      setIsWalletBusy(true);
      setWalletError(null);
      setConnectedWallet(
        connectedWallet.kind === "phantom"
          ? await buildPhantomWallet(connectedWallet.address)
          : await buildMetaMaskWallet(connectedWallet.address),
      );
    } catch (error) {
      setWalletError(getWalletRequestError(error));
    } finally {
      setIsWalletBusy(false);
    }
  }

  async function disconnectWallet() {
    if (connectedWallet?.kind === "phantom") {
      await getSolanaProvider()?.disconnect?.();
    }

    setConnectedWallet(null);
    setWalletError(null);
    setDidCopyWallet(false);
    setIsWalletMenuOpen(false);
  }

  async function copyWalletAddress() {
    if (!connectedWallet) {
      return;
    }

    try {
      await window.navigator.clipboard.writeText(connectedWallet.address);
      setDidCopyWallet(true);
      window.setTimeout(() => setDidCopyWallet(false), 1200);
    } catch {
      setWalletError("地址复制失败，请手动复制。");
    }
  }

  return (
    <header className="pm-topbar">
      <Link className="pm-brand" href="/">
        <span className="pm-brandMark">
          <Trophy className="h-4 w-4" />
        </span>
        <span>Crowdline</span>
      </Link>

      <div aria-label="Search markets" className="pm-search">
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">搜索 World Cup markets, teams, outcomes...</span>
      </div>

      <nav className="pm-topActions" aria-label="Crowdline navigation">
        <Link className="pm-link" href="/">
          Markets
        </Link>
        <Link className="pm-link" href="/portfolio">
          Portfolio
        </Link>
        <Link className="pm-link" href="/leaderboard">
          Leaderboard
        </Link>
        <Link className="pm-primaryButton" href="/portfolio">
          <BriefcaseBusiness className="h-4 w-4" />
          My positions
        </Link>
        <div className="pm-walletConnect" ref={walletMenuRef}>
          <button
            aria-expanded={isWalletMenuOpen}
            aria-haspopup="menu"
            className="pm-walletButton"
            data-connected={connectedWallet ? "true" : "false"}
            onClick={() => {
              setIsWalletMenuOpen((open) => !open);
            }}
            type="button"
          >
            <span className="pm-walletStatusDot" />
            <Wallet className="h-4 w-4" />
            <span className="pm-walletButtonText">
              {connectedWallet
                ? formatWalletAddress(connectedWallet.address)
                : "Connect wallet"}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {isWalletMenuOpen ? (
            <div className="pm-walletMenu" role="menu">
              {connectedWallet ? (
                <>
                  <div>
                    <div className="pm-walletMenuLabel">
                      {connectedWallet.providerLabel}
                    </div>
                    <div className="pm-walletMenuAddress">
                      {connectedWallet.address}
                    </div>
                  </div>
                  <div className="pm-walletMenuBalance">
                    <span>{connectedWallet.networkLabel}</span>
                    <strong>{connectedWallet.balanceLabel}</strong>
                  </div>
                  {walletError ? (
                    <div className="pm-walletMenuError">{walletError}</div>
                  ) : null}
                  <button
                    className="pm-walletMenuAction"
                    disabled={isWalletBusy}
                    onClick={copyWalletAddress}
                    role="menuitem"
                    type="button"
                  >
                    {didCopyWallet ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {didCopyWallet ? "Copied" : "Copy address"}
                  </button>
                  <button
                    className="pm-walletMenuAction"
                    disabled={isWalletBusy}
                    onClick={refreshConnectedWallet}
                    role="menuitem"
                    type="button"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {isWalletBusy ? "Refreshing..." : "Refresh balance"}
                  </button>
                  <button
                    className="pm-walletMenuAction pm-walletMenuActionDanger"
                    onClick={disconnectWallet}
                    role="menuitem"
                    type="button"
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <div className="pm-walletMenuLabel">Connect wallet</div>
                    <div className="pm-walletMenuMeta">
                      选择浏览器钱包并发起真实连接请求。
                    </div>
                  </div>
                  <button
                    className="pm-walletProviderButton"
                    disabled={isWalletBusy}
                    onClick={connectPhantomWallet}
                    role="menuitem"
                    type="button"
                  >
                    <span className="pm-walletProviderIcon">P</span>
                    <span>
                      Phantom
                      <small>Solana wallet</small>
                    </span>
                  </button>
                  <button
                    className="pm-walletProviderButton"
                    disabled={isWalletBusy}
                    onClick={connectMetaMaskWallet}
                    role="menuitem"
                    type="button"
                  >
                    <span className="pm-walletProviderIcon">M</span>
                    <span>
                      MetaMask
                      <small>EVM wallet</small>
                    </span>
                  </button>
                  {walletError ? (
                    <div className="pm-walletMenuError">{walletError}</div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      </nav>
    </header>
  );
}

export function CrowdlineCategoryNav() {
  return (
    <nav className="pm-categoryNav" aria-label="Market categories">
      {categories.map((category) => {
        const Icon = category.icon;

        return (
          <Link
            className="pm-categoryPill"
            data-active={category.active ? "true" : "false"}
            href={category.href}
            key={category.label}
          >
            <Icon className="h-4 w-4" />
            {category.label}
          </Link>
        );
      })}
    </nav>
  );
}
