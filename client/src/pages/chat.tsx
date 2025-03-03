import { useWallet } from "@/lib/web3";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
  // State for the parse result from the API
  const [parseResult, setParseResult] = useState<ParseData | null>(null);
  const [loadingParse, setLoadingParse] = useState<boolean>(false);

  useEffect(() => {
    if (!isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  // This function calls your Node API at /api/parseTransaction
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

  // Placeholder for the signing function (to be integrated with Taho)
  async function handleSignTx() {
    if (!parseResult || !parseResult.parsed) {
      alert("No parsed transaction data available.");
      return;
    }
    // Here you would build a transaction object and call Taho's window.ethereum.request
    // For now, we just alert the user.
    alert(
      "Here, push data to Taho wallet for signing:\n" +
        JSON.stringify(parseResult.parsed, null, 2),
    );
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
