import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Loader2 } from "lucide-react";

export function ApiSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing API settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["apiSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_settings")
        .select("*")
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      return data;
    },
  });

  // Set initial values when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && settings) {
      setApiBaseUrl(settings.api_base_url || "");
      setApiKey(""); // Don't show existing API key for security
    }
  };

  // Validate API connection
  const validateConnection = async (baseUrl: string, key: string) => {
    setIsValidating(true);
    try {
      const url = `${baseUrl}/health`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${key}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }

      toast({
        title: "Connection successful",
        description: "API credentials are valid",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // Save API settings
  const saveMutation = useMutation({
    mutationFn: async () => {
      const newSettings = {
        api_base_url: apiBaseUrl,
        api_key: apiKey,
      };

      if (settings) {
        // Update existing
        const { error } = await supabase
          .from("api_settings")
          .update(newSettings)
          .eq("id", settings.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("api_settings")
          .insert([newSettings]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiSettings"] });
      toast({
        title: "Settings saved",
        description: "API settings have been updated successfully",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    if (!apiBaseUrl || !apiKey) {
      toast({
        title: "Missing fields",
        description: "Please provide both API base URL and API key",
        variant: "destructive",
      });
      return;
    }

    // Validate connection first
    const isValid = await validateConnection(apiBaseUrl, apiKey);
    if (isValid) {
      saveMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          API Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>API Integration Settings</DialogTitle>
          <DialogDescription>
            Configure external API connection for advanced reporting features
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="apiBaseUrl">API Base URL</Label>
              <Input
                id="apiBaseUrl"
                placeholder="https://api.example.com/v1"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={settings ? "Enter new API key to update" : "Enter API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely and never exposed to the client
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => validateConnection(apiBaseUrl, apiKey)}
                variant="outline"
                disabled={!apiBaseUrl || !apiKey || isValidating}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!apiBaseUrl || !apiKey || saveMutation.isPending}
                className="ml-auto"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}