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
    initUserMenu();
}

/* ======= USER AVATAR MENU ======= */
function initUserMenu() {
    checkAdminAuth();
    // Click outside to close
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('user-dropdown');
        const btn = document.getElementById('user-avatar-btn');
        if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function checkAdminAuth() {
    const isAdmin = localStorage.getItem('admin_auth') === 'true';
    const avatarBtn = document.getElementById('user-avatar-btn');
    const loggedOut = document.getElementById('dropdown-logged-out');
    const loggedIn = document.getElementById('dropdown-logged-in');
    const nameEl = document.querySelector('.user-dropdown-name');
    const roleEl = document.querySelector('.user-dropdown-role');

    if (!avatarBtn) return;

    if (isAdmin) {
        avatarBtn.classList.add('logged-in');
        avatarBtn.innerHTML = '<i class="fas fa-user-shield"></i>';
        if (loggedOut) loggedOut.style.display = 'none';
        if (loggedIn) loggedIn.style.display = 'block';
        if (nameEl) nameEl.textContent = 'Admin';
        if (roleEl) roleEl.textContent = 'Quản trị viên';
    } else {
        avatarBtn.classList.remove('logged-in');
        avatarBtn.innerHTML = '<i class="fas fa-user"></i>';
        if (loggedOut) loggedOut.style.display = 'block';
        if (loggedIn) loggedIn.style.display = 'none';
        if (nameEl) nameEl.textContent = 'Đăng nhập';
        if (roleEl) roleEl.textContent = 'Khách';
    }
}

function doAdminLogout() {
    localStorage.removeItem('admin_auth');
    checkAdminAuth();
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.remove('show');
    showNotification('Đã đăng xuất');
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

    // Set min date = today
    const dateGoInput = document.getElementById('date-go');
    if (dateGoInput) {
        dateGoInput.min = new Date().toISOString().split('T')[0];
    }

    // Form submit → Supabase + Validation
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate
        if (!validateBookingForm(form)) return;

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner"></i> Đang xử lý...';
        submitBtn.classList.add('btn-loading');

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Map field names
        data.pickup_location = data.pickup;
        data.dropoff_location = data.dropoff;
        data.customer_phone = data.phone;

        // Tính giá ước tính
        const km = parseInt(data.distance_km) || 0;
        if (km > 0) {
            data.estimated_fare = calculateFare(km, data.vehicle_type).total;
        }

        // Gửi lên Supabase + auto-match tài xế
        const result = await submitBookingWithMatch(data);

        submitBtn.innerHTML = originalHTML;
        submitBtn.classList.remove('btn-loading');

        if (result.error) {
            console.error('Booking error:', result.error);
            showNotification('Đặt xe thành công! Đang tìm tài xế...');
        }

        // Show confirmation modal
        showBookingConfirmation(data, result);
        form.reset();
        document.getElementById('price-estimate')?.classList.remove('visible');
    });

    // Init lookup form
    initLookupForm();
}

/* ======= FORM VALIDATION ======= */
function validateBookingForm(form) {
    let valid = true;
    clearValidation(form);

    const name = form.querySelector('[name="customer_name"]');
    const phone = form.querySelector('[name="phone"]');
    const pickup = form.querySelector('[name="pickup"]');
    const dropoff = form.querySelector('[name="dropoff"]');
    const dateGo = form.querySelector('[name="date_go"]');

    // Tên
    if (name && name.value.trim().length < 2) {
        setInvalid(name, 'Vui lòng nhập họ tên');
        valid = false;
    }

    // SĐT
    if (phone) {
        const phoneVal = phone.value.replace(/\s/g, '');
        if (!/^0\d{9}$/.test(phoneVal)) {
            setInvalid(phone, 'SĐT phải 10 số, bắt đầu bằng 0');
            valid = false;
        }
    }

    // Điểm đón/đến
    if (pickup && pickup.value.trim().length < 2) {
        setInvalid(pickup, 'Vui lòng nhập điểm đón');
        valid = false;
    }
    if (dropoff && dropoff.value.trim().length < 2) {
        setInvalid(dropoff, 'Vui lòng nhập điểm đến');
        valid = false;
    }

    // Ngày đi
    if (dateGo && dateGo.value) {
        const today = new Date().toISOString().split('T')[0];
        if (dateGo.value < today) {
            setInvalid(dateGo, 'Ngày đi không được trong quá khứ');
            valid = false;
        }
    }

    return valid;
}

