# QLCV

Ứng dụng điều phối công việc dùng React, Vite, Firestore và OneSignal. Giao diện ưu tiên điện thoại, không yêu cầu đăng nhập.

## Duyệt giao diện local với dữ liệu thật

```sh
npm ci
npm run dev:preview -- --port 5173
```

Mở `http://localhost:5173`. Để thử trên điện thoại, dùng địa chỉ **Network** Vite in ra và kết nối điện thoại cùng Wi-Fi với máy chạy server.

Chế độ này đọc `.env.preview` (`VITE_LOCAL_PREVIEW=false`) và cấu hình Firebase công khai trong `.env.local` (được Git bỏ qua). Các thao tác thêm, sửa, xóa, hoàn thành và hoàn tác tác động dữ liệu Firestore thật. API gửi thông báo được Vite chuyển tiếp đến ứng dụng đang chạy, không cần đưa khóa server về máy local.

Mở `/admin` để thấy form giao việc sẵn ở đầu trang; gửi xong form được làm trống để tiếp tục nhập. `/` giữ giao diện danh sách công việc.

Đăng ký nhận push chỉ khởi tạo ở origin OneSignal đã cấu hình (mặc định `https://qlcv-bay.vercel.app`). Local vẫn đọc/ghi Firestore thật và gửi thông báo qua API; nút chuông trên local hướng dẫn mở trang chính thức để đăng ký nhận push. Nếu cần kiểm thử đăng ký trên localhost, dùng OneSignal app riêng cho local và đặt đồng thời `VITE_ONESIGNAL_APP_ID`, `VITE_ONESIGNAL_SITE_ORIGIN` khớp cấu hình của app đó.

- Chọn nhiều mục **HSCV / Mạng / Máy in**, hoặc nhập công việc khác.
- Đóng form vẫn giữ bản nháp trong phiên trình duyệt.
- Tìm kiếm, lọc loại việc và việc gấp.
- Hoàn thành và hoàn tác; xem lịch sử, thống kê ngày hoặc 7 ngày.
Muốn dùng dữ liệu mẫu riêng trong trình duyệt, chạy `VITE_LOCAL_PREVIEW=true npm run dev -- --host 0.0.0.0`. Chế độ mẫu không kết nối Firebase hoặc gửi push.

## Chạy với dịch vụ thật

`npm run dev` dùng cấu hình Firebase/OneSignal hiện có từ các biến `VITE_FIREBASE_*` và `VITE_ONESIGNAL_APP_ID`. Chế độ này thao tác dữ liệu Firestore thật. API `/api/notify` cần môi trường Vercel cùng các biến server `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`, `SITE_URL`.

`npm run build` tạo bản production trong `dist/`. Build mặc định không bật dữ liệu mẫu. `npm run lint` kiểm tra ESLint.

Các đường dẫn `/admin` và `/admin/report` vẫn được giữ để tương thích liên kết cũ. Push lên nhánh `main` sẽ kích hoạt Vercel tự triển khai với cấu hình môi trường đã có trên Vercel.
