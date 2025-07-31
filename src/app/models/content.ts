// For home page content
export interface HomeContent {
  id?: number; // Backend might use fixed ID (e.g., 1) or auto-increment
  title: string;
  subtitle: string;
  btn1_text: string;
  btn2_text: string;
  bg_image?: string; // Stored filename on backend
  bg_image_url?: string; // URL for displaying in frontend
}

// For about us page content
export interface AboutContent {
  id?: number;
  title: string;
  description: string;
  image?: string; // Stored filename on backend
  image_url?: string; // URL for displaying in frontend
}

// For main features section content (title and subtitle)
export interface FeaturesMainContent {
  id?: number;
  title: string;
  subtitle: string;
}

// For individual feature cards (assuming they are managed separately or as part of a JSON column)
// Based on your backend, you'll need separate routes for these if they are separate DB table entries.
export interface FeatureCard {
  id?: number; // Unique ID for the card
  title: string;
  description: string;
  icon_image?: string; // Stored filename for icon
  icon_image_url?: string; // URL for displaying icon
}

// This interface combines all content for the AdminPagecontentComponent's data model
export interface WebsiteContent {
  home: HomeContent;
  about: AboutContent;
  features: {
    main: FeaturesMainContent; // Main title/subtitle for features section
    cards: FeatureCard[]; // Array of feature cards
  };
}