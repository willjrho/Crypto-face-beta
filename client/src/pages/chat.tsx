import { useWallet } from "@/lib/web3";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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

  // User's prompt for the transaction
  const [txPrompt, setTxPrompt] = useState("");

  // Server parse result
  const [parseResult, setParseResult] = useState<ParseData | null>(null);

  // UI loading states / feedback
  const [loadingParse, setLoadingParse] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  /**
   * Call the Node API to parse the transaction prompt.
   */
  async function handleParseTx() {
    setErrorMessage(null);
    setTxHash(null);

    if (!txPrompt.trim()) {
      setErrorMessage("Please enter a transaction prompt.");
      return;
    }

    setLoadingParse(true);
    try {
      console.log("[DEBUG] Sending transaction prompt:", txPrompt);
      const response = await fetch("/api/parseTransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: txPrompt }),
      });

      console.log("[DEBUG] Received raw response:", response);

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[DEBUG] Parsed JSON from API:", data);

      setParseResult(data);
    } catch (err: any) {
      console.error("[ERROR] Parsing transaction:", err);
      setParseResult(null);
      setErrorMessage(
        err?.message || "An error occurred while parsing transaction.",
      );
    } finally {
      setLoadingParse(false);
    }
  }

  /**
   * Use Ethers.js to sign and send the transaction via the user's wallet (Taho, etc.).
   */
  async function handleSignTx() {
    setErrorMessage(null);
    setTxHash(null);

    // Make sure we have parsed data
    if (!parseResult?.parsed) {
      setErrorMessage("No parsed transaction data available.");
      return;
    }

    const { amount, currency, recipient } = parseResult.parsed;

    // Ensure that an Ethereum provider is available
    if (typeof window.ethereum === "undefined") {
      setErrorMessage("No Ethereum provider found (Taho/MetaMask).");
      return;
    }

    try {
      // Request account access if needed
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // Create an Ethers provider from window.ethereum
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // Get the signer for the currently connected account
      const signer = provider.getSigner();

      // Convert the parsed amount to wei
      // Note: This assumes the parsed amount is in "ETH-like" units
      const amtWei = ethers.utils.parseEther(amount);

      // Build the transaction object
      const txParams = {
        to: recipient,
        value: amtWei,
      };

      console.log("[DEBUG] handleSignTx sending txParams:", txParams);

      // Send the transaction => Taho/MetaMask will show a popup
      const txResponse = await signer.sendTransaction(txParams);

      console.log("[DEBUG] Transaction response:", txResponse);

      // Save the transaction hash to show in the UI
      setTxHash(txResponse.hash);
    } catch (err: any) {
      console.error("Transaction sign error:", err);
      setErrorMessage(err.message || "Failed to send transaction.");
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background p-4">
      <h1 className="text-xl font-bold mb-4">Transaction Parser</h1>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-2 mb-2 border border-red-400 text-red-700 bg-red-50">
          {errorMessage}
        </div>
      )}

      {/* Transaction Hash */}
      {txHash && (
        <div className="p-2 mb-2 border border-green-400 text-green-700 bg-green-50">
          Transaction Submitted! Tx Hash: {txHash}
        </div>
      )}

      {/* Input and parse button */}
      <div className="mb-4">
        <Input
          value={txPrompt}
          onChange={(e) => setTxPrompt(e.target.value)}
          placeholder="E.g. 'Transfer 0.1 ETH to 0x1234...' or 'Send 0.0001 BTC...' etc."
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

      {/* Show parse results (if any) */}
      {parseResult && (
        <Card className="p-4 bg-gray-50">
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
