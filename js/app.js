// GILDED HAMMER Customer Portal - Client Side Application Engine & Interactive Simulators
// Offline-friendly Vanilla JS routing and real-time state mechanics.

// --- Global SPA Router ---
const appRouter = {
  activeView: null,
  activeParams: null,

  init() {
    // Read route from URL hash if present, default to login
    window.addEventListener("hashchange", () => this.handleHashChange());
    this.handleHashChange();
  },

  navigate(viewId, params = null) {
    window.location.hash = `#/${viewId}` + (params ? `/${params}` : "");
  },

  handleHashChange() {
    const hash = window.location.hash || "#/login";
    const parts = hash.replace("#/", "").split("/");
    const viewId = parts[0];
    const params = parts[1] || null;

    // Check auth guards: guests can browse homepage, search, rooms list, and detail page
    const guestViews = ["login", "homepage", "search", "rooms", "detail"];
    if (!guestViews.includes(viewId) && !CustomerDB.state.currentUser) {
      this.navigate("login");
      return;
    }

    this.activeView = viewId;
    this.activeParams = params;

    this.renderView();
  },

  renderView() {
    // Hide all views first
    document.querySelectorAll(".view-container").forEach(el => {
      el.classList.remove("active");
    });

    // Deactivate all nav links
    document.querySelectorAll(".nav-link").forEach(el => {
      el.classList.remove("active");
    });

    // Show/hide sticky header based on login status
    const header = document.getElementById("app-header");
    if (this.activeView === "login") {
      header.style.display = "none";
    } else {
      header.style.display = "block";
      
      // Update nav link active state
      const matchingLink = document.querySelector(`.nav-link[data-route="${this.activeView}"]`);
      if (matchingLink) matchingLink.classList.add("active");
      
      // Update User widget
      updateHeaderUserWidget();
    }

    // Show selected view container
    const activeEl = document.getElementById(`${this.activeView}-view`);
    if (activeEl) {
      activeEl.classList.add("active");
      
      // Run specific controller hooks
      if (this.activeView === "homepage") {
        initHomepageView();
      } else if (this.activeView === "search") {
        initSearchView();
      } else if (this.activeView === "rooms") {
        initRoomsListView();
      } else if (this.activeView === "profile") {
        initProfileView(this.activeParams || "kyc");
      } else if (this.activeView === "bidding") {
        initBiddingRoomView(this.activeParams);
      } else if (this.activeView === "detail") {
        initDetailAssetView(this.activeParams);
      } else if (this.activeView === "login") {
        initLoginView(this.activeParams);
      }
    }
    
    // Scroll window back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// --- Toast Alerts Notification Helper ---
function showToast(title, message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-alert`;
  
  let icon = "✓";
  let iconClass = "toast-icon-success";
  if (type === "warning") {
    icon = "⚠️";
    iconClass = "toast-icon-warning";
  } else if (type === "error" || type === "danger") {
    icon = "❌";
    iconClass = "toast-icon-error";
  }

  toast.innerHTML = `
    <div class="toast-icon ${iconClass}">${icon}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  // Automatically fade out and remove after 4.5s
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

// --- Clipboard Copy Helper ---
function copyText(elementId) {
  const text = document.getElementById(elementId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Đã sao chép 📋", `Nội dung "${text}" đã được sao chép vào bộ nhớ tạm.`);
  });
}

// --- Header Session Updater ---
function updateHeaderUserWidget() {
  const user = CustomerDB.state.currentUser;
  const guestActions = document.getElementById("header-guest-actions");
  const userActions = document.getElementById("header-user-actions");

  if (!user) {
    if (guestActions) guestActions.style.display = "flex";
    if (userActions) userActions.style.display = "none";
    return;
  }

  if (guestActions) guestActions.style.display = "none";
  if (userActions) userActions.style.display = "flex";

  const usernameEl = document.getElementById("header-username");
  const avatarEl = document.getElementById("header-avatar");
  const badgeEl = document.getElementById("header-kyc-badge");

  if (usernameEl) usernameEl.innerText = user.fullName;
  if (avatarEl) avatarEl.innerText = user.fullName[0];

  if (badgeEl) {
    if (user.kycStatus === "APPROVED_VNeID") {
      badgeEl.innerText = "✓ VNeID Định Danh";
      badgeEl.style.color = "var(--tertiary)";
    } else if (user.kycStatus === "APPROVED_CCCD") {
      badgeEl.innerText = "✓ CCCD Đã Duyệt";
      badgeEl.style.color = "var(--primary)";
    } else {
      badgeEl.innerText = "Chưa Định Danh ⚠️";
      badgeEl.style.color = "var(--secondary)";
    }
  }
}

// --- Screen I: Login & Tab Toggle Logic ---
let activeLoginTab = "individual";

function switchLoginTab(tabType) {
  activeLoginTab = tabType;
  const tabInd = document.getElementById("tab-ind");
  const tabCorp = document.getElementById("tab-corp");
  const userInputLabel = document.getElementById("label-login-user");
  const userInput = document.getElementById("login-input-phone");

  if (tabType === "individual") {
    tabInd.classList.add("active");
    tabCorp.classList.remove("active");
    userInputLabel.innerText = "Số điện thoại hoặc Email";
    userInput.value = "0367266064";
    userInput.placeholder = "Nhập số điện thoại (VD: 0367266064)...";
  } else {
    tabInd.classList.remove("active");
    tabCorp.classList.add("active");
    userInputLabel.innerText = "Mã số thuế Doanh nghiệp";
    userInput.value = "0110004356";
    userInput.placeholder = "Nhập mã số thuế (VD: 0110004356)...";
  }
}

let otpInterval = null;
function triggerSMSVerification() {
  const phone = document.getElementById("login-input-phone").value;
  document.getElementById("otp-phone-display").innerText = phone;
  
  // Clear any existing digits
  document.querySelectorAll(".otp-digit").forEach(el => el.value = "");
  
  // Display OTP Modal
  openModal("modal-otp");
  
  // Tick countdown timer
  let seconds = 59;
  const label = document.getElementById("otp-countdown-label");
  label.innerText = `Gửi lại mã (${seconds}s)`;
  label.style.pointerEvents = "none";
  label.style.color = "var(--on-surface-variant)";
  
  if (otpInterval) clearInterval(otpInterval);
  otpInterval = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(otpInterval);
      label.innerText = "Gửi lại mã kích hoạt";
      label.style.pointerEvents = "auto";
      label.style.color = "var(--primary)";
    } else {
      label.innerText = `Gửi lại mã (${seconds}s)`;
    }
  }, 1000);
}

function moveOtpFocus(input, digitIndex) {
  if (input.value.length === 1 && digitIndex < 6) {
    document.getElementById(`otp-${digitIndex + 1}`).focus();
  }
  // Auto login if all 6 digits are typed
  if (digitIndex === 6 && input.value.length === 1) {
    verifySMSCode();
  }
}

function verifySMSCode() {
  const d1 = document.getElementById("otp-1").value;
  const d2 = document.getElementById("otp-2").value;
  const d3 = document.getElementById("otp-3").value;
  const d4 = document.getElementById("otp-4").value;
  const d5 = document.getElementById("otp-5").value;
  const d6 = document.getElementById("otp-6").value;
  
  const otp = `${d1}${d2}${d3}${d4}${d5}${d6}`;
  
  if (otp === "123456" || otp === "") { // allow empty or 123456 for easy demo pass
    clearInterval(otpInterval);
    closeModal("modal-otp");
    
    // Execute store session login
    const username = document.getElementById("login-input-phone").value;
    CustomerDB.login(username);
    
    showToast("Đăng nhập thành công! 🔓", "Chào mừng bạn trở lại Cổng Đấu Giá.");
    appRouter.navigate("homepage");
  } else {
    showToast("Lỗi OTP ❌", "Mã xác thực SMS OTP không đúng, vui lòng gõ mã 123456 để thử nghiệm nhanh.", "danger");
  }
}

function simulateVNeIDInstantLogin() {
  showToast("VNeID Connection 🔗", "Đang kết nối cổng dân cư quốc gia Bộ Công An...", "warning");
  setTimeout(() => {
    CustomerDB.login("0367266064");
    CustomerDB.updateKYCVNeID(); // Instantly verify via VNeID
    showToast("Xác thực VNeID thành công! 🛡️", "Chào mừng Nguyễn Văn A đăng nhập chính chủ.");
    appRouter.navigate("homepage");
  }, 1200);
}

function handleLogout() {
  CustomerDB.logout();
  showToast("Đã đăng xuất 🚪", "Phiên làm việc của bạn đã được kết thúc an toàn.");
  appRouter.navigate("login");
}

// --- Registration View & Controllers ---
function initLoginView(params) {
  if (params === "register") {
    showRegisterForm();
  } else {
    showLoginForm();
  }
}

function showRegisterForm() {
  const loginFormPanel = document.getElementById("login-container");
  const registerFormPanel = document.getElementById("register-container");

  if (loginFormPanel) loginFormPanel.style.display = "none";
  if (registerFormPanel) registerFormPanel.style.display = "block";
  
  // Set tab to individual by default
  switchRegisterTab("individual");
}

function showLoginForm() {
  const loginFormPanel = document.getElementById("login-container");
  const registerFormPanel = document.getElementById("register-container");

  if (loginFormPanel) loginFormPanel.style.display = "block";
  if (registerFormPanel) registerFormPanel.style.display = "none";
}

let activeRegisterTab = "individual";

function switchRegisterTab(tabType) {
  activeRegisterTab = tabType;
  const tabInd = document.getElementById("reg-tab-ind");
  const tabCorp = document.getElementById("reg-tab-corp");
  const title = document.getElementById("register-title");
  const userLabel = document.getElementById("label-register-user");
  const userInput = document.getElementById("register-user");

  if (tabType === "individual") {
    if (tabInd) tabInd.classList.add("active");
    if (tabCorp) tabCorp.classList.remove("active");
    if (title) title.innerText = "ĐĂNG KÝ TÀI KHOẢN CÁ NHÂN";
    if (userLabel) userLabel.innerText = "Số điện thoại hoặc Email";
    if (userInput) userInput.placeholder = "Nhập số điện thoại hoặc email...";
  } else {
    if (tabInd) tabInd.classList.remove("active");
    if (tabCorp) tabCorp.classList.add("active");
    if (title) title.innerText = "ĐĂNG KÝ TÀI KHOẢN DOANH NGHIỆP";
    if (userLabel) userLabel.innerText = "Mã số thuế Doanh nghiệp";
    if (userInput) userInput.placeholder = "Nhập mã số thuế doanh nghiệp...";
  }
}

function handleRegisterSubmit() {
  const name = document.getElementById("register-name").value;
  const username = document.getElementById("register-user").value;
  const pass = document.getElementById("register-pass").value;
  const passConfirm = document.getElementById("register-pass-confirm").value;

  if (pass !== passConfirm) {
    showToast("Mật khẩu không khớp ⚠️", "Mật khẩu xác nhận phải trùng với mật khẩu đã nhập.", "danger");
    return;
  }

  showToast("Đang tạo tài khoản... ⏳", "Vui lòng đợi trong giây lát...", "warning");

  setTimeout(() => {
    CustomerDB.login(username);
    // Set the custom name
    if (CustomerDB.state.currentUser) {
      CustomerDB.state.currentUser.fullName = name;
      CustomerDB.save();
    }
    updateHeaderUserWidget();
    showToast("Đăng ký thành công! 🎉", `Chào mừng thành viên ${name} tham gia cổng ONBI AUCTION.`);
    appRouter.navigate("homepage");
  }, 1200);
}

function togglePassVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
  } else {
    input.type = "password";
  }
}

function simulateGoogleLogin() {
  showToast("Google Authentication 🌐", "Đang kết nối tài khoản Google của bạn...", "warning");
  setTimeout(() => {
    CustomerDB.login("user.google@gmail.com");
    if (CustomerDB.state.currentUser) {
      CustomerDB.state.currentUser.fullName = "Google User";
      CustomerDB.save();
    }
    updateHeaderUserWidget();
    showToast("Liên kết Google thành công! 🔓", "Đăng nhập chính chủ Google thành công.");
    appRouter.navigate("homepage");
  }, 1200);
}

// --- Screen II: Homepage Core Render ---
let homepageTimers = [];

function initHomepageView() {
  // Clear any existing active grid timers
  homepageTimers.forEach(t => clearInterval(t));
  homepageTimers = [];

  // Render Categories Circles - Screen II.a
  const catsBox = document.getElementById("home-categories-list");
  catsBox.innerHTML = CustomerDB.state.categories.map(cat => `
    <div class="category-circle-card" onclick="handleCategoryCardClick('${cat.slug}')">
      <div class="category-icon">${cat.icon}</div>
      <div class="category-name">${cat.name}</div>
      <div class="category-count">${cat.count} tài sản đấu giá</div>
    </div>
  `).join('');

  // Render Active / LIVE auctions grid - Screen II.b
  const liveBox = document.getElementById("home-live-assets");
  const liveAssets = CustomerDB.state.assets.filter(a => a.status === "LIVE");
  renderAssetGrid(liveAssets, liveBox, true);

  // Render Upcoming grid
  const upcomingBox = document.getElementById("home-upcoming-assets");
  const upcomingAssets = CustomerDB.state.assets.filter(a => a.status === "UPCOMING");
  renderAssetGrid(upcomingAssets, upcomingBox, false);
}

