# Lộ Trình Triển Khai Dự Án E-Commerce: SHANVIS (2026)

* **Tên dự án:** SHANVIS *(Shan + Vision)*
* **Slogan gợi ý:** *Precision in Every Frame*
* **Định hướng:** Nền tảng thương mại điện tử chuyên biệt về máy ảnh & ống kính, kết hợp **AI Shopping Agent (AI Rig Builder)** và **Giao diện chuyển động nhiếp ảnh (Motion & Spatial Web)**.
* **Thời gian dự kiến (MVP):** 6 Tuần.

---

## 1. Kiến Trúc Công Nghệ (Tech Stack 2026)

| Thành phần | Công nghệ sử dụng | Vai trò trong dự án SHANVIS |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 15/16 (App Router) + TypeScript | Tối ưu tốc độ tải trang (RSC) và chuẩn SEO cho từng mã máy ảnh/ống kính. |
| **Styling & UI** | Tailwind CSS + Shadcn UI | Xây dựng bố cục lưới Bento Grid và hệ thống Dark Mode chuẩn màu nhiếp ảnh. |
| **Motion & 3D** | Lenis + GSAP (ScrollTrigger) + Framer Motion | Tạo hiệu ứng cuộn mượt, chuyển cảnh lá khẩu (Aperture) và lấy nét (Focus Pull). |
| **AI Integration** | Vercel AI SDK + Google Gemini API | Vận hành trợ lý phối ghép cấu hình (AI Rig Builder) và so sánh thông số thông minh. |
| **Database & Vector** | Supabase (PostgreSQL + pgvector) | Lưu trữ thông số kỹ thuật JSONB và tìm kiếm ngữ nghĩa theo nhu cầu chụp. |
| **Thanh toán (VN)** | PayOS / SePay (VietQR tự động) + Stripe | Xác nhận chuyển khoản ngân hàng qua Webhook trong 3 giây. |
| **Vận chuyển (VN)** | API Giao Hàng Nhanh (GHN) / Viettel Post | Tính phí vận chuyển và bảo hiểm hàng công nghệ giá trị cao. |

---

## 2. Nhận Diện Thị Giác & Trải Nghiệm Độc Quyền

* **Bảng màu chủ đạo (Dark Mode First):**
  * **Nền chính:** `#0D0D0F` (Đen nhám vỏ hợp kim Magie giúp ảnh chụp mẫu hiển thị chuẩn màu nhất).
  * **Nền thẻ Bento:** `#16161A` kết hợp viền mảnh `rgba(255, 255, 255, 0.08)`.
  * **Màu nhấn (Accent):** `#FF4D00` (Cam đỏ ngàm ống kính & điểm lấy nét EVF).
* **Hệ thống Font chữ:**
  * **Tiêu đề & Nội dung:** *Plus Jakarta Sans* hoặc *Inter*.
  * **Thông số kỹ thuật (ISO, Khẩu độ, Tiêu cự):** *Geist Mono* hoặc *JetBrains Mono*.

---

## 3. Kế Hoạch Triển Khai Chi Tiết 6 Tuần

### Tuần 1: Kiến trúc Dữ liệu & Thiết kế Hệ thống (Design System)
* [x] Khởi tạo dự án Next.js với TypeScript, Tailwind CSS và cấu hình thư mục chuẩn.
* [x] Thiết kế Database trên Supabase:
  * Bảng `products`: Tên, hãng (Sony, Canon, Fujifilm, Nikon...), giá, tồn kho, phân loại (`body`, `lens`, `accessory`).
  * Bảng `camera_specs`: Lưu thông số dạng `JSONB` (ngàm `mount_type`, cảm biến `sensor_size`, dải ISO, chống rung IBIS).
  * Bảng `product_embeddings`: Kích hoạt `pgvector` để lưu vector phục vụ AI tìm kiếm theo ngữ cảnh.
* [x] Xây dựng bộ UI Components cơ bản theo phong cách Bento Grid & Dark Mode.

### Tuần 2: Core E-commerce & Bộ lọc Quang học Chuyên sâu
* [ ] Xây dựng trang danh sách sản phẩm với bộ lọc kỹ thuật: Hãng sản xuất, Ngàm ống kính (E-mount, RF, X-mount, Z-mount), Kích thước cảm biến (Full-frame, APS-C, Medium Format), Tiêu cự & Khẩu độ.
* [ ] Xây dựng trang chi tiết sản phẩm (PDP):
  * Bảng thông số kỹ thuật trực quan.
  * Thư viện ảnh chụp mẫu (**Sample Gallery**) hiển thị kèm thẻ thông số EXIF (máy ảnh, ống kính, tiêu cự, khẩu độ, tốc độ màn trập, ISO).
