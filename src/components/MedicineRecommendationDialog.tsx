import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, AlertTriangle, Stethoscope, MapPin, Package, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';

interface Recommendation {
  id?: string;
  medicine_name: string;
  company_name?: string;
  reason: string;
  dosage_suggestion: string;
  priority: 'high' | 'medium' | 'low';
  selling_price?: number;
  quantity?: number;
  rack_no?: string;
  batch_no?: string;
}

interface RecommendationResponse {
  recommendations: Recommendation[];
  medical_advice: string;
  consult_doctor: boolean;
}

interface MedicineRecommendationDialogProps {
  onSelectMedicine?: (medicineId: string, medicineName: string) => void;
}

export function MedicineRecommendationDialog({ onSelectMedicine }: MedicineRecommendationDialogProps) {
  const [open, setOpen] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResponse | null>(null);

  const handleGetRecommendations = async () => {
    if (!symptoms.trim()) {
      toast.error('Please describe the symptoms');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('medicine-recommendations', {
        body: { symptoms: symptoms.trim() }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
    } catch (error: any) {
      console.error('Error getting recommendations:', error);
      toast.error(error.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMedicine = (medicine: Recommendation) => {
    if (medicine.id && onSelectMedicine) {
      onSelectMedicine(medicine.id, medicine.medicine_name);
      setOpen(false);
      toast.success(`${medicine.medicine_name} added to sale`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      case 'low': return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  const resetDialog = () => {
    setSymptoms('');
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button 
          size="lg" 
          className="gap-2 bg-gradient-to-r from-info to-primary hover:from-info/90 hover:to-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
        >
          <Search className="h-5 w-5" />
          <Sparkles className="h-4 w-4" />
          AI Medicine Finder
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Medicine Recommendations
          </DialogTitle>
          <DialogDescription>
            Describe the customer's symptoms and our AI will suggest suitable medicines from available inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Describe Symptoms</label>
            <Textarea
              placeholder="e.g., headache and mild fever since yesterday, feeling tired..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          <Button 
            onClick={handleGetRecommendations} 
            disabled={loading || !symptoms.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing symptoms...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Get Recommendations
              </>
            )}
          </Button>

          {result && (
            <div className="space-y-4 mt-4">
              {/* Medical Advice Banner */}
              {result.consult_doctor && (
                <Card className="border-amber-500/50 bg-amber-500/5">
                  <CardContent className="flex items-start gap-3 p-4">
                    <Stethoscope className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-amber-700">Doctor Consultation Recommended</p>
                      <p className="text-sm text-amber-600/80 mt-1">
                        Based on the described symptoms, we recommend consulting a healthcare professional for proper diagnosis.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Suggested Medicines ({result.recommendations.length})
                  </h4>
                  
                  {result.recommendations.map((rec, index) => (
                    <Card 
                      key={index} 
                      className="hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => handleSelectMedicine(rec)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{rec.medicine_name}</CardTitle>
                            {rec.company_name && (
                              <CardDescription>{rec.company_name}</CardDescription>
                            )}
                          </div>
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority} match
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{rec.reason}</p>
                        
                        {rec.dosage_suggestion && (
                          <div className="text-sm">
                            <span className="font-medium">Suggested dosage:</span>{' '}
                            <span className="text-muted-foreground">{rec.dosage_suggestion}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm pt-2 border-t">
                          {rec.selling_price !== undefined && (
                            <span className="font-semibold text-primary">
                              {formatCurrency(rec.selling_price)}
                            </span>
                          )}
                          {rec.quantity !== undefined && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Package className="h-3.5 w-3.5" />
                              {rec.quantity} in stock
                            </span>
                          )}
                          {rec.rack_no && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              Rack {rec.rack_no}
                            </span>
                          )}
                        </div>

                        {onSelectMedicine && rec.id && (
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="w-full mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectMedicine(rec);
                            }}
                          >
                            Add to Sale
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-muted">
                  <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
                    No matching medicines found in current inventory
                  </CardContent>
                </Card>
              )}

              {/* General Medical Advice */}
              {result.medical_advice && (
                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardContent className="flex items-start gap-3 p-4">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-700">Medical Advice</p>
                      <p className="text-sm text-blue-600/80 mt-1">{result.medical_advice}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
