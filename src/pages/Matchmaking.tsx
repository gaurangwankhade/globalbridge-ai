import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Star, Mail, Loader2, TrendingUp, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Buyer {
  id: string;
  name: string;
  country?: string;
  region?: string;
  category?: string;
  hsCode?: string;
  trustScore?: number;
  minOrderQty?: number;
  maxOrderQty?: number;
  matchScore: number;
}

const Matchmaking = () => {
  const { user, loading } = useAuth();

  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Buyer[] | null>(null);

  const [productName, setProductName] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [targetRegion, setTargetRegion] = useState("");
  const [targetCountry, setTargetCountry] = useState("");

  const handleSearch = async () => {
    if (!user) {
      toast.error("Please sign in to use buyer matching.");
      return;
    }

    if (!productName.trim()) {
      toast.error("Please enter a product name");
      return;
    }

    setIsSearching(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("match-buyers", {
        body: {
          productName: productName.trim(),
          hsCode: hsCode.trim() || undefined,
          targetRegion: targetRegion.trim() || undefined,
          targetCountry: targetCountry.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const buyers: Buyer[] = data?.buyers ?? [];
      setResults(buyers);

      toast.success(`Found ${buyers.length} matching buyers!`);
    } catch (err: any) {
      console.error("Matchmaking error:", err);
      toast.error(err?.message || "Failed to find buyers. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const sortByTrustScore = () => {
    if (results) {
      const sorted = [...results].sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0));
      setResults(sorted);
      toast.success("Sorted by trust score");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Loading session...</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buyer-Seller Matchmaking</h1>
          <p className="text-muted-foreground mt-2">
            Connect with verified buyers using AI-powered semantic matching
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Sign in required
            </CardTitle>
            <CardDescription>
              Please sign in to search buyers and save your searches.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tip: if you don’t have an auth page yet, create a minimal one later. For now,
              you can sign in through whatever login flow you already have wired.
            </p>
            <Button onClick={() => toast.info("Open your login page / auth flow to sign in.")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Buyer-Seller Matchmaking</h1>
        <p className="text-muted-foreground mt-2">
          Connect with verified buyers using AI-powered semantic matching
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Search Criteria</CardTitle>
            <CardDescription>Find potential buyers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                placeholder="e.g., LED Televisions"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>HS Code (Optional)</Label>
              <Input
                placeholder="e.g., 8528.72"
                value={hsCode}
                onChange={(e) => setHsCode(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Region</Label>
              <Input
                placeholder="e.g., Europe, Asia"
                value={targetRegion}
                onChange={(e) => setTargetRegion(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Country</Label>
              <Input
                placeholder="e.g., Germany"
                value={targetCountry}
                onChange={(e) => setTargetCountry(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding Buyers...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Find Buyers
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {isSearching && (
            <Card>
              <CardContent className="p-12 flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">
                  Running semantic search on buyer database...
                </p>
              </CardContent>
            </Card>
          )}

          {results && results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Matching Buyers ({results.length})</h2>
                <Button variant="outline" size="sm" onClick={sortByTrustScore}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Sort by Trust Score
                </Button>
              </div>

              <div className="grid gap-4">
                {results.map((buyer) => (
                  <Card key={buyer.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{buyer.name}</h3>
                                {(buyer.trustScore ?? 0) >= 90 && (
                                  <Badge variant="default" className="bg-success">
                                    High Trust
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {(buyer.country || "Unknown")}{buyer.region ? `, ${buyer.region}` : ""}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-warning text-warning" />
                                  Trust Score: {buyer.trustScore ?? "N/A"}
                                </div>
                              </div>

                              <p className="text-xs text-muted-foreground mt-1">
                                Similarity: {(buyer.matchScore * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 pl-11">
                            <div className="flex flex-wrap items-center gap-3">
                              {buyer.category && <Badge variant="outline">{buyer.category}</Badge>}
                              {buyer.hsCode && <Badge variant="secondary">HS: {buyer.hsCode}</Badge>}
                            </div>

                            {(buyer.minOrderQty || buyer.maxOrderQty) && (
                              <div>
                                <p className="text-xs text-muted-foreground">Order Qty</p>
                                <p className="text-sm font-medium">
                                  {buyer.minOrderQty ?? "?"} – {buyer.maxOrderQty ?? "?"}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button onClick={() => toast.info("Contact feature coming soon!")}>
                            <Mail className="mr-2 h-4 w-4" />
                            Contact
                          </Button>
                          <Button variant="outline" onClick={() => toast.info("Profile view coming soon!")}>
                            View Profile
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {results && results.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  No matching buyers found. Try adjusting your search criteria.
                </p>
              </CardContent>
            </Card>
          )}

          {!results && !isSearching && (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Find Your Perfect Buyers</h3>
                <p className="text-muted-foreground">
                  Enter product details and run semantic search against the buyer database.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Matchmaking;