function renderAssetGrid(assetsList, containerEl, isLive = true) {
  if (assetsList.length === 0) {
    containerEl.innerHTML = `<div style="grid-column: 1/-1; padding: 32px; text-align: center; color: var(--on-surface-variant)">Hiện chưa có tài sản nào trong danh mục này.</div>`;
    return;
  }

  containerEl.innerHTML = assetsList.map(asset => {
    const isRegistered = CustomerDB.state.registeredAuctions.some(r => r.assetId === asset.id);
    const depositDetails = CustomerDB.state.registeredAuctions.find(r => r.assetId === asset.id);
    const isCoked = depositDetails ? depositDetails.depositPaid : false;
    
    let btnText = "Đăng ký tham gia";
    let btnClass = "btn-primary";
    let btnClick = `handleAssetRegistration('${asset.id}')`;
    
    if (isRegistered) {
      if (isCoked) {
        btnText = isLive ? "VÀO PHÒNG ĐẤU GIÁ LIVE" : "ĐÃ NỘP CỌC (ĐỢI MỞ)";
        btnClass = isLive ? "btn-primary" : "btn-glass";
        btnClick = isLive ? `appRouter.navigate('bidding', '${asset.id}')` : `appRouter.navigate('profile', 'cart')`;
      } else {
        btnText = "NỘP TIỀN ĐẶT TRƯỚC";
        btnClass = "btn-secondary";
        btnClick = `appRouter.navigate('profile', 'cart')`;
      }
    }

    const priceLabel = isLive ? "Giá cao nhất trả" : "Giá khởi điểm";
    const priceVal = isLive && asset.currentBid > 0 ? asset.currentBid : asset.startPrice;

    return `
      <div class="glass-panel asset-card" onclick="handleBiddingDropdownClick('${asset.id}')">
        <div class="asset-thumb-wrapper">
          <img class="asset-thumb" src="${asset.image}" alt="${asset.name}">
          <span class="badge ${isLive ? 'badge-live' : 'badge-upcoming'} asset-badge-floating">${isLive ? 'ĐANG ĐẤU' : 'SẮP MỞ'}</span>
        </div>
        <div class="asset-body">
          <div class="asset-title">${asset.name}</div>
          
          <div style="margin: var(--spacing-sm) 0;">
            <div class="asset-info-row">
              <span class="asset-info-label">${priceLabel}</span>
              <span class="asset-price-major">${(priceVal / 1000000000).toFixed(2)} Tỷ VNĐ</span>
            </div>
            <div class="asset-info-row">
              <span class="asset-info-label">Tiền đặt trước (Cọc)</span>
              <span class="asset-info-val">${(asset.depositAmount / 1000000).toFixed(0)} Triệu VNĐ</span>
            </div>
          </div>

          <div class="asset-timer-row ${isLive ? '' : 'asset-timer-upcoming'}" id="timer-card-${asset.id}">
            <span class="timer-label">${isLive ? 'Còn lại:' : 'Mở thầu:'}</span>
            <span class="timer-countdown" id="timer-digits-${asset.id}">--d : --h : --m : --s</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Bootstrap real time ticking clock intervals for card listing
  assetsList.forEach(asset => {
    const digitsEl = document.getElementById(`timer-digits-${asset.id}`);
    if (!digitsEl) return;

    let targetTime = new Date(isLive ? asset.endTime : asset.startTime).getTime();
    
    const updateTick = () => {
      let now = new Date().getTime();
      let diff = targetTime - now;

      if (diff <= 0) {
        digitsEl.innerText = "00d : 00h : 00m : 00s";
        return;
      }

      let days = Math.floor(diff / (1000 * 60 * 60 * 24));
      let hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      let seconds = Math.floor((diff % (1000 * 60)) / 1000);

      digitsEl.innerText = `${days.toString().padStart(2, '0')}d : ${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`;
    };

    updateTick();
    const interval = setInterval(updateTick, 1000);
    homepageTimers.push(interval);
  });
}

function handleAssetRegistration(assetId) {
  if (!CustomerDB.state.currentUser) {
    showToast("Yêu cầu đăng nhập 🔑", "Vui lòng đăng nhập hệ thống để thực hiện đăng ký tham gia đấu giá.", "warning");
    appRouter.navigate("login");
    return;
  }

  const asset = CustomerDB.state.assets.find(a => a.id === assetId);
  if (!asset) return;

  const success = CustomerDB.registerForAuction(assetId);
  if (success) {
    showToast("Đăng ký thành công! 🛒", `Đã lưu "${asset.name}" vào danh sách đăng ký. Vui lòng nộp cọc để nhận quyền trả thầu.`);
    if (appRouter.activeView !== "bidding") {
      appRouter.navigate("profile", "cart");
    }
  } else {
    showToast("Thông báo", "Tài sản này đã được đăng ký từ trước.", "warning");
  }
}

function handleCategoryDropdownClick(categorySlug) {
  handleCategoryCardClick(categorySlug);
}

function handleBiddingDropdownClick(assetId) {
  if (!CustomerDB.state.currentUser) {
    showToast("Yêu cầu đăng nhập 🔑", "Vui lòng đăng nhập hệ thống để xem chi tiết tài sản đấu giá.", "warning");
    appRouter.navigate("login");
    return;
  }

  // Navigate to detailed asset view
  appRouter.navigate("detail", assetId);
}

function handleCategoryCardClick(categorySlug) {
  // Navigate to search page and filter by this category
  appRouter.navigate("search");
  setTimeout(() => {
    // Uncheck all except this one
    document.querySelectorAll("input[name='category']").forEach(cb => {
      cb.checked = (cb.value === categorySlug);
    });
    handleFilterChange();
  }, 100);
}

function handleQuickTagClick(categorySlug) {
  handleCategoryCardClick(categorySlug);
}

function handleHomeSearch() {
  const query = document.getElementById("home-search-input").value;
  appRouter.navigate("search");
  setTimeout(() => {
    const searchBar = document.getElementById("home-search-input");
    // Pass keyword and execute
    showToast("Đang tìm kiếm 🔍", `Tìm nhanh các tài sản liên quan tới "${query}"`);
    handleFilterChange(query);
  }, 100);
}

// --- Screen III: Search & Filter Grid ---
function initSearchView() {
  // Populate category checkboxes in sidebar - Screen III
  const filterCatBox = document.getElementById("filter-categories-container");
  filterCatBox.innerHTML = CustomerDB.state.categories.map(cat => `
    <label class="filter-checkbox-label">
      <input type="checkbox" name="category" value="${cat.slug}" onchange="handleFilterChange()">
      ${cat.name} (${cat.count})
    </label>
  `).join('');

  // Perform initial render
  handleFilterChange();
}

function handleFilterChange(keywordQuery = null) {
  const searchGrid = document.getElementById("search-assets-grid");
  if (!searchGrid) return;

  // Gather filters
  const selectedCats = Array.from(document.querySelectorAll("input[name='category']:checked")).map(cb => cb.value);
  const selectedStatuses = Array.from(document.querySelectorAll("input[name='status']:checked")).map(cb => cb.value);
  
  const minPrice = parseFloat(document.getElementById("price-min").value) * 1000000000 || 0;
  const maxPrice = parseFloat(document.getElementById("price-max").value) * 1000000000 || Infinity;

  // Filter local database
  let filtered = CustomerDB.state.assets.filter(asset => {
    // Category check
    if (selectedCats.length > 0 && !selectedCats.includes(asset.category)) return false;
    
    // Status check
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(asset.status)) return false;
    
    // Price check
    const currentPrice = asset.currentBid > 0 ? asset.currentBid : asset.startPrice;
    if (currentPrice < minPrice || currentPrice > maxPrice) return false;
    
    // Keyword search filter
    if (keywordQuery) {
      const match = asset.name.toLowerCase().includes(keywordQuery.toLowerCase()) || 
                    asset.description.toLowerCase().includes(keywordQuery.toLowerCase());
      if (!match) return false;
    }

    return true;
  });

  // Apply sorting selector - Screen III
  const sorting = document.getElementById("results-sorting").value;
  if (sorting === "price-asc") {
    filtered.sort((a, b) => (a.currentBid || a.startPrice) - (b.currentBid || b.startPrice));
  } else if (sorting === "price-desc") {
    filtered.sort((a, b) => (b.currentBid || b.startPrice) - (a.currentBid || a.startPrice));
  } else if (sorting === "bids-desc") {
    filtered.sort((a, b) => b.bidCount - a.bidCount);
  }

  // Update results counter
  document.getElementById("results-counter").innerText = `Tìm thấy ${filtered.length} tài sản phù hợp`;

  // Render Grid
  renderAssetGrid(filtered, searchGrid, true);
}

function resetAllFilters() {
  document.querySelectorAll("input[name='category']").forEach(cb => cb.checked = false);
  document.querySelectorAll("input[name='status']").forEach(cb => cb.checked = true);
  document.getElementById("price-min").value = 0;
  document.getElementById("price-max").value = 10;
  handleFilterChange();
  showToast("Bộ lọc đã xoá", "Hiển thị lại danh sách tài sản đầy đủ.");
}

// --- Screen IV: Profile sections & eKYC / Banking / Signing ---
let currentProfileSec = "kyc";

function initProfileView(sectionId) {
  currentProfileSec = sectionId;

  // Highlight menu item
  document.querySelectorAll(".profile-menu-item").forEach(el => {
    el.classList.remove("active");
  });
  const matchingMenu = document.getElementById(`menu-${sectionId}`);
  if (matchingMenu) matchingMenu.classList.add("active");

  // Show selected profile div panel
  document.querySelectorAll(".profile-section-wrapper").forEach(el => {
    el.style.display = "none";
  });
  document.getElementById(`profile-sec-${sectionId}`).style.display = "flex";

  // Trigger sub-renderers
  if (sectionId === "kyc") {
    renderKycSection();
  } else if (sectionId === "cart") {
    renderCartSection();
  } else if (sectionId === "history") {
    renderHistorySection();
  } else if (sectionId === "security") {
    renderSecuritySection();
  }
}

function switchProfileSection(sectionId) {
  appRouter.navigate("profile", sectionId);
}

// Sub A: eKYC Render & Actions - Screen IV.a
function renderKycSection() {
  const user = CustomerDB.state.currentUser;
  if (!user) return;

  const badge = document.getElementById("profile-kyc-status-badge");
  const linkedBox = document.getElementById("vneid-linked-container");
  const unlinkedBox = document.getElementById("vneid-unlinked-container");
  const manualForm = document.getElementById("manual-kyc-form");

  // Populate text inputs
  document.getElementById("profile-fullName").value = user.fullName;
  document.getElementById("profile-idCard").value = user.idCard;
  document.getElementById("profile-phone").value = user.phone;
  document.getElementById("profile-email").value = user.email;
  document.getElementById("profile-bankName").value = user.bankName;
  document.getElementById("profile-bankAccount").value = user.bankAccount;
  document.getElementById("profile-bankOwner").value = user.bankOwner;

  // Set welcome name dynamically
  const welcomeNameEl = document.getElementById("profile-welcome-name");
  if (welcomeNameEl) {
    welcomeNameEl.innerText = user.fullName;
  }

  if (user.kycStatus === "APPROVED_VNeID") {
    badge.innerText = "✓ XÁC THỰC VNeID";
    badge.className = "badge badge-success";
    linkedBox.style.display = "flex";
    unlinkedBox.style.display = "none";
    manualForm.style.display = "none";
  } else if (user.kycStatus === "APPROVED_CCCD") {
    badge.innerText = "✓ CCCD ĐÃ PHÊ DUYỆT";
    badge.className = "badge badge-success";
    linkedBox.style.display = "none";
    unlinkedBox.style.display = "none";
    manualForm.style.display = "block";
    document.getElementById("front-loaded-visual").style.display = "flex";
    document.getElementById("back-loaded-visual").style.display = "flex";
  } else {
    badge.innerText = "CHƯA XÁC THỰC";
    badge.className = "badge badge-live";
    linkedBox.style.display = "none";
    unlinkedBox.style.display = "flex";
    manualForm.style.display = "block";
    document.getElementById("front-loaded-visual").style.display = "none";
    document.getElementById("back-loaded-visual").style.display = "none";
  }
}

function simulateVNeIDInstantKYC() {
  showToast("Liên kết VNeID 🔗", "Đang truy vấn xác thực cơ sở dữ liệu quốc gia C06...", "warning");
  
  // Show dynamic loader screen overlay
  const overlay = document.createElement("div");
  overlay.className = "ocr-scan-overlay";
  overlay.innerHTML = `
    <div class="ocr-scan-line"></div>
    <span style="font-size: 32px; margin-bottom: var(--spacing-sm)">🛡️</span>
    <h3 style="color:#fff">ĐANG ĐỐI SOÁT VNeID</h3>
    <p style="font-size:12px; color:var(--on-surface-variant)">Vui lòng xác nhận chia sẻ thông tin trên ứng dụng VNeID di động của bạn...</p>
  `;
  document.getElementById("profile-sec-kyc").appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
    CustomerDB.updateKYCVNeID();
    renderKycSection();
    updateHeaderUserWidget();
    showToast("Thành công! 🛡️", "Xác thực danh tính VNeID cấp độ 2 chính chủ thành công. Đã cấp quyền đấu thầu pháp lý.");
  }, 2000);
}

let loadedFront = false;
let loadedBack = false;

function triggerManualKYCUpload(side) {
  // Simulate picking and uploading files - Screen IV.a OCR Scan
  const card = document.getElementById(`cccd-${side}-card`);
  
  // Add scanner overlay
  const overlay = document.createElement("div");
  overlay.className = "ocr-scan-overlay";
  overlay.innerHTML = `
    <div class="ocr-scan-line"></div>
    <h4 style="color:var(--primary); font-size:12px">OCR SCANNING...</h4>
  `;
  card.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
    document.getElementById(`${side}-loaded-visual`).style.display = "flex";
    if (side === "front") loadedFront = true;
    if (side === "back") loadedBack = true;
    showToast("Tải ảnh thành công 📷", `Đã nhận và quét xong OCR trích xuất dữ liệu mặt ${side === 'front' ? 'trước' : 'sau'} CCCD.`);
  }, 1500);
}

function submitManualKYCDocuments() {
  if (!loadedFront || !loadedBack) {
    showToast("Thiếu tài liệu ⚠️", "Vui lòng chụp và tải ảnh cả 2 mặt trước và mặt sau CCCD để gửi phê duyệt.", "warning");
    return;
  }
  
  showToast("Gửi hồ sơ 🚀", "Đang gửi hồ sơ định danh lên Chuyên viên kiểm duyệt...", "warning");
  setTimeout(() => {
    CustomerDB.updateKYCManual();
    renderKycSection();
    updateHeaderUserWidget();
    showToast("Hồ sơ đã duyệt! ✓", "Chuyên viên đã đối soát khớp thông tin và phê duyệt KYC của bạn.");
  }, 1500);
}

function handleProfileSave() {
  const fullName = document.getElementById("profile-fullName").value;
  const email = document.getElementById("profile-email").value;
  const phone = document.getElementById("profile-phone").value;
  const bankName = document.getElementById("profile-bankName").value;
  const bankAccount = document.getElementById("profile-bankAccount").value;
  const bankOwner = document.getElementById("profile-bankOwner").value;

  CustomerDB.updateProfileDetails(fullName, email, phone, bankName, bankAccount, bankOwner);
  updateHeaderUserWidget();
  showToast("Thành công! ✓", "Thông tin tài khoản cá nhân và liên kết ngân hàng hoàn cọc đã được lưu trữ.");
}

// Sub B: Cart / Deposits - Screen IV.b
// --- SECTION B: CART / DEPOSITS (TRANSACTION LIST) CONTROLLER & HIGH FIDELITY MOCKS ---
const MOCK_PROFILE_TRANSACTIONS = [
  {
    id: "FTA-26001104",
    name: "Thử nghiệm mobile 1",
    category: "xe", // Tài sản khác
    docFee: 1000,
    docPaid: true,
    docPaidTime: "14/05/2026 10:12",
    docRegTime: "04/05/2026 10:10 - 14/05/2026 10:13",
    depositFee: 1000,
    depositPaid: true,
    depositPaidTime: "14/05/2026 10:12",
    depositRegTime: "04/05/2026 10:10 - 14/05/2026 10:13",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=150&q=80"
  },
  {
    id: "FTA-26001102",
    name: "Test docs",
    category: "xe", // Tài sản khác
    docFee: 11111,
    docPaid: false,
    docRegTime: "06/05/2026 08:38 - 07/05/2026 08:39",
    depositFee: 11111,
    depositPaid: false,
    depositRegTime: "06/05/2026 08:38 - 07/05/2026 08:39",
    image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=150&q=80"
  },
  {
    id: "FTA-26001101",
    name: "Thử nghiệm 05/05/2026 13:38:55",
    category: "xe", // Tài sản khác
    docFee: 1000,
    docPaid: false,
    docRegTime: "05/05/2026 13:38 - 05/05/2026 13:41",
    depositFee: 1000,
    depositPaid: false,
    depositRegTime: "05/05/2026 13:38 - 05/05/2026 13:41",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=150&q=80"
  },
  {
    id: "FTA-26001100",
    name: "Thử nghiệm 29/04/2026 14:50:32",
    category: "xe", // Tài sản khác
    docFee: 1000,
    docPaid: false,
    docRegTime: "29/04/2026 14:51 - 29/04/2026 14:54",
    depositFee: 1000,
    depositPaid: false,
    depositRegTime: "29/04/2026 14:51 - 29/04/2026 14:54",
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=150&q=80"
  },
  {
    id: "FTA-26001041",
    name: "Thử nghiệm 20/04/2026 14:26:13",
    category: "xe", // Tài sản khác
    docFee: 1000,
    docPaid: true,
    docPaidTime: "20/04/2026 14:27",
    docRegTime: "20/04/2026 14:26 - 20/04/2026 14:29",
    depositFee: 1000,
    depositPaid: true,
    depositPaidTime: "20/04/2026 14:27",
    depositRegTime: "20/04/2026 14:26 - 20/04/2026 14:29",
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=150&q=80"
  }
];

let currentCartFilter = "all";
let currentCartSearchQuery = "";

window.changeCartFilter = function(category) {
  currentCartFilter = category;
  
  const pills = ["dat", "tranh", "xe", "all"];
  pills.forEach(p => {
    const el = document.getElementById(`cart-pill-${p}`);
    if (el) {
      if (p === category) el.classList.add("active");
      else el.classList.remove("active");
    }
  });
  
  renderCartSection();
};

window.filterCartList = function() {
  const input = document.getElementById("cart-search-input");
  currentCartSearchQuery = input ? input.value.trim().toLowerCase() : "";
  renderCartSection();
};

function renderCartSection() {
  const container = document.getElementById("cart-cards-container");
  if (!container) return;

  const dbList = CustomerDB.state.registeredAuctions;

  // Map db registered items into transaction-card-friendly schema
  const userTransactions = dbList.map(item => {
    const asset = CustomerDB.state.assets.find(a => a.id === item.assetId);
    if (!asset) return null;
    return {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      docFee: 1000,
      docPaid: true, // Auto paid when registered in this flow
      docPaidTime: item.regDate,
      docRegTime: `${asset.startTime.split(' ')[0]} - ${asset.regDeadline.split(' ')[0]}`,
      depositFee: asset.depositAmount,
      depositPaid: item.depositPaid,
      depositPaidTime: item.depositPaid ? item.regDate : null,
      depositRegTime: `${asset.startTime.split(' ')[0]} - ${asset.regDeadline.split(' ')[0]}`,
      image: asset.image,
      isLiveDb: true
    };
  }).filter(t => t !== null);

  const allList = [...userTransactions, ...MOCK_PROFILE_TRANSACTIONS];

  // Apply filters
  let filtered = allList;
  if (currentCartFilter === "dat") {
    filtered = filtered.filter(item => item.category === "dat");
  } else if (currentCartFilter === "tranh") {
    filtered = filtered.filter(item => item.category === "tranh");
  } else if (currentCartFilter === "xe") {
    filtered = filtered.filter(item => item.category === "xe");
  } // 'all' includes all assets

  if (currentCartSearchQuery) {
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(currentCartSearchQuery) || 
      item.id.toLowerCase().includes(currentCartSearchQuery)
    );
  }

  // Update counters
  const counterEl = document.getElementById("cart-counter");
  if (counterEl) {
    counterEl.innerText = `Có ${filtered.length} tài sản giao dịch`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass-panel" style="text-align:center; padding: 48px; color: var(--on-surface-variant);">
        Không tìm thấy giao dịch nào phù hợp với bộ lọc hiện tại.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const docBadge = item.docPaid ? 
      `<span class="payment-status-badge status-paid">✓ Đã thanh toán vào ${item.docPaidTime || '14/05/2026 10:12'}</span>` : 
      `<button class="btn btn-sm btn-primary" onclick="openDepositModal('${item.id}')" style="padding: 4px 12px; font-size:11px; font-weight:700;">Thanh toán</button>`;
      
    const depositBadge = item.depositPaid ? 
      `<span class="payment-status-badge status-paid">✓ Đã thanh toán vào ${item.depositPaidTime || '14/05/2026 10:12'}</span>` : 
      `<button class="btn btn-sm btn-primary" onclick="openDepositModal('${item.id}')" style="padding: 4px 12px; font-size:11px; font-weight:700;">Thanh toán</button>`;

    let footerActionHtml = "";
    if (item.isLiveDb && item.depositPaid) {
      const assetObj = CustomerDB.state.assets.find(a => a.id === item.id);
      if (assetObj && assetObj.status === "LIVE") {
        footerActionHtml = `
          <div style="border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 12px; margin-top: 4px; text-align: right;">
            <button class="btn btn-primary btn-sm" onclick="appRouter.navigate('bidding', '${item.id}')" style="padding: 6px 14px; font-size:12px; font-weight:800; background: var(--tertiary); border-color: var(--tertiary); color: var(--on-tertiary); box-shadow: 0 4px 12px var(--tertiary-glow);">VÀO PHÒNG ĐẤU GIÁ LIVE 🔨</button>
          </div>
        `;
      }
    }

    return `
      <div class="glass-panel transaction-card">
        <div class="transaction-card-header">
          <img class="transaction-card-image" src="${item.image}" alt="${item.name}">
          <div class="transaction-card-title-box">
            <h4 class="transaction-card-title">${item.name}</h4>
            <span class="transaction-card-id">Mã tài sản: ${item.id}</span>
          </div>
        </div>
        
        <div class="transaction-card-body">
          <div class="card-fee-column">
            <div class="fee-column-header">
              <span class="fee-column-title">Tiền hồ sơ</span>
              ${docBadge}
            </div>
            <div class="fee-column-row">
              <span class="fee-label">Số tiền (đ):</span>
              <span class="fee-value-amount">${item.docFee.toLocaleString()}</span>
            </div>
            <div class="fee-column-row">
              <span class="fee-label">Thời hạn nộp phí:</span>
              <span class="fee-value-time">${item.docRegTime}</span>
            </div>
          </div>
          
          <div class="card-fee-column">
            <div class="fee-column-header">
              <span class="fee-column-title">Tiền đặt trước</span>
              ${depositBadge}
            </div>
            <div class="fee-column-row">
              <span class="fee-label">Số tiền (đ):</span>
              <span class="fee-value-amount">${item.depositFee.toLocaleString()}</span>
            </div>
            <div class="fee-column-row">
              <span class="fee-label">Thời hạn nộp phí:</span>
              <span class="fee-value-time">${item.depositRegTime}</span>
            </div>
          </div>
        </div>
        ${footerActionHtml}
      </div>
    `;
  }).join('');
}

let activeDepositAssetId = null;

function openDepositModal(assetId) {
  activeDepositAssetId = assetId;
  let asset = CustomerDB.state.assets.find(a => a.id === assetId);

  if (!asset) {
    // Check inside mock assets
    const mockItem = MOCK_PROFILE_TRANSACTIONS.find(m => m.id === assetId);
    if (mockItem) {
      asset = {
        id: mockItem.id,
        name: mockItem.name,
        depositAmount: mockItem.depositFee
      };
    }
  }

  if (!asset) return;

  // Dynamic seeding of VietQR modal details - Screen IV.b
  document.getElementById("vietqr-deposit-amount").innerText = `${asset.depositAmount.toLocaleString()} VNĐ`;
  
  // Set simulated VietQR image with payment parameters
  const bankAcc = "10022998811";
  const syntax = `ONBI_${asset.id}_COC_TAISAN`;
  document.getElementById("vietqr-bank-account").innerText = bankAcc;
  document.getElementById("vietqr-syntax").innerText = syntax;
  
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=banking://vietcombank?account=${bankAcc}&amount=${asset.depositAmount}&message=${syntax}`;
  document.getElementById("vietqr-image-placeholder").src = qrUrl;

  openModal("modal-vietqr");
}

function simulateBankingWebhookResponse() {
  if (!activeDepositAssetId) return;

  closeModal("modal-vietqr");
  showToast("Đối soát cọc 🤖", "Hệ thống đang chạy vòng quay ngân hàng VCB đối soát tiền chuyển khoản...", "warning");

  setTimeout(() => {
    // If it is a mock item, update the mock item directly!
    const mockItem = MOCK_PROFILE_TRANSACTIONS.find(m => m.id === activeDepositAssetId);
    if (mockItem) {
      mockItem.depositPaid = true;
      mockItem.docPaid = true;
      mockItem.depositPaidTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
      renderCartSection();
      showToast("Thanh toán thành công! ✓", `Đã nhận tiền cọc/lệ phí giao dịch cho mã ${activeDepositAssetId}.`);
      return;
    }

    const item = CustomerDB.simulateDepositPayment(activeDepositAssetId);
    if (item) {
      renderCartSection();
      updateHeaderUserWidget();
      showToast("Duyệt cọc thành công! ✓", `Đã nhận tiền đặt trước. Cấp mã đấu thầu: ${item.bidderCode} cho tài sản thầu.`);
      
      // Dynamic room state updates: if user is currently inside the bidding room, reload layout!
      if (appRouter.activeView === "bidding") {
        if (currentBiddingAsset && currentBiddingAsset.id === activeDepositAssetId) {
          updateBiddingBoard();
        }
        initBiddingOtherRooms();
      }
      
      // Dynamic detail updates: if user is currently looking at the asset detail page, reload!
      if (appRouter.activeView === "detail" && currentDetailAsset && currentDetailAsset.id === activeDepositAssetId) {
        initDetailAssetView(activeDepositAssetId);
      }
      
      // Dynamic list updates: if user is currently looking at the rooms list view, reload card grid!
      if (appRouter.activeView === "rooms") {
        initRoomsListView();
      }
    }
  }, 1800);
}

// Sub C: History & Signing Pad - Screen IV.c
// --- SECTION C: BIDDING HISTORY & SIGNING (AUCTION HISTORY) & STATS BAR ---
const MOCK_AUCTION_HISTORY = [
  {
    id: "FTA-882001",
    name: "Thử nghiệm đấu giá BĐS Hoài Đức Lô B1",
    category: "dat",
    result: "TRƯỢT",
    bidAmount: 201000000,
    endTime: "18/04/2026 17:33",
    signed: false
  },
  {
    id: "FTA-882002",
    name: "Thử nghiệm đấu giá căn hộ 70m2 Hà Đông",
    category: "dat",
    result: "THẰNG",
    bidAmount: 225000000, // per m2
    isPerM2: true,
    endTime: "18/04/2026 16:31",
    signed: true
  },
  {
    id: "FTA-882003",
    name: "Thử nghiệm đấu giá đất nền Sơn Tây Lô A",
    category: "dat",
    result: "TRƯỢT",
    bidAmount: 0, // -/-
    endTime: "16/04/2026 17:30",
    signed: false
  },
  {
    id: "FTA-882004",
    name: "Thử nghiệm đấu giá xe Vespa cổ LX",
    category: "xe",
    result: "TRƯỢT",
    bidAmount: 205000000,
    endTime: "16/04/2026 17:07",
    signed: false
  },
  {
    id: "FTA-882005",
    name: "Thử nghiệm đấu giá đất thổ cư Thạch Thất",
    category: "dat",
    result: "THẰNG",
    bidAmount: 200000000, // per m2
    isPerM2: true,
    endTime: "16/04/2026 08:51",
    signed: true
  }
];

let currentHistoryFilter = "all";
let currentHistorySearchQuery = "";

window.changeHistoryFilter = function(category) {
  currentHistoryFilter = category;
  
  const pills = ["dat", "tranh", "xe", "all"];
  pills.forEach(p => {
    const el = document.getElementById(`history-pill-${p}`);
    if (el) {
      if (p === category) el.classList.add("active");
      else el.classList.remove("active");
    }
  });
  
  renderHistorySection();
};

window.filterHistoryList = function() {
  const input = document.getElementById("history-search-input");
  currentHistorySearchQuery = input ? input.value.trim().toLowerCase() : "";
  renderHistorySection();
};

function renderHistorySection() {
  const container = document.getElementById("history-table-body");
  if (!container) return;

  const dbHistoryList = CustomerDB.state.biddingHistory;

  // Map user database history bids
  const userHistory = dbHistoryList.map(item => {
    const asset = CustomerDB.state.assets.find(a => a.id === item.assetId);
    if (!asset) return null;
    return {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      result: item.result, // "THẮNG", "TRƯỢT", "ĐANG_THẦU"
      bidAmount: item.bidAmount,
      endTime: item.time,
      signed: item.signed,
      isUserDb: true
    };
  }).filter(h => h !== null);

  const allHistory = [...userHistory, ...MOCK_AUCTION_HISTORY].filter(item => item.result === "THẮNG" || item.result === "TRƯỢT");

  // Dynamic Widgets calculation
  // Filter for Won entries inside total history to sum values
  const wonHistory = allHistory.filter(h => h.result === "THẮNG");
  // Mock base: 78,758,500,000 đ
  // Let's sum win amounts from database (user wins in live thầu) plus mock win bases
  const wonBaseAmount = 78333500000; 
  const computedTotalWins = wonBaseAmount + wonHistory.filter(w => w.isUserDb).reduce((sum, h) => sum + h.bidAmount, 0);
  const computedWinCount = wonHistory.length;
  const computedRegCount = CustomerDB.state.registeredAuctions.length + 4; // Mock seeds to equal 5

  const totalWinValEl = document.getElementById("stat-total-win-val");
  const winCountEl = document.getElementById("stat-win-count");
  const regCountEl = document.getElementById("stat-total-reg-count");

  if (totalWinValEl) totalWinValEl.innerText = `${computedTotalWins.toLocaleString()} đ`;
  if (winCountEl) winCountEl.innerText = computedWinCount;
  if (regCountEl) regCountEl.innerText = computedRegCount;

  // Apply filters
  let filtered = allHistory;
  if (currentHistoryFilter === "dat") {
    filtered = filtered.filter(item => item.category === "dat");
  } else if (currentHistoryFilter === "tranh") {
    filtered = filtered.filter(item => item.category === "tranh");
  } else if (currentHistoryFilter === "xe") {
    filtered = filtered.filter(item => item.category === "xe");
  }

  if (currentHistorySearchQuery) {
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(currentHistorySearchQuery) || 
      item.id.toLowerCase().includes(currentHistorySearchQuery)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:var(--on-surface-variant); padding:32px">
          Không tìm thấy lịch sử đấu giá nào phù hợp với bộ lọc.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    let resBadge = "";
    if (item.result === "THẮNG") {
      resBadge = `<span style="color:var(--tertiary); font-weight:700;">🟢 Trúng đấu giá</span>`;
    } else if (item.result === "TRƯỢT") {
      resBadge = `<span style="color:var(--error); font-weight:700;">🔴 Không trúng</span>`;
    } else {
      resBadge = `<span style="color:var(--secondary); font-weight:700;">🟢 Đang thầu live</span>`;
    }

    let priceVal = item.bidAmount > 0 ? `${item.bidAmount.toLocaleString()} đ` : "-/-";
    if (item.isPerM2 && item.bidAmount > 0) {
      priceVal += " /m²";
    }

    let optionAction = "";
    if (item.result === "THẮNG") {
      if (item.signed) {
        optionAction = `<span style="color:var(--tertiary); font-size:12px; font-weight:700;">✓ Đã ký số</span>`;
      } else {
        optionAction = `<button class="btn btn-sm btn-primary" onclick="openSigningModal('${item.id}', ${item.bidAmount})" style="padding: 4px 10px; font-size:11px; background:var(--secondary); color:#000; font-weight:700;">Ký biên bản ✍️</button>`;
      }
    } else {
      optionAction = `<button class="btn btn-sm btn-glass" onclick="showToast('Đối soát hoàn cọc', 'Khoản đặt cọc sẽ được hoàn trả tự động trong 3-5 ngày làm việc.')" style="padding: 4px 8px; font-size:11px; font-weight:600;">Hoàn cọc</button>`;
    }

    return `
      <tr>
        <td style="font-weight:700; text-align:left;">${item.name}</td>
        <td style="text-align:center;">${resBadge}</td>
        <td style="font-family:var(--font-mono); font-weight:700; color:var(--secondary); text-align:right;">${priceVal}</td>
        <td style="font-size:12px; color:var(--on-surface-variant); text-align:center;">${item.endTime}</td>
        <td style="text-align:center;">${optionAction}</td>
      </tr>
    `;
  }).join('');
}

let activeSigningAssetId = null;
let activeSigningAmount = 0;
let isDrawing = false;
let canvas, ctx;

function openSigningModal(assetId, amount) {
  activeSigningAssetId = assetId;
  activeSigningAmount = amount;
  
  const asset = CustomerDB.state.assets.find(a => a.id === assetId);
  if (!asset) return;

  document.getElementById("esign-doc-asset-name").innerText = asset.name;
  document.getElementById("esign-doc-amount").innerText = `${amount.toLocaleString()} VNĐ`;

  openModal("modal-esign");

  // Bootstrap letter/Signature Canvas Drawer
  setTimeout(() => {
    canvas = document.getElementById("esign-canvas");
    ctx = canvas.getContext("2d");
    
    // Scale for high resolution drawing
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 200;
    
    ctx.strokeStyle = "#ffb800"; // Amber gold pen color matching style
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    
    // Setup mouse/touch bindings - Screen IV.c Drawing Signature
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);

    canvas.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
      isDrawing = true;
      e.preventDefault();
    });
    canvas.addEventListener("touchmove", (e) => {
      if (!isDrawing) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
      e.preventDefault();
    });
    canvas.addEventListener("touchend", stopDrawing);
  }, 100);
}

