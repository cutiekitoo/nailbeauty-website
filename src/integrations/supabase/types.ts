export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          price: number
          stock: number
          images: string[]
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description: string
          price: number
          stock: number
          images: string[]
          category: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          price?: number
          stock?: number
          images?: string[]
          category?: string
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_name: string
          customer_phone: string
          wilaya_code: string
          wilaya_name: string
          delivery_method: 'home' | 'office'
          address: string | null
          office_location: string | null
          subtotal: number
          shipping_fee: number
          total: number
          payment_method: string
          status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          notes: string | null
          stock_restored: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          customer_name: string
          customer_phone: string
          wilaya_code: string
          wilaya_name: string
          delivery_method: 'home' | 'office'
          address?: string | null
          office_location?: string | null
          subtotal: number
          shipping_fee: number
          total: number
          payment_method: string
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          notes?: string | null
          stock_restored?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          customer_name?: string
          customer_phone?: string
          wilaya_code?: string
          wilaya_name?: string
          delivery_method?: 'home' | 'office'
          address?: string | null
          office_location?: string | null
          subtotal?: number
          shipping_fee?: number
          total?: number
          payment_method?: string
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          notes?: string | null
          stock_restored?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          name: string
          image: string | null
          unit_price: number
          quantity: number
          line_total: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          name: string
          image?: string | null
          unit_price: number
          quantity: number
          line_total: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          name?: string
          image?: string | null
          unit_price?: number
          quantity?: number
          line_total?: number
        }
      }
      shipping_rates: {
        Row: {
          code: string
          name: string
          home_rate: number
          office_rate: number
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          code: string
          name: string
          home_rate: number
          office_rate: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          code?: string
          name?: string
          home_rate?: number
          office_rate?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role: 'admin'
          created_at: string
        }
        Insert: {
          user_id: string
          role: 'admin'
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: 'admin'
          created_at?: string
        }
      }
    }
    Views: {
      product_revenue: {
        Row: {
          product_id: string
          product_name: string
          slug: string
          units_sold: number
          revenue: number
          orders_count: number
        }
      }
      total_revenue: {
        Row: {
          total_revenue: number
          grand_total_collected: number
          total_orders: number
          total_shipping: number
        }
      }
    }
    Functions: {
      create_order: {
        Args: {
          payload: Json
        }
        Returns: Json
      }
      restore_stock: {
        Args: {
          p_order_id: string
        }
        Returns: void
      }
      update_order_status: {
        Args: {
          p_order_id: string
          new_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
        }
        Returns: Json
      }
      validate_order_status_transition: {
        Args: {
          current_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          new_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          user_id: string
          role: string
        }
        Returns: boolean
      }
    }
  }
}