function setInvalid(input, message) {
    input.classList.add('invalid');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error-msg show';
    errorDiv.textContent = message;
    input.closest('.form-group').appendChild(errorDiv);
}

function clearValidation(form) {
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    form.querySelectorAll('.form-error-msg').forEach(el => el.remove());
}

/* ======= BOOKING CONFIRMATION MODAL ======= */
function showBookingConfirmation(bookingData, result) {
    const modal = document.getElementById('booking-modal');
    const content = document.getElementById('modal-content');
    if (!modal || !content) return;

    const vehicleLabel = bookingData.vehicle_type === 'sedan-4' ? 'Xe 4 chỗ' : bookingData.vehicle_type === 'suv-7' ? 'Xe 7 chỗ' : bookingData.vehicle_type;
    const fareText = bookingData.estimated_fare ? formatVND(bookingData.estimated_fare) : '—';
    const match = result.match;

    let driverHTML = '';
    if (match && match.success) {
        driverHTML = `
            <div class="modal-driver-card">
                <div class="modal-driver-icon"><i class="fas fa-user-check"></i></div>
                <div class="modal-driver-info">
                    <h4>${match.driver_name}</h4>
                    <p><i class="fas fa-phone"></i> ${match.driver_phone} · <i class="fas fa-car"></i> ${match.driver_vehicle}</p>
                </div>
            </div>`;
    } else {
        driverHTML = `
            <div class="modal-waiting">
                <i class="fas fa-clock"></i>
                <span>Đang tìm tài xế phù hợp — chúng tôi sẽ liên hệ bạn sớm nhất</span>
            </div>`;
    }

    content.innerHTML = `
        <div class="modal-success-icon"><i class="fas fa-check"></i></div>
        <div class="modal-title">Đặt Xe Thành Công!</div>
        <div class="modal-subtitle">Cảm ơn ${bookingData.customer_name || 'Quý khách'}. Đơn của bạn đã được ghi nhận.</div>

        <div class="modal-info-grid">
            <div class="modal-info-item full">
                <div class="mii-label">Tuyến đường</div>
                <div class="mii-value">${bookingData.pickup || ''} → ${bookingData.dropoff || ''}</div>
            </div>
            <div class="modal-info-item">
                <div class="mii-label">Ngày đi</div>
                <div class="mii-value">${bookingData.date_go || '—'}</div>
            </div>
            <div class="modal-info-item">
                <div class="mii-label">Loại xe</div>
                <div class="mii-value">${vehicleLabel}</div>
            </div>
            <div class="modal-info-item">
                <div class="mii-label">Khoảng cách</div>
                <div class="mii-value">${bookingData.distance_km || '—'} km</div>
            </div>
            <div class="modal-info-item">
                <div class="mii-label">Giá ước tính</div>
                <div class="mii-value" style="color:#ff9800">${fareText}</div>
            </div>
        </div>

        ${driverHTML}

        <div class="modal-actions">
            <button class="modal-btn-secondary" onclick="closeBookingModal()">Đóng</button>
            <button class="modal-btn-primary" onclick="closeBookingModal(); document.getElementById('lookup-section').scrollIntoView({behavior:'smooth'})">
                <i class="fas fa-search"></i> Tra cứu đơn
            </button>
        </div>`;

    modal.classList.add('show');
}

function closeBookingModal() {
    document.getElementById('booking-modal')?.classList.remove('show');
}

