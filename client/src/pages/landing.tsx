import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/web3";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const { connect, isConnecting } = useWallet();
  const [, navigate] = useLocation();

  const handleConnect = async () => {
    await connect();
    navigate("/chat");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-primary/5">
      {/* Header with connect button */}
      <header className="w-full p-4">
        <div className="max-w-7xl mx-auto flex justify-end">
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
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <h1 className="text-6xl font-bold text-center bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent mb-4">
          CryptoFace Beta
        </h1>
        <p className="text-lg text-muted-foreground text-center mb-16">
          A new AgentiFi layer to make crypto ui as easy as speaking
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl px-4">
          <Card className="p-6 text-center">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Crypto Copilot</CardTitle>
            </CardHeader>
          </Card>

          <Card className="p-6 text-center">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Agent Dev Tools</CardTitle>
            </CardHeader>
          </Card>

          <Card className="p-6 text-center">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Agent Marketplace</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}