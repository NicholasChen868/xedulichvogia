/**
 * ============================================
 * MAIN APPLICATION
 * ============================================
 * Renders UI from config + Supabase data.
 * Falls back to config.js if DB unavailable.
 */

/** SECURITY: Escape HTML to prevent XSS when interpolating user/DB data */
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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

async function checkAdminAuth() {
    const avatarBtn = document.getElementById('user-avatar-btn');
    const loggedOut = document.getElementById('dropdown-logged-out');
    const loggedIn = document.getElementById('dropdown-logged-in');
    const nameEl = document.querySelector('.user-dropdown-name');
    const roleEl = document.querySelector('.user-dropdown-role');

    if (!avatarBtn) return;

    // Kiểm tra Supabase Auth session — KHÔNG dùng localStorage fallback
    let isAdmin = false;
    try {
        if (typeof checkAdminSession === 'function') {
            const { session } = await checkAdminSession();
            isAdmin = !!session;
        }
    } catch (e) {
        console.warn('Admin session check failed');
    }

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

async function doAdminLogout() {
    if (typeof signOutAdmin === 'function') {
        await signOutAdmin();
    }
    await checkAdminAuth();
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

    // Distance and Pricing API logic
    const distanceInput = document.getElementById('distance-input');
    const priceDisplay = document.getElementById('price-estimate');
    const dateGoInput = document.getElementById('date-go');

    // Auto calculate distance
    const pickupInput = form.querySelector('[name="pickup"]');
    const dropoffInput = form.querySelector('[name="dropoff"]');
    let distanceDebounceTimeout;

    const triggerDistanceCalc = () => {
        if (distanceDebounceTimeout) clearTimeout(distanceDebounceTimeout);
        distanceDebounceTimeout = setTimeout(async () => {
            const origin = pickupInput?.value?.trim();
            const dest = dropoffInput?.value?.trim();
            if (origin && dest && origin.length > 2 && dest.length > 2) {
                try {
                    const res = await fetch(`${SUPABASE_URL}/functions/v1/calculate-distance`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                        body: JSON.stringify({ origin, destination: dest })
                    });
                    const data = await res.json();
                    if (data.success && data.distance_km) {
                        distanceInput.value = data.distance_km;
                        updateEstimate();
                    }
                } catch (e) { console.error('Lỗi tính khoảng cách:', e); }
            }
        }, 1500); // Wait 1.5s after typing
    };

    if (pickupInput) pickupInput.addEventListener('input', triggerDistanceCalc);
    if (dropoffInput) dropoffInput.addEventListener('input', triggerDistanceCalc);

    // Dynamic pricing calculation
    let pricingDebounceTimeout;
    const updateEstimate = () => {
        if (!distanceInput || !priceDisplay) return;
        if (pricingDebounceTimeout) clearTimeout(pricingDebounceTimeout);

        pricingDebounceTimeout = setTimeout(async () => {
            const km = parseInt(distanceInput.value) || 0;
            const vehicleId = vehicleSelect ? vehicleSelect.value : 'sedan-4';
            const dateGo = dateGoInput && dateGoInput.value ? dateGoInput.value : new Date().toISOString();

            if (km > 0) {
                priceDisplay.innerHTML = `<span class="estimate-label">Đang tính giá... <i class="fas fa-spinner fa-spin"></i></span>`;
                priceDisplay.classList.add('visible');

                try {
                    const res = await fetch(`${SUPABASE_URL}/functions/v1/pricing-engine`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                        body: JSON.stringify({ distance_km: km, vehicle_type: vehicleId, pickup_time: dateGo })
                    });
                    const data = await res.json();

                    if (data.success && data.final_fare) {
                        priceDisplay.innerHTML = `
                            <span class="estimate-label">Ước tính:</span> 
                            <span class="estimate-value">${formatVND(data.final_fare)}</span>
                            <div style="font-size:0.8rem;color:rgba(255,255,255,0.7);margin-top:6px;line-height:1.4"><i class="fas fa-info-circle"></i> ${data.note || 'Giá cước cơ bản'}</div>`;
                    } else {
                        // Fallback local calculation
                        const fare = calculateFare(km, vehicleId);
                        priceDisplay.innerHTML = `<span class="estimate-label">Ước tính:</span> <span class="estimate-value">${formatVND(fare.total)}</span>`;
                    }
                } catch (e) {
                    console.error('Pricing error:', e);
                    const fare = calculateFare(km, vehicleId);
                    priceDisplay.innerHTML = `<span class="estimate-label">Ước tính:</span> <span class="estimate-value">${formatVND(fare.total)}</span>`;
                }
            } else {
                priceDisplay.classList.remove('visible');
            }
        }, 800);
    };

    if (distanceInput && priceDisplay) {
        distanceInput.addEventListener('input', updateEstimate);
        if (vehicleSelect) vehicleSelect.addEventListener('change', updateEstimate);
        if (dateGoInput) dateGoInput.addEventListener('change', updateEstimate);
    }

    // Set min date = today
    if (dateGoInput) {
        dateGoInput.min = new Date().toISOString().split('T')[0];
    }

    // Form submit → Supabase + Validation
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate CAPTCHA if Turnstile is active
        if (typeof turnstile !== 'undefined' && typeof TURNSTILE_SITE_KEY !== 'undefined' && TURNSTILE_SITE_KEY && !TURNSTILE_SITE_KEY.includes('REPLACE')) {
            const captchaEl = document.querySelector('#captcha-booking');
            const token = captchaEl ? turnstile.getResponse(captchaEl) : null;
            if (!token) {
                showNotification('Vui lòng xác minh CAPTCHA trước khi đặt xe', 'error');
                return;
            }
        }

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
            showNotification(result.error.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
            return;
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
                    <h4>${escapeHtml(match.driver_name)}</h4>
                    <p><i class="fas fa-phone"></i> ${escapeHtml(match.driver_phone)} · <i class="fas fa-car"></i> ${escapeHtml(match.driver_vehicle)}</p>
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
        <div class="modal-subtitle">Cảm ơn ${escapeHtml(bookingData.customer_name || 'Quý khách')}. Đơn của bạn đã được ghi nhận.</div>

        <div class="modal-info-grid">
            <div class="modal-info-item full">
                <div class="mii-label">Tuyến đường</div>
                <div class="mii-value">${escapeHtml(bookingData.pickup || '')} → ${escapeHtml(bookingData.dropoff || '')}</div>
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
                <div class="mii-label">Giá ước tính</div>
                <div class="mii-value" style="color:#ff9800; font-weight:700">${fareText}</div>
            </div>
        </div>

        ${driverHTML}

        ${result.data && result.data[0] ? `
        <div style="margin:20px 0;text-align:center;padding:15px;background:rgba(255,152,0,0.1);border:1px dashed rgba(255,152,0,0.5);border-radius:12px">
            <h4 style="color:#ff9800;margin-bottom:8px"><i class="fas fa-wallet"></i> Đặt cọc 10% giữ chuyến</h4>
            <p style="font-size:0.85rem;color:rgba(255,255,255,0.7);margin-bottom:15px">Cọc ${formatVND((bookingData.estimated_fare || 0) * 0.1)} để đảm bảo có xe ngay (Bắt buộc dịp lễ).</p>
            <div style="display:flex;gap:10px;justify-content:center" id="payment-btns">
                <button class="btn-book" onclick="processPayment('${result.data[0].id}', 'momo')" style="padding:10px;font-size:0.9rem;border-radius:8px"><img src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" style="height:16px;margin-right:5px;vertical-align:middle"> MoMo</button>
                <button class="btn-secondary" onclick="processPayment('${result.data[0].id}', 'vnpay')" style="padding:10px;font-size:0.9rem;border-radius:8px"><i class="fas fa-qrcode"></i> VNPay</button>
            </div>
        </div>` : ''}

        <div class="modal-actions" style="margin-top:20px;">
            <button class="modal-btn-secondary" onclick="closeBookingModal()">Đóng</button>
            <button class="modal-btn-primary" onclick="closeBookingModal(); document.getElementById('lookup-section').scrollIntoView({behavior:'smooth'})">
                <i class="fas fa-search"></i> Theo dõi đơn
            </button>
        </div>`;

    modal.classList.add('show');
}

// Hàm khởi tạo thanh toán
window.processPayment = async function (bookingId, provider) {
    const btns = document.getElementById('payment-btns');
    if (btns) btns.innerHTML = '<span style="color:#ff9800;font-size:0.9rem"><i class="fas fa-spinner fa-spin"></i> Đang tạo mã thanh toán...</span>';
    try {
        const req = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ booking_id: bookingId, provider })
        });
        const res = await req.json();
        if (res.pay_url) {
            window.location.href = res.pay_url;
        } else {
            alert('Không thể tạo Link thanh toán lúc này (Dev fallback).');
        }
    } catch (e) {
        console.error('Payment Error', e);
        alert('Cổng thanh toán tạm thời không khả dụng trên môi trường Dev.');
    }
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
                        <strong>${escapeHtml(b._driver.full_name)}</strong>
                        <small>${escapeHtml(b._driver.license_plate || '')} · ⭐ ${escapeHtml(b._driver.average_rating || '5.0')}</small>
                    </div>
                </div>`;
        }

        let ratingInfo = '';
        if (b.status === 'completed') {
            if (!b.rating) {
                ratingInfo = `<button class="btn-rate-driver" onclick="openRatingModal('${escapeHtml(b.id)}', '${escapeHtml(b.pickup_location)}', '${escapeHtml(b.dropoff_location)}')"><i class="fas fa-star"></i> Đánh giá chuyến đi</button>`;
            } else {
                ratingInfo = `<div class="btn-rated"><i class="fas fa-check-circle"></i> Đã đánh giá ${parseInt(b.rating) || 0} sao</div>`;
            }
        }

        return `
            <div class="booking-result-card">
                <div class="brc-header">
                    <div class="brc-route">${escapeHtml(b.pickup_location || '—')} <i class="fas fa-arrow-right"></i> ${escapeHtml(b.dropoff_location || '—')}</div>
                    <span class="brc-status ${escapeHtml(b.status)}">${escapeHtml(statusLabels[b.status] || b.status)}</span>
                </div>
                <div class="brc-details">
                    <div class="brc-detail">Ngày đặt<span>${time}</span></div>
                    <div class="brc-detail">Loại xe<span>${vehicle}</span></div>
                    <div class="brc-detail">Giá<span>${fare}</span></div>
                </div>
                ${driverInfo}
                ${ratingInfo}
            </div>`;
    }).join('');
}

