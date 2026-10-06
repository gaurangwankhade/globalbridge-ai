import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Eye } from "lucide-react";
import { toast } from "sonner";

const Documents = () => {
  const [docType, setDocType] = useState("");
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    if (!docType) {
      toast.error("Please select a document type");
      return;
    }
    setGenerated(true);
    toast.success("Document generated successfully!");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Generator</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered generation of trade and logistics documents
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Document Type</CardTitle>
            <CardDescription>Select the document to generate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Commercial Invoice</SelectItem>
                  <SelectItem value="packing">Packing List</SelectItem>
                  <SelectItem value="bl">Bill of Lading</SelectItem>
                  <SelectItem value="declaration">Export Declaration</SelectItem>
                  <SelectItem value="undertaking">Letter of Undertaking</SelectItem>
                  <SelectItem value="certificate">Certificate of Origin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Document Details</CardTitle>
            <CardDescription>Enter information for the document</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Seller Name</Label>
                <Input placeholder="Your company name" />
              </div>
              <div className="space-y-2">
                <Label>Seller Address</Label>
                <Input placeholder="Complete address" />
              </div>
              <div className="space-y-2">
                <Label>Buyer Name</Label>
                <Input placeholder="Buyer company name" />
              </div>
              <div className="space-y-2">
                <Label>Buyer Address</Label>
                <Input placeholder="Buyer address" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Product Details</Label>
              <Input placeholder="Description of goods" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" placeholder="100" />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input type="number" placeholder="50.00" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="USD" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD</SelectItem>
                    <SelectItem value="eur">EUR</SelectItem>
                    <SelectItem value="gbp">GBP</SelectItem>
                    <SelectItem value="cny">CNY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleGenerate} className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Generate Document
            </Button>
          </CardContent>
        </Card>
      </div>

      {generated && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Document Preview</CardTitle>
            <CardDescription>
              Your {docType === "invoice" ? "Commercial Invoice" : "document"} is ready
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-8 bg-card min-h-[400px]">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center border-b pb-4">
                  <h2 className="text-2xl font-bold">COMMERCIAL INVOICE</h2>
                  <p className="text-sm text-muted-foreground mt-2">Invoice #INV-2024-001</p>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-2">Seller Details</h3>
                    <p className="text-sm">GlobalTrade Exports Ltd</p>
                    <p className="text-sm text-muted-foreground">123 Export Street</p>
                    <p className="text-sm text-muted-foreground">Shanghai, China</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Buyer Details</h3>
                    <p className="text-sm">European Imports GmbH</p>
                    <p className="text-sm text-muted-foreground">456 Import Avenue</p>
                    <p className="text-sm text-muted-foreground">Hamburg, Germany</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2">Qty</th>
                        <th className="text-right py-2">Unit Price</th>
                        <th className="text-right py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3">Electronic Components - LED Displays</td>
                        <td className="text-right">100</td>
                        <td className="text-right">$50.00</td>
                        <td className="text-right">$5,000.00</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td colSpan={3} className="text-right pt-4">Total Amount:</td>
                        <td className="text-right pt-4">$5,000.00 USD</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 mt-4">
              <Button variant="outline" className="flex-1">
                <Eye className="mr-2 h-4 w-4" />
                Full Preview
              </Button>
              <Button className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Documents;