function startDrawing(e) {
  isDrawing = true;
  ctx.beginPath();
  const rect = canvas.getBoundingClientRect();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
}

function stopDrawing() {
  isDrawing = false;
}

function clearSignatureCanvas() {
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function submitSignatureSigning() {
  // Save letter details to store
  const dataUrl = canvas.toDataURL();
  CustomerDB.saveWinnerSignature(activeSigningAssetId, dataUrl);
  
  closeModal("modal-esign");
  renderHistorySection();
  showToast("Ký biên bản thành công! 📜", "Chữ ký tay điện tử của bạn đã được đính kèm gốc pháp lý vào Biên bản trúng đấu giá PDF.");
}

// --- Screen VII: Live Bidding Room Control & Auto Robot Bidders Simulator ---
let biddingRoomInterval = null;
let currentBiddingAsset = null;
let simulatedBidders = ["BID_8842", "BID_7701", "BID_1192", "BID_3042", "BID_9915", "BID_4402"];
let localCountdownTimeRemaining = 0;
let countdownClockInterval = null;

// Mockup interactive tab & stepper state
let activeBiddingTab = "m2";
let activeBiddingMultiplier = 1;

// Masterpiece helper: read numbers in Vietnamese words with high-fidelity accuracy
function docSoTiengViet(number) {
  if (number === 0) return "Không đồng";
  
  // High fidelity mockup exact values override
  if (number === 20026000000) return "Hai mươi tỷ không trăm hai mươi sáu triệu đồng";
  if (number === 20028000000) return "Hai mươi tỷ không trăm hai mươi tám triệu đồng";
  
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const unitsTen = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];
  
  function readGroup(n, showZero = false) {
    let tr = Math.floor(n / 100);
    let ch = Math.floor((n % 100) / 10);
    let dv = n % 10;
    let s = "";
    
    if (tr > 0 || showZero) {
      s += units[tr] + " trăm ";
    }
    
    if (ch > 0) {
      if (ch === 1) {
        s += "mười ";
      } else {
        s += unitsTen[ch] + " ";
      }
    } else if (tr > 0 && dv > 0) {
      s += "lẻ ";
    }
    
    if (dv > 0) {
      if (dv === 1 && ch > 1) {
        s += "mốt ";
      } else if (dv === 5 && ch > 0) {
        s += "lăm ";
      } else {
        s += units[dv] + " ";
      }
    }
    return s;
  }
  
  let result = "";
  let ty = Math.floor(number / 1000000000);
  let temp = number % 1000000000;
  let trieu = Math.floor(temp / 1000000);
  temp = temp % 1000000;
  let nghin = Math.floor(temp / 1000);
  let dong = temp % 1000;
  
  let hasValueBefore = false;
  
  if (ty > 0) {
    result += readGroup(ty, false) + "tỷ ";
    hasValueBefore = true;
  }
  
  if (trieu > 0) {
    result += readGroup(trieu, hasValueBefore) + "triệu ";
    hasValueBefore = true;
  }
  
  if (nghin > 0) {
    result += readGroup(nghin, hasValueBefore) + "nghìn ";
    hasValueBefore = true;
  }
  
  if (dong > 0) {
    result += readGroup(dong, hasValueBefore);
  }
  
  result = result.trim();
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
    result += " đồng";
  }
  
  return result.replace(/\s+/g, " ");
}