/* ======= RATING MODAL (INDEX) ======= */
let currentRatingVal = 5;

function openRatingModal(bookingId, pickup, dropoff) {
    document.getElementById('rating-booking-id').value = bookingId;
    document.getElementById('rating-route').innerText = `${pickup} ➝ ${dropoff}`;

    // reset styling
    document.getElementById('rating-review').value = '';
    const stars = document.querySelectorAll('#rating-stars i');

    // Default 5 stars
    setRatingStars(5);

    // Add listeners
    stars.forEach(s => {
        s.onclick = function () {
            setRatingStars(this.getAttribute('data-val'));
        };
    });

    document.getElementById('rating-modal').classList.add('show');
}

function setRatingStars(val) {
    currentRatingVal = parseInt(val);
    const stars = document.querySelectorAll('#rating-stars i');
    stars.forEach(s => {
        const sVal = parseInt(s.getAttribute('data-val'));
        if (sVal <= currentRatingVal) {
            s.className = 'fas fa-star active';
        } else {
            s.className = 'far fa-star';
        }
    });
}

function closeRatingModal() {
    document.getElementById('rating-modal').classList.remove('show');
}

async function submitRating() {
    const bookingId = document.getElementById('rating-booking-id').value;
    const review = document.getElementById('rating-review').value.trim();
    const phone = document.getElementById('lookup-phone').value.replace(/\s/g, '');
    const btn = document.getElementById('btn-submit-rating');

    if (!phone) {
        showNotification('Vui lòng tra cứu đơn trước khi đánh giá');
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
    btn.classList.add('btn-loading');

    // SECURITY: Dùng SECURITY DEFINER function với ownership verification
    const { data, error } = await db.rpc('submit_customer_rating', {
        p_booking_id: bookingId,
        p_customer_phone: phone,
        p_rating: currentRatingVal,
        p_review_text: review
    });

    btn.innerHTML = 'Gửi Đánh Giá';
    btn.classList.remove('btn-loading');

    if (error) {
        showNotification('Lỗi khi gửi đánh giá');
        return;
    }
    if (data && !data.success) {
        showNotification(data.error || 'Không thể gửi đánh giá');
        return;
    }

    showNotification('Cảm ơn bạn đã đánh giá chuyến đi!');
    closeRatingModal();

    // Refresh lookup results to show "Đã đánh giá"
    if (phone) {
        document.getElementById('lookup-form').dispatchEvent(new Event('submit'));
    }
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
    const icon = document.createElement('i');
    icon.className = 'fas fa-check-circle';
    notif.appendChild(icon);
    notif.appendChild(document.createTextNode(' ' + message));
    document.body.appendChild(notif);
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}
