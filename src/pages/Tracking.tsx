import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, CheckCircle2, Clock, MapPin, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Shipment {
  id: string;
  origin: string;
  destination: string;
  cargo_type: string;
  weight: number;
  volume: number;
  transport_mode: string;
  status: string;
  created_at: string;
}

const Tracking = () => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // New shipment form
  const [newShipment, setNewShipment] = useState({
    origin: "",
    destination: "",
    cargo_type: "",
    weight: "",
    volume: "",
    transport_mode: "sea",
  });

  useEffect(() => {
    fetchShipments();
  }, [user]);

  const fetchShipments = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load shipments");
    } else {
      setShipments(data || []);
    }
    setLoading(false);
  };

  const createShipment = async () => {
    if (!user) return;
    
    if (!newShipment.origin || !newShipment.destination || !newShipment.cargo_type) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);
    const { data, error } = await supabase
      .from('shipments')
      .insert({
        user_id: user.id,
        origin: newShipment.origin,
        destination: newShipment.destination,
        cargo_type: newShipment.cargo_type,
        weight: parseFloat(newShipment.weight) || 0,
        volume: parseFloat(newShipment.volume) || 0,
        transport_mode: newShipment.transport_mode,
        status: 'pending',
      })
      .select()
      .single();

    setCreating(false);

    if (error) {
      toast.error("Failed to create shipment");
    } else {
      toast.success("Shipment created successfully!");
      setShipments([data, ...shipments]);
      setDialogOpen(false);
      setNewShipment({
        origin: "",
        destination: "",
        cargo_type: "",
        weight: "",
        volume: "",
        transport_mode: "sea",
      });
    }
  };

  const updateStatus = async (shipmentId: string, newStatus: string) => {
    const { error } = await supabase
      .from('shipments')
      .update({ status: newStatus })
      .eq('id', shipmentId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated!");
      setShipments(shipments.map(s => 
        s.id === shipmentId ? { ...s, status: newStatus } : s
      ));
      if (selectedShipment?.id === shipmentId) {
        setSelectedShipment({ ...selectedShipment, status: newStatus });
      }
    }
  };

  const filteredShipments = shipments.filter(s => 
    s.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cargo_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'in-transit': return 'bg-accent text-accent-foreground';
      case 'delivered': return 'bg-success text-success-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipment Tracking</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage your shipments
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Shipment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Shipment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origin *</Label>
                  <Input
                    placeholder="e.g., Shanghai, China"
                    value={newShipment.origin}
                    onChange={(e) => setNewShipment({ ...newShipment, origin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Destination *</Label>
                  <Input
                    placeholder="e.g., Rotterdam, Netherlands"
                    value={newShipment.destination}
                    onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cargo Type *</Label>
                <Input
                  placeholder="e.g., Electronics, Machinery"
                  value={newShipment.cargo_type}
                  onChange={(e) => setNewShipment({ ...newShipment, cargo_type: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={newShipment.weight}
                    onChange={(e) => setNewShipment({ ...newShipment, weight: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Volume (m³)</Label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={newShipment.volume}
                    onChange={(e) => setNewShipment({ ...newShipment, volume: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transport</Label>
                  <Select
                    value={newShipment.transport_mode}
                    onValueChange={(v) => setNewShipment({ ...newShipment, transport_mode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sea">Sea</SelectItem>
                      <SelectItem value="air">Air</SelectItem>
                      <SelectItem value="rail">Rail</SelectItem>
                      <SelectItem value="road">Road</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={createShipment} className="w-full" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Shipment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Shipments</CardTitle>
          <CardDescription>Find shipments by origin, destination, or cargo type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Search shipments..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Shipments</CardTitle>
            <CardDescription>{shipments.length} total shipments</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredShipments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No shipments found. Create your first shipment to get started.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredShipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    onClick={() => setSelectedShipment(shipment)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedShipment?.id === shipment.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{shipment.cargo_type}</span>
                      <Badge className={getStatusColor(shipment.status)}>
                        {shipment.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {shipment.origin} → {shipment.destination}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedShipment && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedShipment.cargo_type}</CardTitle>
                  <CardDescription>Shipment Details</CardDescription>
                </div>
                <Badge className={getStatusColor(selectedShipment.status)}>
                  {selectedShipment.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Origin</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {selectedShipment.origin}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    {selectedShipment.destination}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Weight</p>
                  <p className="font-medium">{selectedShipment.weight} kg</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Volume</p>
                  <p className="font-medium">{selectedShipment.volume} m³</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Transport Mode</p>
                  <p className="font-medium capitalize">{selectedShipment.transport_mode}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(selectedShipment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select
                  value={selectedShipment.status}
                  onValueChange={(v) => updateStatus(selectedShipment.id, v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Tracking;
