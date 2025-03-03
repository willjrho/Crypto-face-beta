import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/web3";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function Landing() {
  const { connect, isConnecting } = useWallet();
  const [, navigate] = useLocation();

  const handleConnect = async () => {
    await connect();
    navigate("/chat");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-primary/5">
      <h1 className="text-6xl font-bold text-center bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent mb-4">
        CryptoFace Beta
      </h1>
      <p className="text-lg text-muted-foreground text-center mb-8">
        A new AgentiFi layer to make crypto ui as easy as speaking
      </p>
      <Button
        size="lg"
        onClick={handleConnect}
        disabled={isConnecting}
        className="min-w-[200px]"
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          "Connect Wallet"
        )}
      </Button>
    </div>
  );
}