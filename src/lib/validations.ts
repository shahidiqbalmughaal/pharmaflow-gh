import { z } from "zod";

// Medicine validation schema
export const medicineSchema = z.object({
  medicine_name: z.string()
    .trim()
    .min(1, "Medicine name is required")
    .max(200, "Medicine name must be less than 200 characters"),
  batch_no: z.string()
    .trim()
    .min(1, "Batch number is required")
    .max(100, "Batch number must be less than 100 characters"),
  company_name: z.string()
    .trim()
    .min(1, "Company name is required")
    .max(200, "Company name must be less than 200 characters"),
  rack_no: z.string()
    .trim()
    .min(1, "Rack number is required")
    .max(50, "Rack number must be less than 50 characters"),
  selling_type: z.enum(["per_tablet", "per_packet"], {
    required_error: "Selling type is required",
  }),
  quantity: z.number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(1000000, "Quantity must be less than 1,000,000"),
  tablets_per_packet: z.number()
    .int("Tablets per packet must be a whole number")
    .min(1, "Tablets per packet must be at least 1")
    .optional()
    .nullable(),
  purchase_price: z.number()
    .positive("Purchase price must be positive")
    .min(0.01, "Purchase price must be at least 0.01")
    .max(1000000, "Purchase price must be less than 1,000,000"),
  selling_price: z.number()
    .positive("Selling price must be positive")
    .min(0.01, "Selling price must be at least 0.01")
    .max(1000000, "Selling price must be less than 1,000,000"),
  price_per_packet: z.number()
    .positive("Price per packet must be positive")
    .optional()
    .nullable(),
  manufacturing_date: z.string()
    .min(1, "Manufacturing date is required"),
  expiry_date: z.string()
    .min(1, "Expiry date is required"),
  supplier: z.string()
    .trim()
    .min(1, "Supplier name is required")
    .max(200, "Supplier name must be less than 200 characters"),
}).refine(
  (data) => {
    const mfgDate = new Date(data.manufacturing_date);
    const expDate = new Date(data.expiry_date);
    return expDate > mfgDate;
  },
  {
    message: "Expiry date must be after manufacturing date",
    path: ["expiry_date"],
  }
).refine(
  (data) => data.selling_price >= data.purchase_price,
  {
    message: "Selling price should be greater than or equal to purchase price",
    path: ["selling_price"],
  }
).refine(
  (data) => {
    if (data.selling_type === "per_packet") {
      return data.tablets_per_packet && data.tablets_per_packet > 0;
    }
    return true;
  },
  {
    message: "Tablets per packet is required when selling by packet",
    path: ["tablets_per_packet"],
  }
).refine(
  (data) => {
    if (data.selling_type === "per_packet") {
      return data.price_per_packet && data.price_per_packet > 0;
    }
    return true;
  },
  {
    message: "Price per packet is required when selling by packet",
    path: ["price_per_packet"],
  }
);

// Cosmetic validation schema
export const cosmeticSchema = z.object({
  product_name: z.string()
    .trim()
    .min(1, "Product name is required")
    .max(200, "Product name must be less than 200 characters"),
  brand: z.string()
    .trim()
    .min(1, "Brand is required")
    .max(100, "Brand must be less than 100 characters"),
  batch_no: z.string()
    .trim()
    .min(1, "Batch number is required")
    .max(100, "Batch number must be less than 100 characters"),
  rack_no: z.string()
    .trim()
    .min(1, "Rack number is required")
    .max(50, "Rack number must be less than 50 characters"),
  quantity: z.number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(1000000, "Quantity must be less than 1,000,000"),
  purchase_price: z.number()
    .positive("Purchase price must be positive")
    .min(0.01, "Purchase price must be at least 0.01")
    .max(1000000, "Purchase price must be less than 1,000,000"),
  selling_price: z.number()
    .positive("Selling price must be positive")
    .min(0.01, "Selling price must be at least 0.01")
    .max(1000000, "Selling price must be less than 1,000,000"),
  manufacturing_date: z.string()
    .min(1, "Manufacturing date is required"),
  expiry_date: z.string()
    .min(1, "Expiry date is required"),
  supplier: z.string()
    .trim()
    .min(1, "Supplier name is required")
    .max(200, "Supplier name must be less than 200 characters"),
}).refine(
  (data) => {
    const mfgDate = new Date(data.manufacturing_date);
    const expDate = new Date(data.expiry_date);
    return expDate > mfgDate;
  },
  {
    message: "Expiry date must be after manufacturing date",
    path: ["expiry_date"],
  }
).refine(
  (data) => data.selling_price >= data.purchase_price,
  {
    message: "Selling price should be greater than or equal to purchase price",
    path: ["selling_price"],
  }
);

