import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Route, Clock, DollarSign, Leaf, TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const RouteOptimizer = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [cargoType, setCargoType] = useState("");
  const [weight, setWeight] = useState("");
  const [volume, setVolume] = useState("");
  const [transportMode, setTransportMode] = useState("");

  const handleOptimize = async () => {
    if (!origin || !destination || !cargoType || !weight || !volume || !transportMode) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsOptimizing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('optimize-route', {
        body: {
          origin,
          destination,
          cargoType,
          weight: parseFloat(weight),
          volume: parseFloat(volume),
          transportMode,
        }
      });

      if (error) throw error;

      setResults(data);
      toast.success("Route optimization complete!");
    } catch (error: any) {
      console.error('Route optimization error:', error);
      toast.error(error.message || "Failed to optimize route. Please try again.");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Route Optimization</h1>
        <p className="text-muted-foreground mt-2">
          Find the most efficient shipping routes with AI-powered analysis
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Route Details</CardTitle>
              <CardDescription>Enter your shipment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Origin Port</Label>
                <Input 
                  placeholder="e.g., Shanghai, China" 
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Destination Port</Label>
                <Input 
                  placeholder="e.g., Rotterdam, Netherlands" 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Cargo Type</Label>
                <Select value={cargoType} onValueChange={setCargoType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cargo type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Cargo</SelectItem>
                    <SelectItem value="container">Container (FCL)</SelectItem>
                    <SelectItem value="bulk">Bulk Cargo</SelectItem>
                    <SelectItem value="refrigerated">Refrigerated</SelectItem>
                    <SelectItem value="hazardous">Hazardous Materials</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input 
                    type="number" 
                    placeholder="1000" 
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Volume (m³)</Label>
                  <Input 
                    type="number" 
                    placeholder="10" 
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Transport Mode</Label>
                <Select value={transportMode} onValueChange={setTransportMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sea">Sea Freight</SelectItem>
                    <SelectItem value="air">Air Freight</SelectItem>
                    <SelectItem value="road">Road Transport</SelectItem>
                    <SelectItem value="rail">Rail Transport</SelectItem>
                    <SelectItem value="multimodal">Multimodal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button className="w-full" onClick={handleOptimize} disabled={isOptimizing}>
                {isOptimizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Route className="mr-2 h-4 w-4" />
                    Optimize Route
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {results && (
            <>
              <Card className="border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Recommended Route
                    </CardTitle>
                    <Badge className="bg-primary">Best Match</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="font-medium text-lg mb-3">{results.recommended.route}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Transit Time</p>
                            <p className="font-medium">{results.recommended.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Estimated Cost</p>
                            <p className="font-medium">{results.recommended.cost}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Leaf className="h-4 w-4 text-success" />
                          <div>
                            <p className="text-xs text-muted-foreground">Carbon</p>
                            <p className="font-medium">{results.recommended.carbon}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Carrier</p>
                          <p className="font-medium">{results.recommended.carrier}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alternative Routes</CardTitle>
                  <CardDescription>Compare other available options</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.alternatives.map((alt: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                        <p className="font-medium mb-3">{alt.route}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Transit Time</p>
                            <p className="font-medium">{alt.time}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Cost</p>
                            <p className="font-medium">{alt.cost}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Carbon</p>
                            <p className="font-medium">{alt.carbon}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Carrier</p>
                            <p className="font-medium">{alt.carrier}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteOptimizer;
