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

// 1) A type for the parse response from your Python API
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

  // This "input" is the chat message
  const [input, setInput] = useState("");

  // This is for the transaction prompt to parse
  const [txPrompt, setTxPrompt] = useState("");

  // This holds the parse result
  const [parseResult, setParseResult] = useState<ParseData | null>(null);

  useEffect(() => {
    if (!isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  // 2) Load chat messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  // 3) Send chat message
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage.mutate(input.trim());
    }
  };

  // 4) Mutation to parse the transaction prompt
  const parseTransaction = useMutation({
    mutationFn: async (prompt: string) => {
      const resp = await apiRequest("POST", "/api/parseTransaction", { prompt });
      // resp is the JSON from your Node route => from Python
      return resp as ParseData;
    },
    onSuccess: (data) => {
      setParseResult(data);
    },
    onError: (err) => {
      console.error("parseTransaction error:", err);
      setParseResult(null);
    },
  });

  // 5) Function to sign & submit the transaction via Taho
  async function handleSignTx() {
    if (!parseResult || !parseResult.parsed) {
      alert("No parsed transaction data available.");
      return;
    }
    const { amount, currency, recipient } = parseResult.parsed;
    if (typeof window.ethereum === "undefined") {
      alert("No Ethereum provider found (Taho/MetaMask).");
      return;
    }
    try {
      // Request accounts if not already connected
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const accounts: string[] = await window.ethereum.request({ method: "eth_accounts" });
      const fromAddress = accounts[0];

      // For demonstration, treat the "amount" as native token with 18 decimals
      const amtNum = parseFloat(amount) || 0;
      const amountWei = BigInt(Math.floor(amtNum * 1e18)).toString(16);

      // Build transaction object for Taho
      const txParams = {
        from: fromAddress,
        to: recipient,
        value: "0x" + amountWei, 
        // Add chainId or other fields if needed
      };

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [txParams],
      });
      alert(`Transaction submitted!\nTx Hash: ${txHash}`);
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
      {/* Chat messages */}
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

      {/* (Optional) Divider or section break */}
      <hr />

      {/* Transaction parse section */}
      <div className="p-4 border-t space-y-2">
        <h2 className="font-bold">Parse Transaction Prompt</h2>
        <div className="flex gap-2">
          <Input
            value={txPrompt}
            onChange={(e) => setTxPrompt(e.target.value)}
            placeholder="E.g. 'Please transfer 0.00000001 BTC to 0x1234...'"
            className="flex-1"
          />
          <Button
            disabled={parseTransaction.isPending}
            onClick={() => parseTransaction.mutate(txPrompt)}
          >
            Parse Tx
          </Button>
        </div>

        {/* Show parse results if any */}
        {parseResult && (
          <div className="mt-2 p-2 border rounded bg-gray-50">
            <pre className="text-sm">
              {JSON.stringify(parseResult, null, 2)}
            </pre>

            {parseResult.parsed && (
              <Button className="mt-2" onClick={handleSignTx}>
                Sign & Submit with Taho
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
