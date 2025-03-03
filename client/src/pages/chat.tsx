import { useWallet } from "@/lib/web3";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ethers } from "ethers";

interface ParseData {
  done: boolean;
  messages: string[];
  parsed: {
    amount: string;
    currency: string;
    recipient: string;
  } | null;
}

export default function Chat() {
  const { address, isConnected } = useWallet();
  const [, navigate] = useLocation();

  // State for the transaction prompt
  const [txPrompt, setTxPrompt] = useState("");
  // Holds the parse result from the API
  const [parseResult, setParseResult] = useState<ParseData | null>(null);
  const [loadingParse, setLoadingParse] = useState<boolean>(false);

  useEffect(() => {
    if (!isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  // Call the Node API to parse the transaction prompt.
  async function handleParseTx() {
    if (!txPrompt.trim()) return;
    setLoadingParse(true);
    try {
      console.log("[DEBUG] Sending transaction prompt:", txPrompt);
      const response = await fetch("/api/parseTransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: txPrompt }),
      });
      console.log("[DEBUG] Received raw response:", response);
      const data = await response.json();
      console.log("[DEBUG] Parsed JSON from API:", data);
      setParseResult(data);
    } catch (error) {
      console.error("[ERROR] Parsing transaction:", error);
      setParseResult(null);
    } finally {
      setLoadingParse(false);
    }
  }

  // Use ethers.js to sign and send the transaction via the user's wallet.
  async function handleSignTx() {
    if (!parseResult || !parseResult.parsed) {
      alert("No parsed transaction data available.");
      return;
    }

    const { amount, currency, recipient } = parseResult.parsed;

    // Ensure that an Ethereum provider is available
    if (typeof window.ethereum === "undefined") {
      alert("No Ethereum provider found (Taho/MetaMask).");
      return;
    }

    try {
      // Request account access if needed
      await window.ethereum.request({ method: "eth_requestAccounts" });
      // Create an Ethers provider from window.ethereum
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      // Get the signer for the currently connected account
      const signer = provider.getSigner();

      // Convert the parsed amount to wei.
      // Note: This assumes the parsed amount is in ether units.
      const amtWei = ethers.utils.parseEther(amount);

      // Build the transaction object.
      // If the currency is "BTC" (used as a native token on your EVM chain), treat it as such.
      const txParams = {
        to: recipient,
        value: amtWei,
        // Optionally, add chainId, gasLimit, gasPrice, etc.
      };

      console.log("[DEBUG] handleSignTx sending txParams:", txParams);

      // Send the transaction using the signer. Taho or MetaMask will prompt the user to sign.
      const txResponse = await signer.sendTransaction(txParams);
      console.log("[DEBUG] Transaction response:", txResponse);

      alert(`Transaction submitted!\nTx Hash: ${txResponse.hash}`);
    } catch (err: any) {
      console.error("Transaction sign error:", err);
      alert("Sign/Submit error: " + err.message);
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background p-4">
      <h1 className="text-xl font-bold mb-4">Transaction Parser</h1>

      <div className="mb-4">
        <Input
          value={txPrompt}
          onChange={(e) => setTxPrompt(e.target.value)}
          placeholder="E.g. 'Please transfer 0.00000001 BTC to wallet address 0x...'"
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
        <div className="p-4 border rounded bg-gray-50">
          <pre className="text-sm">{JSON.stringify(parseResult, null, 2)}</pre>
          {parseResult.parsed && (
            <Button className="mt-2" onClick={handleSignTx}>
              Sign & Submit Transaction
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
