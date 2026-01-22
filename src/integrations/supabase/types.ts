export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alert_history: {
        Row: {
          alert_type: string
          batch_no: string | null
          created_at: string
          current_quantity: number | null
          expiry_date: string | null
          id: string
          item_id: string
          item_name: string
          item_type: string
          notification_method: string
          sent_at: string
          sent_to: string
          shop_id: string | null
        }
        Insert: {
          alert_type: string
          batch_no?: string | null
          created_at?: string
          current_quantity?: number | null
          expiry_date?: string | null
          id?: string
          item_id: string
          item_name: string
          item_type: string
          notification_method: string
          sent_at?: string
          sent_to: string
          shop_id?: string | null
        }
        Update: {
          alert_type?: string
          batch_no?: string | null
          created_at?: string
          current_quantity?: number | null
          expiry_date?: string | null
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          notification_method?: string
          sent_at?: string
          sent_to?: string
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_settings: {
        Row: {
          admin_emails: string[]
          admin_whatsapp_numbers: string[]
          check_frequency_hours: number
          created_at: string
          email_enabled: boolean
          expiry_warning_days: number
          id: string
          low_stock_threshold: number
          shop_id: string | null
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          admin_emails?: string[]
          admin_whatsapp_numbers?: string[]
          check_frequency_hours?: number
          created_at?: string
          email_enabled?: boolean
          expiry_warning_days?: number
          id?: string
          low_stock_threshold?: number
          shop_id?: string | null
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          admin_emails?: string[]
          admin_whatsapp_numbers?: string[]
          check_frequency_hours?: number
          created_at?: string
          email_enabled?: boolean
          expiry_warning_days?: number
          id?: string
          low_stock_threshold?: number
          shop_id?: string | null
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "alert_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      cosmetics: {
        Row: {
          batch_no: string
          brand: string
          created_at: string | null
          expiry_date: string
          id: string
          manufacturing_date: string
          product_name: string
          purchase_price: number
          quantity: number
          rack_no: string
          selling_price: number
          shop_id: string | null
          supplier: string
          updated_at: string | null
        }
        Insert: {
          batch_no: string
          brand: string
          created_at?: string | null
          expiry_date: string
          id?: string
          manufacturing_date: string
          product_name: string
          purchase_price: number
          quantity?: number
          rack_no: string
          selling_price: number
          shop_id?: string | null
          supplier: string
          updated_at?: string | null
        }
        Update: {
          batch_no?: string
          brand?: string
          created_at?: string | null
          expiry_date?: string
          id?: string
          manufacturing_date?: string
          product_name?: string
          purchase_price?: number
          quantity?: number
          rack_no?: string
          selling_price?: number
          shop_id?: string | null
          supplier?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cosmetics_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_discounts: {
        Row: {
          created_at: string
          customer_id: string
          discount_percentage: number
          id: string
          is_active: boolean
          reason: string | null
          shop_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          discount_percentage?: number
          id?: string
          is_active?: boolean
          reason?: string | null
          shop_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          discount_percentage?: number
          id?: string
          is_active?: boolean
          reason?: string | null
          shop_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_discounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_discounts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          loyalty_points: number
          name: string
          notes: string | null
          phone: string
          shop_id: string | null
          total_purchases: number
          total_spent: number
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name: string
          notes?: string | null
          phone: string
          shop_id?: string | null
          total_purchases?: number
          total_spent?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          notes?: string | null
          phone?: string
          shop_id?: string | null
          total_purchases?: number
          total_spent?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_alerts: {
        Row: {
          amount: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string | null
          due_date: string
          id: string
          is_paid: boolean | null
          is_recurring: boolean | null
          recurrence_interval: number | null
          shop_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          is_paid?: boolean | null
          is_recurring?: boolean | null
          recurrence_interval?: number | null
          shop_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          is_paid?: boolean | null
          is_recurring?: boolean | null
          recurrence_interval?: number | null
          shop_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_alerts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          expense_date: string
          id: string
          notes: string | null
          shop_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          shop_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          shop_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          batch_no: string
          company_name: string
          created_at: string | null
          expiry_date: string
          id: string
          is_narcotic: boolean | null
          manufacturing_date: string
          medicine_name: string
          price_per_packet: number | null
          purchase_price: number
          quantity: number
          rack_no: string
          selling_price: number
          selling_type: string
          shop_id: string | null
          supplier: string
          tablets_per_packet: number | null
          updated_at: string | null
        }
        Insert: {
          batch_no: string
          company_name: string
          created_at?: string | null
          expiry_date: string
          id?: string
          is_narcotic?: boolean | null
          manufacturing_date: string
          medicine_name: string
          price_per_packet?: number | null
          purchase_price: number
          quantity?: number
          rack_no: string
          selling_price: number
          selling_type?: string
          shop_id?: string | null
          supplier: string
          tablets_per_packet?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_no?: string
          company_name?: string
          created_at?: string | null
          expiry_date?: string
          id?: string
          is_narcotic?: boolean | null
          manufacturing_date?: string
          medicine_name?: string
          price_per_packet?: number | null
          purchase_price?: number
          quantity?: number
          rack_no?: string
          selling_price?: number
          selling_type?: string
          shop_id?: string | null
          supplier?: string
          tablets_per_packet?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicines_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          current_shop_id: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_shop_id?: string | null
          full_name?: string | null
          id: string
          last_login_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_shop_id?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_shop_id_fkey"
            columns: ["current_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          batch_no: string | null
          created_at: string | null
          current_stock: number
          id: string
          item_id: string
          item_name: string
          item_type: string
          order_quantity: number
          purchase_order_id: string
          shop_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          batch_no?: string | null
          created_at?: string | null
          current_stock?: number
          id?: string
          item_id: string
          item_name: string
          item_type: string
          order_quantity: number
          purchase_order_id: string
          shop_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          batch_no?: string | null
          created_at?: string | null
          current_stock?: number
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          order_quantity?: number
          purchase_order_id?: string
          shop_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          order_number: string
          sent_at: string | null
          shop_id: string | null
          status: string
          supplier_id: string
          supplier_name: string
          total_amount: number
          total_items: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          order_number: string
          sent_at?: string | null
          shop_id?: string | null
          status?: string
          supplier_id: string
          supplier_name: string
          total_amount?: number
          total_items?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          sent_at?: string | null
          shop_id?: string | null
          status?: string
          supplier_id?: string
          supplier_name?: string
          total_amount?: number
          total_items?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          id: string
          processed_at: string
          processed_by: string
          quantity: number
          reason: string | null
          refund_amount: number
          return_type: string
          sale_id: string
          sale_item_id: string
          shop_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          processed_at?: string
          processed_by: string
          quantity: number
          reason?: string | null
          refund_amount?: number
          return_type: string
          sale_id: string
          sale_item_id: string
          shop_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          processed_at?: string
          processed_by?: string
          quantity?: number
          reason?: string | null
          refund_amount?: number
          return_type?: string
          sale_id?: string
          sale_item_id?: string
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_salesman_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items_salesman_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          batch_no: string
          created_at: string | null
          id: string
          is_fridge_item: boolean | null
          item_id: string
          item_name: string
          item_type: string
          profit: number
          quantity: number
          return_date: string | null
          return_quantity: number | null
          return_status: string | null
          sale_id: string
          shop_id: string | null
          tablets_per_packet: number | null
          total_packets: number | null
          total_price: number
          total_tablets: number | null
          unit_price: number
        }
        Insert: {
          batch_no: string
          created_at?: string | null
          id?: string
          is_fridge_item?: boolean | null
          item_id: string
          item_name: string
          item_type: string
          profit: number
          quantity: number
          return_date?: string | null
          return_quantity?: number | null
          return_status?: string | null
          sale_id: string
          shop_id?: string | null
          tablets_per_packet?: number | null
          total_packets?: number | null
          total_price: number
          total_tablets?: number | null
          unit_price: number
        }
        Update: {
          batch_no?: string
          created_at?: string | null
          id?: string
          is_fridge_item?: boolean | null
          item_id?: string
          item_name?: string
          item_type?: string
          profit?: number
          quantity?: number
          return_date?: string | null
          return_quantity?: number | null
          return_status?: string | null
          sale_id?: string
          shop_id?: string | null
          tablets_per_packet?: number | null
          total_packets?: number | null
          total_price?: number
          total_tablets?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_salesman_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          discount: number | null
          discount_percentage: number | null
          id: string
          loyalty_points_earned: number | null
          loyalty_points_redeemed: number | null
          return_date: string | null
          return_processed_by: string | null
          return_reason: string | null
          return_status: string | null
          sale_date: string | null
          salesman_id: string | null
          salesman_name: string
          shop_id: string | null
          subtotal: number
          tax: number | null
          total_amount: number
          total_profit: number
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          discount_percentage?: number | null
          id?: string
          loyalty_points_earned?: number | null
          loyalty_points_redeemed?: number | null
          return_date?: string | null
          return_processed_by?: string | null
          return_reason?: string | null
          return_status?: string | null
          sale_date?: string | null
          salesman_id?: string | null
          salesman_name: string
          shop_id?: string | null
          subtotal: number
          tax?: number | null
          total_amount: number
          total_profit: number
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          discount_percentage?: number | null
          id?: string
          loyalty_points_earned?: number | null
          loyalty_points_redeemed?: number | null
          return_date?: string | null
          return_processed_by?: string | null
          return_reason?: string | null
          return_status?: string | null
          sale_date?: string | null
          salesman_id?: string | null
          salesman_name?: string
          shop_id?: string | null
          subtotal?: number
          tax?: number | null
          total_amount?: number
          total_profit?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      salesmen: {
        Row: {
          assigned_counter: string
          cnic: string
          contact: string
          created_at: string | null
          id: string
          joining_date: string
          name: string
          shop_id: string | null
        }
        Insert: {
          assigned_counter: string
          cnic: string
          contact: string
          created_at?: string | null
          id?: string
          joining_date: string
          name: string
          shop_id?: string | null
        }
        Update: {
          assigned_counter?: string
          cnic?: string
          contact?: string
          created_at?: string | null
          id?: string
          joining_date?: string
          name?: string
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salesmen_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          created_at: string
          id: string
          pharmacy_address: string
          pharmacy_contact: string
          pharmacy_logo_url: string | null
          pharmacy_name: string
          pharmacy_tagline: string
          shop_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pharmacy_address?: string
          pharmacy_contact?: string
          pharmacy_logo_url?: string | null
          pharmacy_name?: string
          pharmacy_tagline?: string
          shop_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pharmacy_address?: string
          pharmacy_contact?: string
          pharmacy_logo_url?: string | null
          pharmacy_name?: string
          pharmacy_tagline?: string
          shop_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_staff: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: string
          shop_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role: string
          shop_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          shop_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_staff_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          location: string | null
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_merge_logs: {
        Row: {
          added_quantity: number
          batch_no: string
          id: string
          medicine_id: string
          medicine_name: string
          merged_at: string
          merged_by: string
          new_purchase_price: number | null
          new_selling_price: number | null
          new_total_quantity: number
          notes: string | null
          previous_purchase_price: number | null
          previous_quantity: number
          previous_selling_price: number | null
          shop_id: string | null
        }
        Insert: {
          added_quantity: number
          batch_no: string
          id?: string
          medicine_id: string
          medicine_name: string
          merged_at?: string
          merged_by: string
          new_purchase_price?: number | null
          new_selling_price?: number | null
          new_total_quantity: number
          notes?: string | null
          previous_purchase_price?: number | null
          previous_quantity: number
          previous_selling_price?: number | null
          shop_id?: string | null
        }
        Update: {
          added_quantity?: number
          batch_no?: string
          id?: string
          medicine_id?: string
          medicine_name?: string
          merged_at?: string
          merged_by?: string
          new_purchase_price?: number | null
          new_selling_price?: number | null
          new_total_quantity?: number
          notes?: string | null
          previous_purchase_price?: number | null
          previous_quantity?: number
          previous_selling_price?: number | null
          shop_id?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          shop_id: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          shop_id?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          shop_id?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      sale_items_salesman_view: {
        Row: {
          batch_no: string | null
          created_at: string | null
          id: string | null
          item_id: string | null
          item_name: string | null
          item_type: string | null
          quantity: number | null
          sale_id: string | null
          shop_id: string | null
          tablets_per_packet: number | null
          total_packets: number | null
          total_price: number | null
          total_tablets: number | null
          unit_price: number | null
        }
        Insert: {
          batch_no?: string | null
          created_at?: string | null
          id?: string | null
          item_id?: string | null
          item_name?: string | null
          item_type?: string | null
          quantity?: number | null
          sale_id?: string | null
          shop_id?: string | null
          tablets_per_packet?: number | null
          total_packets?: number | null
          total_price?: number | null
          total_tablets?: number | null
          unit_price?: number | null
        }
        Update: {
          batch_no?: string | null
          created_at?: string | null
          id?: string | null
          item_id?: string | null
          item_name?: string | null
          item_type?: string | null
          quantity?: number | null
          sale_id?: string | null
          shop_id?: string | null
          tablets_per_packet?: number | null
          total_packets?: number | null
          total_price?: number | null
          total_tablets?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales_salesman_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_salesman_view: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          discount: number | null
          discount_percentage: number | null
          id: string | null
          loyalty_points_earned: number | null
          loyalty_points_redeemed: number | null
          sale_date: string | null
          salesman_id: string | null
          salesman_name: string | null
          shop_id: string | null
          subtotal: number | null
          tax: number | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          discount_percentage?: number | null
          id?: string | null
          loyalty_points_earned?: number | null
          loyalty_points_redeemed?: number | null
          sale_date?: string | null
          salesman_id?: string | null
          salesman_name?: string | null
          shop_id?: string | null
          subtotal?: number | null
          tax?: number | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          discount_percentage?: number | null
          id?: string | null
          loyalty_points_earned?: number | null
          loyalty_points_redeemed?: number | null
          sale_date?: string | null
          salesman_id?: string | null
          salesman_name?: string | null
          shop_id?: string | null
          subtotal?: number | null
          tax?: number | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      salesmen_list: {
        Row: {
          assigned_counter: string | null
          id: string | null
          name: string | null
          shop_id: string | null
        }
        Insert: {
          assigned_counter?: string | null
          id?: string | null
          name?: string | null
          shop_id?: string | null
        }
        Update: {
          assigned_counter?: string | null
          id?: string | null
          name?: string | null
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salesmen_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      decrement_cosmetic_quantity: {
        Args: { cosmetic_id: string; qty: number }
        Returns: undefined
      }
      decrement_medicine_quantity: {
        Args: { medicine_id: string; qty: number }
        Returns: undefined
      }
      generate_order_number: { Args: never; Returns: string }
      get_shop_role: {
        Args: { _shop_id: string; _user_id: string }
        Returns: string
      }
      get_user_shop_id: { Args: { _user_id: string }; Returns: string }
      get_user_shops: {
        Args: { p_user_id: string }
        Returns: {
          shop_id: string
          shop_name: string
          shop_role: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_shop_access: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      switch_shop: {
        Args: { p_shop_id: string; p_user_id: string }
        Returns: boolean
      }
      user_belongs_to_shop: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "salesman"
      expense_category:
        | "supplier_payment"
        | "staff_salary"
        | "food_expense"
        | "miscellaneous"
        | "rent"
        | "water_bill"
        | "electricity_bill"
        | "maintenance"
        | "medical_equipment"
        | "license_fees"
        | "insurance"
        | "marketing"
        | "transportation"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "salesman"],
      expense_category: [
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
        "transportation",
      ],
    },
  },
} as const