/* ======= TRA CỨU ĐƠN ======= */
function initLookupForm() {
    const form = document.getElementById('lookup-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('lookup-phone').value.replace(/\s/g, '');

        if (!/^0\d{9}$/.test(phone)) {
            showNotification('Vui lòng nhập SĐT hợp lệ (10 số)');
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tìm...';
        btn.classList.add('btn-loading');

        const result = await lookupBookingsByPhone(phone);

        btn.innerHTML = '<i class="fas fa-search"></i> Tra cứu';
        btn.classList.remove('btn-loading');

        renderLookupResults(result.data);
    });
}

function renderLookupResults(bookings) {
    const container = document.getElementById('lookup-results');
    if (!container) return;

    if (!bookings || bookings.length === 0) {
        container.innerHTML = `
            <div class="lookup-empty">
                <i class="fas fa-inbox"></i>
                Không tìm thấy đơn nào với SĐT này
            </div>`;
        return;
    }

    container.innerHTML = bookings.map(b => {
        const statusLabels = { pending: 'Chờ tài xế', matched: 'Đã ghép', confirmed: 'Đã nhận', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
        const time = b.created_at ? new Date(b.created_at).toLocaleDateString('vi-VN') : '—';
        const fare = b.estimated_fare ? formatVND(b.estimated_fare) : '—';
        const vehicle = b.vehicle_type === 'sedan-4' ? '4 chỗ' : b.vehicle_type === 'suv-7' ? '7 chỗ' : (b.vehicle_type || '—');

        let driverInfo = '';
        if (b._driver) {
            driverInfo = `
                <div class="brc-driver">
                    <div class="brc-driver-avatar"><i class="fas fa-user"></i></div>
                    <div class="brc-driver-info">
                        <strong>${b._driver.full_name}</strong>
                        <small>${b._driver.license_plate || ''} · ⭐ ${b._driver.rating || '5.0'}</small>
                    </div>
                </div>`;
        }

        return `
            <div class="booking-result-card">
                <div class="brc-header">
                    <div class="brc-route">${b.pickup_location || '—'} <i class="fas fa-arrow-right"></i> ${b.dropoff_location || '—'}</div>
                    <span class="brc-status ${b.status}">${statusLabels[b.status] || b.status}</span>
                </div>
                <div class="brc-details">
                    <div class="brc-detail">Ngày đặt<span>${time}</span></div>
                    <div class="brc-detail">Loại xe<span>${vehicle}</span></div>
                    <div class="brc-detail">Giá<span>${fare}</span></div>
                </div>
                ${driverInfo}
            </div>`;
    }).join('');
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
        const km = parseInt(slider.value) || 0;
        const fare = calculateFare(km, selectedVehicle);

        totalEl.textContent = formatVND(fare.total);

        // Update km display
        const kmValueEl = document.getElementById('calc-km-value');
        if (kmValueEl) kmValueEl.textContent = km + ' km';

        // Update rate
        const rateEl = document.getElementById('calc-rate-value');
        if (rateEl) rateEl.textContent = formatVND(fare.ratePerKm) + '/km';

        // Breakdown
        const breakdownEl = document.getElementById('calc-breakdown');
        if (breakdownEl) {
            const multiplierLabel = fare.multiplier !== 1 ? `<div class="breakdown-row multiplier"><span>Hệ số loại xe</span><span>×${fare.multiplier}</span></div>` : '';
            breakdownEl.innerHTML = `
                <div class="breakdown-row"><span>Khoảng cách</span><span>${km} km</span></div>
                <div class="breakdown-row"><span>Đơn giá</span><span class="breakdown-subtotal">${formatVND(fare.ratePerKm)}/km</span></div>
                ${multiplierLabel}
                <div class="breakdown-row"><span>Giá cơ bản</span><span class="breakdown-subtotal">${formatVND(fare.baseFare)}</span></div>
            `;
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
