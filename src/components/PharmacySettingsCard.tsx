import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePharmacySettings } from "@/hooks/usePharmacySettings";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Save, Loader2, Upload, X, Image } from "lucide-react";
import { toast } from "sonner";

export const PharmacySettingsCard = () => {
  const { settings, isLoading, saveSettings, isSaving } = usePharmacySettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    pharmacy_name: "",
    pharmacy_tagline: "",
    pharmacy_address: "",
    pharmacy_contact: "",
    pharmacy_logo_url: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        pharmacy_name: settings.pharmacy_name || "",
        pharmacy_tagline: settings.pharmacy_tagline || "",
        pharmacy_address: settings.pharmacy_address || "",
        pharmacy_contact: settings.pharmacy_contact || "",
        pharmacy_logo_url: settings.pharmacy_logo_url || "",
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(formData);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB");
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_shop_id")
        .eq("id", user.id)
        .single();

      if (!profile?.current_shop_id) throw new Error("No shop selected");

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.current_shop_id}/logo-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('pharmacy-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pharmacy-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, pharmacy_logo_url: publicUrl }));
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, pharmacy_logo_url: "" }));
  };

  const hasChanges = 
    formData.pharmacy_name !== settings?.pharmacy_name ||
    formData.pharmacy_tagline !== settings?.pharmacy_tagline ||
    formData.pharmacy_address !== settings?.pharmacy_address ||
    formData.pharmacy_contact !== settings?.pharmacy_contact ||
    formData.pharmacy_logo_url !== (settings?.pharmacy_logo_url || "");

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
          Configure your pharmacy name, address, contact information, and logo for receipts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo Upload Section */}
          <div className="space-y-2">
            <Label>Pharmacy Logo</Label>
            <div className="flex items-center gap-4">
              {formData.pharmacy_logo_url ? (
                <div className="relative">
                  <img
                    src={formData.pharmacy_logo_url}
                    alt="Pharmacy Logo"
                    className="h-20 w-20 object-contain border rounded-lg p-1 bg-white"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-20 w-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full sm:w-auto"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG up to 2MB. Will appear on receipts.
                </p>
              </div>
            </div>
          </div>

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
              {formData.pharmacy_logo_url && (
                <img
                  src={formData.pharmacy_logo_url}
                  alt="Logo Preview"
                  className="h-12 w-auto mx-auto mb-2"
                />
              )}
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