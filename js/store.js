// LocalStorage Database State Manager for Customer Portal
// Decouples UI layers from raw fake models.

const CustomerDB = {
  storageKey: "ONBI_CUSTOMER_PORTAL_DB",
  state: {},

  init() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.state = JSON.parse(saved);
        
        // Ensure standard structure exists
        if (!this.state.assets) this.state.assets = [...DEFAULT_CUSTOMER_MOCK_DATA.assets];
        if (!this.state.categories) this.state.categories = [...DEFAULT_CUSTOMER_MOCK_DATA.categories];
        if (!this.state.news) this.state.news = [...DEFAULT_CUSTOMER_MOCK_DATA.news];
        if (!this.state.currentUser) this.state.currentUser = null;
        if (!this.state.registeredAuctions) this.state.registeredAuctions = [];
        if (!this.state.biddingHistory) this.state.biddingHistory = [];
        if (!this.state.signatures) this.state.signatures = {};
        if (!this.state.favorites) this.state.favorites = [];
        
        // Auto-recalculate mock room times so they are perpetually relative to 'now'
        this.adjustMockTimes();
        
      } catch (e) {
        console.error("Error parsing saved DB, resetting...", e);
        this.reset();
      }
    } else {
      this.reset();
    }
  },

  reset() {
    this.state = {
      categories: [...DEFAULT_CUSTOMER_MOCK_DATA.categories],
      assets: [...DEFAULT_CUSTOMER_MOCK_DATA.assets],
      news: [...DEFAULT_CUSTOMER_MOCK_DATA.news],
      currentUser: null,
      registeredAuctions: [
        // Seed an initial registered item waiting for deposit for Screen IV.b
        {
          assetId: "BID_9921",
          status: "REGISTERED", // REGISTERED, DEPOSITED
          depositPaid: false,
          bidderCode: "",
          regDate: "2026-05-28 09:12:00"
        }
      ],
      biddingHistory: [
        // Seed some history bids for Screen IV.c
        {
          id: "BH-101",
          assetId: "BID_9924",
          bidAmount: 1600000000,
          time: "2026-05-26 10:45:12",
          result: "THẮNG", // THẮNG, TRƯỢT, ĐANG_THẦU
          signed: false
        },
        {
          id: "BH-102",
          assetId: "BID_9925",
          bidAmount: 9000000000,
          time: "2026-05-25 15:30:00",
          result: "TRƯỢT",
          signed: false
        }
      ],
      signatures: {}, // key is assetId
      favorites: []
    };
    this.adjustMockTimes();
  },

  adjustMockTimes() {
    const now = Date.now();
    const format = (ts) => new Date(ts).toISOString();

    this.state.assets.forEach(asset => {
      if (asset.id === "BID_9921") {
        asset.regDeadline = format(now - 300000);  // -5m
        asset.startTime = format(now - 120000);    // -2m
        asset.endTime = format(now + 600000);      // +10m (15m from regDeadline)
        asset.status = "LIVE";
      } else if (asset.id === "BID_9922") {
        asset.regDeadline = format(now - 360000);  // -6m
        asset.startTime = format(now - 180000);    // -3m
        asset.endTime = format(now + 540000);      // +9m (15m from regDeadline)
        asset.status = "LIVE";
      } else if (asset.id === "BID_9923") {
        asset.regDeadline = format(now + 300000);  // +5m
        asset.startTime = format(now + 600000);    // +10m
        asset.endTime = format(now + 1200000);     // +20m (15m from regDeadline)
        asset.status = "UPCOMING";
      } else if (asset.id === "BID_9924") {
        asset.regDeadline = format(now - 120000);  // -2m
        asset.startTime = format(now + 180000);    // +3m
        asset.endTime = format(now + 780000);      // +13m (15m from regDeadline)
        asset.status = "UPCOMING";
      } else if (asset.id === "BID_9925") {
        asset.regDeadline = format(now - 1800000); // -30m
        asset.startTime = format(now - 1500000);   // -25m
        asset.endTime = format(now - 900000);      // -15m (15m from regDeadline)
        asset.status = "ENDED";
      } else if (asset.id === "BID_9926") {
        asset.regDeadline = format(now + 180000);  // +3m
        asset.startTime = format(now + 480000);    // +8m
        asset.endTime = format(now + 1080000);     // +18m (15m from regDeadline)
        asset.status = "UPCOMING";
      } else if (asset.id === "BID_9927") {
        asset.regDeadline = format(now - 2700000); // -45m
        asset.startTime = format(now - 2400000);   // -40m
        asset.endTime = format(now - 1800000);     // -30m (15m from regDeadline)
        asset.status = "ENDED";
      }
    });
    this.save();
  },

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  },

  // Auth helper: Credential Login
  login(username, password) {
    // Standard mock account as shown in Screen I.a CCCD wireframe
    this.state.currentUser = {
      username: username || "0367266064",
      fullName: "Mr Ba (Mr Ba)",
      email: "ngoctam.vinhcity@gmail.com",
      phone: username || "0367266064",
      idCard: "001095009982",
      address: "Vinh City, Nghệ An",
      kycStatus: "UNVERIFIED", // UNVERIFIED, WAITING_APPROVAL, APPROVED_CCCD, APPROVED_VNeID
      bankName: "Vietcombank (VCB)",
      bankAccount: "190367266064",
      bankOwner: "MR BA"
    };
    this.save();
    return this.state.currentUser;
  },

  logout() {
    this.state.currentUser = null;
    this.save();
  },

  // KYC Helpers
  updateKYCVNeID() {
    if (!this.state.currentUser) return false;
    this.state.currentUser.kycStatus = "APPROVED_VNeID";
    this.state.currentUser.fullName = "Mr Ba (Mr Ba)";
    this.state.currentUser.idCard = "001095009982";
    this.state.currentUser.address = "Vinh City, Nghệ An";
    this.save();
    return true;
  },

  updateKYCManual(fullName, email, phone, address, idCard, idDate, idPlace, bankName, bankOwner, bankAccount) {
    if (!this.state.currentUser) return false;
    this.state.currentUser.kycStatus = "APPROVED_CCCD";
    if (fullName) this.state.currentUser.fullName = fullName;
    if (email) this.state.currentUser.email = email;
    if (phone) this.state.currentUser.phone = phone;
    if (address) this.state.currentUser.address = address;
    if (idCard) this.state.currentUser.idCard = idCard;
    if (bankName) this.state.currentUser.bankName = bankName;
    if (bankOwner) this.state.currentUser.bankOwner = bankOwner;
    if (bankAccount) this.state.currentUser.bankAccount = bankAccount;
    this.save();
    return true;
  },

  updateProfileDetails(fullName, email, phone, bankName, bankAccount, bankOwner) {
    if (!this.state.currentUser) return false;
    this.state.currentUser.fullName = fullName;
    this.state.currentUser.email = email;
    this.state.currentUser.phone = phone;
    this.state.currentUser.bankName = bankName;
    this.state.currentUser.bankAccount = bankAccount;
    this.state.currentUser.bankOwner = bankOwner;
    this.save();
    return true;
  },

  // Registered Auctions Helpers (Giỏ hàng / Nộp cọc)
  registerForAuction(assetId) {
    const list = this.state.registeredAuctions;
    const exists = list.find(item => item.assetId === assetId);
    if (!exists) {
      list.push({
        assetId,
        status: "REGISTERED",
        depositPaid: false,
        bidderCode: "",
        regDate: new Date().toISOString().replace('T', ' ').substring(0, 19)
      });
      this.save();
      return true;
    }
    return false;
  },

  simulateDepositPayment(assetId) {
    const list = this.state.registeredAuctions;
    const item = list.find(item => item.assetId === assetId);
    if (item) {
      item.depositPaid = true;
      item.status = "DEPOSITED";
      // Generate a mock bidder code
      item.bidderCode = `BID_${Math.floor(1000 + Math.random() * 9000)}`;
      this.save();
      return item;
    }
    return null;
  },

  // Bidding Action Helpers
  addBiddingHistoryEntry(assetId, bidAmount, result) {
    const entry = {
      id: `BH-${Math.floor(100 + Math.random() * 900)}`,
      assetId,
      bidAmount,
      time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      result: result || "ĐANG_THẦU",
      signed: false
    };
    this.state.biddingHistory.unshift(entry);
    this.save();
    return entry;
  },

  saveWinnerSignature(assetId, signatureDataUrl) {
    this.state.signatures[assetId] = signatureDataUrl;
    
    // Mark bid history entry as signed
    const entry = this.state.biddingHistory.find(b => b.assetId === assetId && b.result === "THẮNG");
    if (entry) {
      entry.signed = true;
    }
    
    this.save();
    return true;
  }
};
