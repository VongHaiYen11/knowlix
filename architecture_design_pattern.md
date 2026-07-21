# 📐 Kiến trúc & Các Mẫu Thiết Kế (Architecture & Design Patterns) - Knowlix

Tài liệu này tóm tắt các nguyên tắc kiến trúc và mẫu thiết kế chính được áp dụng trong dự án Knowlix nhằm tối ưu hóa tính độc lập, dễ mở rộng, bảo trì và tăng độ tin cậy của mã nguồn.

---

## 1. Clean Architecture (Use Cases / Interactors)

Dự án áp dụng **Clean Architecture** để phân tách rõ ràng các quy tắc nghiệp vụ (Business Rules) khỏi chi tiết kỹ thuật (Controllers, Express Routes, Databases).

*   **Vị trí**: `backend/src/modules/sources/use-cases/`
*   **Mô tả**:
    Các lớp nghiệp vụ nặng và phức tạp trước đây thuộc về `sources.service.ts` đã được chia nhỏ thành các **Use Cases** đơn chức năng (Single Responsibility):
    *   `IngestSourceFileUseCase`: Đảm nhận việc tải tài liệu gốc lên storage, đăng ký file, tạo nguồn ở trạng thái "Processing" và kích hoạt quá trình xử lý ngầm.
    *   `GenerateSourceSummaryUseCase`: Tiến hành trích xuất text, gọi Gemini tạo tóm tắt, liên kết dữ liệu và đồng bộ hóa trang tri thức ngầm (background job).
    *   `DeleteSourceUseCase`: Thực hiện xóa nguồn tài liệu và xử lý ngắt liên kết (detach) các trang tri thức liên quan.
*   **Lợi ích**:
    *   Mỗi tệp tin chỉ đảm nhận **duy nhất một nhiệm vụ** (SRP), tránh phình to code.
    *   Dễ dàng viết Unit Test độc lập cho từng nghiệp vụ mà không cần phụ thuộc vào toàn bộ hệ thống Service.

---

## 2. Proxy Pattern (Mẫu thiết kế ủy quyền / bọc ngoài)

Được áp dụng để xây dựng cơ chế **Tự động thử lại (Retry)** cho tất cả các cuộc gọi API Gemini.

*   **Vị trí**: `backend/src/config/gemini.ts`
*   **Mô tả**:
    Thay vì trả về client Gemini gốc, hàm `getGeminiClient()` tạo một Proxy bọc ngoài 3 phương thức quan trọng của SDK `@google/genai`:
    *   `models.generateContent`
    *   `models.generateContentStream`
    *   `models.embedContent`
    Proxy này tự động bắt (catch) các lỗi kết nối, lỗi phân tích cú pháp JSON tạm thời hoặc rate limits của Google API, tiến hành chờ lũy tiến (Exponential Backoff: 1s, 2s) và tự động gọi lại (retry) tối đa **3 lần** trước khi ném lỗi chính thức ra ngoài.
*   **Lợi ích**:
    *   Tăng độ ổn định và khả năng phục hồi của các tác vụ AI trước lỗi mạng tạm thời.
    *   Hoàn toàn trong suốt (Transparent): Không cần sửa đổi bất kỳ dòng mã nào đang sử dụng client Gemini ở các module khác.

---

## 3. Repository Pattern (Mẫu thiết kế kho lưu trữ)

Tách biệt hoàn toàn tầng truy cập dữ liệu (Data Access Layer) khỏi tầng nghiệp vụ (Business Logic).

*   **Vị trí**: Các file `*.repository.ts` trong các module (ví dụ: `sources.repository.ts`, `notes.repository.ts`, `auth.repository.ts`).
*   **Mô tả**:
    Mọi truy vấn SQL, kết nối cơ sở dữ liệu PostgreSQL (qua Pool hoặc Client) và xử lý giao dịch (Transactions) đều được gói gọn bên trong các Repository class. Services và Use Cases không trực tiếp thực hiện câu lệnh SQL mà chỉ gọi qua giao diện Repository.
*   **Lợi ích**:
    *   Dễ dàng thay đổi hệ quản trị cơ sở dữ liệu hoặc cấu trúc bảng mà không làm ảnh hưởng đến tầng logic nghiệp vụ.
    *   Dễ dàng giả lập (Mocking) cơ sở dữ liệu khi chạy kiểm thử (Unit Testing).

---

## 4. Data Mapper Pattern (Mẫu thiết kế ánh xạ dữ liệu)

Giải quyết sự khác biệt về quy chuẩn đặt tên giữa Cơ sở dữ liệu và Client.

*   **Vị trí**: `backend/src/modules/sources/sources.mapper.ts`
*   **Mô tả**:
    Cơ sở dữ liệu PostgreSQL sử dụng chuẩn đặt tên `snake_case` (ví dụ: `user_id`, `raw_storage_object_id`), trong khi giao diện Frontend sử dụng chuẩn `camelCase` (ví dụ: `userId`, `rawStorageObjectId`). Mapper chịu trách nhiệm ánh xạ và chuyển đổi dữ liệu qua lại giữa hai định dạng này.
*   **Lợi ích**:
    *   Giữ cho chuẩn đặt tên đồng nhất ở cả Frontend và cơ sở dữ liệu DB.
    *   Ẩn bớt các trường nhạy cảm hoặc không cần thiết trước khi gửi phản hồi về client.

---

## 5. Layered Architecture (Kiến trúc phân tầng)

Kiến trúc tổng thể của hệ thống đi theo luồng dữ liệu 4 tầng cơ bản:
1.  **Routing Layer** (`*.routes.ts`): Nhận HTTP request, kiểm tra xác thực (`requireAuth`), validate dữ liệu đầu vào bằng Zod schema.
2.  **Controller Layer** (`*.controller.ts`): Điều hướng request, gọi tầng nghiệp vụ (Use Cases / Services) tương ứng và trả về HTTP response phù hợp.
3.  **Service/Use Case Layer** (`use-cases/*`): Thực hiện logic nghiệp vụ cốt lõi, tương tác với AI và Storage.
4.  **Repository Layer** (`*.repository.ts`): Trực tiếp thao tác đọc/ghi vào cơ sở dữ liệu PostgreSQL.