function initBiddingRoomView(assetId) {
  if (biddingRoomInterval) clearInterval(biddingRoomInterval);
  if (countdownClockInterval) clearInterval(countdownClockInterval);

  const asset = CustomerDB.state.assets.find(a => a.id === assetId);
  if (!asset) return;

  currentBiddingAsset = asset;
  
  // Set default tab type: land gets 'm2' by default, other categories get 'total'
  activeBiddingTab = asset.category === "dat" ? "m2" : "total";
  activeBiddingMultiplier = 1;

  // Toggle tab visual highlights
  const tabM2 = document.getElementById("tab-m2-price");
  const tabTotal = document.getElementById("tab-total-price");
  if (tabM2 && tabTotal) {
    if (asset.category === "dat") {
      tabM2.style.display = "flex";
      if (activeBiddingTab === "m2") {
        tabM2.classList.add("active");
        tabTotal.classList.remove("active");
      } else {
        tabTotal.classList.add("active");
        tabM2.classList.remove("active");
      }
    } else {
      // Hide m2 tab if not land, make total tab fill
      tabM2.style.display = "none";
      tabTotal.classList.add("active");
      tabTotal.style.gridColumn = "span 2";
    }
  }

  // Render overlay name and image
  document.getElementById("overlay-asset-name").innerText = asset.name;
  document.getElementById("room-asset-img").src = asset.image;
  
  // Render specs list
  const table = document.getElementById("room-details-table");
  table.innerHTML = Object.entries(asset.details).map(([key, val]) => `
    <tr>
      <th>${key}</th>
      <td>${val}</td>
    </tr>
  `).join('');

  // Seed live WS scrolling feed with initial random logs
  const feedList = document.getElementById("room-feed-list");
  let timeStr = new Date(Date.now() - 60000).toTimeString().split(' ')[0] + '.' + String(Math.floor(Math.random() * 900) + 100);
  
  const area = asset.details && asset.details["Diện tích"] ? (parseFloat(asset.details["Diện tích"]) || 1) : 1;
  const startPriceVal = asset.category === "dat" && activeBiddingTab === "m2" ? Math.round(asset.startPrice / area) : asset.startPrice;
  const unitSuffix = asset.category === "dat" && activeBiddingTab === "m2" ? " đ/m²" : " đ";
  
  feedList.innerHTML = `
    <div class="feed-item">
      <div class="feed-left">
        <div class="feed-price-row">
          <span class="feed-amount">${startPriceVal.toLocaleString()}${unitSuffix}</span>
          <span class="feed-badge-icon">👑</span>
        </div>
        <span class="feed-time">${timeStr}</span>
      </div>
      <span class="feed-bidder" style="color:var(--on-surface-variant)">Khởi điểm</span>
    </div>
  `;

  // Start real-time countdown clocks - Multi-stage logic
  const clockEl = document.getElementById("room-countdown-clock");
  const labelEl = document.getElementById("room-countdown-label");

  const tickClock = () => {
    const regDeadlineTime = new Date(asset.regDeadline).getTime();
    const startTime = new Date(asset.startTime).getTime();
    const endTime = new Date(asset.endTime).getTime();
    const now = Date.now();
    
    let diff = 0;
    let labelText = "Thời gian còn lại:";
    let isClosed = false;

    if (now < regDeadlineTime) {
      // Stage 1: Registration open
      diff = regDeadlineTime - now;
      labelText = "Thời gian đăng ký còn lại:";
    } else if (now < startTime) {
      // Stage 2: Preparing for auction
      diff = startTime - now;
      labelText = "Thời gian chuẩn bị đấu:";
    } else if (now < endTime) {
      // Stage 3: Live Bidding ongoing
      diff = endTime - now;
      labelText = "Thời gian thầu còn lại:";
    } else {
      // Stage 4: Closed
      diff = 0;
      labelText = "Phiên đấu giá đã kết thúc";
      isClosed = true;
    }

    if (labelEl) labelEl.innerText = labelText;

    if (isClosed || diff <= 0) {
      clockEl.innerText = "00d : 00h : 00m : 00s";
      clearInterval(countdownClockInterval);
      clearInterval(biddingRoomInterval);
      updateBiddingBoard(); // update states instantly when transitioning to closed
      return;
    }

    let days = Math.floor(diff / (1000 * 60 * 60 * 24));
    let hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((diff % (1000 * 60)) / 1000);

    clockEl.innerText = `${days.toString().padStart(2, '0')}d : ${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`;
  };

  tickClock();
  countdownClockInterval = setInterval(tickClock, 1000);

  // Populate dynamic current bid board & stepper control console
  updateBiddingBoard();

  // Start Robot opponent Bidders WebSocket simulator
  biddingRoomInterval = setInterval(() => {
    simulateOpponentBiddingPlace();
  }, 10000);

  // Alert Success
  showToast("Vào phòng đấu thành công! 🔨", "Đã đồng bộ kết nối WebSocket trực tuyến an toàn.");

  // Initialize other bidding rooms list at the bottom of the page
  initBiddingOtherRooms();
}

