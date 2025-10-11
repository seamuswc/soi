import { createConfig, http } from 'wagmi';
import { base, mainnet } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';

const projectId = '06866621556efc2fe61f94f0034eec42';

export const config = createConfig({
  chains: [base, mainnet],
  connectors: [
    walletConnect({ projectId }),
    injected(),
    coinbaseWallet({ appName: 'SoiPattaya' })
  ],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http()
  }
});

