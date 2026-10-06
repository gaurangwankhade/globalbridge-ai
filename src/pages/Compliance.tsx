import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, FileText, Upload, Loader2, History, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ComplianceResult {
  id?: string;
  redFlags: Array<{ issue: string; severity: string }>;
  hsCodeIssues: Array<{ code: string; issue: string; recommendation: string }>;
  tariffRisks: Array<{ region: string; risk: string; impact: string }>;
  missingDocs: string[];
  countryRegulations: Array<{ country: string; regulation: string }>;
}

interface StoredDocument {
  id: string;
  name: string;
  path: string;
}

const Compliance = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentText, setDocumentText] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<ComplianceResult | null>(null);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchHistory();
    }
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    setLoadingDocs(true);
    
    const { data, error } = await supabase.storage
      .from('documents')
      .list(user.id, { limit: 20, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      console.error('Error fetching documents:', error);
    } else {
      setDocuments(data?.map(f => ({
        id: f.id,
        name: f.name,
        path: `${user.id}/${f.name}`,
      })) || []);
    }
    setLoadingDocs(false);
  };

  const fetchHistory = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('compliance_checks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setHistory(data || []);
    }
  };

  // 🔹 Phase 2: Extract text from PDF using Node backend
const extractFromPDF = async (file: File) => {
  setExtracting(true);
  try {
    const formData = new FormData();
    formData.append("document", file);

    const res = await fetch("http://localhost:4000/api/compliance-check", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("PDF extraction failed");
    }

    const data = await res.json();

    setExtractedText(data.extractedText || "");
    setDocumentText(data.extractedText || "");

    toast.success("Document text extracted. Review before analysis.");
  } catch (err) {
    console.error(err);
    toast.error("Failed to extract PDF text");
  } finally {
    setExtracting(false);
  }
};

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (error) {
      toast.error("Failed to upload document");
      console.error(error);
    } else {
      toast.success("Document uploaded successfully!");
fetchDocuments();

if (file.type === "application/pdf") {
  await extractFromPDF(file);
} else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
  const text = await file.text();
  setDocumentText(text);
}


    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteDocument = async (path: string) => {
    const { error } = await supabase.storage
      .from('documents')
      .remove([path]);

    if (error) {
      toast.error("Failed to delete document");
    } else {
      toast.success("Document deleted");
      fetchDocuments();
    }
  };

  const handleAnalyze = async () => {
    if (!documentText.trim()) {
      toast.error("Please enter document details");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-compliance', {
        body: { documentText, userId: user?.id }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
      } else {
        setResults({
          id: data.id,
          redFlags: data.redFlags || [],
          hsCodeIssues: data.hsCodeIssues || [],
          tariffRisks: data.tariffRisks || [],
          missingDocs: data.missingDocs || [],
          countryRegulations: data.countryRegulations || [],
        });
        toast.success("Compliance analysis complete!");
        fetchHistory();
      }
    } catch (error: any) {
      console.error('Compliance check error:', error);
      toast.error(error.message || "Failed to analyze document. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadHistoryItem = (item: any) => {
    setDocumentText(item.document_text);
    setResults({
      id: item.id,
      redFlags: item.red_flags || [],
      hsCodeIssues: item.hs_code_issues || [],
      tariffRisks: item.tariff_risks || [],
      missingDocs: item.missing_docs || [],
      countryRegulations: item.country_regulations || [],
    });
    setShowHistory(false);
    toast.success("Loaded previous analysis");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Compliance Checker</h1>
          <p className="text-muted-foreground mt-2">
            Analyze your trade documents for compliance issues and regulatory requirements
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
          <History className="mr-2 h-4 w-4" />
          History ({history.length})
        </Button>
      </div>

      {showHistory && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis History</CardTitle>
            <CardDescription>Your previous compliance checks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => loadHistoryItem(item)}
                  className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-sm truncate max-w-md">
                      {item.document_text?.substring(0, 80)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {(item.red_flags?.length || 0)} issues
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Input</CardTitle>
              <CardDescription>
                Paste your document details or upload a file for analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 🔹 Phase 2: Auto-extracted PDF preview */}
{extractedText && (
  <Card className="bg-muted/30">
    <CardHeader>
      <CardTitle className="text-sm">
        Auto-extracted Document Text
      </CardTitle>
      <CardDescription>
        Review before final compliance validation
      </CardDescription>
    </CardHeader>
    <CardContent>
      {extracting ? (
        <p className="text-sm text-muted-foreground">
          Extracting document…
        </p>
      ) : (
        <Textarea
          value={extractedText}
          readOnly
          rows={6}
          className="text-xs bg-muted"
        />
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Auto-extracted (review before submission)
      </p>
    </CardContent>
  </Card>
)}
              <Textarea
                placeholder="Paste invoice, packing list, bill of lading, or other trade document details here..."
                className="min-h-[200px]"
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
              />
              
              <div className="flex gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.pdf"
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload Document
                </Button>
                <Button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex-1"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Run Compliance Check
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uploaded Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded border">
                      <span className="text-sm truncate flex-1">{doc.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteDocument(doc.path)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {results && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Red Flags & Critical Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {results.redFlags.length === 0 ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      No critical issues found
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {results.redFlags.map((flag, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                          <AlertCircle className={`h-4 w-4 mt-0.5 ${
                            flag.severity === 'high' ? 'text-destructive' : 'text-warning'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{flag.issue}</p>
                            <Badge variant={flag.severity === 'high' ? 'destructive' : 'default'} className="mt-1">
                              {flag.severity} priority
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>HS Code Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {results.hsCodeIssues.length === 0 ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      HS codes appear correct
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {results.hsCodeIssues.map((item, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{item.code}</code>
                            <Badge variant="outline">{item.issue}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Recommendation: {item.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tariff Risks</CardTitle>
                </CardHeader>
                <CardContent>
                  {results.tariffRisks.length === 0 ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      No significant tariff risks
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {results.tariffRisks.map((risk, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">{risk.region}</p>
                            <Badge variant="destructive">{risk.impact} impact</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{risk.risk}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {results && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Missing Documentation</CardTitle>
                </CardHeader>
                <CardContent>
                  {results.missingDocs.length === 0 ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      All documents present
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {results.missingDocs.map((doc, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                          {doc}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Country-Specific Regulations</CardTitle>
                </CardHeader>
                <CardContent>
                  {results.countryRegulations.length === 0 ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      No specific regulations flagged
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {results.countryRegulations.map((reg, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium mb-1">{reg.country}</p>
                          <p className="text-xs text-muted-foreground">{reg.regulation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Compliance;