window.switchBiddingTab = function(tabType) {
  const asset = currentBiddingAsset;
  if (!asset) return;

  const tabM2 = document.getElementById("tab-m2-price");
  const tabTotal = document.getElementById("tab-total-price");

  if (tabType === 'm2' && asset.category === 'dat') {
    activeBiddingTab = 'm2';
    if (tabM2) tabM2.classList.add("active");
    if (tabTotal) tabTotal.classList.remove("active");
  } else {
    activeBiddingTab = 'total';
    if (tabTotal) tabTotal.classList.add("active");
    if (tabM2) tabM2.classList.remove("active");
  }

  activeBiddingMultiplier = 1; // Reset stepper multiplier on tab toggle
  updateBiddingBoard();
  
  showToast("Thay đổi chế độ xem 🔄", `Đã chuyển đổi hiển thị thông tin bảng giá sang dạng ${activeBiddingTab === 'm2' ? 'Đơn giá / m²' : 'Tổng giá trị tài sản'}.`);
};

window.adjustBiddingMultiplier = function(delta) {
  activeBiddingMultiplier += delta;
  if (activeBiddingMultiplier < 1) activeBiddingMultiplier = 1;
  updateBiddingConsolePrices();
};

function updateBiddingBoard() {
  const asset = currentBiddingAsset;
  if (!asset) return;

  const area = asset.details && asset.details["Diện tích"] ? (parseFloat(asset.details["Diện tích"]) || 1) : 1;
  const totalPrice = asset.currentBid > 0 ? asset.currentBid : asset.startPrice;
  const pricePerM2 = Math.round(totalPrice / area);

  // Populate Bottom-Left Tabs values
  const tabTotalValEl = document.getElementById("tab-total-val");
  if (tabTotalValEl) tabTotalValEl.innerText = `${totalPrice.toLocaleString()} đ`;
  const tabM2ValEl = document.getElementById("tab-m2-val");
  if (tabM2ValEl) tabM2ValEl.innerText = `${pricePerM2.toLocaleString()} đ`;

  // Determine current active showcase price based on tab
  const boardVal = document.getElementById("room-highest-bid");
  const typeLabel = document.getElementById("room-price-type-label");
  const wordsLabel = document.getElementById("room-highest-bid-words");
  
  let showPrice = totalPrice;
  if (asset.category === "dat" && activeBiddingTab === "m2") {
    showPrice = pricePerM2;
    typeLabel.innerText = "Giá hiện tại /m²";
  } else {
    typeLabel.innerText = "Tổng giá hiện tại";
  }

  // Large price animation
  boardVal.innerText = `${showPrice.toLocaleString()} đ`;
  boardVal.classList.add("flash-glow");
  setTimeout(() => boardVal.classList.remove("flash-glow"), 400);

  // Words translation
  wordsLabel.innerText = docSoTiengViet(showPrice);

  // Update Bid Count badge
  document.getElementById("room-bid-count-badge").innerText = `${asset.bidCount} lượt trả giá 📌`;

  // Update stepper inputs
  updateBiddingConsolePrices();
}

function updateBiddingConsolePrices() {
  const asset = currentBiddingAsset;
  if (!asset) return;

  const area = asset.details && asset.details["Diện tích"] ? (parseFloat(asset.details["Diện tích"]) || 1) : 1;
  const totalPrice = asset.currentBid > 0 ? asset.currentBid : asset.startPrice;
  const pricePerM2 = Math.round(totalPrice / area);

  const stepBase = asset.category === "dat" && activeBiddingTab === "m2" ? Math.round(asset.stepPrice / area) : asset.stepPrice;
  
  // Set labels
  document.getElementById("stepper-unit-label").innerText = asset.category === "dat" && activeBiddingTab === "m2" ? "Bước giá (đ/m²)" : "Bước giá (đ/TỔNG)";
  document.getElementById("stepper-base-val").innerText = `${stepBase.toLocaleString()} X`;
  document.getElementById("stepper-multiplier-val").innerText = activeBiddingMultiplier;
  
  const computedIncrement = activeBiddingMultiplier * stepBase;
  document.getElementById("stepper-total-increment").innerText = `= ${computedIncrement.toLocaleString()} đ`;

  // Calculate next target bid price
  let targetPrice = totalPrice + activeBiddingMultiplier * asset.stepPrice;
  let buttonLabelAmount = targetPrice;
  
  if (asset.category === "dat" && activeBiddingTab === "m2") {
    const targetM2 = pricePerM2 + activeBiddingMultiplier * stepBase;
    buttonLabelAmount = targetM2;
  }

  // Get registration and deposit status
  const reg = CustomerDB.state.registeredAuctions.find(r => r.assetId === asset.id);
  const isRegistered = !!reg;
  const depositPaid = reg ? reg.depositPaid : false;
  
  const now = Date.now();
  const startTime = new Date(asset.startTime).getTime();
  const endTime = new Date(asset.endTime).getTime();

  // Dynamic bidder code display
  const bidderCodeEl = document.getElementById("room-my-bidder-code");
  if (bidderCodeEl) {
    if (isRegistered && depositPaid) {
      bidderCodeEl.innerText = `${reg.bidderCode} (Đã nộp cọc thầu)`;
      bidderCodeEl.style.color = "var(--tertiary)";
    } else if (isRegistered) {
      bidderCodeEl.innerText = "Chưa nộp cọc thầu";
      bidderCodeEl.style.color = "var(--secondary)";
    } else {
      bidderCodeEl.innerText = "Chưa đăng ký tham gia";
      bidderCodeEl.style.color = "var(--error)";
    }
  }

  const mainBtn = document.getElementById("btn-main-place-bid");
  const mainBtnWords = document.getElementById("btn-main-bid-words");
  
  // Reset custom styles from disabled/enabled state toggles
  mainBtn.disabled = false;
  mainBtn.style.opacity = "1";
  mainBtn.style.cursor = "pointer";
  mainBtn.style.filter = "none";

  const withdrawLink = document.getElementById("btn-withdraw-bid-link");
  if (withdrawLink) {
    withdrawLink.style.display = "inline-block";
  }

  if (reg && reg.bidWithdrawn) {
    mainBtn.innerText = "ĐÃ RÚT LẠI TRẢ GIÁ (BỊ ĐÌNH CHỈ)";
    mainBtnWords.innerText = "Tài khoản của bạn đã bị đình chỉ thầu và tịch thu tiền cọc do rút thầu.";
    mainBtn.disabled = true;
    mainBtn.style.opacity = "0.5";
    mainBtn.style.cursor = "not-allowed";
    mainBtn.style.filter = "grayscale(70%)";
    mainBtn.onclick = null;
    
    if (withdrawLink) {
      withdrawLink.style.display = "none";
    }
    if (bidderCodeEl) {
      bidderCodeEl.innerText = `${reg.bidderCode || 'Thợ thầu'} (Đã rút lại trả giá - ĐÌNH CHỈ)`;
      bidderCodeEl.style.color = "var(--error)";
    }
  } else if (!isRegistered) {
    // Status A: Not registered
    if (now >= startTime) {
      mainBtn.innerText = "CHƯA ĐĂNG KÝ THAM GIA";
      mainBtnWords.innerText = "Phiên đấu giá đang diễn ra. Bạn không thể đặt giá do chưa đăng ký.";
      mainBtn.disabled = true;
      mainBtn.style.opacity = "0.5";
      mainBtn.style.cursor = "not-allowed";
      mainBtn.style.filter = "grayscale(80%)";
      mainBtn.onclick = null;
    } else {
      mainBtn.innerText = "ĐĂNG KÝ THAM GIA";
      mainBtnWords.innerText = `Lệ phí và cọc thầu: ${asset.depositAmount.toLocaleString()} đ`;
      mainBtn.onclick = () => {
        handleAssetRegistration(asset.id);
        updateBiddingBoard();
      };
    }
  } else if (!depositPaid) {
    // Status B: Registered but not paid deposit
    if (now >= startTime) {
      mainBtn.innerText = "CHƯA NỘP TIỀN ĐẶT TRƯỚC (CỌC)";
      mainBtnWords.innerText = "Phiên đấu giá đang diễn ra. Bạn không thể đặt giá do chưa nộp cọc.";
      mainBtn.disabled = true;
      mainBtn.style.opacity = "0.5";
      mainBtn.style.cursor = "not-allowed";
      mainBtn.style.filter = "grayscale(80%)";
      mainBtn.onclick = null;
    } else {
      mainBtn.innerText = "NỘP TIỀN ĐẶT TRƯỚC (CỌC)";
      mainBtnWords.innerText = `Số tiền đặt trước: ${asset.depositAmount.toLocaleString()} đ`;
      mainBtn.onclick = () => {
        openDepositModal(asset.id);
      };
    }
  } else if (now < startTime) {
    // Status C: Paid deposit but upcoming (not started yet)
    mainBtn.innerText = "CHỜ ĐẾN PHIÊN ĐẤU GIÁ";
    mainBtnWords.innerText = "Hồ sơ cọc thầu đã duyệt. Đợi mở thầu để bắt đầu đặt giá.";
    mainBtn.disabled = true;
    mainBtn.style.opacity = "0.5";
    mainBtn.style.cursor = "not-allowed";
    mainBtn.style.filter = "grayscale(60%)";
    mainBtn.onclick = null;
  } else if (now < endTime) {
    // Status D: Live
    mainBtn.innerText = `TRẢ GIÁ: ${buttonLabelAmount.toLocaleString()} đ`;
    mainBtnWords.innerText = docSoTiengViet(buttonLabelAmount);
    mainBtn.onclick = () => {
      handlePlaceMainConsoleBid();
    };
  } else {
    // Status E: Ended
    mainBtn.innerText = "PHIÊN ĐẤU GIÁ ĐÃ KẾT THÚC";
    mainBtnWords.innerText = "Thời gian trả giá đã kết thúc. Phòng đấu đã khép lại.";
    mainBtn.disabled = true;
    mainBtn.style.opacity = "0.5";
    mainBtn.style.cursor = "not-allowed";
    mainBtn.style.filter = "grayscale(100%)";
    mainBtn.onclick = null;
  }
}

let activePlacedBidAmount = 0;

window.handlePlaceMainConsoleBid = function() {
  const asset = currentBiddingAsset;
  if (!asset) return;

  const basePrice = asset.currentBid > 0 ? asset.currentBid : asset.startPrice;
  activePlacedBidAmount = basePrice + asset.stepPrice * activeBiddingMultiplier;

  // Submit the bid immediately without confirmation dialog!
  executeBidSubmission();
};

function executeBidSubmission() {
  const asset = currentBiddingAsset;
  if (!asset) return;

  asset.currentBid = activePlacedBidAmount;
  asset.bidCount++;
  asset.lastBidder = "BID_9912 (Bạn)";
  
  CustomerDB.addBiddingHistoryEntry(asset.id, activePlacedBidAmount, "ĐANG_THẦU");
  CustomerDB.save();

  appendBiddingFeedLog("BID_9912 (Tôi)", activePlacedBidAmount, true);
  updateBiddingBoard();
  
  showToast("Đặt thầu thành công! ✓", `Mức trả giá của bạn đã được ghi nhận trên hệ thống.`);

  // Anti-sniping: extend endTime in database when user places a bid with less than 30s remaining
  const currentEndTime = new Date(asset.endTime).getTime();
  if (currentEndTime - Date.now() < 30000) {
    const newEndTime = new Date(currentEndTime + 30000);
    asset.endTime = newEndTime.toISOString().replace('T', ' ').substring(0, 19);
    CustomerDB.save();
    showToast("Bảo vệ giật thầu (Anti-Sniping) ⚡", "Lượt đặt giá sát nút giây cuối, đồng hồ đấu thầu tự động gia hạn thêm 30 giây để đảm bảo công bằng!", "warning");
  }
}
window.handleViewAssetDetails = function() {
  if (currentBiddingAsset) {
    appRouter.navigate("detail", currentBiddingAsset.id);
  }
};

window.handleWithdrawBidClick = function() {
  const asset = currentBiddingAsset;
  if (!asset) return;

  const reg = CustomerDB.state.registeredAuctions.find(r => r.assetId === asset.id);
  if (!reg || (!reg.depositPaid && !reg.bidWithdrawn)) {
    showToast("Không thể rút lại thầu", "Tài khoản của bạn chưa nộp cọc thầu hoặc chưa đăng ký tài sản này.", "warning");
    return;
  }

  if (reg.bidWithdrawn) {
    showToast("Đã rút lại trả giá", "Tài khoản của bạn đã thực hiện rút thầu và bị đình chỉ trước đó.", "warning");
    return;
  }

  // Check if user has placed any bids
  const feedList = document.getElementById("room-feed-list");
  const userBids = feedList ? feedList.querySelectorAll(".feed-item.me") : [];
  if (userBids.length === 0) {
    showToast("Chưa trả giá ⚠️", "Bạn chưa thực hiện lượt trả giá nào trong phiên này để rút lại.", "warning");
    return;
  }

  // Update popup text dynamically
  const displayAmount = document.getElementById("withdraw-deposit-amount-display");
  if (displayAmount) {
    displayAmount.innerText = `Số tiền cọc bị tịch thu: ${asset.depositAmount.toLocaleString()} đ`;
  }

  openModal("modal-withdraw-bid");
};