* [ ] Xây dựng **Smart Cart Drawer** (Giỏ hàng thông minh): Tự động kiểm tra tính tương thích ngàm giữa Body và Lens khi thêm vào giỏ, cảnh báo nếu chọn sai ngàm.

### Tuần 3: Tích hợp Chuyển động Nhiếp ảnh (Camera Motion UX)
* [ ] Tích hợp **Lenis** cho trải nghiệm cuộn trang có quán tính vật lý mượt mà.
* [ ] Xây dựng hiệu ứng **EVF Focus Pull** trên thẻ sản phẩm (Framer Motion): Làm mờ nhẹ các thẻ xung quanh khi di chuột vào 1 sản phẩm, hiện khung ngắm điện tử 4 góc và thông số nhanh.
* [ ] Tạo hiệu ứng chuyển cảnh liền mạch (**Shared Element Transition**) từ ảnh ngoài trang chủ phóng to vào trang chi tiết.
* [ ] Xây dựng trang **Scrollytelling Flagship** (GSAP ScrollTrigger): Khi người dùng cuộn chuột, hình ảnh máy ảnh chủ lực xoay góc hoặc hiển thị các lớp công nghệ (cảm biến, chip xử lý).
* [ ] Tạo thanh trượt **Interactive Lens Slider**: Kéo thanh trượt để so sánh trực tiếp độ xóa phông của các khẩu độ (f/1.4 vs f/4) hoặc khử nhiễu ở mức ISO cao.

### Tuần 4: Tích hợp Trợ lý AI (AI Rig Builder)
* [ ] Kết nối **Vercel AI SDK** với **Gemini API**.
* [ ] Lập trình tính năng **AI Rig Builder** sử dụng kỹ thuật *Tool Calling*:
  * Khách nhập nhu cầu tự nhiên (VD: *"Cần combo chụp đường phố nhỏ gọn và quay vlog dưới 35 triệu"*).
  * AI tự truy vấn Database, ghép 1 Body + 1 Lens cùng ngàm, kiểm tra tồn kho và trả về thẻ combo có nút **"Thêm cả bộ vào giỏ hàng"**.
* [ ] Xây dựng tính năng **AI Spec Comparator**: Chọn 2 máy ảnh bất kỳ để AI tự đọc JSONB và tóm tắt ưu/nhược điểm bằng ngôn ngữ dễ hiểu cho người mới.

### Tuần 5: Thanh toán Tự động, Vận chuyển & Quản trị (Việt Nam)
* [ ] Tích hợp cổng thanh toán **VietQR (PayOS hoặc SePay)**: Tạo mã QR động theo từng đơn hàng và tự động cập nhật trạng thái đã thanh toán qua Webhook trong 3 giây.
* [ ] Tích hợp API **Giao Hàng Nhanh (GHN)** / **Viettel Post** để tự động tính phí ship và khai giá bảo hiểm hàng hóa.
* [ ] Xây dựng trang Admin quản lý đơn hàng, tồn kho và form thêm sản phẩm mới (tự động tạo vector embedding mỗi khi đăng sản phẩm).

### Tuần 6: Tối ưu Hiệu năng & Kiểm thử Toàn diện (QA)
* [ ] Chuyển đổi toàn bộ hình ảnh sản phẩm và ảnh mẫu sang định dạng **AVIF/WebP**, cấu hình `next/image` tối ưu tốc độ tải.
* [ ] Tinh chỉnh hiệu ứng chuyển động chỉ chạy trên GPU (`transform`, `opacity`) để đạt 60fps ổn định trên thiết bị di động, hỗ trợ tự động tắt hiệu ứng khi bật `prefers-reduced-motion`.
* [ ] Kiểm thử toàn bộ luồng đặt hàng, kịch bản thanh toán lỗi và độ chính xác khi AI gợi ý phối ghép ngàm ống kính.

---

## 4. Checklist Bắt Đầu Ngay (Ngày 1)

1. Tạo tài khoản **Supabase** (tạo project mới mang tên `shanvis-db`).
2. Lấy **API Key của Google Gemini** (tại Google AI Studio).
3. Khởi tạo thư mục code trên máy tính bằng lệnh:
   ```bash
   npx create-next-app@latest shanvis-store --typescript --tailwind --eslint
   ```

