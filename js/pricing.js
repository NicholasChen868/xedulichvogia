/**
 * ============================================
 * PRICING CALCULATOR
 * ============================================
 * Tính giá theo cơ cấu cự ly bậc thang.
 * Mỗi km được tính theo mức giá của khoảng cách đó.
 */

function calculateFare(distanceKm, vehicleTypeId = 'sedan-4') {
    if (!distanceKm || distanceKm <= 0) return { total: 0, breakdown: [], distance: 0 };

    const vehicle = VEHICLE_TYPES.find(v => v.id === vehicleTypeId) || VEHICLE_TYPES[0];
    const breakdown = [];
    let total = 0;
    let remainingKm = distanceKm;

    for (const tier of PRICING_TIERS) {
        if (remainingKm <= 0) break;

        const tierRange = tier.maxKm - tier.minKm + 1;
        const kmInTier = Math.min(remainingKm, tierRange);

        const tierCost = kmInTier * tier.pricePerKm;
        total += tierCost;

        breakdown.push({
            label: tier.label,
            km: kmInTier,
            pricePerKm: tier.pricePerKm,
            subtotal: tierCost
        });

        remainingKm -= kmInTier;
    }

    // Apply vehicle multiplier
    total = Math.round(total * vehicle.priceMultiplier);

    return {
        total,
        breakdown,
        distance: distanceKm,
        vehicleType: vehicle.name,
        multiplier: vehicle.priceMultiplier
    };
}

/**
 * Format VND currency
 */
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

/**
 * Format short VND (e.g., 1.5M)
 */
function formatVNDShort(amount) {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1).replace('.0', '') + 'M ₫';
    }
    if (amount >= 1000) {
        return Math.round(amount / 1000) + 'K ₫';
    }
    return formatVND(amount);
}

/**
 * Get price for a popular route
 */
function getRoutePrice(route, vehicleTypeId = 'sedan-4') {
    const fare = calculateFare(route.distance, vehicleTypeId);
    return fare.total;
}

/**
 * Get the current tier for a given distance
 */
function getCurrentTier(distanceKm) {
    return PRICING_TIERS.find(t => distanceKm >= t.minKm && distanceKm <= t.maxKm) || PRICING_TIERS[PRICING_TIERS.length - 1];
}