window.confirmWithdrawBid = function() {
  const asset = currentBiddingAsset;
  if (!asset) return;

  const reg = CustomerDB.state.registeredAuctions.find(r => r.assetId === asset.id);
  if (!reg) return;

  // Mark as withdrawn and forfeit deposit
  reg.bidWithdrawn = true;
  reg.depositPaid = false; // User forfeits deposit!
  CustomerDB.save();

  // Close warning modal
  closeModal("modal-withdraw-bid");

  // Revert user's last bid from DOM feed and revert room state
  const feedList = document.getElementById("room-feed-list");
  if (feedList) {
    const userBids = feedList.querySelectorAll(".feed-item.me");
    if (userBids.length > 0) {
      const lastUserBid = userBids[userBids.length - 1];
      const prevBidNode = lastUserBid.previousElementSibling;

      // Remove the element from DOM
      lastUserBid.remove();

      // Decrement room's bid count
      if (asset.bidCount > 0) {
        asset.bidCount--;
      }

      // Revert highest bid amount & bidder ID from previous item
      if (prevBidNode) {
        const amountEl = prevBidNode.querySelector(".feed-amount");
        const bidderEl = prevBidNode.querySelector(".feed-bidder");
        if (amountEl && bidderEl) {
          const rawText = amountEl.innerText;
          const cleaned = rawText.replace(/[^0-9]/g, "");
          let prevAmount = parseInt(cleaned) || asset.startPrice;

          if (rawText.includes("đ/m²")) {
            const area = asset.details && asset.details["Diện tích"] ? (parseFloat(asset.details["Diện tích"]) || 1) : 1;
            prevAmount = Math.round(prevAmount * area);
          }

          asset.currentBid = prevAmount;
          asset.lastBidder = bidderEl.innerText;
        }
      } else {
        asset.currentBid = 0;
        asset.lastBidder = "";
      }

      // Remove from bidding history too
      const bidHistoryIndex = CustomerDB.state.biddingHistory.findIndex(h => h.assetId === asset.id);
      if (bidHistoryIndex > -1) {
        CustomerDB.state.biddingHistory.splice(bidHistoryIndex, 1);
      }
      CustomerDB.save();
    }
  }

  // Update live thầu display
  updateBiddingBoard();

  // Show status success toast
  showToast("Rút thầu thành công ⚠️", "Đã rút lại lượt trả giá gần nhất. Tài khoản bị đình chỉ đấu giá và tịch thu toàn bộ tiền cọc.", "error");
};

// --- SECTION D: SECURITY SETTINGS (2FA AUTHENTICATOR) CONTROLLERS ---
function renderSecuritySection() {
  if (!CustomerDB.state.security2FA) {
    CustomerDB.state.security2FA = { enabled: false };
    CustomerDB.save();
  }

  const is2FAEnabled = CustomerDB.state.security2FA.enabled;
  const badge = document.getElementById("security-2fa-badge");
  const phoneGraphic = document.getElementById("security-phone-illustration");
  const illustratedIcon = document.getElementById("phone-illustrated-icon");
  const btnToggle = document.getElementById("btn-toggle-2fa");

  if (!badge || !phoneGraphic || !illustratedIcon || !btnToggle) return;

  if (is2FAEnabled) {
    badge.innerText = "Đã kích hoạt";
    badge.style.background = "rgba(0, 230, 118, 0.1)";
    badge.style.borderColor = "rgba(0, 230, 118, 0.3)";
    badge.style.color = "var(--tertiary)";
    
    phoneGraphic.classList.add("active");
    illustratedIcon.innerText = "🔒";
    illustratedIcon.style.filter = "drop-shadow(0 0 10px rgba(0, 230, 118, 0.5))";
    
    btnToggle.innerText = "Hủy kích hoạt";
    btnToggle.style.background = "var(--error)";
    btnToggle.style.borderColor = "var(--error)";
    btnToggle.style.color = "#fff";
    btnToggle.style.boxShadow = "0 4px 15px rgba(255, 107, 107, 0.25)";
  } else {
    badge.innerText = "Chưa kích hoạt";
    badge.style.background = "rgba(255, 107, 107, 0.1)";
    badge.style.borderColor = "rgba(255, 107, 107, 0.3)";
    badge.style.color = "var(--error)";
    
    phoneGraphic.classList.remove("active");
    illustratedIcon.innerText = "📲";
    illustratedIcon.style.filter = "drop-shadow(0 0 10px rgba(255, 107, 107, 0.3))";
    
    btnToggle.innerText = "Thiết lập ngay";
    btnToggle.style.background = "var(--tertiary)";
    btnToggle.style.borderColor = "var(--tertiary)";
    btnToggle.style.color = "var(--on-tertiary)";
    btnToggle.style.boxShadow = "0 4px 15px var(--tertiary-glow)";
  }
}

window.handleSetup2FAClick = function() {
  if (!CustomerDB.state.security2FA) {
    CustomerDB.state.security2FA = { enabled: false };
    CustomerDB.save();
  }

  if (CustomerDB.state.security2FA.enabled) {
    // If active, call deactivation flow
    deactivate2FA();
    return;
  }

  // Generate dynamic QR Code for user Authenticator
  const username = CustomerDB.state.currentUser ? CustomerDB.state.currentUser.username : "0367266064";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/ONBI-AUCTION:${username}?secret=ONBIAUCTIONSECRET&issuer=ONBI-AUCTION`;
  
  const qrEl = document.getElementById("2fa-qr-code-placeholder");
  if (qrEl) qrEl.src = qrUrl;

  const otpInput = document.getElementById("otp-2fa-input");
  if (otpInput) otpInput.value = "";

  openModal("modal-setup-2fa");
};

window.confirm2FAActivation = function() {
  const otpInput = document.getElementById("otp-2fa-input");
  const otpValue = otpInput ? otpInput.value.trim() : "";

  if (otpValue.length !== 6 || isNaN(otpValue)) {
    showToast("Mã OTP không hợp lệ ⚠️", "Vui lòng nhập đúng mã xác minh 6 chữ số từ ứng dụng Authenticator.", "warning");
    return;
  }

  // Persist state in CustomerDB
  CustomerDB.state.security2FA = { enabled: true };
  CustomerDB.save();

  closeModal("modal-setup-2fa");
  renderSecuritySection();

  showToast("Kích hoạt 2FA thành công! 🔐", "Tài khoản của bạn đã được bảo vệ bằng xác thực hai lớp Authenticator.");
};

window.deactivate2FA = function() {
  const confirmed = confirm("Bạn có chắc chắn muốn hủy kích hoạt xác minh 2 bước? Việc này sẽ làm giảm mức độ bảo mật cho tài khoản của bạn.");
  if (confirmed) {
    CustomerDB.state.security2FA = { enabled: false };
    CustomerDB.save();
    renderSecuritySection();
    showToast("Đã hủy 2FA ⚠️", "Đã hủy kích hoạt xác minh hai bước Authenticator.", "warning");
  }
};

function simulateOpponentBiddingPlace() {
  const asset = currentBiddingAsset;
  if (appRouter.activeView !== "bidding" || !asset) return;

  const now = Date.now();
  const startTime = new Date(asset.startTime).getTime();
  const endTime = new Date(asset.endTime).getTime();

  // Only place opponent bids when the auction is active and live!
  if (now < startTime || now >= endTime) return;

  const basePrice = asset.currentBid > 0 ? asset.currentBid : asset.startPrice;
  const robotBid = basePrice + asset.stepPrice;
  const robotId = simulatedBidders[Math.floor(Math.random() * simulatedBidders.length)];

  asset.currentBid = robotBid;
  asset.bidCount++;
  asset.lastBidder = robotId;
  CustomerDB.save();

  appendBiddingFeedLog(robotId, robotBid, false);
  updateBiddingBoard();

  showToast("Phát sinh lượt trả giá mới 🔔", `Mã đấu thầu ẩn danh ${robotId} đã đặt giá cao hơn.`, "warning");

  // Anti-sniping: extend endTime in database when opponent places a bid with less than 30s remaining
  const currentEndTime = new Date(asset.endTime).getTime();
  if (currentEndTime - Date.now() < 30000) {
    const newEndTime = new Date(currentEndTime + 30000);
    asset.endTime = newEndTime.toISOString().replace('T', ' ').substring(0, 19);
    CustomerDB.save();
    showToast("Gia hạn thầu tự động ⚡", "Đối thủ đặt giá ở giây cuối, đếm ngược cộng thêm 30 giây bảo vệ chống sniping!", "warning");
  }
}

function appendBiddingFeedLog(bidderCode, amount, isMe = false) {
  const feedList = document.getElementById("room-feed-list");
  if (!feedList) return;

  const timeStr = new Date().toTimeString().split(' ')[0] + '.' + String(Math.floor(Math.random() * 900) + 100);
  
  const asset = currentBiddingAsset;
  const area = asset && asset.details && asset.details["Diện tích"] ? (parseFloat(asset.details["Diện tích"]) || 1) : 1;
  
  let showAmount = amount;
  let unitSuffix = " đ";
  if (asset && asset.category === "dat" && activeBiddingTab === "m2") {
    showAmount = Math.round(amount / area);
    unitSuffix = " đ/m²";
  }

  const item = document.createElement("div");
  item.className = `feed-item ${isMe ? 'me' : ''}`;
  item.innerHTML = `
    <div class="feed-left">
      <div class="feed-price-row">
        <span class="feed-amount">${showAmount.toLocaleString()}${unitSuffix}</span>
        <span class="feed-badge-icon">👑</span>
      </div>
      <span class="feed-time">${timeStr}</span>
    </div>
    <span class="feed-bidder">${bidderCode}</span>
  `;

  feedList.appendChild(item);
  
  const scrollContainer = feedList.parentElement;
  scrollContainer.scrollTop = scrollContainer.scrollHeight;
}

// --- Common Modals (OTP, VietQR, E-Sign, News) Controllers ---
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add("active");
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove("active");
  
  // Specific resets
  if (modalId === "modal-otp" && otpInterval) {
    clearInterval(otpInterval);
  }
}

// Drawer news popup
function openNewsDetailModal(newsId) {
  const item = CustomerDB.state.news.find(n => n.id === newsId);
  if (!item) return;

  document.getElementById("news-detail-category").innerText = item.category.toUpperCase();
  document.getElementById("news-detail-title").innerText = item.title;
  document.getElementById("news-detail-pubdate").innerText = `Đăng tải lúc: ${item.pubDate}`;
  document.getElementById("news-detail-content").innerText = item.content;

  openModal("modal-news");
}

function openGlobalNewsModal() {
  // Fallback to open the first guide article for test
  openNewsDetailModal("NEW-002");
}

// --- Custom Web Component: Unified footer-section ---
class FooterSection extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer>
        <div class="footer-grid">
          <div>
            <div class="logo" style="margin-bottom: var(--spacing-sm)">
              <div class="logo-icon" style="background:#ffb800; color:#000">🏛️</div>
              <span style="color:#fff">ONBI AUCTION</span>
            </div>
            <p class="footer-text" style="margin-bottom: var(--spacing-md)">Cổng đấu giá tài sản quốc gia hàng đầu Việt Nam. Tích hợp giải pháp chuyển đổi số thông tin và eKYC an ninh hoàn thiện.</p>
            <p class="footer-text"><strong>Giấy phép số:</strong> 128/GP-ĐG do Sở Tư pháp Hà Nội cấp ngày 15/08/2021.</p>
          </div>
          <div>
            <h4 class="footer-col-title">DANH MỤC ĐẦU BÀI</h4>
            <ul class="footer-list">
              <li><a href="#/search">Tài sản đấu giá</a></li>
              <li><a href="#" onclick="openGlobalNewsModal(); return false;">Quy chế & Quy định pháp lý</a></li>
              <li><a href="#" onclick="openNewsDetailModal('NEW-004'); return false;">Hướng dẫn nộp cọc bằng VietQR</a></li>
              <li><a href="#/profile/kyc">Đăng ký eKYC định danh</a></li>
            </ul>
          </div>
          <div>
            <h4 class="footer-col-title">LIÊN HỆ & TRỢ GIÚP</h4>
            <p class="footer-text" style="margin-bottom: 8px;">📍 Tầng 12, Tòa nhà ONBI Tower, Cầu Giấy, Hà Nội</p>
            <p class="footer-text" style="margin-bottom: 8px;">📞 Hotline: 1900.88.99.11 (24/7)</p>
            <p class="footer-text">✉ Hỗ trợ: hotro@sandaugia.vn</p>
          </div>
        </div>
        
        <div class="footer-bottom">
          <span>© 2026 CỔNG ĐẤU GIÁ ONBI. Tất cả các quyền được bảo lưu.</span>
          <div style="display:flex; gap:16px;">
            <a href="#" style="color:var(--on-surface-variant)">Điều khoản sử dụng</a>
            <a href="#" style="color:var(--on-surface-variant)">Chính sách bảo mật</a>
          </div>
        </div>
      </footer>
    `;
  }
}
customElements.define("footer-section", FooterSection);

// --- Header Clock Ticking Controller ---
function startHeaderClock() {
  const timeEl = document.getElementById("header-clock-time");
  const dateEl = document.getElementById("header-clock-date");
  if (!timeEl || !dateEl) return;

  const update = () => {
    const now = new Date();
    // Time format: HH:MM:ss
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    timeEl.innerText = `${hours}:${minutes}:${seconds}`;

    // Date format: DD/MM/YYYY
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    dateEl.innerText = `${day}/${month}/${year}`;
  };

  update();
  setInterval(update, 1000);
}

