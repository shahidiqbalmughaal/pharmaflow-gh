import { forwardRef } from "react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";

interface SaleItem {
  itemName: string;
  batchNo: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sellingType?: "per_tablet" | "per_packet";
  tabletsPerPacket?: number;
  totalTablets?: number;
}

interface PharmacyInfo {
  pharmacy_name?: string;
  pharmacy_tagline?: string;
  pharmacy_address?: string;
  pharmacy_contact?: string;
}

interface SaleReceiptProps {
  saleId: string;
  salesmanName: string;
  customerName?: string;
  loyaltyPointsEarned?: number;
  saleDate: Date;
  items: SaleItem[];
  subtotal: number;
  discountPercentage?: number;
  discountAmount?: number;
  tax: number;
  total: number;
  pharmacyInfo?: PharmacyInfo;
}

// Default values for pharmacy info
const DEFAULT_PHARMACY_INFO: Required<PharmacyInfo> = {
  pharmacy_name: "Al-Rehman Pharmacy & Cosmetics",
  pharmacy_tagline: "Complete Healthcare Solutions",
  pharmacy_address: "Service Road, Muslim Town, Sadiqabad, Rawalpindi",
  pharmacy_contact: "0334-5219838",
};

export const SaleReceipt = forwardRef<HTMLDivElement, SaleReceiptProps>(
  ({ saleId, salesmanName, customerName, loyaltyPointsEarned, saleDate, items, subtotal, discountPercentage, discountAmount, tax, total, pharmacyInfo }, ref) => {
    // Merge with defaults
    const pharmacy = {
      ...DEFAULT_PHARMACY_INFO,
      ...pharmacyInfo,
    };

    return (
      <div ref={ref} className="p-8 bg-white text-black max-w-md mx-auto">
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold">{pharmacy.pharmacy_name}</h1>
          <p className="text-sm mt-2">{pharmacy.pharmacy_tagline}</p>
          <p className="text-xs mt-1 text-gray-700">{pharmacy.pharmacy_address}</p>
          <p className="text-xs text-gray-700">Contact: {pharmacy.pharmacy_contact}</p>
        </div>

        <div className="mb-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold">Receipt #:</span>
            <span>{saleId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Date:</span>
            <span>{format(saleDate, "MMM dd, yyyy HH:mm")}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Served by:</span>
            <span>{salesmanName}</span>
          </div>
          {customerName && (
            <div className="flex justify-between">
              <span className="font-semibold">Customer:</span>
              <span>{customerName}</span>
            </div>
          )}
        </div>

        <div className="border-t-2 border-dashed border-black pt-4 mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-2">Item</th>
                <th className="text-center py-2">Qty</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-gray-300">
                  <td className="py-2">
                    <div>{item.itemName}</div>
                    <div className="text-xs text-gray-600">Batch: {item.batchNo}</div>
                    {item.sellingType === "per_packet" && item.tabletsPerPacket && (
                      <div className="text-xs text-gray-600">
                        {item.tabletsPerPacket} tabs/pack × {item.quantity} = {item.totalTablets} tablets
                      </div>
                    )}
                  </td>
                  <td className="text-center">
                    {item.quantity}
                    {item.sellingType === "per_packet" && <span className="text-xs block">pkts</span>}
                  </td>
                  <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right font-semibold">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-black pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountPercentage && discountPercentage > 0 && (
            <div className="flex justify-between">
              <span>Discount ({discountPercentage}%):</span>
              <span>-{formatCurrency(discountAmount || 0)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>+{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t-2 border-black pt-2 mt-2">
            <span>TOTAL:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {loyaltyPointsEarned && loyaltyPointsEarned > 0 && (
            <div className="flex justify-between text-sm bg-green-50 p-2 rounded mt-2">
              <span className="font-semibold">Loyalty Points Earned:</span>
              <span className="font-bold text-green-700">+{loyaltyPointsEarned}</span>
            </div>
          )}
        </div>

        {/* Return Policy */}
        <div className="mt-6 pt-4 border-t-2 border-dashed border-black">
          <div className="bg-gray-100 p-3 rounded text-xs">
            <p className="font-bold text-center mb-2 underline">RETURN POLICY</p>
            <p className="mb-1">• Items can be returned/replaced within <strong>7 days</strong> with this receipt.</p>
            <p className="text-red-600 font-semibold">• Fridge items (insulin, vaccines, etc.) cannot be replaced or returned.</p>
          </div>
        </div>

        <div className="text-center mt-4 pt-4 border-t-2 border-dashed border-black text-xs">
          <p className="font-semibold">Thank you for your purchase!</p>
          <p className="mt-2">For queries, please contact us</p>
          <p className="mt-4">Powered by Al-Rehman POS System</p>
        </div>
      </div>
    );
  }
);

SaleReceipt.displayName = "SaleReceipt";
