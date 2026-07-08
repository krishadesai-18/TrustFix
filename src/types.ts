export interface Booking {
  status: "idle" | "booked" | "accepted" | "on_the_way" | "in_progress" | "completed" | "cancelled";
  category: string;
  date: string;
  timeSlot: string;
  problemDescription: string;
  paymentMethod: string;
  otp: string;
  beforePhoto: string | null;
  afterPhoto: string | null;
  customerRating: number;
  customerReview: string;
  recommend: boolean | null;
  amountPaid: number;
}

export interface SlotStatus {
  [slot: string]: "available" | "unavailable" | "booked";
}

export interface Notification {
  id: string;
  text: string;
  time: string;
}

export interface AppState {
  booking: Booking;
  slots: SlotStatus;
  notifications: Notification[];
}

export interface Professional {
  name: string;
  title: string;
  experience: string;
  specialty: string;
  rating: number;
  trustScore: number;
  baseCharge: number;
  avatar: string;
  reviews: Array<{
    author: string;
    date: string;
    rating: number;
    text: string;
  }>;
}