// --- Change Password Interactive Validator & Controller ---
function validateNewPassword() {
  const oldPass = document.getElementById("change-pass-old").value;
  const newPass = document.getElementById("change-pass-new").value;
  const confirmPass = document.getElementById("change-pass-confirm").value;

  const reqs = {
    different: newPass !== oldPass && newPass !== "",
    length: newPass.length >= 8,
    uppercase: /[A-Z]/.test(newPass),
    lowercase: /[a-z]/.test(newPass),
    number: /\d/.test(newPass),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPass),
    whitespace: newPass !== "" && !/\s/.test(newPass)
  };

  let allValid = true;

  // Update visual list items
  for (const [key, valid] of Object.entries(reqs)) {
    const el = document.getElementById(`req-${key}`);
    if (el) {
      const bullet = el.querySelector(".req-bullet");
      if (valid) {
        el.style.color = "var(--tertiary)";
        if (bullet) bullet.innerHTML = "✓ ";
      } else {
        el.style.color = "var(--on-surface-variant)";
        if (bullet) bullet.innerHTML = "○ ";
        allValid = false;
      }
    }
  }

  const btn = document.getElementById("btn-save-password");
  const match = newPass === confirmPass && confirmPass !== "";

  if (allValid && match) {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  } else {
    btn.disabled = true;
    btn.style.opacity = "0.6";
    btn.style.cursor = "not-allowed";
  }
}

function executePasswordChange() {
  const btn = document.getElementById("btn-save-password");
  const oldText = btn.innerText;
  
  btn.disabled = true;
  btn.style.opacity = "0.6";
  btn.style.cursor = "not-allowed";
  btn.innerText = "⏳ Đang mã hóa & lưu mật khẩu...";

  setTimeout(() => {
    closeModal("modal-change-password");
    showToast("Thành công! ✓", "Mật khẩu tài khoản ONBI của bạn đã được thay đổi an toàn.");
    
    // Reset form
    document.getElementById("change-password-form").reset();
    validateNewPassword(); // Reset visual indicators
    
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.innerText = oldText;
  }, 1500);
}

// --- Bootstrap Setup Initializations ---
window.addEventListener("DOMContentLoaded", () => {
  // Initialize state stores
  CustomerDB.init();
  
  // Boot SPA router
  appRouter.init();
  
  // Start header ticking clock
  startHeaderClock();
});

// --- Rooms Listing View (Phòng đấu giá) controller functions ---
let activeRoomsFilter = "ALL";
let roomsTimers = [];

