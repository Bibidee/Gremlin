import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export class NoInjectedWalletError extends Error {
  constructor() {
    super("No injected wallet found. Install MetaMask or Rabby and reload.");
    this.name = "NoInjectedWalletError";
  }
}

interface Eip6963ProviderDetail {
  info: { uuid: string; name: string; rdns: string };
  provider: NonNullable<Window["ethereum"]>;
}

/** Collects wallets announced via EIP-6963 (the modern multi-wallet discovery standard
 * that Rabby, Coinbase Wallet, and current MetaMask all use). Each wallet announces
 * itself independently instead of fighting over a single window.ethereum, which is
 * exactly what avoids the double-popup problem the old window.ethereum.providers[]
 * array approach ran into. */
function discoverEip6963Providers(): Promise<Eip6963ProviderDetail[]> {
  return new Promise((resolve) => {
    const found: Eip6963ProviderDetail[] = [];
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
      if (detail && !found.some((d) => d.info.uuid === detail.info.uuid)) {
        found.push(detail);
      }
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    // Wallets respond synchronously to the request event, but give async injectors
    // a short window before resolving.
    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve(found);
    }, 150);
  });
}

/** Picks a single injected wallet to connect through. Prefers EIP-6963 discovery
 * (each wallet announces itself independently, so there's no ambiguity about which
 * provider gets called) and falls back to the legacy window.ethereum / .providers[]
 * pattern only if no wallet announces itself the modern way. */
async function pickInjectedProvider(): Promise<NonNullable<Window["ethereum"]> | null> {
  const announced = await discoverEip6963Providers();
  if (announced.length > 0) {
    const preferred =
      announced.find((d) => d.info.rdns.includes("metamask") || d.info.rdns.includes("rabby")) ??
      announced[0];
    return preferred.provider;
  }

  const eth = window.ethereum;
  if (!eth) return null;

  const candidates: NonNullable<Window["ethereum"]>[] =
    (eth as unknown as { providers?: NonNullable<Window["ethereum"]>[] }).providers ?? [eth];

  return candidates.find((p) => p.isMetaMask || p.isRabby) ?? candidates[0] ?? eth;
}

/** Switches the injected wallet to StudioNet, adding it first if the wallet doesn't
 * know about it yet. Deliberately does NOT call genlayer-js's client.connect() —
 * that helper also installs a MetaMask-only signing Snap (wallet_getSnaps /
 * wallet_requestSnaps), which errors out on Rabby and any non-MetaMask wallet.
 * We don't need the snap: passing `provider` to createClient already routes
 * signing through the injected wallet directly. */
async function switchToStudioNet(provider: NonNullable<Window["ethereum"]>): Promise<void> {
  const chainIdHex = `0x${studionet.id.toString(16)}`;
  const currentChainId = (await provider.request({ method: "eth_chainId" })) as string;
  if (currentChainId === chainIdHex) return;

  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
  } catch {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHex,
          chainName: studionet.name,
          rpcUrls: studionet.rpcUrls.default.http,
          nativeCurrency: studionet.nativeCurrency,
          blockExplorerUrls: studionet.blockExplorers?.default.url
            ? [studionet.blockExplorers.default.url]
            : undefined,
        },
      ],
    });
  }
}

/** Requests account access from the injected wallet (MetaMask or Rabby only) and
 * returns a GenLayer client bound to that wallet, connected to StudioNet. */
export async function connectInjectedWallet(): Promise<{
  client: ReturnType<typeof createClient>;
  address: `0x${string}`;
}> {
  const provider = await pickInjectedProvider();
  if (!provider) {
    throw new NoInjectedWalletError();
  }

  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts[0] as `0x${string}`;

  await switchToStudioNet(provider);

  const client = createClient({
    chain: studionet,
    account: address,
    provider,
  });

  return { client, address };
}

/** Read-only client, usable before any wallet is connected. */
export function createReadClient() {
  return createClient({ chain: studionet });
}
