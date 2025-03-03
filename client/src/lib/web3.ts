import { ethers } from "ethers";
import { create } from "zustand";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWallet = create<WalletState>((set) => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {
    try {
      set({ isConnecting: true });
      if (!window.ethereum) {
        throw new Error("No wallet found! Please install MetaMask or Taho.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      set({ address, isConnected: true });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      set({ isConnecting: false });
    }
  },
  disconnect: () => {
    set({ address: null, isConnected: false });
  },
}));