function initRoomsListView() {
  // Clear any existing ticking timers
  roomsTimers.forEach(t => clearInterval(t));
  roomsTimers = [];

  const container = document.getElementById("rooms-list-grid");
  if (!container) return;

  const searchQuery = document.getElementById("rooms-search-input") ? document.getElementById("rooms-search-input").value.trim().toLowerCase() : "";
  
  let assets = CustomerDB.state.assets;

  // Filter based on activeRoomsFilter
  if (activeRoomsFilter !== "ALL") {
    assets = assets.filter(a => a.status === activeRoomsFilter);
  }

  // Filter based on search query
  if (searchQuery) {
    assets = assets.filter(a => a.name.toLowerCase().includes(searchQuery) || a.id.toLowerCase().includes(searchQuery));
  }

  if (assets.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; padding: 48px; text-align: center; color: var(--on-surface-variant)">Không tìm thấy phòng đấu giá nào phù hợp với bộ lọc hiện tại.</div>`;
    return;
  }

  container.innerHTML = assets.map(asset => {
    const isLive = asset.status === "LIVE";
    const isUpcoming = asset.status === "UPCOMING";
    const isEnded = asset.status === "ENDED";
    const isFailed = asset.status === "FAILED";

    // User status
    const reg = CustomerDB.state.registeredAuctions.find(r => r.assetId === asset.id);
    const isRegistered = !!reg;
    const depositPaid = reg ? reg.depositPaid : false;

    let statusText = "Đã kết thúc";
    let statusClass = "badge-ended";
    if (isLive) {
      statusText = "🟢 Đang đấu";
      statusClass = "badge-live";
    } else if (isUpcoming) {
      statusText = "🟡 Sắp mở thầu";
      statusClass = "badge-upcoming";
    } else if (isFailed) {
      statusText = "🔴 Thất bại";
      statusClass = "badge-ended";
    }

    // Dynamic button based on user status
    let btnText = "Đăng ký tham gia";
    let btnClass = "btn-primary";
    let btnClick = `handleAssetRegistration('${asset.id}'); setTimeout(initRoomsListView, 150);`;

    if (isEnded || isFailed) {
      btnText = "XEM BIÊN BẢN CHỐT 📋";
      btnClass = "btn-glass";
      btnClick = `appRouter.navigate('profile', 'history')`;
    } else if (isRegistered) {
      if (depositPaid) {
        btnText = isLive ? "VÀO PHÒNG LIVE 🔨" : "ĐÃ NỘP CỌC (ĐỢI MỞ)";
        btnClass = isLive ? "btn-primary" : "btn-glass";
        btnClick = isLive ? `appRouter.navigate('bidding', '${asset.id}')` : `showToast('Chờ mở thầu', 'Tài sản đã nộp cọc thành công. Vui lòng đợi mở thầu.')`;
      } else {
        btnText = "NỘP CỌC NHẬN QUYỀN 💸";
        btnClass = "btn-secondary";
        btnClick = `openDepositModal('${asset.id}')`;
      }
    }

    const priceLabel = isLive ? "Giá thầu hiện tại" : "Giá khởi điểm";
    const priceVal = isLive && asset.currentBid > 0 ? asset.currentBid : asset.startPrice;
    
    return `
      <div class="glass-panel room-list-card">
        <div class="room-thumb-wrapper">
          <img class="room-thumb" src="${asset.image}" alt="${asset.name}">
          <span class="badge ${statusClass} room-badge-floating">${statusText}</span>
        </div>
        <div class="room-body">
          <div class="room-id-tag">${asset.id}</div>
          <div class="room-title">${asset.name}</div>
          
          <div class="room-info-grid">
            <div class="room-info-row">
              <span class="room-info-label">${priceLabel}</span>
              <span class="room-price">${priceVal.toLocaleString()} đ</span>
            </div>
            <div class="room-info-row">
              <span class="room-info-label">Số lượt nhảy giá</span>
              <span class="room-bid-count">${asset.bidCount} lượt</span>
            </div>
          </div>

          <!-- Dynamic timer -->
          <div class="room-timer-box" id="room-list-timer-${asset.id}">
            <span class="timer-label">Đang tải...</span>
            <span class="timer-countdown" id="room-list-clock-${asset.id}">00d : 00h : 00m : 00s</span>
          </div>

          <button class="btn ${btnClass} room-action-btn" onclick="${btnClick}">
            ${btnText}
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Bootstrap ticking clocks
  assets.forEach(asset => {
    const clockEl = document.getElementById(`room-list-clock-${asset.id}`);
    const labelBox = document.getElementById(`room-list-timer-${asset.id}`);
    if (!clockEl || !labelBox) return;

    const labelEl = labelBox.querySelector(".timer-label");

    const tick = () => {
      const regDeadlineTime = new Date(asset.regDeadline).getTime();
      const startTime = new Date(asset.startTime).getTime();
      const endTime = new Date(asset.endTime).getTime();
      const now = Date.now();
      
      let diff = 0;
      let labelText = "Thời gian còn lại:";
      let isClosed = false;

      if (now < regDeadlineTime) {
        diff = regDeadlineTime - now;
        labelText = "Đăng ký còn:";
      } else if (now < startTime) {
        diff = startTime - now;
        labelText = "Chuẩn bị thầu:";
      } else if (now < endTime) {
        diff = endTime - now;
        labelText = "Thời gian thầu còn:";
      } else {
        diff = 0;
        labelText = "Phiên thầu đã đóng";
        isClosed = true;
      }

      if (labelEl) labelEl.innerText = labelText;

      if (isClosed || diff <= 0) {
        clockEl.innerText = "00d : 00h : 00m : 00s";
        return;
      }

      let days = Math.floor(diff / (1000 * 60 * 60 * 24));
      let hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      let seconds = Math.floor((diff % (1000 * 60)) / 1000);

      clockEl.innerText = `${days.toString().padStart(2, '0')}d : ${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`;
    };

    tick();
    const interval = setInterval(tick, 1000);
    roomsTimers.push(interval);
  });
}

function changeRoomsFilter(filterType) {
  activeRoomsFilter = filterType;
  
  // Highlight pill
  const pills = document.querySelectorAll("#rooms-status-pills .filter-pill");
  pills.forEach(p => p.classList.remove("active"));
  
  // Find matching
  const matchingPill = Array.from(pills).find(p => p.getAttribute("onclick").includes(filterType));
  if (matchingPill) matchingPill.classList.add("active");

  initRoomsListView();
}

function filterRoomsList() {
  initRoomsListView();
}

// --- Other registered rooms inside Bidding Room View footer list ---
function initBiddingOtherRooms() {
  const container = document.getElementById("bidding-other-rooms-grid");
  if (!container) return;

  const currentAsset = currentBiddingAsset;
  if (!currentAsset) return;

  // Filter other assets: must be registered by user AND status must NOT be ENDED or FAILED
  let otherAssets = CustomerDB.state.assets.filter(a => {
    if (a.id === currentAsset.id) return false;
    if (a.status === "ENDED" || a.status === "FAILED") return false;
    const isRegistered = CustomerDB.state.registeredAuctions.some(r => r.assetId === a.id);
    return isRegistered;
  });

  if (otherAssets.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; padding: 24px; text-align: center; color: var(--on-surface-variant); font-size: 13px;">Không có phòng đấu giá khác đã đăng ký đang diễn ra.</div>`;
    return;
  }

  container.innerHTML = otherAssets.map(asset => {
    const isLive = asset.status === "LIVE";
    const isUpcoming = asset.status === "UPCOMING";
    const isFailed = asset.status === "FAILED";

    let statusText = "Đã kết thúc";
    let statusClass = "badge-ended";
    if (isLive) {
      statusText = "🟢 Đang đấu";
      statusClass = "badge-live";
    } else if (isUpcoming) {
      statusText = "🟡 Sắp mở thầu";
      statusClass = "badge-upcoming";
    } else if (isFailed) {
      statusText = "🔴 Thất bại";
      statusClass = "badge-ended";
    }

    const priceLabel = isLive ? "Giá thầu hiện tại" : "Giá khởi điểm";
    const priceVal = asset.currentBid > 0 ? asset.currentBid : asset.startPrice;
    
    return `
      <div class="glass-panel room-list-card" onclick="appRouter.navigate('bidding', '${asset.id}')" style="cursor: pointer;">
        <div class="room-thumb-wrapper" style="padding-top: 55%;">
          <img class="room-thumb" src="${asset.image}" alt="${asset.name}">
          <span class="badge ${statusClass} room-badge-floating" style="font-size: 9px; padding: 4px 8px;">${statusText}</span>
        </div>
        <div class="room-body" style="padding: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="room-id-tag" style="margin: 0; font-size: 10px;">${asset.id}</span>
          </div>
          <div class="room-title" style="font-size: 13px; font-weight: 700; color: #fff; margin: 0; line-height: 1.3; height: 34px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${asset.name}</div>
          
          <div class="room-info-vertical" style="display: flex; flex-direction: column; gap: 6px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.04); padding: 8px; border-radius: var(--radius-sm);">
            <div style="display: flex; flex-direction: column; gap: 1px;">
              <span class="room-info-label" style="font-size: 9px; color: var(--on-surface-variant); text-transform: uppercase; font-weight: 600; letter-spacing: 0.2px;">${priceLabel}</span>
              <span class="room-price" style="font-size: 13.5px; font-weight: 800; color: var(--secondary);">${priceVal.toLocaleString()} đ</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1px; border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 4px; margin-top: 2px;">
              <span class="room-info-label" style="font-size: 9px; color: var(--on-surface-variant); text-transform: uppercase; font-weight: 600; letter-spacing: 0.2px;">Số lượt nhảy giá</span>
              <span class="room-bid-count" style="font-size: 11.5px; font-weight: 700; color: #fff;">${asset.bidCount} lượt</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// --- VIEW 7: DETAIL VIEW (CHI TIẾT CUỘC ĐẤU GIÁ) CONTROLLER FUNCTIONS ---
let currentDetailAsset = null;
let currentDetailImageIndex = 0;
let detailImages = [];
let activeDetailTab = 0;

function initDetailAssetView(assetId) {
  const asset = CustomerDB.state.assets.find(a => a.id === assetId);
  if (!asset) return;

  currentDetailAsset = asset;
  currentDetailImageIndex = 0;
  activeDetailTab = 0;

  // Setup gallery images: dynamically generate 3 nice images based on asset category to make the gallery slider fully working!
  detailImages = [asset.image];
  if (asset.category === "dat") {
    detailImages.push("https://images.unsplash.com/photo-1524813686514-a57563d77965?auto=format&fit=crop&w=800&q=80");
    detailImages.push("https://images.unsplash.com/photo-1464146072230-91cabc968266?auto=format&fit=crop&w=800&q=80");
  } else if (asset.category === "tranh") {
    detailImages.push("https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80");
    detailImages.push("https://images.unsplash.com/photo-1579783928621-7a13d66a6211?auto=format&fit=crop&w=800&q=80");
  } else {
    // xe co
    detailImages.push("https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80");
    detailImages.push("https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=800&q=80");
  }

  // Render general specs
  document.getElementById("detail-asset-name").innerText = asset.name;
  document.getElementById("detail-start-price").innerText = `${asset.startPrice.toLocaleString()} đ`;
  document.getElementById("detail-bid-count-badge").innerText = `${asset.bidCount} lượt trả giá 📌`;

  // Render slider layout
  renderDetailSlider();

  // Render specs tables
  document.getElementById("spec-id").innerText = asset.id;
  document.getElementById("spec-reg-end").innerText = asset.regDeadline;
  document.getElementById("spec-start-price").innerText = `${asset.startPrice.toLocaleString()} đ`;
  document.getElementById("spec-step-price").innerText = `${asset.stepPrice.toLocaleString()} đ`;
  document.getElementById("spec-location").innerText = asset.details["Vị trí"] || "Hà Nội";
  document.getElementById("spec-start-time").innerText = asset.startTime;
  document.getElementById("spec-end-time").innerText = asset.endTime;
  document.getElementById("spec-deposit-price").innerText = `${asset.depositAmount.toLocaleString()} đ`;
  document.getElementById("spec-deposit-end").innerText = asset.regDeadline;

  // Render dynamic action buttons console box
  renderDetailActionCard();

  // Render active tab contents
  renderDetailTabPanel();
}

function renderDetailSlider() {
  const mainImg = document.getElementById("detail-main-img");
  const thumbsContainer = document.getElementById("detail-thumbnails-container");
  if (!mainImg || !thumbsContainer) return;

  mainImg.src = detailImages[currentDetailImageIndex];

  thumbsContainer.innerHTML = detailImages.map((imgUrl, index) => {
    const isActive = index === currentDetailImageIndex;
    return `
      <div class="thumbnail-item ${isActive ? 'active' : ''}" onclick="selectDetailImage(${index})">
        <img src="${imgUrl}" alt="Thumb ${index + 1}">
      </div>
    `;
  }).join('');
}

window.selectDetailImage = function(index) {
  currentDetailImageIndex = index;
  renderDetailSlider();
};

window.slideDetailImage = function(direction) {
  currentDetailImageIndex += direction;
  if (currentDetailImageIndex < 0) {
    currentDetailImageIndex = detailImages.length - 1;
  } else if (currentDetailImageIndex >= detailImages.length) {
    currentDetailImageIndex = 0;
  }
  renderDetailSlider();
};

function renderDetailActionCard() {
  const container = document.getElementById("detail-action-card");
  const subtextEl = document.getElementById("detail-status-subtext");
  if (!container || !currentDetailAsset) return;

  const asset = currentDetailAsset;
  const isLive = asset.status === "LIVE";
  const isUpcoming = asset.status === "UPCOMING";
  const isEnded = asset.status === "ENDED";
  const isFailed = asset.status === "FAILED";

  // Check registration and cọc
  const reg = CustomerDB.state.registeredAuctions.find(r => r.assetId === asset.id);
  const isRegistered = !!reg;
  const depositPaid = reg ? reg.depositPaid : false;

  let actionHtml = "";
  let subtext = "";

  if (reg && reg.bidWithdrawn) {
    actionHtml = `<div class="detail-alert-banner banner-ended" style="background: rgba(255, 107, 107, 0.1); border: 1px solid var(--error); color: var(--error);">BỊ ĐÌNH CHỈ THẦU (ĐÃ RÚT LẠI TRẢ GIÁ)</div>`;
    subtext = "Trạng thái: Bạn đã rút lại lượt trả giá gần nhất và bị đình chỉ tham gia thầu đối với tài sản này. Toàn bộ tiền cọc đã bị tịch thu.";
  } else if (isEnded || isFailed) {
    actionHtml = `<div class="detail-alert-banner banner-ended">ĐẤU GIÁ ĐÃ KẾT THÚC</div>`;
    subtext = `Trạng thái: Phiên thầu đã đóng. Kết quả: ${asset.bidCount > 0 ? "Đấu giá thành công ✓" : "Đấu giá không thành x"}.`;
  } else if (isLive) {
    if (!isRegistered) {
      actionHtml = ""; // Hide button completely!
      subtext = "Trạng thái: Phiên thầu đang diễn ra trực tiếp. Đã quá hạn đăng ký tham gia.";
    } else if (!depositPaid) {
      actionHtml = ""; // Hide button completely!
      subtext = "Trạng thái: Phiên thầu đang diễn ra. Đã quá hạn nộp tiền đặt trước (cọc).";
    } else {
      actionHtml = `
        <button class="btn btn-primary" style="width: 100%; padding: 14px 20px; font-size: 15px; font-weight: 800; background: var(--tertiary); border-color: var(--tertiary); color: var(--on-tertiary); box-shadow: 0 4px 15px var(--tertiary-glow);" onclick="appRouter.navigate('bidding', '${asset.id}')">
          VÀO PHÒNG ĐẤU GIÁ LIVE 🔨
        </button>
      `;
      subtext = `Trạng thái: Hồ sơ thầu hợp lệ. Mã đấu thầu của bạn: ${reg.bidderCode}. Bấm vào phòng đấu để trả giá trực tiếp!`;
    }
  } else if (isUpcoming) {
    if (!isRegistered) {
      actionHtml = `
        <button class="btn btn-primary" style="width: 100%; padding: 14px 20px; font-size: 15px; font-weight: 800;" onclick="handleAssetRegistration('${asset.id}'); setTimeout(initDetailAssetView, 150, '${asset.id}');">
          ĐĂNG KÝ THAM GIA
        </button>
      `;
      subtext = "Trạng thái: Đang mở đăng ký mua hồ sơ tham gia thầu trực tuyến.";
    } else if (!depositPaid) {
      actionHtml = `
        <button class="btn btn-secondary" style="width: 100%; padding: 14px 20px; font-size: 15px; font-weight: 800;" onclick="openDepositModal('${asset.id}')">
          NỘP TIỀN ĐẶT TRƯỚC (CỌC) 💸
        </button>
      `;
      subtext = "Trạng thái: Đăng ký thành công. Vui lòng nộp tiền đặt trước để hoàn thiện hồ sơ.";
    } else {
      actionHtml = `<div class="detail-alert-banner banner-waiting">ĐÃ NỘP CỌC (ĐANG CHỜ MỞ THẦU)</div>`;
      subtext = `Trạng thái: Hồ sơ hoàn thiện. Mã thợ thầu cấp phát: ${reg.bidderCode}. Vui lòng chờ đến ngày mở thầu.`;
    }
  }

  container.innerHTML = actionHtml;
  if (subtextEl) subtextEl.innerText = subtext;
}

window.changeDetailTab = function(tabIndex) {
  activeDetailTab = tabIndex;
  
  // Highlight tab button
  const btns = document.querySelectorAll(".detail-tab-btn");
  btns.forEach((btn, idx) => {
    if (idx === tabIndex) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  renderDetailTabPanel();
};

function renderDetailTabPanel() {
  const panel = document.getElementById("detail-tab-content-panel");
  if (!panel || !currentDetailAsset) return;

  const asset = currentDetailAsset;

  let html = "";
  if (activeDetailTab === 0) {
    // MÔ TẢ TÀI SẢN
    html = `
      <div style="display:flex; flex-direction:column; gap: var(--spacing-md)">
        <p style="font-weight: 700; color: #fff; margin:0">MÔ TẢ CHI TIẾT TÀI SẢN:</p>
        <p style="margin:0">${asset.description}</p>
        <p style="font-weight: 700; color: #fff; margin:var(--spacing-sm) 0 0 0">CHI TIẾT VỊ TRÍ & ĐẶC ĐIỂM:</p>
        <ul style="margin:0; padding-left: 20px; display:flex; flex-direction:column; gap:6px;">
          ${Object.entries(asset.details).map(([key, val]) => `
            <li><strong>${key}:</strong> ${val}</li>
          `).join('')}
        </ul>
      </div>
    `;
  } else if (activeDetailTab === 1) {
    // THÔNG TIN ĐẤU GIÁ
    html = `
      <div style="display:flex; flex-direction:column; gap: var(--spacing-sm)">
        <p style="font-weight: 700; color: #fff; margin:0">QUY CHẾ VÀ ĐIỀU KHOẢN ĐẤU GIÁ:</p>
        <p style="margin:0">1. Đấu giá tài sản theo phương thức trả giá lên trực tiếp với bước nhảy giá cố định tối thiểu là <strong>${asset.stepPrice.toLocaleString()} đ</strong>.</p>
        <p style="margin:0">2. Để đủ điều kiện tham gia, nhà thầu phải nộp đầy đủ phí hồ sơ thầu (1.000đ) và tiền đặt trước (cọc thầu) tương ứng là <strong>${asset.depositAmount.toLocaleString()} đ</strong> trước thời hạn kết thúc đăng ký.</p>
        <p style="margin:0">3. Cuộc đấu giá diễn ra minh bạch, an toàn qua đường truyền WebSocket mã hóa. Mọi hành vi trả giá sát nút (dưới 30 giây cuối cùng) sẽ kích hoạt cơ chế gia hạn thêm 30 giây tự động (Anti-Sniping).</p>
      </div>
    `;
  } else if (activeDetailTab === 2) {
    // TÀI LIỆU LIÊN QUAN
    html = `
      <div style="display:flex; flex-direction:column; gap: var(--spacing-md)">
        <p style="font-weight: 700; color: #fff; margin:0">DANH SÁCH TÀI LIỆU HỒ SƠ PHÁP LÝ LIÊN QUAN:</p>
        <div style="display:flex; flex-direction:column; gap: 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding: 10px 14px; border-radius:4px; border:1px solid rgba(255,255,255,0.04)">
            <span>📄 Quy chế cuộc đấu giá tài sản.pdf (1.2 MB)</span>
            <a href="#" style="color:var(--primary); font-weight:700; text-decoration:none;" onclick="event.preventDefault(); showToast('Tải hồ sơ thành công ✓', 'Đã tải xuống Quy chế cuộc đấu giá.');">Tải xuống 📥</a>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding: 10px 14px; border-radius:4px; border:1px solid rgba(255,255,255,0.04)">
            <span>📄 Bản đồ quy hoạch phân lô chi tiết.pdf (4.8 MB)</span>
            <a href="#" style="color:var(--primary); font-weight:700; text-decoration:none;" onclick="event.preventDefault(); showToast('Tải hồ sơ thành công ✓', 'Đã tải xuống Bản đồ quy hoạch.');">Tải xuống 📥</a>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding: 10px 14px; border-radius:4px; border:1px solid rgba(255,255,255,0.04)">
            <span>📄 Quyết định phê duyệt giá khởi điểm.pdf (850 KB)</span>
            <a href="#" style="color:var(--primary); font-weight:700; text-decoration:none;" onclick="event.preventDefault(); showToast('Tải hồ sơ thành công ✓', 'Đã tải xuống Quyết định phê duyệt.');">Tải xuống 📥</a>
          </div>
        </div>
      </div>
    `;
  } else if (activeDetailTab === 3) {
    // DIỄN BIẾN CUỘC ĐẤU GIÁ
    if (asset.status === "LIVE" && asset.bidCount > 0) {
      html = `
        <div style="display:flex; flex-direction:column; gap: var(--spacing-sm)">
          <p style="font-weight: 700; color: #fff; margin:0">LỊCH SỬ NHẢY GIÁ THỜI GIAN THỰC:</p>
          <div style="display:flex; flex-direction:column; gap: 8px;">
            <div style="display:flex; justify-content:space-between; padding: 6px 12px; background:var(--primary-glow); border-radius:4px; border-left:3px solid var(--primary)">
              <strong>${asset.currentBid.toLocaleString()} đ 👑</strong>
              <span>Đối thủ BID_7701 (Vừa trả)</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding: 6px 12px; background:rgba(255,255,255,0.02); border-radius:4px;">
              <span>${(asset.currentBid - asset.stepPrice).toLocaleString()} đ</span>
              <span>Bạn (BID_9912)</span>
            </div>
          </div>
        </div>
      `;
    } else {
      html = `
        <div style="text-align:center; padding: 32px; color:var(--on-surface-variant)">
          <div style="font-size:32px; margin-bottom:12px;">📊</div>
          Phiên thầu chưa mở hoặc chưa có lượt trả giá nào được ghi nhận.
        </div>
      `;
    }
  } else if (activeDetailTab === 4) {
    // TÀI LIỆU CỦA TÔI
    const reg = CustomerDB.state.registeredAuctions.find(r => r.assetId === asset.id);
    html = `
      <div style="display:flex; flex-direction:column; gap: var(--spacing-md)">
        <p style="font-weight: 700; color: #fff; margin:0">HỒ SƠ THAM GIA THẦU CỦA BẠN:</p>
        <div style="display:flex; flex-direction:column; gap: 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding: 10px 14px; border-radius:4px;">
            <span>1. Đơn đề nghị tham gia đấu giá trực tuyến</span>
            <span style="color:var(--tertiary); font-weight:700;">✓ Đã nộp</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding: 10px 14px; border-radius:4px;">
            <span>2. Bản sao thẻ Căn cước công dân (eKYC VNeID)</span>
            <span style="color:var(--tertiary); font-weight:700;">✓ Đã đối soát</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding: 10px 14px; border-radius:4px;">
            <span>3. Biên lai nộp tiền đặt trước (Cọc thầu)</span>
            <span style="${reg && reg.depositPaid ? 'color:var(--tertiary)' : 'color:var(--error)'}; font-weight:700;">
              ${reg && reg.depositPaid ? '✓ Đã nhận tiền cọc thầu' : '✗ Chưa nộp cọc'}
            </span>
          </div>
        </div>
      </div>
    `;
  } else if (activeDetailTab === 5) {
    // KHÁCH HÀNG KHÔNG ĐỦ ĐIỀU KIỆN
    html = `
      <div style="text-align:center; padding: 32px; color:var(--on-surface-variant)">
        <div style="font-size:32px; margin-bottom:12px;">🛡️</div>
        Không có khách hàng nào trong danh sách bị hạn chế hoặc không đủ điều kiện tham gia tài sản này.
      </div>
    `;
  }

  panel.innerHTML = html;
}

