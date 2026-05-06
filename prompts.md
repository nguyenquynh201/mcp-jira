# 📝 Prompt mẫu cho team — MCP Jira (Ikara)

Copy prompt phù hợp, điền thông tin vào ô `[...]`, paste vào Claude Desktop.

---

## 🐛 PROMPT 1 — Tạo BUG

```
Hãy tạo 1 bug trên Jira với thông tin sau:

- Project: [KF]
- Tiêu đề: [Login crash khi user nhập sai password 3 lần]
- Mô tả:
  • Môi trường: [Android 14 / iOS 17 / Web Chrome]
  • Phiên bản app: [v2.5.1]
  • Bước tái hiện:
    1. [Mở app, vào màn login]
    2. [Nhập sai password 3 lần liên tiếp]
    3. [App crash]
  • Kết quả mong đợi: [Hiện thông báo "Sai password quá nhiều lần"]
  • Kết quả thực tế: [App đóng đột ngột]
- Priority: [High]
- Assignee: [tên người fix, ví dụ: Phạm Chinh]
- Fix version: [v2.5.2]
- Labels: [mobile, crash]
- Epic link: [tên epic, ví dụ: Login Flow]
- Sprint: [sprint hiện tại]
- Story points: [3]
- End date: [2026-05-20]

Trước khi tạo, hãy xác nhận lại thông tin cho mình kiểm tra.
Nếu không tìm thấy assignee/epic/sprint thì báo mình biết để chọn lại.
```

---

## ✅ PROMPT 2 — Tạo TASK

```
Hãy tạo 1 task trên Jira với thông tin sau:

- Project: [KF]
- Tiêu đề: [Implement màn hình Profile mới]
- Mô tả:
  • Mục đích: [Cho phép user xem và chỉnh sửa thông tin cá nhân]
  • Yêu cầu chính:
    - [Hiển thị avatar, tên, email, ngày sinh]
    - [Cho phép edit và lưu thay đổi]
    - [Validate dữ liệu trước khi gửi API]
  • Acceptance criteria:
    - [User có thể cập nhật thông tin thành công]
    - [Có loading state khi đang gọi API]
    - [Hiện toast khi thành công/thất bại]
  • Tài liệu tham khảo: [link Figma / spec nếu có]
- Priority: [Medium]
- Assignee: [Phạm Chinh]
- Fix version: [v2.6.0]
- Labels: [mobile, feature]
- Epic link: [User Profile]
- Sprint: [Sprint 12]
- Story points: [5]
- Start date: [2026-05-10]
- End date: [2026-05-25]

Trước khi tạo, xác nhận lại thông tin cho mình kiểm tra.
```

---

## ⚡ PROMPT 3 — Tạo nhanh (cho member quen rồi)

```
Tạo [bug/task] KF: "[tiêu đề]". Assign [tên người], priority [Medium],
epic [tên epic], sprint hiện tại, [story_points] points.
Mô tả: [nội dung ngắn gọn]
```

**Ví dụ thực tế:**

```
Tạo bug KF: "Notification trùng lặp trên Android". Assign Phạm Chinh,
priority High, epic Notification, sprint hiện tại, 2 points.
Mô tả: User nhận 2 notification giống nhau khi LOI gửi tin. Xảy ra trên Android 13+.
```

---

## 📋 PROMPT 4 — Tạo nhiều task cùng lúc (cho PM/PO)

```
Tạo các task sau trong project KF, sprint hiện tại, priority Medium,
epic "Onboarding Flow", assign cho Phạm Chinh:

1. Thiết kế màn welcome - 2 points
2. Implement màn welcome theo Figma - 5 points
3. Tích hợp tracking analytics cho onboarding - 3 points
4. Viết unit test cho onboarding flow - 3 points
5. QA test toàn bộ flow onboarding - 2 points

Tạo lần lượt và báo cho mình URL của từng task.
```

---

## 🔍 PROMPT 5 — Kiểm tra trước khi tạo (an toàn nhất)

```
Mình muốn tạo 1 [bug/task] mới. Trước khi tạo, hãy giúp mình:

1. Liệt kê các epic đang mở trong project [KF] để mình chọn
2. Liệt kê sprint đang active của project [KF]
3. Tìm user có tên [Phạm Chinh] trên Jira

Sau đó hỏi mình các thông tin còn thiếu rồi mới tạo.
```

---

## 🛠️ Các prompt phụ trợ khác

### Xem chi tiết 1 issue
```
Cho mình xem chi tiết issue KF-1234
```

### Tìm task của mình
```
Liệt kê các task đang In Progress của tôi trong project KF
```

### Tìm theo điều kiện (JQL)
```
Tìm các bug priority High trong project KF chưa được assign
```

### Đổi trạng thái
```
Chuyển KF-1234 sang Done
```

### Comment vào issue
```
Comment vào KF-1234: "Đã test trên iOS 17, hoạt động tốt. Đang test thêm Android."
```

### Xem các project có sẵn
```
Liệt kê tất cả projects trên Jira
```

### Xem các epic của project
```
Liệt kê các epic đang mở của project KF
```

### Xem sprint của project
```
Liệt kê các sprint active của project KF
```

---

## 💡 Mẹo cho member

| Tình huống | Cách làm |
|------------|----------|
| Không biết tên epic chính xác | Cứ gõ tên gần đúng — Claude sẽ tự tìm và match |
| Không biết username Jira của đồng nghiệp | Gõ tên hiển thị (ví dụ "Phạm Chinh") — Claude tự search |
| Muốn dùng "sprint hiện tại" | Cứ gõ vậy — Claude sẽ tự lấy sprint đang active |
| Quên field nào | Claude sẽ hỏi lại trước khi tạo |
| Tạo nhầm | Lên Jira xóa trực tiếp (MCP hiện chưa có tool delete vì lý do an toàn) |

---

## 📌 Lưu ý quan trọng

1. **Luôn xác nhận trước khi tạo** — yêu cầu Claude show lại thông tin trước khi gọi API
2. **Project key** phải đúng (viết HOA): `KF`, `DEV`, `MK`...
3. **Định dạng ngày**: `YYYY-MM-DD` (ví dụ `2026-05-15`)
4. **Priority** chỉ có 5 mức: `Highest`, `High`, `Medium`, `Low`, `Lowest`
5. **Issue type** chỉ có: `Task`, `Bug`, `Story`, `Epic`, `Sub-task`

---

## 🆘 Khi gặp lỗi

| Lỗi | Nguyên nhân thường gặp |
|-----|----------------------|
| "Field 'assignee' is required" | Sai username — dùng `search_users` để tìm đúng |
| "Issue type ... not valid" | Sai loại issue cho project đó |
| "Customfield ... cannot be set" | Custom field ID chưa cấu hình đúng — báo admin |
| "401 Unauthorized" | Sai username/password — vào Settings → Extensions → Jira sửa lại |
| "404 Not Found" | Project key sai hoặc bạn không có quyền truy cập |

Khi gặp lỗi, copy thông báo lỗi gửi cho admin/dev để được hỗ trợ.
