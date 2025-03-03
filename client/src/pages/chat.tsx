import { useWallet } from "@/lib/web3";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { BrowserProvider, parseEther, parseUnits, Contract } from "ethers";

interface ParseData {
  done: boolean;
  messages: string[];
  parsed: {
    amount: string;
    currency: string;
    recipient: string;
  } | null;
}

// Minimal ERC20 ABI (just transfer)
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
];

// Replace this with your actual mUSD contract address on the chain you’re using
const MUSD_ADDRESS = "0xe2f2a5C287993345a840Db3B0845fbC70f5935a5";

export default function Chat() {
  const { address, isConnected } = useWallet();
  const [, navigate] = useLocation();

  const [txPrompt, setTxPrompt] = useState("");
  const [parseResult, setParseResult] = useState<ParseData | null>(null);
  const [loadingParse, setLoadingParse] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  async function handleParseTx() {
    setErrorMessage(null);
    setTxHash(null);

    if (!txPrompt.trim()) {
      setErrorMessage("Please enter a transaction prompt.");
      return;
    }

    setLoadingParse(true);
    try {
      const response = await fetch("/api/parseTransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: txPrompt }),
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      const data = await response.json();
      setParseResult(data);
    } catch (err: any) {
      setParseResult(null);
      setErrorMessage(err?.message || "Error parsing transaction.");
    } finally {
      setLoadingParse(false);
    }
  }

  async function handleSignTx() {
    setErrorMessage(null);
    setTxHash(null);

    if (!parseResult?.parsed) {
      setErrorMessage("No parsed transaction data available.");
      return;
    }
    const { amount, currency, recipient } = parseResult.parsed;

    if (typeof window.ethereum === "undefined") {
      setErrorMessage("No Ethereum provider found (Taho/MetaMask).");
      return;
    }

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      let txResponse;
      if (
        currency.toLowerCase() === "eth" ||
        currency.toLowerCase() === "matic" ||
        currency.toLowerCase() === "btc" // if your chain's native token is labeled "BTC"
      ) {
        // Native currency transfer
        const amtWei = parseEther(amount);
        const txParams = {
          to: recipient,
          value: amtWei,
        };
        txResponse = await signer.sendTransaction(txParams);
      } else if (currency.toLowerCase() === "musd") {
        // ERC-20 token transfer
        const contract = new Contract(MUSD_ADDRESS, ERC20_ABI, signer);
        // Typically mUSD has 18 decimals, parseUnits(amount, 18)
        const amtTokens = parseUnits(amount, 18);
        txResponse = await contract.transfer(recipient, amtTokens);
      } else {
        throw new Error(
          `Unsupported token: ${currency}. Consider adding a fallback for unknown tokens.`,
        );
      }

      setTxHash(txResponse.hash);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send transaction.");
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background p-4">
      <h1 className="text-xl font-bold mb-4">Transaction Parser</h1>

      {errorMessage && (
        <div className="p-2 mb-2 border border-red-400 text-red-700 bg-red-50">
          {errorMessage}
        </div>
      )}

      {txHash && (
        <div className="p-2 mb-2 border border-green-400 text-green-700 bg-green-50">
          Transaction Submitted! Tx Hash: {txHash}
        </div>
      )}

      <div className="mb-4">
        <Input
          value={txPrompt}
          onChange={(e) => setTxPrompt(e.target.value)}
          placeholder="E.g. 'Transfer 0.1 ETH to 0x1234...' etc."
          className="w-full"
        />
        <Button
          className="mt-2"
          onClick={handleParseTx}
          disabled={loadingParse}
        >
          {loadingParse ? "Parsing..." : "Parse Transaction"}
        </Button>
      </div>

      {parseResult && (
        <Card className="p-4 bg-black text-white">
          <pre className="text-sm mb-2">
            {JSON.stringify(parseResult, null, 2)}
          </pre>
          {parseResult.parsed && (
            <Button onClick={handleSignTx}>Sign & Submit Transaction</Button>
          )}
        </Card>
      )}
    </div>
  );
}
