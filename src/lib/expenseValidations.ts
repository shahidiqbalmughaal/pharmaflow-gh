import { z } from "zod";

// Expense categories with display names
export const expenseCategories = {
  supplier_payment: "Supplier Payment",
  staff_salary: "Staff Salary",
  food_expense: "Food Expense",
  miscellaneous: "Miscellaneous",
  rent: "Rent",
  water_bill: "Water Bill",
  electricity_bill: "Electricity Bill",
  maintenance: "Maintenance",
  medical_equipment: "Medical Equipment",
  license_fees: "License Fees",
  insurance: "Insurance",
  marketing: "Marketing",
  transportation: "Transportation",
} as const;

export type ExpenseCategory = keyof typeof expenseCategories;

// Expense validation schema
export const expenseSchema = z.object({
  amount: z.number()
    .positive("Amount must be positive")
    .min(0.01, "Amount must be at least 0.01")
    .max(10000000, "Amount must be less than 10,000,000"),
  expense_date: z.string()
    .min(1, "Date is required"),
  category: z.enum([
    "supplier_payment",
    "staff_salary", 
    "food_expense",
    "miscellaneous",
    "rent",
    "water_bill",
    "electricity_bill",
    "maintenance",
    "medical_equipment",
    "license_fees",
    "insurance",
    "marketing",
    "transportation"
  ] as const, {
    required_error: "Category is required",
  }),
  notes: z.string()
    .max(500, "Notes must be less than 500 characters")
    .optional()
    .nullable(),
});

// Expense alert validation schema
export const expenseAlertSchema = z.object({
  category: z.enum([
    "supplier_payment",
    "staff_salary",
    "food_expense",
    "miscellaneous",
    "rent",
    "water_bill",
    "electricity_bill",
    "maintenance",
    "medical_equipment",
    "license_fees",
    "insurance",
    "marketing",
    "transportation"
  ] as const),
  due_date: z.string().min(1, "Due date is required"),
  amount: z.number().positive().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  is_recurring: z.boolean().default(false),
  recurrence_interval: z.number().int().positive().optional().nullable(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type ExpenseAlertFormData = z.infer<typeof expenseAlertSchema>;
