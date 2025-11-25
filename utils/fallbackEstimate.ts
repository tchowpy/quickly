import { PricingEstimate } from "types/models";

export function computeFallbackEstimate(unitPrice: number, quantity: number, distanceKm?: number): PricingEstimate {
  const distance = distanceKm ?? 10;
    const productPrice = unitPrice * quantity;
  let serviceFee = 200;
  if (productPrice > 10000) {
    serviceFee = 700;
  } else if (productPrice > 5000) {
    serviceFee = 400;
  }
  const deliveryFee = distanceKm ? Math.max(distance, 1) * 500 : 0;
  const deliveryFeeMin = distance * 150;
  const deliveryFeeMax = distance * 500;
  return {
    product_price: productPrice,
    service_fee: serviceFee,
    delivery_fee: deliveryFee,
    delivery_fee_min: deliveryFeeMin,
    delivery_fee_max: deliveryFeeMax,
    total_amount:  productPrice + serviceFee + deliveryFee,
    distance_km: distanceKm,
  };
}