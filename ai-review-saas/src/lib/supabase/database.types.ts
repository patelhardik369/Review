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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          company_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      businesses: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          phone: string | null
          website: string | null
          gmb_account_id: string | null
          gmb_location_id: string | null
          gmb_location_name: string | null
          stripe_customer_id: string | null
          response_limit: number
          responses_used: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          phone?: string | null
          website?: string | null
          gmb_account_id?: string | null
          gmb_location_id?: string | null
          gmb_location_name?: string | null
          stripe_customer_id?: string | null
          response_limit?: number
          responses_used?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          phone?: string | null
          website?: string | null
          gmb_account_id?: string | null
          gmb_location_id?: string | null
          gmb_location_name?: string | null
          stripe_customer_id?: string | null
          response_limit?: number
          responses_used?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          business_id: string
          gmb_review_id: string
          author_name: string | null
          author_photo_url: string | null
          star_rating: number | null
          review_text: string | null
          review_time: string | null
          create_time: string | null
          update_time: string | null
          sentiment: string | null
          is_responded: boolean
          priority: number
          review_metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          gmb_review_id: string
          author_name?: string | null
          author_photo_url?: string | null
          star_rating?: number | null
          review_text?: string | null
          review_time?: string | null
          create_time?: string | null
          update_time?: string | null
          sentiment?: string | null
          is_responded?: boolean
          priority?: number
          review_metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          gmb_review_id?: string
          author_name?: string | null
          author_photo_url?: string | null
          star_rating?: number | null
          review_text?: string | null
          review_time?: string | null
          create_time?: string | null
          update_time?: string | null
          sentiment?: string | null
          is_responded?: boolean
          priority?: number
          review_metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      responses: {
        Row: {
          id: string
          review_id: string
          business_id: string
          content: string
          tone: string | null
          status: string
          ai_model: string | null
          ai_tokens_used: number | null
          edit_history: Json | null
          approved_by: string | null
          approved_at: string | null
          published_at: string | null
          gmb_reply_id: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          review_id: string
          business_id: string
          content: string
          tone?: string | null
          status?: string
          ai_model?: string | null
          ai_tokens_used?: number | null
          edit_history?: Json | null
          approved_by?: string | null
          approved_at?: string | null
          published_at?: string | null
          gmb_reply_id?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          business_id?: string
          content?: string
          tone?: string | null
          status?: string
          ai_model?: string | null
          ai_tokens_used?: number | null
          edit_history?: Json | null
          approved_by?: string | null
          approved_at?: string | null
          published_at?: string | null
          gmb_reply_id?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          status: string
          plan_type: string | null
          | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          trial_start: string | null
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          status?: string | null
          plan_type?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          status?: string | null
          plan_type?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      brand_settings: {
        Row: {
          id: string
          business_id: string | null
          user_id: string
          tone: string
          greeting: string | null
          closing: string | null
          custom_vocabulary: string[] | null
          response_length: string
          include_coupon: boolean
          coupon_code: string | null
          custom_phrases: Json | null
          auto_publish: boolean
          notify_on_negative: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id?: string | null
          user_id: string
          tone?: string
          greeting?: string | null
          closing?: string | null
          custom_vocabulary?: string[] | null
          response_length?: string
          include_coupon?: boolean
          coupon_code?: string | null
          custom_phrases?: Json | null
          auto_publish?: boolean
          notify_on_negative?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string | null
          user_id?: string
          tone?: string
          greeting?: string | null
          closing?: string | null
          custom_vocabulary?: string[] | null
          response_length?: string
          include_coupon?: boolean
          coupon_code?: string | null
          custom_phrases?: Json | null
          auto_publish?: boolean
          notify_on_negative?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          provider: string
          access_token: string | null
          refresh_token: string | null
          expires_at: string | null
          metadata: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          metadata?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          metadata?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      webhooks: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          provider: string
          payload: Json
          processed: boolean
          processing_error: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          provider: string
          payload: Json
          processed?: boolean
          processing_error?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          provider?: string
          payload?: Json
          processed?: boolean
          processing_error?: string | null
          processed_at?: string | null
          created_at?: string
        }
      }
      usage_logs: {
        Row: {
          id: string
          user_id: string
          business_id: string | null
          action: string
          tokens_used: number
          cost_cents: number
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_id?: string | null
          action: string
          tokens_used?: number
          cost_cents?: number
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_id?: string | null
          action?: string
          tokens_used?: number
          cost_cents?: number
          metadata?: Json | null
          created_at?: string
        }
      }
    }
  }
}
