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
      signatures: {} // key is assetId
    };
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
      fullName: "Nguyễn Văn A",
      email: "taikhoandemo1@gmail.com",
      phone: username || "0367266064",
      idCard: "001095009982",
      address: "Số 15 Phố Huế, Bùi Thị Xuân, Hai Bà Trưng, Hà Nội",
      kycStatus: "UNVERIFIED", // UNVERIFIED, WAITING_APPROVAL, APPROVED_CCCD, APPROVED_VNeID
      bankName: "Vietcombank (VCB)",
      bankAccount: "190367266064",
      bankOwner: "NGUYEN VAN A"
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
    this.state.currentUser.fullName = "Nguyễn Văn A";
    this.state.currentUser.idCard = "001095009982";
    this.state.currentUser.address = "Hà Nội, Việt Nam";
    this.save();
    return true;
  },

  updateKYCManual(frontImg, backImg, portraitImg) {
    if (!this.state.currentUser) return false;
    this.state.currentUser.kycStatus = "APPROVED_CCCD";
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
