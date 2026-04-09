// Canonical list of all service types offered on Kidor.
// Used in BookingFlow (customer picks service), CompanyDashboard (shop selects offerings),
// and ShopProfile (displays shop services).

export const SERVICE_CATEGORIES = [
  {
    category: "Vehicle Wraps",
    services: [
      { name: "Full Color Change Wrap", description: "Complete vehicle color transformation" },
      { name: "Partial Wrap", description: "Hood, roof, trunk, or custom panels" },
      { name: "Racing Stripes", description: "Single or dual stripe packages" },
      { name: "PPF Paint Protection Film", description: "Clear bra to protect your paint" },
      { name: "Chrome Delete", description: "Replace chrome trim with vinyl" },
      { name: "Custom Design Wrap", description: "Unique graphics and full custom design" },
    ],
  },
  {
    category: "Signage",
    services: [
      { name: "Monument Signs", description: "Freestanding exterior monument signage" },
      { name: "Banners", description: "Vinyl banners for indoor or outdoor use" },
      { name: "LED Signs", description: "Illuminated LED cabinet and channel signs" },
      { name: "Channel Letters", description: "3D dimensional lettering for storefronts" },
      { name: "Window Graphics", description: "Storefront window decals and frosted film" },
      { name: "Window Tinting", description: "Residential, commercial, and automotive window tint" },
    ],
  },
];

// Flat list of all service names for convenience
export const ALL_SERVICE_NAMES = SERVICE_CATEGORIES.flatMap(c => c.services.map(s => s.name));