// Salesman validation schema
export const salesmanSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  contact: z.string()
    .trim()
    .min(1, "Contact is required")
    .regex(/^[\d\s\-\+\(\)]+$/, "Invalid contact number format")
    .min(10, "Contact must be at least 10 digits")
    .max(20, "Contact must be less than 20 characters"),
  cnic: z.string()
    .trim()
    .min(1, "CNIC is required")
    .regex(/^\d{5}-\d{7}-\d{1}$/, "CNIC must be in format: 12345-1234567-1")
    .length(15, "CNIC must be exactly 15 characters including dashes"),
  joining_date: z.string()
    .min(1, "Joining date is required"),
  assigned_counter: z.string()
    .trim()
    .min(1, "Assigned counter is required")
    .max(50, "Assigned counter must be less than 50 characters"),
}).refine(
  (data) => {
    const joiningDate = new Date(data.joining_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return joiningDate <= today;
  },
  {
    message: "Joining date cannot be in the future",
    path: ["joining_date"],
  }
);

// Supplier validation schema
export const supplierSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Supplier name is required")
    .max(200, "Supplier name must be less than 200 characters"),
  company: z.string()
    .trim()
    .max(200, "Company name must be less than 200 characters")
    .optional(),
  phone: z.string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number format")
    .min(10, "Phone must be at least 10 digits")
    .max(20, "Phone must be less than 20 characters"),
  whatsapp: z.string()
    .trim()
    .regex(/^[\d\s\-\+\(\)]*$/, "Invalid WhatsApp number format")
    .max(20, "WhatsApp number must be less than 20 characters")
    .optional()
    .or(z.literal("")),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  address: z.string()
    .trim()
    .max(500, "Address must be less than 500 characters")
    .optional(),
  notes: z.string()
    .trim()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
});

// Sale item validation
export const saleItemSchema = z.object({
  itemType: z.enum(["medicine", "cosmetic"], {
    required_error: "Item type is required",
  }),
  itemId: z.string()
    .min(1, "Please select an item"),
  itemName: z.string()
    .min(1, "Item name is required"),
  batchNo: z.string()
    .min(1, "Batch number is required"),
  quantity: z.number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  unitPrice: z.number()
    .min(0, "Rate must be positive"),
  totalPrice: z.number()
    .min(0, "Total price must be positive"),
  profit: z.number(),
  purchasePrice: z.number()
    .min(0, "Purchase price cannot be negative"),
  tabletsPerPacket: z.number().optional(),
  totalTablets: z.number().optional(),
  totalPackets: z.number().optional(),
  sellingType: z.enum(["per_tablet", "per_packet"]).optional(),
}).refine(
  (data) => {
    // Validate that Quantity × Rate matches Total Price (with small tolerance for floating point)
    const calculatedTotal = data.quantity * data.unitPrice;
    const difference = Math.abs(calculatedTotal - data.totalPrice);
    return difference < 0.01; // Allow 1 cent tolerance
  },
  {
    message: "Total Price must equal Quantity × Rate",
    path: ["totalPrice"],
  }
);

// Sale validation schema
export const saleSchema = z.object({
  salesmanId: z.string()
    .min(1, "Please select a salesman"),
  saleItems: z.array(saleItemSchema)
    .min(1, "At least one item is required")
    .max(100, "Maximum 100 items per sale"),
  discountPercentage: z.number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%"),
  tax: z.number()
    .min(0, "Tax cannot be negative")
    .max(1000000, "Tax is too large"),
});

// Helper function to validate quantity against available stock
export const validateStockAvailability = (
  itemType: "medicine" | "cosmetic",
  itemId: string,
  requestedQuantity: number,
  availableItems: any[]
): { isValid: boolean; availableQuantity: number; message?: string } => {
  const item = availableItems.find((i) => i.id === itemId);
  
  if (!item) {
    return {
      isValid: false,
      availableQuantity: 0,
      message: "Item not found",
    };
  }

  const availableQuantity = item.quantity;

  if (requestedQuantity > availableQuantity) {
    return {
      isValid: false,
      availableQuantity,
      message: `Only ${availableQuantity} units available in stock`,
    };
  }

  return {
    isValid: true,
    availableQuantity,
  };
};
