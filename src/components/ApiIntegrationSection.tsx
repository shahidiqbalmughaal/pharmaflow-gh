import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";

interface MedicineData {
  name: string;
  batch_no: string;
  quantity: number;
  price: number;
  expiry_date: string;
  distributor: string;
}

export function ApiIntegrationSection() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [medicinesData, setMedicinesData] = useState<MedicineData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check if API is configured
  const { data: apiSettings } = useQuery({
    queryKey: ["apiSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_settings")
        .select("*")
        .single();
      
      if (error && error.code !== "PGRST116") {
        throw error;
      }
      
      return data;
    },
  });

  const callApiProxy = async (endpoint: string, params?: Record<string, any>) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke('api-proxy', {
        body: { endpoint, params },
      });

      if (error) throw error;
      
      return data;
    } catch (error: any) {
      toast({
        title: "API Error",
        description: error.message || "Failed to fetch data from API",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDailySoldMedicines = async () => {
    try {
      const data = await callApiProxy('/getDailySoldMedicines');
      setMedicinesData(data.medicines || []);
      toast({
        title: "Success",
        description: "Daily sold medicines loaded successfully",
      });
    } catch (error) {
      // Error already handled in callApiProxy
    }
  };

  const handleDateRangeSales = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = await callApiProxy('/getSoldMedicinesByDateRange', {
        startDate,
        endDate,
      });
      setMedicinesData(data.medicines || []);
      toast({
        title: "Success",
        description: "Date range sales loaded successfully",
      });
    } catch (error) {
      // Error already handled in callApiProxy
    }
  };

  const handleExportReport = async () => {
    try {
      const params: Record<string, any> = {};
      
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        params.date = format(new Date(), 'yyyy-MM-dd');
      }

      const data = await callApiProxy('/exportReport', params);
      
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        toast({
          title: "Export ready",
          description: "Report is being downloaded",
        });
      }
    } catch (error) {
      // Error already handled in callApiProxy
    }
  };

  const filteredData = medicinesData.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.batch_no.toLowerCase().includes(searchLower) ||
      item.distributor.toLowerCase().includes(searchLower)
    );
  });

  if (!apiSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            API integration is not configured. Please configure API settings first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Integration - External Reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleDailySoldMedicines}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Daily Sold Medicines
          </Button>

          <div className="flex gap-2 items-center">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
            <Button
              onClick={handleDateRangeSales}
              disabled={isLoading}
              variant="outline"
            >
              Get Range
            </Button>
          </div>

          <Button
            onClick={handleExportReport}
            disabled={isLoading}
            variant="secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Search */}
        {medicinesData.length > 0 && (
          <div className="space-y-4">
            <Input
              placeholder="Search by name, batch, or distributor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Results Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine Name</TableHead>
                    <TableHead>Batch No</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Distributor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.batch_no}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell>
                          {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{item.distributor}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No results found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing {filteredData.length} of {medicinesData.length} records
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}