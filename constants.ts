
import { TravelDestination, AgencyInfo } from './types';

export const MOCK_DESTINATIONS: TravelDestination[] = [
  {
    id: '1',
    name: 'Bali',
    country: 'Indonesia',
    description: 'Beautiful beaches and tropical landscapes.',
    estimatedBaseCostUSD: 150,
    imageUrl: 'https://picsum.photos/seed/bali/800/600',
    rating: 4.8,
    category: 'Budget'
  },
  {
    id: '2',
    name: 'Paris',
    country: 'France',
    description: 'The city of lights and romance.',
    estimatedBaseCostUSD: 1200,
    imageUrl: 'https://picsum.photos/seed/paris/800/600',
    rating: 4.5,
    category: 'Luxury'
  },
  {
    id: '3',
    name: 'Kasol',
    country: 'India',
    description: 'A serene mountain getaway in Himachal Pradesh.',
    estimatedBaseCostUSD: 40,
    imageUrl: 'https://picsum.photos/seed/kasol/800/600',
    rating: 4.7,
    category: 'Budget'
  },
  {
    id: '4',
    name: 'Tokyo',
    country: 'Japan',
    description: 'Neon lights and deep traditions.',
    estimatedBaseCostUSD: 1500,
    imageUrl: 'https://picsum.photos/seed/tokyo/800/600',
    rating: 4.9,
    category: 'City'
  },
  {
    id: '5',
    name: 'Kyiv',
    country: 'Ukraine',
    description: 'A historic city with deep cultural roots.',
    estimatedBaseCostUSD: 300,
    imageUrl: 'https://picsum.photos/seed/kyiv/800/600',
    rating: 4.2,
    category: 'Budget'
  }
];

export const MOCK_AGENCIES: AgencyInfo[] = [
  { name: "SkyHigh Rentals", type: "Rental", contact: "+91 98765-43210", location: "Mumbai Central" },
  { name: "Urban Wheels", type: "Rental", contact: "+91 91234-56789", location: "Bengaluru Airport" },
  { name: "Express Trains", type: "Transport", contact: "139 (Railways)", location: "Pan-India" },
  { name: "Orbit Fly", type: "Transport", contact: "011-2345678", location: "IGI Airport Delhi" }
];
