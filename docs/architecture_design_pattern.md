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
    Các dependency kỹ thuật được truyền vào constructor dưới dạng port hẹp (`Pick<...>`). Production dùng dependency mặc định, còn test có thể truyền fake repository/storage/AI implementation mà không khởi động database.
*   **Lợi ích**:
    *   Mỗi lớp đảm nhận một use case cụ thể; phần truy vấn và transaction được chuyển sang repository chuyên trách.
    *   Dễ dàng viết Unit Test độc lập cho từng nghiệp vụ mà không cần phụ thuộc vào toàn bộ hệ thống Service.

---

## 2. Proxy Pattern (Mẫu thiết kế ủy quyền / bọc ngoài)

Được áp dụng để xây dựng cơ chế **Tự động thử lại (Retry)** cho tất cả các cuộc gọi API Gemini.

*   **Vị trí**: `backend/src/config/gemini.ts`
*   **Mô tả**:
    Thay vì sửa trực tiếp method trên client Gemini, hàm `getGeminiClient()` trả về một JavaScript `Proxy`. Proxy ngoài bọc client và Proxy trong bọc `client.models`, chặn trong suốt 3 phương thức quan trọng của SDK `@google/genai`:
    *   `models.generateContent`
    *   `models.generateContentStream`
    *   `models.embedContent`
    Proxy tự động bắt các lỗi do lời gọi SDK/API ném ra, tiến hành chờ lũy tiến (1s, 2s) và gọi lại tối đa **3 lần** trước khi ném lỗi cuối cùng. Mỗi lần gọi đều log operation, model, attempt; khi response hoặc stream hoàn tất sẽ log `status=finished` và thời gian xử lý. Lỗi parse/validate JSON xảy ra sau khi SDK đã trả response thuộc trách nhiệm của workflow gọi LLM, không thuộc Proxy này.
*   **Lợi ích**:
    *   Tăng độ ổn định và khả năng phục hồi của các tác vụ AI trước lỗi mạng tạm thời.
    *   Hoàn toàn trong suốt (Transparent): Không cần sửa đổi bất kỳ dòng mã nào đang sử dụng client Gemini ở các module khác.

---

## 3. Repository Pattern (Mẫu thiết kế kho lưu trữ)

Tách biệt hoàn toàn tầng truy cập dữ liệu (Data Access Layer) khỏi tầng nghiệp vụ (Business Logic).

*   **Vị trí**: Các file `*.repository.ts` trong module và infrastructure, ví dụ `sources.repository.ts`, `source-ingestion.repository.ts`, `notes.repository.ts`, `auth.repository.ts`, `storage.repository.ts`.
*   **Mô tả**:
    Mọi truy vấn SQL, kết nối PostgreSQL (qua Pool hoặc Client), xây dựng điều kiện query và xử lý transaction đều nằm trong Repository. Services và Use Cases truyền filter có kiểu dữ liệu, không truyền SQL fragment hoặc trực tiếp sử dụng Pool.
*   **Lợi ích**:
    *   Dễ dàng thay đổi hệ quản trị cơ sở dữ liệu hoặc cấu trúc bảng mà không làm ảnh hưởng đến tầng logic nghiệp vụ.
    *   Dễ dàng giả lập (Mocking) cơ sở dữ liệu khi chạy kiểm thử (Unit Testing).

---

## 4. Data Mapper Pattern (Mẫu thiết kế ánh xạ dữ liệu)

Giải quyết sự khác biệt về quy chuẩn đặt tên giữa Cơ sở dữ liệu và Client.

*   **Vị trí**: Các file `*.mapper.ts`, ví dụ `backend/src/modules/sources/sources.mapper.ts`.
*   **Mô tả**:
    Cơ sở dữ liệu PostgreSQL sử dụng `snake_case` (ví dụ: `user_id`, `raw_storage_object_id`), trong khi API/Frontend sử dụng `camelCase` (ví dụ: `userId`, `rawStorageObjectId`). Mapper chịu trách nhiệm chuyển đổi record database trước khi trả khỏi tầng nghiệp vụ, bao gồm cả source đang ở trạng thái ingestion nền.
*   **Lợi ích**:
    *   Giữ cho chuẩn đặt tên đồng nhất ở cả Frontend và cơ sở dữ liệu DB.
    *   Ẩn bớt các trường nhạy cảm hoặc không cần thiết trước khi gửi phản hồi về client.

---

## 5. Layered Architecture (Kiến trúc phân tầng)

Kiến trúc tổng thể của hệ thống đi theo luồng dữ liệu 4 tầng cơ bản:
1.  **Routing Layer** (`*.routes.ts`): Nhận HTTP request, kiểm tra xác thực (`requireAuth`), validate body/query bằng Zod middleware trước khi controller chạy.
2.  **Controller Layer** (`*.controller.ts`): Điều hướng request, gọi tầng nghiệp vụ (Use Cases / Services) tương ứng và trả về HTTP response phù hợp.
3.  **Service/Use Case Layer** (`use-cases/*`): Thực hiện logic nghiệp vụ cốt lõi, tương tác với AI và Storage.
4.  **Repository Layer** (`*.repository.ts`): Trực tiếp thao tác đọc/ghi vào cơ sở dữ liệu PostgreSQL.

Dependency chỉ đi từ tầng ngoài vào tầng trong: route gọi controller, controller gọi service/use case, service/use case gọi repository hoặc infrastructure port. Controller không import repository và không tự xử lý password hashing.

---

## 6. Architecture Guard Tests

*   **Vị trí**: `backend/test/architecture-boundaries.test.ts`, `backend/test/source-use-cases.test.ts`
*   **Mô tả**:
    *   Phát hiện truy cập Pool nằm ngoài repository/database infrastructure.
    *   Ngăn controller import repository hoặc thư viện hash mật khẩu.
    *   Xác nhận Gemini dùng Proxy thay vì mutate SDK methods.
    *   Kiểm tra mapper và khả năng inject repository fake vào use case.
*   **Chạy kiểm tra**: `cd backend && npm test && npm run build`.
