
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  currency: string;
}

export interface TravelDestination {
  id: string;
  name: string;
  country: string;
  description: string;
  estimatedBaseCostUSD: number;
  imageUrl: string;
  rating: number;
  category: 'Budget' | 'Luxury' | 'Adventure' | 'City';
  locationUrl?: string; // For Maps/VR
}

export interface Ticket {
  id: string;
  userId: string;
  destination: string;
  date: string;
  cost: string;
  transportType: string;
  status: 'Confirmed' | 'Pending';
}

export interface TravelHistory extends Ticket {
  feedback?: string;
  rating?: number;
}

export interface TravelCostEstimate {
  walk: number;
  bike: number;
  car: number;
  flight: number;
  train: number;
  bus: number;
}

export interface AgencyInfo {
  name: string;
  type: string;
  contact: string;
  location: string;
}
