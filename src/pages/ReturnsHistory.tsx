import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, RotateCcw, Search, Filter, Calendar } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { exportToCSV } from "@/lib/exportUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const ReturnsHistory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [returnType, setReturnType] = useState<string>("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // Fetch returns with sale and item details
  const { data: returns, isLoading } = useQuery({
    queryKey: ["returnsHistory", dateFrom, dateTo, returnType, minAmount, maxAmount, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("returns")
        .select(`
          *,
          sales:sale_id (
            id,
            salesman_name,
            customer_name,
            sale_date
          ),
          sale_items:sale_item_id (
            id,
            item_name,
            item_type,
            batch_no,
            unit_price,
            is_fridge_item
          )
        `)
        .order("processed_at", { ascending: false });

      if (dateFrom) {
        query = query.gte("processed_at", startOfDay(dateFrom).toISOString());
      }
      if (dateTo) {
        query = query.lte("processed_at", endOfDay(dateTo).toISOString());
      }
      if (returnType !== "all") {
        query = query.eq("return_type", returnType);
      }
      if (minAmount) {
        query = query.gte("refund_amount", parseFloat(minAmount));
      }
      if (maxAmount) {
        query = query.lte("refund_amount", parseFloat(maxAmount));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Filter by search query (item name)
  const filteredReturns = returns?.filter((ret) => {
    if (!searchQuery) return true;
    const itemName = (ret.sale_items as any)?.item_name?.toLowerCase() || "";
    const customerName = (ret.sales as any)?.customer_name?.toLowerCase() || "";
    const salesmanName = (ret.sales as any)?.salesman_name?.toLowerCase() || "";
    const search = searchQuery.toLowerCase();
    return itemName.includes(search) || customerName.includes(search) || salesmanName.includes(search);
  });

  // Calculate summary statistics
  const totalRefunds = filteredReturns?.reduce((sum, ret) => sum + Number(ret.refund_amount), 0) || 0;
  const totalReturns = filteredReturns?.length || 0;
  const returnsByType = {
    refund: filteredReturns?.filter((r) => r.return_type === "refund").length || 0,
    exchange: filteredReturns?.filter((r) => r.return_type === "exchange").length || 0,
  };

  const handleExport = () => {
    if (!filteredReturns || filteredReturns.length === 0) return;

    const exportData = filteredReturns.map((ret) => ({
      "Return Date": format(new Date(ret.processed_at), "MMM dd, yyyy HH:mm"),
      "Original Sale Date": (ret.sales as any)?.sale_date 
        ? format(new Date((ret.sales as any).sale_date), "MMM dd, yyyy") 
        : "N/A",
      "Item Name": (ret.sale_items as any)?.item_name || "N/A",
      "Item Type": (ret.sale_items as any)?.item_type || "N/A",
      "Batch No": (ret.sale_items as any)?.batch_no || "N/A",
      "Return Type": ret.return_type === "refund" ? "Refund" : "Exchange",
      "Quantity": ret.quantity,
      "Refund Amount": formatCurrency(Number(ret.refund_amount)),
      "Reason": ret.reason || "No reason provided",
      "Processed By": ret.processed_by,
      "Customer": (ret.sales as any)?.customer_name || "Walk-in",
      "Salesman": (ret.sales as any)?.salesman_name || "N/A",
    }));

    exportToCSV(exportData, `returns-history-${format(new Date(), "yyyy-MM-dd")}`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom(subDays(new Date(), 30));
    setDateTo(new Date());
    setReturnType("all");
    setMinAmount("");
    setMaxAmount("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <RotateCcw className="h-6 w-6" />
            Returns History
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            View and export all processed returns and exchanges
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleExport}
          disabled={!filteredReturns || filteredReturns.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Returns</div>
            <div className="text-2xl font-bold">{totalReturns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Refunded</div>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalRefunds)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Refunds</div>
            <div className="text-2xl font-bold text-orange-500">{returnsByType.refund}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Exchanges</div>
            <div className="text-2xl font-bold text-blue-500">{returnsByType.exchange}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item, customer, salesman..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div>
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "MMM dd, yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Return Type */}
            <div>
              <Label>Return Type</Label>
              <Select value={returnType} onValueChange={setReturnType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="refund">Refund Only</SelectItem>
                  <SelectItem value="exchange">Exchange Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button variant="ghost" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Amount Range */}
          <div className="mt-4 grid grid-cols-2 gap-4 max-w-md">
            <div>
              <Label>Min Amount (Rs.)</Label>
              <Input
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Max Amount (Rs.)</Label>
              <Input
                type="number"
                placeholder="No limit"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Returns List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredReturns && filteredReturns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Item</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Qty</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Refund</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Reason</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Processed By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.map((ret) => (
                    <tr key={ret.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">
                          {format(new Date(ret.processed_at), "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(ret.processed_at), "HH:mm")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">
                          {(ret.sale_items as any)?.item_name || "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(ret.sale_items as any)?.item_type} • {(ret.sale_items as any)?.batch_no}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant={ret.return_type === "refund" ? "destructive" : "secondary"}
                          className="capitalize"
                        >
                          {ret.return_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{ret.quantity}</td>
                      <td className="px-4 py-3 text-right font-bold text-destructive">
                        {formatCurrency(Number(ret.refund_amount))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm max-w-[200px] truncate" title={ret.reason || "No reason"}>
                          {ret.reason || <span className="text-muted-foreground italic">No reason</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(ret.sales as any)?.customer_name || "Walk-in"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {ret.processed_by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No returns found</p>
              <p className="text-sm">Try adjusting your filters or date range</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReturnsHistory;
