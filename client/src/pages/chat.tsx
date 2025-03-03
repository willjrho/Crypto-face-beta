import { useWallet } from "@/lib/web3";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Message } from "@shared/schema";
import { ethers } from "ethers";

interface ParseData {
  done: boolean;
  messages: string[];
  parsed: {
    amount: string; // e.g. "0.00000001"
    currency: string; // e.g. "BTC"
    recipient: string; // e.g. "0x..."
  } | null;
}

export default function Chat() {
  const { address, isConnected } = useWallet();
  const [, navigate] = useLocation();

  // Chat input state
  const [input, setInput] = useState("");
  // Transaction prompt state
  const [txPrompt, setTxPrompt] = useState("");
  // Holds parse result from Python
  const [parseResult, setParseResult] = useState<ParseData | null>(null);

  useEffect(() => {
    if (!isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  // 1) Load chat messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  // 2) Send chat message
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/messages", {
        content,
        walletAddress: address,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setInput("");
    },
  });

  // 3) parseTransaction => calls /api/parseTransaction
  const parseTransaction = useMutation({
    mutationFn: async (prompt: string) => {
      console.log("[DEBUG parseTransaction] sending prompt =>", prompt);
      const resp = await apiRequest("POST", "/api/parseTransaction", {
        prompt,
      });
      console.log("[DEBUG parseTransaction] raw =>", resp);
      return resp as ParseData;
    },
    onSuccess: (data) => {
      console.log("[DEBUG parseTransaction onSuccess] =>", data);
      setParseResult(data);
    },
    onError: (err) => {
      console.error("[ERROR parseTransaction]", err);
      setParseResult(null);
    },
  });

  // 4) Chat form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage.mutate(input.trim());
    }
  };

  // 5) Sign & Submit Transaction with Ethers
  async function handleSignTx() {
    if (!parseResult || !parseResult.parsed) {
      alert("No parsed transaction data available.");
      return;
    }

    const { amount, currency, recipient } = parseResult.parsed;

    // If your currency is truly "BTC" on an EVM chain, we treat it as the native token.
    // If it's real Bitcoin, you'd need a separate flow.
    // We'll assume it's an EVM-based chain with a "BTC" symbol.

    if (typeof window.ethereum === "undefined") {
      alert("No Ethereum provider found (Taho/MetaMask).");
      return;
    }

    try {
      // 1) Request accounts if not already connected
      await window.ethereum.request({ method: "eth_requestAccounts" });
      // 2) Create an Ethers provider from the injected window.ethereum
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      // 3) Get a signer for the user's account
      const signer = provider.getSigner();

      // 4) Convert the parsed 'amount' from ether units to wei
      // If amount is "0.00000001", parseEther will handle it as a string
      const amtWei = ethers.utils.parseEther(amount);

      // 5) Build transaction object
      const tx = {
        to: recipient,
        value: amtWei,
        // If you need chainId, gasLimit, gasPrice, data, etc., add them here
      };

      console.log("[DEBUG] handleSignTx => sending transaction", tx);
      // 6) Send transaction => Taho will pop up for user to sign
      const txResponse = await signer.sendTransaction(tx);
      console.log("[DEBUG] Transaction response =>", txResponse);

      alert(`Transaction submitted!\nTx Hash: ${txResponse.hash}`);
    } catch (err: any) {
      console.error("Transaction sign error:", err);
      alert("Sign/Submit error: " + err.message);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      {/* Chat messages list */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <Card key={message.id} className="p-4">
            <div className="flex items-start gap-2">
              <div className="text-sm text-muted-foreground">
                {message.walletAddress.slice(0, 6)}...
                {message.walletAddress.slice(-4)}
              </div>
              <div className="flex-1">{message.content}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Chat input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message CryptoFace"
            className="flex-1"
          />
          <Button type="submit" disabled={sendMessage.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <hr />

      {/* Transaction parse UI */}
      <div className="p-4 border-t space-y-2">
        <h2 className="font-bold">Parse Transaction Prompt</h2>
        <div className="flex gap-2">
          <Input
            value={txPrompt}
            onChange={(e) => setTxPrompt(e.target.value)}
            placeholder="E.g. 'Please transfer 0.00000001 BTC to 0x...' "
            className="flex-1"
          />
          <Button
            disabled={parseTransaction.isPending}
            onClick={() => parseTransaction.mutate(txPrompt)}
          >
            {parseTransaction.isPending ? "Parsing..." : "Parse Tx"}
          </Button>
        </div>

        {/* Show parse result */}
        {parseResult && (
          <div className="mt-2 p-2 border rounded bg-gray-50">
            <pre className="text-sm">
              {JSON.stringify(parseResult, null, 2)}
            </pre>

            {parseResult.parsed && (
              <Button className="mt-2" onClick={handleSignTx}>
                Sign & Submit Tx
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
