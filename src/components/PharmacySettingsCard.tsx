import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePharmacySettings } from "@/hooks/usePharmacySettings";
import { Building2, Save, Loader2 } from "lucide-react";

export const PharmacySettingsCard = () => {
  const { settings, isLoading, saveSettings, isSaving } = usePharmacySettings();
  
  const [formData, setFormData] = useState({
    pharmacy_name: "",
    pharmacy_tagline: "",
    pharmacy_address: "",
    pharmacy_contact: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        pharmacy_name: settings.pharmacy_name || "",
        pharmacy_tagline: settings.pharmacy_tagline || "",
        pharmacy_address: settings.pharmacy_address || "",
        pharmacy_contact: settings.pharmacy_contact || "",
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(formData);
  };

  const hasChanges = 
    formData.pharmacy_name !== settings?.pharmacy_name ||
    formData.pharmacy_tagline !== settings?.pharmacy_tagline ||
    formData.pharmacy_address !== settings?.pharmacy_address ||
    formData.pharmacy_contact !== settings?.pharmacy_contact;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Pharmacy Details
        </CardTitle>
        <CardDescription>
          Configure your pharmacy name, address, and contact information for receipts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pharmacy_name">Pharmacy Name</Label>
              <Input
                id="pharmacy_name"
                value={formData.pharmacy_name}
                onChange={(e) => setFormData(prev => ({ ...prev, pharmacy_name: e.target.value }))}
                placeholder="Enter pharmacy name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pharmacy_tagline">Tagline</Label>
              <Input
                id="pharmacy_tagline"
                value={formData.pharmacy_tagline}
                onChange={(e) => setFormData(prev => ({ ...prev, pharmacy_tagline: e.target.value }))}
                placeholder="Enter tagline"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="pharmacy_address">Address</Label>
            <Input
              id="pharmacy_address"
              value={formData.pharmacy_address}
              onChange={(e) => setFormData(prev => ({ ...prev, pharmacy_address: e.target.value }))}
              placeholder="Enter full address"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="pharmacy_contact">Contact Number</Label>
            <Input
              id="pharmacy_contact"
              value={formData.pharmacy_contact}
              onChange={(e) => setFormData(prev => ({ ...prev, pharmacy_contact: e.target.value }))}
              placeholder="Enter contact number"
            />
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Receipt Preview:</p>
            <div className="text-center bg-white p-3 rounded border">
              <p className="font-bold text-sm">{formData.pharmacy_name || "Pharmacy Name"}</p>
              <p className="text-xs text-muted-foreground">{formData.pharmacy_tagline || "Tagline"}</p>
              <p className="text-xs text-muted-foreground mt-1">{formData.pharmacy_address || "Address"}</p>
              <p className="text-xs text-muted-foreground">Contact: {formData.pharmacy_contact || "Contact"}</p>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isSaving || !hasChanges}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
