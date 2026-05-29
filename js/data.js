// Mock Database for Customer (Bidder) Portal Demo
// Built for high-fidelity interactive simulation - Categories: Đất, Tranh, Xe cộ

const DEFAULT_CUSTOMER_MOCK_DATA = {
  // Categories structure - Screen II.a
  categories: [
    { id: "cat-dat", name: "Đất", icon: "🏢", count: 3, slug: "dat" },
    { id: "cat-tranh", name: "Tranh", icon: "🎨", count: 2, slug: "tranh" },
    { id: "cat-xe", name: "Xe cộ", icon: "🚗", count: 2, slug: "xe" }
  ],

  // Assets database - Screen II.a, II.b, III, VII
  assets: [
    {
      id: "BID_9921",
      name: "Đất nền Hoài Đức - Lô A2 (Diện tích 150m2)",
      category: "dat",
      startPrice: 4000000000,
      stepPrice: 50000000,
      depositAmount: 400000000,
      currentBid: 4350000000,
      bidCount: 15,
      lastBidder: "BID_9915",
      regDeadline: "2026-05-27 18:00:00",
      startTime: "2026-05-28 11:00:00",
      endTime: "2026-05-29 17:00:00", // Running Live
      status: "LIVE",
      image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
      description: "Thửa đất Lô A2 nằm trong khu quy hoạch đấu giá mới huyện Hoài Đức, Hà Nội. Hạ tầng hoàn thiện, đường rộng 12m, sổ đỏ chính chủ, pháp lý đầy đủ sạch sẽ. Đất nền phân lô vuông vắn cực đẹp.",
      details: {
        "Vị trí": "Khu đấu giá Hoài Đức, xã Đức Giang, Hoài Đức, Hà Nội",
        "Diện tích": "150 m2",
        "Hướng": "Đông Nam",
        "Mặt tiền": "7.5 m",
        "Hình thức đấu giá": "Trả giá trực tuyến với bước nhảy giá liên tục",
        "Phương thức đấu giá": "Trả giá lên"
      }
    },
    {
      id: "BID_9922",
      name: "Bức tranh sơn mài cổ Họa sĩ Tô Ngọc Vân - Thiếu nữ bên hoa huệ",
      category: "tranh",
      startPrice: 1500000000,
      stepPrice: 20000000,
      depositAmount: 150000000,
      currentBid: 1620000000,
      bidCount: 22,
      lastBidder: "BID_7701",
      regDeadline: "2026-05-27 18:00:00",
      startTime: "2026-05-28 14:00:00",
      endTime: "2026-05-29 18:30:00", // Running Live
      status: "LIVE",
      image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80",
      description: "Bản vẽ sơn mài phục dựng độc bản nghệ thuật cao của danh họa Tô Ngọc Vân. Tác phẩm điêu khắc nghệ thuật sơn mài đỉnh cao, lưu giữ giá trị văn hóa và lịch sử mỹ thuật Việt Nam đầu thế kỷ 20.",
      details: {
        "Tác giả": "Tô Ngọc Vân (Phục dựng nghệ nhân ưu tú)",
        "Chất liệu": "Sơn mài trên gỗ quý",
        "Kích thước": "80cm x 100cm",
        "Chứng nhận": "Có chứng nhận kiểm định chất lượng nghệ thuật quốc gia"
      }
    },
    {
      id: "BID_9923",
      name: "Xe ô tô Lexus RX350 biển số Hà Nội thanh lý",
      category: "xe",
      startPrice: 2200000000,
      stepPrice: 30000000,
      depositAmount: 220000000,
      currentBid: 0,
      bidCount: 0,
      lastBidder: "",
      regDeadline: "2026-05-29 18:00:00",
      startTime: "2026-05-30 09:00:00",
      endTime: "2026-05-30 11:30:00",
      status: "UPCOMING",
      image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80",
      description: "Xe Lexus RX350 sản xuất năm 2021, màu đen, nội thất nâu da bò sang trọng. Xe công vụ thanh lý chính chủ, lăn bánh 35,000 km, bảo dưỡng hãng định kỳ đầy đủ.",
      details: {
        "Thương hiệu": "Lexus (Nhật Bản)",
        "Năm sản xuất": "2021",
        "Hộp số": "Tự động",
        "Số khung": "LJT1255HG209210",
        "Giấy tờ kèm theo": "Đăng ký xe, đăng kiểm gốc và quyết định thanh lý của Cục thi hành án"
      }
    },
    {
      id: "BID_9924",
      name: "Thửa đất số 45 bản đồ quy hoạch Hoài Đức (180m2)",
      category: "dat",
      startPrice: 3200000000,
      stepPrice: 50000000,
      depositAmount: 320000000,
      currentBid: 0,
      bidCount: 0,
      lastBidder: "",
      regDeadline: "2026-05-29 18:00:00",
      startTime: "2026-05-30 10:00:00",
      endTime: "2026-05-30 12:00:00",
      status: "UPCOMING",
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
      description: "Thửa đất vuông vắn tuyệt đẹp tại Hoài Đức, quy hoạch dân cư ổn định, đường trước nhà 8m. Thích hợp mua xây biệt thự mini hoặc đầu tư trung hạn.",
      details: {
        "Vị trí": "Thị trấn Trạm Trôi, Hoài Đức, Hà Nội",
        "Diện tích": "180 m2",
        "Mặt tiền": "9 m",
        "Pháp lý": "Đã có sổ đỏ gốc"
      }
    },
    {
      id: "BID_9925",
      name: "Căn hộ Penthouse tòa nhà ONBI Tower Quận 1 (320m2)",
      category: "dat",
      startPrice: 8500000000,
      stepPrice: 100000000,
      depositAmount: 850000000,
      currentBid: 9200000000,
      bidCount: 42,
      lastBidder: "BID_1192",
      regDeadline: "2026-05-24 18:00:00",
      startTime: "2026-05-25 14:00:00",
      endTime: "2026-05-25 16:00:00",
      status: "ENDED",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      description: "Căn hộ Penthouse siêu vip trên đỉnh tòa tháp ONBI Tower. View trọn vẹn sông Sài Gòn và trung tâm Quận 1. Đầy đủ tiện ích hồ bơi vô cực riêng, thiết kế thông tầng kính tràn sang trọng.",
      details: {
        "Vị trí": "Tầng 42, ONBI Tower, số 15 Lê Lợi, Bến Nghé, Quận 1, TP.HCM",
        "Diện tích": "320 m2",
        "Số phòng": "4 phòng ngủ, 5 phòng vệ sinh",
        "Pháp lý": "Sổ hồng sở hữu lâu dài"
      }
    },
    {
      id: "BID_9926",
      name: "Tác phẩm điêu khắc gỗ lũa nghệ thuật gỗ Trắc nghìn năm",
      category: "tranh",
      startPrice: 450000000,
      stepPrice: 5000000,
      depositAmount: 45000000,
      currentBid: 0,
      bidCount: 0,
      lastBidder: "",
      regDeadline: "2026-05-29 18:00:00",
      startTime: "2026-05-30 14:00:00",
      endTime: "2026-05-30 16:00:00",
      status: "UPCOMING",
      image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
      description: "Tác phẩm điêu khắc thủ công gỗ lũa Trắc nghệ thuật do nghệ nhân điêu khắc lão luyện đục đẽo. Gỗ Trắc nghìn năm siêu bền cứng, hoa văn tự nhiên độc đáo mang ý nghĩa phong thủy thịnh vượng.",
      details: {
        "Chất liệu": "Gỗ lũa Trắc tự nhiên nguyên khối",
        "Năm tuổi ước tính": "Khoảng 800 - 1000 năm",
        "Cân nặng": "85 kg",
        "Ý nghĩa": "Phúc Lộc Thọ quy tụ đông đủ"
      }
    },
    {
      id: "BID_9927",
      name: "Xe máy Vespa cổ thanh lý đời 1968 cực đẹp",
      category: "xe",
      startPrice: 80000000,
      stepPrice: 2000000,
      depositAmount: 8000000,
      currentBid: 88000000,
      bidCount: 4,
      lastBidder: "BID_4402",
      regDeadline: "2026-05-24 18:00:00",
      startTime: "2026-05-25 09:00:00",
      endTime: "2026-05-25 11:30:00",
      status: "ENDED",
      image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80",
      description: "Xe máy Vespa 150 Sprint sản xuất năm 1968 tại Ý. Màu sơn xanh bạc nguyên bản, động cơ 2 thì hoạt động hoàn hảo, giấy tờ hải quan chính ngạch sang tên toàn quốc.",
      details: {
        "Thương hiệu": "Vespa Piaggio (Ý)",
        "Năm sản xuất": "1968",
        "Dung tích": "150 cc",
        "Tình trạng": "Đã trùng tu máy móc cực kỳ mượt mà"
      }
    }
  ],

  // News and Articles - Screen V
  news: [
    {
      id: "NEW-001",
      title: "Thông báo bảo trì hệ thống định danh nâng cấp VNeID",
      category: "Thông báo",
      pubDate: "2026-05-28",
      subsystem: "Đất",
      image: "🏢",
      description: "Hệ thống sẽ tạm ngừng cổng eKYC thủ công trong 2 giờ để tập trung bảo trì nâng cấp kết nối API VNeID cấp độ 2 quốc gia của Bộ Công An.",
      content: "Nhằm nâng cao chất lượng dịch vụ và bảo mật an toàn giao dịch đấu giá trực tuyến, ban kỹ thuật ONBI AUCTION sẽ phối hợp cùng các kỹ sư nâng cấp cổng tích hợp VNeID dân cư. Quá trình nâng cấp diễn ra từ 23h00 ngày 28/05/2026 đến 01h00 ngày 29/05/2026. Trong thời gian này, các tính năng đăng nhập và KYC bằng VNeID có thể bị gián đoạn tạm thời. Rất mong quý khách thông cảm."
    },
    {
      id: "NEW-002",
      title: "Công bố quy chế phòng chống giật thầu (Anti-Sniping) tự động",
      category: "Quy chế pháp lý",
      pubDate: "2026-05-27",
      subsystem: "Đất",
      image: "⚖️",
      description: "Chi tiết quy chế cộng thêm 30 giây tự động khi phát sinh trả giá hợp lệ ở 30 giây cuối cùng của phiên đấu thầu trực tuyến.",
      content: "Từ ngày 01/06/2026, toàn bộ các phiên đấu giá trực tuyến trên hệ thống sẽ được áp dụng cơ chế tự động gia hạn (Anti-Sniping). Theo đó, nếu có bất kỳ lệnh trả giá hợp lệ nào được hệ thống ghi nhận ở 30 giây cuối cùng trước khi đóng phòng thầu, thời gian đếm ngược sẽ tự động được cộng thêm 30 giây nữa. Cơ chế này sẽ được lặp lại liên tục cho đến khi không còn lượt trả giá nào mới trong vòng 30 giây. Điều này nhằm đảm bảo tính công bằng tuyệt đối cho tất cả khách hàng tham gia trả giá, tránh hiện tượng dùng bot trả thầu sát giờ để đầu cơ."
    },
    {
      id: "NEW-003",
      title: "Đấu giá thành công lô đất nền Hoài Đức Lô A1 đạt giá kỷ lục",
      category: "Tin tức",
      pubDate: "2026-05-25",
      subsystem: "Đất",
      image: "💰",
      description: "Phiên đấu giá Lô đất nền A1 Hoài Đức khép lại thành công rực rỡ với mức giá chốt hợp đồng tăng 45% so với khởi điểm.",
      content: "Hôm qua, phiên đấu giá thửa đất nền Lô A1 Hoài Đức đã khép lại sau hơn 2 giờ đua giá kịch tính. Mức giá khởi điểm ban đầu là 3.8 tỷ VNĐ, trải qua 42 lượt nhảy giá thời gian thực kịch tính của các nhà đầu tư lớn, mức giá trúng thầu cuối cùng đã đạt mức kỷ lục 5.51 tỷ VNĐ (tăng 45%). Khách hàng trúng thầu mang mã số BID_3042 đã hoàn tất ký số biên bản trúng thầu ngay trên ứng dụng di động."
    },
    {
      id: "NEW-004",
      title: "Hướng dẫn các bước đăng ký cọc và nộp tiền VietQR tự động",
      category: "Hướng dẫn",
      pubDate: "2026-05-24",
      subsystem: "Xe cộ",
      image: "🚗",
      description: "Video và bài viết hướng dẫn chi tiết cách thức quét mã VietQR để thanh toán tiền đặt trước cọc thầu được duyệt tự động trong 3 giây.",
      content: "Để giúp khách hàng rút ngắn tối đa thời gian đăng ký và tham gia đấu thầu, ONBI AUCTION đã chính thức tích hợp cổng thanh toán đối soát tự động thông minh VietQR. Khách hàng chỉ cần bấm vào 'Nộp cọc' trên màn hình Giỏ hàng để nhận mã QR động đã có sẵn số tiền cọc chuẩn xác và cú pháp chuyển khoản. Sử dụng ứng dụng của bất kỳ ngân hàng nào quét mã này và xác nhận chuyển tiền. Hệ thống đối soát banking thông minh (SePay Webhook) sẽ ghi nhận tiền có và phê duyệt trạng thái 'Đã cọc' tự động chỉ sau 3 giây!"
    }
  ]
};
