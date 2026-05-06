import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios, { AxiosInstance } from "axios";
import { z } from "zod";

// Lọc placeholder chưa resolve (vd: "${user_config.jira_token}") thành empty
function clean(v: string | undefined): string {
  if (!v) return "";
  if (v.startsWith("${") && v.endsWith("}")) return "";
  return v.trim();
}

const JIRA_BASE_URL = clean(process.env.JIRA_BASE_URL) || "https://jira.ikara.co";
const JIRA_USERNAME = clean(process.env.JIRA_USERNAME);
const JIRA_PASSWORD = clean(process.env.JIRA_PASSWORD);
const JIRA_TOKEN = clean(process.env.JIRA_TOKEN);

function mask(s: string): string {
  if (!s) return "(empty)";
  if (s.length <= 4) return "***";
  return s.slice(0, 2) + "***" + s.slice(-2);
}

// Log auth method để debug (stderr -> hiện trong mcp-server log)
console.error(`[mcp-jira] BASE_URL: ${JIRA_BASE_URL}`);
if (JIRA_TOKEN) {
  console.error(`[mcp-jira] Auth method: Bearer Token (${mask(JIRA_TOKEN)})`);
} else if (JIRA_USERNAME && JIRA_PASSWORD) {
  console.error(`[mcp-jira] Auth method: Basic (user=${JIRA_USERNAME}, pass=${mask(JIRA_PASSWORD)})`);
} else {
  console.error(
    `[mcp-jira] ⚠️ THIẾU CREDENTIALS! USERNAME="${JIRA_USERNAME}" PASSWORD=${mask(JIRA_PASSWORD)} TOKEN=${mask(JIRA_TOKEN)}`
  );
}

// Custom field IDs - mỗi Jira instance có ID khác nhau.
// Chạy tool `list_custom_fields` để tìm ID đúng cho instance của bạn,
// rồi cấu hình lại trong .env / extension settings.
const CF_EPIC_LINK = process.env.JIRA_CF_EPIC_LINK || "customfield_10008";
const CF_SPRINT = process.env.JIRA_CF_SPRINT || "customfield_10004";
const CF_STORY_POINTS = process.env.JIRA_CF_STORY_POINTS || "customfield_10002";
const CF_START_DATE = process.env.JIRA_CF_START_DATE || "customfield_10015";
// End date dùng field chuẩn `duedate` của Jira

function makeAxios(baseURL: string): AxiosInstance {
  const authHeaders = JIRA_TOKEN ? { Authorization: `Bearer ${JIRA_TOKEN}` } : {};
  const authConfig = JIRA_TOKEN
    ? {}
    : { auth: { username: JIRA_USERNAME, password: JIRA_PASSWORD } };

  return axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders,
    },
    ...authConfig,
  });
}

const jira = makeAxios(`${JIRA_BASE_URL}/rest/api/2`);
const agile = makeAxios(`${JIRA_BASE_URL}/rest/agile/1.0`);

const server = new McpServer({
  name: "mcp-jira",
  version: "1.0.2",
});

