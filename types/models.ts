export type PaymentMethod = 'cash_on_delivery' | 'mobile_money' | 'mixed';
export type OrderStatus =
  | 'created'
  | 'pending_broadcast'
  | 'broadcasted'
  | 'accepted'
  | 'confirmed'
  | 'in_preparation'
  | 'assigned'
  | 'in_delivery'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'cancelled';

  export type TrackingStatus =
  | 'pending'
  | 'rejected'
  | 'assigned'
  | 'retrieved'
  | 'in_transit'
  | 'at_destination'
  | 'delivered'
  | 'failed';

export interface Coords {
  latitude: number,
  longitude: number
}

export interface UserProfile {
  id: string;
  auth_user_id?: string;
  full_name: string | null;
  phone: string;
  avatar_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  consent_accepted?: boolean;
  created_at?: string;
  distance_km?: number;
  eta?: string;
  total_amount?: number;
  _ts?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price_regulated?: number | null;
  unit?: string | null;
  base_price?: number | null;
  subcategory_id?: string | null;
  image_url?: string | null;
  is_suggested?: boolean;
}

export interface PricingEstimate {
  product_price: number;
  service_fee: number;
  delivery_fee: number;
  delivery_fee_min: number;
  delivery_fee_max: number;
  total_amount: number;
  distance_km?: number;
}

export interface Account {
  phone: string;
  name: string;
}

export interface TrackingSummary {
    id: string;
    order_id: string;
    assigned_to: string | null;
    phone: string;
    distance_km: number;
    expectedTime?: number;
    latitude: number | null;
    longitude: number | null;
    location_address: string | null;
    start_time: string | null;
    end_time: string | null;
    proof_url: string | null;
    status: TrackingStatus;

    users?: UserProfile | null;
    order: OrderSummary;
  };

export interface OrderSummary {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit_price?: number | null;
  total_price?: number | null;
  service_fee: number;
  delivery_fee: number;
  total_amount: number;
  status: OrderStatus;
  payment_mode: PaymentMethod;
  created_at: string;
  provider_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string | null;
  courier_latitude?: number | null;
  courier_longitude?: number | null;
  courier_location_address?: string | null;

  client?: UserProfile | null;
  provider?: UserProfile | null;
  courier?: UserProfile | null;
  
  feedback?: {
    id: string;
    order_id: string;
    client_id: string;
    provider_id: string;
    product_rating: number;
    client_rating: number;
    courier_rating: number;
    feedback_on_client: string;
    feedback_on_provider: string;
    feedback_on_courier: string;
    created_at: string;
  },

  tracking?: {
    id: string;
    order_id: string;
    latitude: number | null;
    longitude: number | null;
    location_address: string | null;
    status: string | null;
    updated_at: string;
    users?: UserProfile | null;
  } | null;
}

export interface OrderStatusEvent {
  id: string;
  order_id: string;
  status: OrderStatus;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  order_id?: string | null;
  type?: string | null;
  link?: string | null;
  created_at: string;
  read: boolean;
}

export interface SupportTicket {
  id: string;
  order_id?: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
}

export interface FeedbackPayload {
  id: string;
  order_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
}
