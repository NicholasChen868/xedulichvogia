/**
 * ============================================
 * MAIN APPLICATION
 * ============================================
 * Renders UI from config + Supabase data.
 * Falls back to config.js if DB unavailable.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Khởi tạo Supabase
    initSupabase();

    renderTrustBar();
    renderVehicleTypes();
    renderPricingTable();
    renderSteps();
    initBookingForm();
    initPricingCalculator();
    initNavigation();

    // Load routes từ Supabase (fallback config.js)
    await loadAndRenderRoutes();
});

/* ======= LOAD DATA TỪ SUPABASE ======= */
async function loadAndRenderRoutes() {
    const routes = await fetchPopularRoutes();
    renderPopularRoutes(routes);
}

/* ======= NAVIGATION ======= */
function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
        navLinks.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => navLinks.classList.remove('open'));
        });
    }
}

/* ======= TRUST BAR ======= */
function renderTrustBar() {
    const container = document.getElementById('trust-bar');
    if (!container) return;
    container.innerHTML = TRUST_STATS.map(stat => `
        <div class="trust-item">
            <i class="fas ${stat.icon}"></i>
            <div>
                <strong>${stat.number}</strong>
                <span>${stat.label}</span>
            </div>
        </div>
    `).join('');
}

/* ======= VEHICLE TYPES ======= */
function renderVehicleTypes() {
    const container = document.getElementById('vehicle-grid');
    if (!container) return;
    container.innerHTML = VEHICLE_TYPES.map(v => `
        <div class="vehicle-card" data-vehicle="${v.id}">
            <div class="vehicle-img">
                <img src="${v.image}" alt="${v.name}" loading="lazy">
                ${v.priceMultiplier > 1 ? '<span class="vehicle-badge">Phổ biến</span>' : ''}
            </div>
            <div class="vehicle-info">
                <h4><i class="fas ${v.icon}"></i> ${v.name}</h4>
                <p>${v.description}</p>
                <div class="vehicle-meta">
                    <span><i class="fas fa-user-group"></i> ${v.seats} chỗ</span>
                    <span class="vehicle-price">${v.priceMultiplier > 1 ? 'x' + v.priceMultiplier + ' hệ số' : 'Giá chuẩn'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

/* ======= PRICING TABLE ======= */
function renderPricingTable() {
    const container = document.getElementById('pricing-tiers');
    if (!container) return;
    container.innerHTML = PRICING_TIERS.map((tier, i) => `
        <div class="pricing-tier ${i === 0 ? 'active' : ''}">
            <div class="tier-range">${tier.label}</div>
            <div class="tier-price">${new Intl.NumberFormat('vi-VN').format(tier.pricePerKm)}<small>₫/km</small></div>
        </div>
    `).join('');
}

/* ======= POPULAR ROUTES ======= */
function renderPopularRoutes(routes) {
    const container = document.getElementById('routes-grid');
    if (!container) return;
    const data = routes || POPULAR_ROUTES;
    container.innerHTML = data.map(route => {
        const price = getRoutePrice(route);
        return `
            <div class="route-card" data-distance="${route.distance}" onclick="fillRoute('${route.from}', '${route.to}', ${route.distance})">
                <div class="route-icon"><i class="fas ${route.icon}"></i></div>
                <div class="route-info">
                    <h4>${route.from} → ${route.to}</h4>
                    <span>${route.distance} km</span>
                </div>
                <div class="route-price">${formatVNDShort(price)}</div>
            </div>
        `;
    }).join('');
}

/* ======= STEPS ======= */
function renderSteps() {
    const container = document.getElementById('steps-grid');
    if (!container) return;
    container.innerHTML = STEPS.map(step => `
        <div class="step-card">
            <div class="step-number">${step.number}</div>
            <div class="step-icon"><i class="fas ${step.icon}"></i></div>
            <h4>${step.title}</h4>
            <p>${step.description}</p>
        </div>
    `).join('');
}

/* ======= BOOKING FORM ======= */
function initBookingForm() {
    const form = document.getElementById('booking-form');
    if (!form) return;

    // Populate vehicle select from config
    const vehicleSelect = document.getElementById('vehicle-select');
    if (vehicleSelect) {
        vehicleSelect.innerHTML = VEHICLE_TYPES.map(v =>
            `<option value="${v.id}">${v.name} (${v.seats} chỗ)</option>`
        ).join('');
    }

    // Distance input live calculation
    const distanceInput = document.getElementById('distance-input');
    const priceDisplay = document.getElementById('price-estimate');

    if (distanceInput && priceDisplay) {
        const updateEstimate = () => {
            const km = parseInt(distanceInput.value) || 0;
            const vehicleId = vehicleSelect ? vehicleSelect.value : 'sedan-4';
            if (km > 0) {
                const fare = calculateFare(km, vehicleId);
                priceDisplay.innerHTML = `<span class="estimate-label">Ước tính:</span> <span class="estimate-value">${formatVND(fare.total)}</span>`;
                priceDisplay.classList.add('visible');
            } else {
                priceDisplay.classList.remove('visible');
            }
        };
        distanceInput.addEventListener('input', updateEstimate);
        if (vehicleSelect) vehicleSelect.addEventListener('change', updateEstimate);
    }

    // Form submit → Supabase
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Tính giá ước tính
        const km = parseInt(data.distance_km) || 0;
        if (km > 0) {
            data.estimated_fare = calculateFare(km, data.vehicle_type).total;
        }

        // Gửi lên Supabase + auto-match tài xế
        const result = await submitBookingWithMatch(data);
        if (result.error) {
            console.error('Booking error:', result.error);
            showNotification('Yêu cầu đặt xe đã được ghi nhận!');
        } else {
            if (result.match?.success) {
                showNotification(`Đặt xe thành công! Tài xế ${result.match.driver_name} (${result.match.driver_vehicle}) sẽ liên hệ bạn.`);
            } else {
                showNotification('Đặt xe thành công! Hệ thống đang tìm tài xế phù hợp.');
            }
            form.reset();
            document.getElementById('price-estimate')?.classList.remove('visible');
        }
        console.log('Booking data:', data);
    });
}

/* ======= PRICING CALCULATOR (interactive section) ======= */
function initPricingCalculator() {
    const slider = document.getElementById('calc-distance');
    const totalEl = document.getElementById('calc-total');
    const vehicleBtns = document.querySelectorAll('.calc-vehicle-btn');

    if (!slider || !totalEl) return;

    let selectedVehicle = 'sedan-4';

    vehicleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            vehicleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedVehicle = btn.dataset.vehicle;
            updateCalc();
        });
    });

    function updateCalc() {
        const km = parseInt(slider.value);
        const fare = calculateFare(km, selectedVehicle);
        const tier = getCurrentTier(km);

        document.getElementById('calc-km-display').textContent = km + ' km';
        document.getElementById('calc-total').textContent = formatVND(fare.total);
        document.getElementById('calc-rate').textContent = new Intl.NumberFormat('vi-VN').format(tier.pricePerKm) + ' ₫/km';

        // Update breakdown
        const breakdownEl = document.getElementById('calc-breakdown');
        if (breakdownEl) {
            breakdownEl.innerHTML = fare.breakdown.map(b => `
                <div class="breakdown-row">
                    <span>${b.label}</span>
                    <span>${b.km} km × ${new Intl.NumberFormat('vi-VN').format(b.pricePerKm)}₫</span>
                    <span class="breakdown-subtotal">${formatVND(b.subtotal)}</span>
                </div>
            `).join('');
            if (fare.multiplier > 1) {
                breakdownEl.innerHTML += `
                    <div class="breakdown-row multiplier">
                        <span>Hệ số xe ${fare.vehicleType}</span>
                        <span>× ${fare.multiplier}</span>
                        <span></span>
                    </div>
                `;
            }
        }
    }

    slider.addEventListener('input', updateCalc);
    updateCalc();
}

/* ======= UTILITIES ======= */
function fillRoute(from, to, distance) {
    const pickupInput = document.querySelector('input[name="pickup"]');
    const dropoffInput = document.querySelector('input[name="dropoff"]');
    const distanceInput = document.getElementById('distance-input');

    if (pickupInput) pickupInput.value = from;
    if (dropoffInput) dropoffInput.value = to;
    if (distanceInput) {
        distanceInput.value = distance;
        distanceInput.dispatchEvent(new Event('input'));
    }

    // Scroll to booking form
    document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
}

function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}
