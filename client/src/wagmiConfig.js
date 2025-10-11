import { createConfig, http } from 'wagmi';
import { mainnet, base, arbitrum } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';

const projectId = '06866621556efc2fe61f94f0034eec42';

export const config = createConfig({
  chains: [mainnet, base, arbitrum],
  connectors: [
    walletConnect({ projectId }),
    injected(),
    coinbaseWallet({ appName: 'SoiPattaya' })
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http()
  }
});