// Debug tool: trả về status auth qua response để debug
server.tool(
  "debug_auth",
  "Debug: trả về trạng thái env vars và auth method đang dùng (mask sensitive)",
  {},
  async () => {
    const lines = [
      `Version: 1.0.2`,
      `BASE_URL: ${JIRA_BASE_URL}`,
      `USERNAME: "${JIRA_USERNAME}" (length=${JIRA_USERNAME.length})`,
      `PASSWORD: ${mask(JIRA_PASSWORD)} (length=${JIRA_PASSWORD.length})`,
      `TOKEN: ${mask(JIRA_TOKEN)} (length=${JIRA_TOKEN.length})`,
      ``,
      `Raw env (chưa qua clean()):`,
      `  JIRA_BASE_URL = ${JSON.stringify(process.env.JIRA_BASE_URL)}`,
      `  JIRA_USERNAME = ${JSON.stringify(process.env.JIRA_USERNAME)}`,
      `  JIRA_PASSWORD = ${process.env.JIRA_PASSWORD ? `(set, ${process.env.JIRA_PASSWORD.length} chars)` : "(unset)"}`,
      `  JIRA_TOKEN = ${process.env.JIRA_TOKEN ? `(set, ${process.env.JIRA_TOKEN.length} chars)` : "(unset)"}`,
      ``,
      `Auth method sẽ dùng: ${JIRA_TOKEN ? "Bearer Token" : JIRA_USERNAME && JIRA_PASSWORD ? "Basic Auth" : "⚠️ KHÔNG CÓ AUTH (anonymous)"}`,
    ];
    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

function errorText(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;
    const detail = typeof data === "object" ? JSON.stringify(data) : String(data);

    let hint = "";
    if (status === 401) {
      hint =
        "\n\n💡 Lỗi xác thực. Kiểm tra lại trong Claude Desktop → Settings → Extensions → Jira (Ikara) → Configure:\n" +
        "  - Username + Password đúng chưa?\n" +
        "  - Nếu Jira yêu cầu Personal Access Token (PAT), tạo PAT tại https://jira.ikara.co/secure/ViewProfile.jspa và điền vào ô Personal Access Token thay vì password.";
    } else if (status === 403) {
      hint = "\n\n💡 Account đã đăng nhập nhưng không có quyền thực hiện action này.";
    } else if (status === 404) {
      hint = "\n\n💡 Không tìm thấy resource. Kiểm tra project key, issue key có đúng không.";
    }

    return `Lỗi Jira (HTTP ${status}): ${detail}${hint}`;
  }
  return String(err);
}

// ============================================================
// MAIN: create_issue (đầy đủ field)
// ============================================================
server.tool(
  "create_issue",
  "Tạo một issue/task/bug mới trên Jira với đầy đủ các field",
  {
    project_key: z.string().describe("Key của project, ví dụ: KF, DEV"),
    issue_type: z
      .enum(["Task", "Bug", "Story", "Epic", "Sub-task"])
      .default("Task")
      .describe("Loại issue"),
    summary: z.string().describe("Tiêu đề"),
    description: z.string().optional().describe("Mô tả chi tiết"),
    priority: z
      .enum(["Highest", "High", "Medium", "Low", "Lowest"])
      .default("Medium")
      .describe("Độ ưu tiên (mặc định Medium)"),
    assignee: z
      .string()
      .optional()
      .describe(
        "Username chính xác của người được assign. Nếu chỉ biết tên hiển thị, dùng tool `search_users` trước để tìm username đúng."
      ),
    labels: z.array(z.string()).optional().describe("Danh sách labels"),
    fix_versions: z
      .array(z.string())
      .optional()
      .describe("Tên các fix version, ví dụ: ['v1.2.0']. Dùng `list_versions` để xem tên có sẵn."),
    epic_link: z
      .string()
      .optional()
      .describe(
        "Key của Epic muốn link, ví dụ: KF-100. Dùng `list_epics` để chọn epic có sẵn trong project."
      ),
    sprint_id: z
      .number()
      .optional()
      .describe("ID (số) của Sprint. Dùng `list_sprints` để lấy ID."),
    start_date: z
      .string()
      .optional()
      .describe("Ngày bắt đầu, format YYYY-MM-DD"),
    end_date: z
      .string()
      .optional()
      .describe("Ngày kết thúc / due date, format YYYY-MM-DD"),
    story_points: z.number().optional().describe("Story points"),
  },
  async (args) => {
    const fields: Record<string, unknown> = {
      project: { key: args.project_key },
      summary: args.summary,
      issuetype: { name: args.issue_type },
      priority: { name: args.priority },
    };

    if (args.description) fields.description = args.description;
    if (args.assignee) fields.assignee = { name: args.assignee };
    if (args.labels?.length) fields.labels = args.labels;
    if (args.fix_versions?.length)
      fields.fixVersions = args.fix_versions.map((name) => ({ name }));
    if (args.epic_link) fields[CF_EPIC_LINK] = args.epic_link;
    if (args.sprint_id !== undefined) fields[CF_SPRINT] = args.sprint_id;
    if (args.start_date) fields[CF_START_DATE] = args.start_date;
    if (args.end_date) fields.duedate = args.end_date;
    if (args.story_points !== undefined) fields[CF_STORY_POINTS] = args.story_points;

    try {
      const response = await jira.post("/issue", { fields });
      const { key, id } = response.data;
      return {
        content: [
          {
            type: "text",
            text: `✅ Đã tạo issue thành công!\n- Key: ${key}\n- ID: ${id}\n- URL: ${JIRA_BASE_URL}/browse/${key}`,
          },
        ],
      };
    } catch (err) {
      return { content: [{ type: "text", text: errorText(err) }], isError: true };
    }
  }
);

// ============================================================
// HELPER: search_users (tìm username từ tên hiển thị)
// ============================================================
server.tool(
  "search_users",
  "Tìm user trên Jira bằng tên hiển thị, email hoặc username. Dùng để lấy đúng `username` cho assignee.",
  {
    query: z.string().describe("Tên, email, hoặc một phần username"),
    max_results: z.number().default(10),
  },
  async ({ query, max_results }) => {
    try {
      const res = await jira.get("/user/search", {
        params: { username: query, maxResults: max_results },
      });
      const users: Array<{
        name: string;
        displayName: string;
        emailAddress?: string;
        active: boolean;
      }> = res.data;

      if (users.length === 0) {
        return { content: [{ type: "text", text: `Không tìm thấy user nào khớp "${query}".` }] };
      }

      const lines = users.map(
        (u) =>
          `- username: ${u.name} | ${u.displayName} | ${u.emailAddress || "không có email"} | ${u.active ? "active" : "inactive"}`
      );
      return {
        content: [{ type: "text", text: `Tìm thấy ${users.length} user:\n${lines.join("\n")}` }],
      };
    } catch (err) {
      return { content: [{ type: "text", text: errorText(err) }], isError: true };
    }
  }
);

// ============================================================
// HELPER: list_epics
// ============================================================
server.tool(
  "list_epics",
  "Liệt kê các Epic có sẵn trong một project (để dùng cho epic_link)",
  {
    project_key: z.string().describe("Key của project"),
    only_open: z.boolean().default(true).describe("Chỉ lấy epic chưa Done"),
    max_results: z.number().default(50),
  },
  async ({ project_key, only_open, max_results }) => {
    try {
      const jql = `project = ${project_key} AND issuetype = Epic${only_open ? " AND statusCategory != Done" : ""}`;
      const res = await jira.post("/search", {
        jql,
        maxResults: max_results,
        fields: ["summary", "status"],
      });
      const issues = res.data.issues as Array<{
        key: string;
        fields: { summary: string; status: { name: string } };
      }>;

      if (issues.length === 0) {
        return { content: [{ type: "text", text: "Không có epic nào." }] };
      }

      const lines = issues.map(
        (i) => `- [${i.key}] ${i.fields.summary} (${i.fields.status.name})`
      );
      return {
        content: [
          {
            type: "text",
            text: `Epics trong ${project_key} (${issues.length}):\n${lines.join("\n")}`,
          },
        ],
      };
    } catch (err) {
      return { content: [{ type: "text", text: errorText(err) }], isError: true };
    }
  }
);

// ============================================================
// HELPER: list_sprints
// ============================================================
server.tool(
  "list_sprints",
  "Liệt kê sprints của một project. Tự động tìm board của project và lấy sprints active + future.",
  {
    project_key: z.string().describe("Key của project"),
    state: z
      .enum(["active", "future", "closed", "active,future"])
      .default("active,future")
      .describe("Trạng thái sprint cần lấy"),
  },
  async ({ project_key, state }) => {
    try {
      const boardsRes = await agile.get("/board", {
        params: { projectKeyOrId: project_key },
      });
      const boards = boardsRes.data.values as Array<{ id: number; name: string }>;
      if (boards.length === 0) {
        return {
          content: [{ type: "text", text: `Không tìm thấy board nào cho project ${project_key}.` }],
        };
      }

      const allSprints: Array<{ id: number; name: string; state: string; boardName: string }> = [];
      for (const b of boards) {
        try {
          const sRes = await agile.get(`/board/${b.id}/sprint`, { params: { state } });
          for (const s of sRes.data.values as Array<{ id: number; name: string; state: string }>) {
            allSprints.push({ ...s, boardName: b.name });
          }
        } catch {
          // board không hỗ trợ sprint (Kanban) -> bỏ qua
        }
      }

      if (allSprints.length === 0) {
        return { content: [{ type: "text", text: "Không có sprint nào." }] };
      }

      const lines = allSprints.map(
        (s) => `- id: ${s.id} | ${s.name} | ${s.state} | board: ${s.boardName}`
      );
      return {
        content: [{ type: "text", text: `Sprints (${allSprints.length}):\n${lines.join("\n")}` }],
      };
    } catch (err) {
      return { content: [{ type: "text", text: errorText(err) }], isError: true };
    }
  }
);

// ============================================================
// HELPER: list_versions
// ============================================================
server.tool(
  "list_versions",
  "Liệt kê fix versions có sẵn của một project",
  { project_key: z.string() },
  async ({ project_key }) => {
    try {
      const res = await jira.get(`/project/${project_key}/versions`);
      const versions = res.data as Array<{ name: string; released: boolean; archived: boolean }>;
      if (versions.length === 0) {
        return { content: [{ type: "text", text: "Project chưa có version nào." }] };
      }
      const lines = versions.map(
        (v) => `- ${v.name}${v.released ? " (released)" : ""}${v.archived ? " (archived)" : ""}`
      );
      return {
        content: [
          { type: "text", text: `Versions của ${project_key}:\n${lines.join("\n")}` },
        ],
      };
    } catch (err) {
      return { content: [{ type: "text", text: errorText(err) }], isError: true };
    }
  }
);

// ============================================================
// HELPER: list_custom_fields (chạy 1 lần để discover field IDs)
// ============================================================
server.tool(
  "list_custom_fields",
  "Liệt kê các custom field của Jira instance để tìm ID đúng cho Epic Link, Sprint, Story Points... Chạy 1 lần khi setup.",
  {
    filter: z
      .string()
      .optional()
      .describe("Lọc theo tên (ví dụ: 'epic', 'sprint', 'story')"),
  },
  async ({ filter }) => {
    try {
      const res = await jira.get("/field");
      let fields = res.data as Array<{ id: string; name: string; custom: boolean }>;
      fields = fields.filter((f) => f.custom);
      if (filter) {
        const lower = filter.toLowerCase();
        fields = fields.filter((f) => f.name.toLowerCase().includes(lower));
      }
      const lines = fields.map((f) => `- ${f.id} → ${f.name}`);
      return {
        content: [
          {
            type: "text",
            text: `Custom fields (${fields.length}):\n${lines.join("\n")}\n\nĐặt env vars tương ứng:\n  JIRA_CF_EPIC_LINK\n  JIRA_CF_SPRINT\n  JIRA_CF_STORY_POINTS\n  JIRA_CF_START_DATE`,
          },
        ],
      };
    } catch (err) {
      return { content: [{ type: "text", text: errorText(err) }], isError: true };
    }
  }
);

// ============================================================
// EXISTING tools: get_issue, search_issues, transition_issue, add_comment, list_projects
// ============================================================
server.tool(
  "get_issue",
  "Lấy thông tin chi tiết một issue Jira",
  { issue_key: z.string() },
  async ({ issue_key }) => {
    try {
      const res = await jira.get(`/issue/${issue_key}`);
      const { key, fields } = res.data;
      const info = [
        `Key: ${key}`,
        `Tiêu đề: ${fields.summary}`,
        `Loại: ${fields.issuetype?.name}`,
        `Trạng thái: ${fields.status?.name}`,
        `Độ ưu tiên: ${fields.priority?.name || "—"}`,
        `Assignee: ${fields.assignee?.displayName || "Chưa assign"}`,
        `Reporter: ${fields.reporter?.displayName}`,
        `Tạo lúc: ${fields.created}`,
        `Cập nhật: ${fields.updated}`,
        `Mô tả: ${fields.description || "—"}`,
        `URL: ${JIRA_BASE_URL}/browse/${key}`,
      ].join("\n");
      return { content: [{ type: "text", text: info }] };
    } catch (err) {
      return { content: [{ type: "text", text: errorText(err) }], isError: true };
    }
  }
);

server.tool(
  "search_issues",
  "Tìm kiếm issues bằng JQL",
  {
    jql: z.string(),
    max_results: z.number().default(10),
  },
  async ({ jql, max_results }) => {
    try {
      const res = await jira.post("/search", {
        jql,
        maxResults: max_results,
        fields: ["summary", "status", "assignee", "priority", "issuetype"],
      });
      const { issues, total } = res.data;
      if (issues.length === 0) return { content: [{ type: "text", text: "Không tìm thấy." }] };

      const lines = [`Tìm thấy ${total}, hiển thị ${issues.length}:\n`];
      for (const i of issues) {
        const f = i.fields;
        lines.push(
          `- [${i.key}] ${f.summary} | ${f.issuetype?.name} | ${f.status?.name} | ${f.assignee?.displayName || "Chưa assign"}`
        );
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return { content: [{ type: "text", text: errorText(err) }], isError: true };
    }
  }
);

server.tool(
  "transition_issue",
  "Chuyển trạng thái issue",
  {
    issue_key: z.string(),
    transition_name: z.string(),
  },
  async ({ issue_key, transition_name }) => {
    try {
      const tRes = await jira.get(`/issue/${issue_key}/transitions`);
      const transitions: Array<{ id: string; name: string }> = tRes.data.transitions;
      const target = transitions.find(
        (t) => t.name.toLowerCase() === transition_name.toLowerCase()
      );
      if (!target) {
        return {
          content: [
            {
              type: "text",
              text: `Không thấy transition "${transition_name}". Các transition có thể: ${transitions
                .map((t) => t.name)
                .join(", ")}`,
            },
          ],
        };
      }
      await jira.post(`/issue/${issue_key}/transitions`, { transition: { id: target.id } });
      return { content: [{ type: "text", text: `✅ ${issue_key} → "${transition_name}".` }] };
    } catch (err) {
      return { content: [{ type: "text", text: errorText(err) }], isError: true };
    }
  }
);

server.tool(
  "add_comment",
  "Thêm comment vào issue",
  {
    issue_key: z.string(),
    comment: z.string(),
  },
  async ({ issue_key, comment }) => {
    try {
      await jira.post(`/issue/${issue_key}/comment`, { body: comment });
      return { content: [{ type: "text", text: `✅ Đã comment vào ${issue_key}.` }] };
    } catch (err) {
      return { content: [{ type: "text", text: errorText(err) }], isError: true };
    }
  }
);

server.tool("list_projects", "Liệt kê tất cả projects", {}, async () => {
  try {
    const res = await jira.get("/project");
    const projects = res.data as Array<{ key: string; name: string; projectTypeKey: string }>;
    const lines = projects.map((p) => `- [${p.key}] ${p.name} (${p.projectTypeKey})`);
    return {
      content: [{ type: "text", text: `Projects (${projects.length}):\n${lines.join("\n")}` }],
    };
  } catch (err) {
    return { content: [{ type: "text", text: errorText(err) }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Jira server đang chạy...");
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
