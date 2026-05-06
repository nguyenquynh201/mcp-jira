# MCP Jira (Ikara)

> MCP Server cho phép quản lý Jira `https://jira.ikara.co` trực tiếp từ **Claude Desktop** bằng tiếng Việt.
>
> Đóng gói dưới dạng **DXT extension** — non-developer (Scrum Master, PO, QA) cũng cài được trong 30 giây.

[![Release](https://img.shields.io/github/v/release/nguyenquynh201/mcp-jira)](../../releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## ✨ Tính năng

- ✅ Tạo task/bug/story với đầy đủ field (assignee, epic, sprint, story points, fix version, labels, dates...)
- 🔍 Tìm user theo tên hiển thị → tự resolve thành username Jira
- 📋 List epics / sprints / versions để chọn nhanh
- 🔄 Đổi trạng thái issue (To Do → In Progress → Done)
- 💬 Thêm comment vào issue
- 🔎 Tìm kiếm issues bằng JQL hoặc ngôn ngữ tự nhiên
- 🛠️ Discover custom field IDs cho mỗi Jira instance

## 🚀 Cài đặt cho người dùng cuối

### Yêu cầu
- [Claude Desktop](https://claude.ai/download) (macOS / Windows / Linux)
- Tài khoản Jira tại `https://jira.ikara.co`

### Các bước

**1. Tải file extension**

Vào trang [Releases](../../releases/latest) và tải file `mcp-jira.dxt`.

**2. Cài vào Claude Desktop**

- Mở Claude Desktop
- Settings → Extensions
- Kéo thả file `mcp-jira.dxt` vào → bấm **Install**

**3. Cấu hình tài khoản**

Sau khi cài, Claude Desktop hiện form yêu cầu nhập:

| Trường | Giá trị |
|--------|---------|
| Jira URL | `https://jira.ikara.co` (đã có sẵn) |
| Username | Username Jira của bạn |
| Password | Password Jira của bạn |
| Personal Access Token | Để trống (hoặc dùng PAT thay cho user/pass) |

Bấm **Save** → xong.

**4. Bắt đầu dùng**

Mở chat trong Claude Desktop và gõ:

```
Liệt kê các project trên Jira
```

Nếu thấy danh sách projects → cài thành công 🎉

## 💬 Sử dụng

### Ví dụ tạo bug
```
Tạo bug trong project KF, tiêu đề "Login crash khi nhập sai password 3 lần",
mô tả "Xảy ra trên Android 14, app v2.5.1, user báo qua Zendesk".
Assign cho Phạm Chinh, priority High, link vào epic Login Flow,
sprint hiện tại, story points 3.
```

Claude sẽ tự động:
1. Tìm username của "Phạm Chinh" qua `search_users`
2. Tìm epic key của "Login Flow" qua `list_epics`
3. Lấy ID của sprint đang active qua `list_sprints`
4. Gọi `create_issue` với đầy đủ thông tin
5. Trả về URL issue vừa tạo

### Xem thêm prompts mẫu
👉 Xem [prompts.md](./prompts.md) — bộ template sẵn cho tạo bug, task, query, comment...

## 🛠️ Tools có sẵn

| Tool | Chức năng |
|------|-----------|
| `create_issue` | Tạo issue đầy đủ field |
| `get_issue` | Xem chi tiết 1 issue |
| `search_issues` | Tìm bằng JQL |
| `transition_issue` | Đổi trạng thái |
| `add_comment` | Thêm comment |
| `list_projects` | Liệt kê projects |
| `list_epics` | Liệt kê epics của project |
| `list_sprints` | Liệt kê sprints |
| `list_versions` | Liệt kê fix versions |
| `search_users` | Tìm user theo tên |
| `list_custom_fields` | Discover custom field IDs (setup) |

## ⚙️ Custom field configuration

Mỗi Jira instance có ID khác nhau cho các custom field (Epic Link, Sprint, Story Points...). Mặc định dùng ID phổ biến:

| Field | Default ID | Env var |
|-------|-----------|---------|
| Epic Link | `customfield_10008` | `JIRA_CF_EPIC_LINK` |
| Sprint | `customfield_10004` | `JIRA_CF_SPRINT` |
| Story Points | `customfield_10002` | `JIRA_CF_STORY_POINTS` |
| Start Date | `customfield_10015` | `JIRA_CF_START_DATE` |

**Nếu ID khác,** chạy 1 lần trong Claude Desktop:
```
Liệt kê custom fields chứa từ "epic", "sprint", "story", "start"
```

Lấy ID đúng → cập nhật `manifest.json` rồi rebuild.

---

## 👨‍💻 Phát triển

### Yêu cầu
- Node.js >= 18
- npm

### Setup
```bash
git clone https://github.com/nguyenquynh201/mcp-jira.git
cd mcp-jira
npm install
cp .env.example .env
# Sửa .env với credentials Jira của bạn
```

### Cấu trúc project
```
mcp-jira/
├── src/
│   └── index.ts           # MCP server (TypeScript)
├── dist/                  # Compiled JS (sinh ra bởi tsc)
├── manifest.json          # DXT manifest
├── package.json
├── tsconfig.json
├── prompts.md             # Template prompts cho member
├── .env.example
└── .github/workflows/
    └── release.yml        # CI/CD auto build & release
```

### Lệnh thường dùng

```bash
# Chạy dev (với hot reload)
npm run dev

# Build TypeScript
npm run build

# Chạy server đã build
npm start

# Pack thành file .dxt
npx tsc && dxt pack
```

### Test thủ công với MCP Inspector
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## 🚢 Release quy trình

CI/CD tự động build và publish khi có tag `v*`.

### Phát hành version mới

```bash
# 1. Sửa code
# 2. Bump version trong package.json và manifest.json
# 3. Commit
git add .
git commit -m "feat: thêm tool xyz"
git push

# 4. Tag và push tag
git tag v1.2.0
git push --tags
```

GitHub Actions sẽ tự động:
1. Build TypeScript
2. Pack `.dxt`
3. Tạo Release với file `.dxt` đính kèm

Member chỉ cần vào trang [Releases](../../releases/latest) tải bản mới.

---

## 🔒 Bảo mật

- ✅ Mỗi user nhập credentials **riêng** trên máy mình → Claude Desktop lưu mã hóa trong **OS keychain** (macOS Keychain / Windows Credential Manager)
- ✅ File `.env` được `.gitignore` không bị commit
- ✅ Server giao tiếp với Jira qua HTTPS
- ⚠️ **Khuyến nghị dùng Personal Access Token** thay password (lấy tại `https://jira.ikara.co/secure/ViewProfile.jspa` → Personal Access Tokens)

---

## 📋 Troubleshooting

### Extension không hiện trong Claude Desktop
- Đảm bảo Claude Desktop là phiên bản mới nhất
- Restart Claude Desktop sau khi cài

### Lỗi "401 Unauthorized"
- Sai username/password → vào Settings → Extensions → Jira → sửa lại

### Lỗi "404 Not Found" khi tạo issue
- Sai project key (phải viết HOA: `KF`, không phải `kf`)
- User của bạn không có quyền tạo issue trong project đó

### Lỗi "Field 'customfield_xxx' cannot be set"
- Custom field ID chưa đúng → chạy `list_custom_fields` để discover ID đúng

### Sprint/Epic không tìm thấy
- Project đó là Kanban (không có sprint) → bỏ field sprint
- Epic chưa có hoặc đã đóng → dùng `list_epics` xem epics có sẵn

---

## 🤝 Đóng góp

Mọi PR/issue đều welcome. Quy trình:
1. Fork repo
2. Tạo branch `feature/xyz` hoặc `fix/xyz`
3. Commit + push
4. Tạo Pull Request

---

## 📄 License

MIT — xem [LICENSE](./LICENSE)

---

## 🙏 Cảm ơn

Built with [Model Context Protocol](https://modelcontextprotocol.io/) và [DXT](https://github.com/anthropics/dxt) bởi Anthropic.
