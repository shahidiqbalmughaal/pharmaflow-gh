import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings, ExternalLink, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ApiSettingsDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            External API credentials are securely stored in Lovable Cloud secrets
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Secure Credential Storage</AlertTitle>
            <AlertDescription className="mt-2">
              For security, API credentials are now stored as encrypted secrets in Lovable Cloud instead of the database. 
              This ensures credentials are never exposed to client-side code.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm">
            <p className="font-medium">Required secrets:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><code className="bg-muted px-1 py-0.5 rounded">EXTERNAL_API_KEY</code> - Your API authentication key</li>
              <li><code className="bg-muted px-1 py-0.5 rounded">EXTERNAL_API_BASE_URL</code> - The base URL of the external API</li>
            </ul>
          </div>

          <div className="pt-2">
            <p className="text-sm text-muted-foreground mb-3">
              To update these credentials, go to your project settings in Lovable and manage secrets there.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
