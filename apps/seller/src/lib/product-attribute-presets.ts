/**
 * Predefined attribute keys and allowed values for seller product JSON sections.
 * Sellers pick from lists instead of typing free-form keys/values.
 */

const OTHER = 'Other (specify)';

/** Shared value lists reused across keys */
const materials = [
  'Plastic',
  'Silicone',
  'Metal',
  'Glass',
  'Wood',
  'Fabric',
  'Ceramic',
  'Rubber',
  'Stainless Steel',
  'Aluminium',
  'Paper',
  'Leather',
  OTHER,
];

const yesNoNa = ['Yes', 'No', 'Not applicable', OTHER];

const commonCare = [
  'Wipe clean with dry cloth',
  'Wipe clean with damp cloth',
  'Hand wash only',
  'Machine washable',
  'Dishwasher safe',
  'Do not wash',
  'Store in a cool dry place',
  OTHER,
];

/** Internal placeholder until seller types a custom attribute name (not saved as-is). */
export const CUSTOM_ATTRIBUTE_PENDING = '__custom_attribute__';

export type AttributePreset = {
  id: string;
  keys: string[];
  /** Values shown for each key; missing keys fall back to `defaultValues` */
  valuesByKey: Record<string, string[]>;
  defaultValues: string[];
};

export const PRESET_FEATURES_SPECS: AttributePreset = {
  id: 'featuresSpecs',
  keys: [
    'Light Source Type',
    'Power Source',
    'Battery Type',
    'Battery Average Life',
    'Voltage',
    'Wattage',
    'Material',
    'Color',
    'Product Dimensions',
    'Item Weight',
    'Included Components',
    'Mounting Type',
    'Water Resistance',
    'Noise Level',
    'Connectivity',
    'Operating System',
    'Screen Size',
    'Storage Capacity',
    'RAM',
    'Processor',
    'Warranty Description',
  ],
  valuesByKey: {
    'Light Source Type': ['LED', 'Halogen', 'CFL', 'Incandescent', 'Neon', 'Not applicable', OTHER],
    'Power Source': ['Battery', 'Corded Electric', 'USB rechargeable', 'Solar', 'Manual', 'Not applicable', OTHER],
    'Battery Type': ['AA', 'AAA', 'CR2032', 'Lithium-ion', 'Built-in rechargeable', 'Not applicable', OTHER],
    'Water Resistance': ['None', 'Water resistant', 'Waterproof (IPX4)', 'Waterproof (IPX7)', 'Not applicable', OTHER],
    Material: materials,
    Color: [
      'Black',
      'White',
      'Grey',
      'Silver',
      'Gold',
      'Blue',
      'Red',
      'Green',
      'Pink',
      'Purple',
      'Multicolour',
      OTHER,
    ],
    Connectivity: ['Wi‑Fi', 'Bluetooth', 'USB', 'NFC', 'None', OTHER],
    'Operating System': ['Android', 'iOS', 'Windows', 'Not applicable', OTHER],
  },
  defaultValues: ['See product description', 'Not applicable', 'As per packaging', OTHER],
};

export const PRESET_MATERIALS_CARE: AttributePreset = {
  id: 'materialsCare',
  keys: [
    'Primary Material',
    'Secondary Material',
    'Finish',
    'Care Instructions',
    'Storage Instructions',
    'Is Dishwasher Safe',
    'Is Microwave Safe',
    'Is Freezer Safe',
    'Allergen Information',
  ],
  valuesByKey: {
    'Primary Material': materials,
    'Secondary Material': materials,
    Finish: ['Matte', 'Glossy', 'Brushed', 'Polished', 'Textured', 'Not applicable', OTHER],
    'Care Instructions': commonCare,
    'Storage Instructions': [
      'Room temperature',
      'Refrigerate after opening',
      'Keep away from direct sunlight',
      'Store upright',
      OTHER,
    ],
    'Is Dishwasher Safe': yesNoNa,
    'Is Microwave Safe': yesNoNa,
    'Is Freezer Safe': yesNoNa,
  },
  defaultValues: commonCare,
};

export const PRESET_ITEM_DETAILS: AttributePreset = {
  id: 'itemDetails',
  keys: [
    'Manufacturer',
    'Packer',
    'Importer',
    'Country of Origin',
    'Item Model Number',
    'Part Number',
    'Net Quantity',
    'Units in Package',
    'Generic Name',
    'HSN Code',
  ],
  valuesByKey: {
    'Country of Origin': [
      'India',
      'China',
      'USA',
      'Germany',
      'Japan',
      'Vietnam',
      'Taiwan',
      'South Korea',
      'Thailand',
      OTHER,
    ],
    'Net Quantity': ['1', '2', '3', '4', '5', '6', 'Pack of 10', 'Pack of 12', OTHER],
    'Units in Package': ['1', '2', '3', '4', '6', '12', OTHER],
  },
  defaultValues: ['As per label', 'See packaging', 'Not applicable', OTHER],
};

export const PRESET_ADDITIONAL_DETAILS: AttributePreset = {
  id: 'additionalDetails',
  keys: [
    'Best Sellers Rank',
    'Launch Date',
    'ASIN / Style ID',
    'Customer Reviews Summary',
    'Certifications',
    'Compatibility',
    'Age Range',
    'Gender',
    'Occasion',
  ],
  valuesByKey: {
    Gender: ['Unisex', 'Men', 'Women', 'Kids', 'Baby', OTHER],
    Occasion: ['Casual', 'Formal', 'Sports', 'Daily use', 'Gifting', OTHER],
    'Age Range': ['0–2 years', '3–5 years', '6–12 years', '13+ years', 'Adult', 'All ages', OTHER],
  },
  defaultValues: ['Not applicable', 'See description', OTHER],
};

export function getValueOptionsForKey(preset: AttributePreset, key: string): string[] {
  const specific = preset.valuesByKey[key];
  if (specific?.length) return specific;
  return preset.defaultValues;
}

/** All four sections as returned by GET /seller/product-attribute-presets */
export type ProductAttributePresetsBundle = {
  featuresSpecs: AttributePreset;
  materialsCare: AttributePreset;
  itemDetails: AttributePreset;
  additionalDetails: AttributePreset;
};

export const BUNDLED_PRODUCT_ATTRIBUTE_PRESETS: ProductAttributePresetsBundle = {
  featuresSpecs: PRESET_FEATURES_SPECS,
  materialsCare: PRESET_MATERIALS_CARE,
  itemDetails: PRESET_ITEM_DETAILS,
  additionalDetails: PRESET_ADDITIONAL_DETAILS,
};
