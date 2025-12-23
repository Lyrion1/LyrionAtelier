/**
 * LYRION ORACLE - PRODUCT RECOMMENDATIONS
 * Simple sun sign based product matching
 */

// Product catalog (simplified for Oracle page)
const ORACLE_PRODUCTS = {
  'aries-crewneck': {
    id: 'aries-crewneck',
    name: 'Aries Crewneck',
    price: 69.99,
    image: '/images/products/aries-crewneck/aries-crewneck-front.jpg',
    mysticalCopy: 'The pioneer. The warrior. For those who lead the charge.'
  },
  'cancer-hoodie': {
    id: 'cancer-hoodie',
    name: 'Cancer Hoodie',
    price: 84.99,
    image: '/images/products/cancer-hoodie/cancer-hoodie-front.jpg',
    mysticalCopy: 'The protector of the heart. For deep feelers who create sanctuary.'
  },
  'libra-tee': {
    id: 'libra-tee',
    name: 'Libra Tee',
    price: 49.99,
    image: '/images/products/libra-tee/libra-tee-front.jpg',
    mysticalCopy: 'The diplomat. The artist. For souls seeking harmony.'
  },
  'capricorn-crewneck': {
    id: 'capricorn-crewneck',
    name: 'Capricorn Crewneck',
    price: 69.99,
    image: '/images/products/capricorn-crewneck/capricorn-crewneck-front.jpg',
    mysticalCopy: 'The architect of empires. For those climbing invisible mountains.'
  },
  'logo-hoodie-black': {
    id: 'logo-hoodie-black',
    name: 'Premium Black Hoodie',
    price: 84.99,
    image: '/images/products/logo-hoodie-black/logo-hoodie-black-front.jpg',
    mysticalCopy: 'The Tree of Life roots you while reaching skyward.'
  },
  'oversized-black-tee': {
    id: 'oversized-black-tee',
    name: 'Oversized Black Tee',
    price: 54,
    image: '/images/products/logo-tee-black/logo-tee-black-front.jpg',
    mysticalCopy: 'Sacred symbols worn close to the heart. Everyday alchemy.'
  },
  'corduroy-cap-tan': {
    id: 'corduroy-cap-tan',
    name: 'Corduroy Cap',
    price: 39,
    image: '/images/products/logo-cap-tan/logo-cap-tan-front.jpg',
    mysticalCopy: 'Crown your consciousness. For fire signs and those meant to be seen.'
  },
  'embroidered-beanie-black': {
    id: 'embroidered-beanie-black',
    name: 'Embroidered Beanie',
    price: 34,
    image: '/images/products/logo-beanie-black/logo-beanie-black-front.jpg',
    mysticalCopy: 'For deep thinkers and winter mystics. Protection for the crown chakra.'
  },
  'organic-tote-black': {
    id: 'organic-tote-black',
    name: 'Organic Tote',
    price: 34,
    image: '/images/products/organic-tote-black/organic-tote-black-front.jpg',
    mysticalCopy: 'Sacred objects deserve sacred vessels. For the everyday mystic.'
  },
  'aromatherapy-candle': {
    id: 'aromatherapy-candle',
    name: 'Aromatherapy Candle',
    price: 38,
    image: '/images/products/aromatherapy-candle/candle-white-front.jpg',
    mysticalCopy: 'Light transforms darkness. For souls in deep transition.'
  },
  'aries-youth-tee-black': {
    id: 'aries-youth-tee-black',
    name: 'Aries Youth Tee',
    price: 29,
    image: '/images/products/aries-youth-tee/aries-youth-black-front.jpg',
    mysticalCopy: 'Little warriors. Bold hearts. For fearless young fire signs.'
  },
  'leo-youth-tee-black': {
    id: 'leo-youth-tee-black',
    name: 'Leo Youth Tee',
    price: 29,
    image: '/images/products/leo-youth-tee/leo-youth-black-front.jpg',
    mysticalCopy: 'Born to shine. For young lions who already know they\'re royalty.'
  },
  'aquarius-youth-tee-white': {
    id: 'aquarius-youth-tee-white',
    name: 'Aquarius Youth Tee',
    price: 29,
    image: '/images/products/aquarius-youth-tee/aquarius-youth-white-front.jpg',
    mysticalCopy: 'The future belongs to the weird ones. For young visionaries.'
  }
};

// Sun sign to product mapping (3 products per sign)
const SUN_SIGN_RECOMMENDATIONS = {
  'aries': ['aries-crewneck', 'corduroy-cap-tan', 'logo-hoodie-black'],
  'taurus': ['logo-hoodie-black', 'organic-tote-black', 'aromatherapy-candle'],
  'gemini': ['oversized-black-tee', 'corduroy-cap-tan', 'organic-tote-black'],
  'cancer': ['cancer-hoodie', 'aromatherapy-candle', 'embroidered-beanie-black'],
  'leo': ['corduroy-cap-tan', 'logo-hoodie-black', 'leo-youth-tee-black'],
  'virgo': ['oversized-black-tee', 'organic-tote-black', 'logo-hoodie-black'],
  'libra': ['libra-tee', 'aromatherapy-candle', 'organic-tote-black'],
  'scorpio': ['embroidered-beanie-black', 'aromatherapy-candle', 'logo-hoodie-black'],
  'sagittarius': ['corduroy-cap-tan', 'oversized-black-tee', 'organic-tote-black'],
  'capricorn': ['capricorn-crewneck', 'logo-hoodie-black', 'embroidered-beanie-black'],
  'aquarius': ['aquarius-youth-tee-white', 'oversized-black-tee', 'organic-tote-black'],
  'pisces': ['embroidered-beanie-black', 'cancer-hoodie', 'aromatherapy-candle']
};

// Get recommended products for a sun sign
function getOracleRecommendations(sunSign) {
  const productIds = SUN_SIGN_RECOMMENDATIONS[sunSign.toLowerCase()] || SUN_SIGN_RECOMMENDATIONS['leo'];
  return productIds.map((id) => ORACLE_PRODUCTS[id]);
}
