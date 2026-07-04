const mockPlugins = [
  {
    id: "memory",
    icon: "☁",
    name: "记忆同步",
    type: "Skill",
    desc: "自动总结、归档和检索长期记忆",
    enabled: true,
    status: "正常",
    tone: "success",
    calls: 12,
    endpoint: "local://skill/memory-sync"
  },
  {
    id: "terminal",
    icon: "⌘",
    name: "终端执行器",
    type: "Tool",
    desc: "执行 Ubuntu / Shell / Python 工作流",
    enabled: true,
    status: "运行中",
    tone: "blue",
    calls: 8,
    endpoint: "local://tool/terminal"
  },
  {
    id: "browser",
    icon: "⌕",
    name: "深度搜索",
    type: "MCP",
    desc: "网页检索、摘要、引用与结果缓存",
    enabled: true,
    status: "正常",
    tone: "success",
    calls: 9,
    endpoint: "mcp://deep-search"
  },
  {
    id: "screen",
    icon: "▣",
    name: "识屏代理",
    type: "Agent",
    desc: "读取屏幕结构并辅助自动点击",
    enabled: true,
    status: "需授权",
    tone: "warning",
    calls: 1,
    endpoint: "local://agent/screen"
  },
  {
    id: "files",
    icon: "▤",
    name: "文件管家",
    type: "Tool",
    desc: "读写、搜索、解压缩与格式转换",
    enabled: true,
    status: "正常",
    tone: "success",
    calls: 5,
    endpoint: "local://tool/files"
  },
  {
    id: "notify",
    icon: "◌",
    name: "通知中心",
    type: "Workflow",
    desc: "聚合推送、任务结果与失败告警",
    enabled: false,
    status: "关闭",
    tone: "muted",
    calls: 0,
    endpoint: "local://workflow/notify"
  },
  {
    id: "image",
    icon: "◎",
    name: "图像工具包",
    type: "Skill",
    desc: "OCR、图片理解、绘图与素材管理",
    enabled: true,
    status: "正常",
    tone: "success",
    calls: 6,
    endpoint: "local://skill/image"
  },
  {
    id: "scheduler",
    icon: "◷",
    name: "定时触发器",
    type: "Workflow",
    desc: "按时间、语音或 Tasker 事件触发",
    enabled: true,
    status: "运行中",
    tone: "blue",
    calls: 5,
    endpoint: "local://workflow/scheduler"
  }
];

const mockJobs = [
  { month: "每天", day: "08", name: "晨间摘要", desc: "整理昨夜消息、任务失败与待办事项", next: "还有 10 小时" },
  { month: "每周", day: "一", name: "插件健康检查", desc: "检查端点、权限、依赖和日志异常", next: "还有 3 天" },
  { month: "触发", day: "语", name: "语音唤醒工作流", desc: "听到关键词后启动指定 Skill 链路", next: "待命中" },
  { month: "Tasker", day: "T", name: "电量保护模式", desc: "低电量时暂停高耗能插件", next: "待触发" }
];

const logs = [
  { time: "22:18", text: "终端执行器完成 Python 脚本，耗时 2.1s" },
  { time: "22:12", text: "深度搜索调用成功，返回 6 条结果" },
  { time: "21:58", text: "识屏代理缺少无障碍权限，已进入待授权状态" },
  { time: "21:30", text: "记忆同步新增 3 条长期记忆" }
];

let plugins = [...mockPlugins];
let selectedPlugin = plugins[0];

const bridge = {
  async listPlugins() {
    if (window.OperitBridge?.listPlugins) {
      return JSON.parse(await window.OperitBridge.listPlugins());
    }
    return plugins;
  },
  async updatePlugin(id, patch) {
    if (window.OperitBridge?.updatePlugin) {
      return window.OperitBridge.updatePlugin(id, JSON.stringify(patch));
    }
    plugins = plugins.map(plugin => plugin.id === id ? { ...plugin, ...patch } : plugin);
    return true;
  },
  async testPlugin(id) {
    if (window.OperitBridge?.testPlugin) {
      return window.OperitBridge.testPlugin(id);
    }
    return `插件 ${id} 连接正常`;
  }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function renderMetrics() {
  const enabled = plugins.filter(item => item.enabled).length;
  const running = plugins.filter(item => item.status === "运行中").length;
  const calls = plugins.reduce((sum, item) => sum + item.calls, 0);
  $("#enabledCount").textContent = String(enabled).padStart(2, "0");
  $("#totalPlugins").textContent = String(plugins.length).padStart(2, "0");
  $("#runningJobs").textContent = running;
  $("#todayRuns").textContent = calls;
}

function toneClass(tone) {
  if (tone === "success") return "success";
  if (tone === "warning") return "warning";
  if (tone === "danger") return "danger";
  if (tone === "muted") return "muted";
  return "";
}

function renderHome() {
  $("#homeList").innerHTML = plugins.map(plugin => `
    <article class="event-card">
      <div class="event-icon">${plugin.icon}</div>
      <div class="event-main">
        <h3>${plugin.name}</h3>
        <p>${plugin.desc}</p>
      </div>
      <div class="badge ${toneClass(plugin.tone)}">
        ${plugin.status}
        <small>${plugin.calls} 次</small>
      </div>
    </article>
  `).join("");
}

function renderPlugins(keyword = "") {
  const lower = keyword.trim().toLowerCase();
  const filtered = plugins.filter(plugin =>
    plugin.name.toLowerCase().includes(lower) ||
    plugin.type.toLowerCase().includes(lower) ||
    plugin.desc.toLowerCase().includes(lower)
  );
  $("#pluginGrid").innerHTML = filtered.map(plugin => `
    <article class="plugin-card">
      <header>
        <div class="plugin-icon">${plugin.icon}</div>
        <label class="switch" aria-label="启用 ${plugin.name}">
          <input type="checkbox" data-enable="${plugin.id}" ${plugin.enabled ? "checked" : ""} />
          <span></span>
        </label>
      </header>
      <h3>${plugin.name}</h3>
      <p>${plugin.desc}</p>
      <footer>
        <span class="pill">${plugin.type}</span>
        <button class="config-btn" data-config="${plugin.id}">配置</button>
      </footer>
    </article>
  `).join("");

  $$('[data-enable]').forEach(input => {
    input.addEventListener('change', async event => {
      const id = event.currentTarget.dataset.enable;
      await bridge.updatePlugin(id, {
        enabled: event.currentTarget.checked,
        status: event.currentTarget.checked ? "正常" : "关闭",
        tone: event.currentTarget.checked ? "success" : "muted"
      });
      refresh();
      toast(event.currentTarget.checked ? "插件已启用" : "插件已关闭");
    });
  });

  $$('[data-config]').forEach(button => {
    button.addEventListener('click', () => openSheet(button.dataset.config));
  });
}

function renderJobs() {
  $("#jobBoard").innerHTML = mockJobs.map(job => `
    <article class="job-card">
      <div class="job-date"><span>${job.month}</span><span>${job.day}</span></div>
      <div>
        <h3>${job.name}</h3>
        <p>${job.desc}</p>
        <p class="pill">${job.next}</p>
      </div>
    </article>
  `).join("");
}

function renderLogs() {
  $("#logPanel").innerHTML = logs.map(log => `
    <article class="log-item">
      <time>${log.time}</time>
      <p>${log.text}</p>
    </article>
  `).join("");
}

function refresh() {
  renderMetrics();
  renderHome();
  renderPlugins($("#pluginSearch")?.value ?? "");
  renderJobs();
  renderLogs();
}

function openSheet(id) {
  selectedPlugin = plugins.find(plugin => plugin.id === id) ?? plugins[0];
  $("#sheetType").textContent = selectedPlugin.type;
  $("#sheetTitle").textContent = selectedPlugin.name;
  $("#endpointInput").value = selectedPlugin.endpoint;
  $("#pluginSheet").showModal();
}

function toast(message) {
  const old = $(".toast");
  if (old) old.remove();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  $("#app").appendChild(node);
  setTimeout(() => node.remove(), 2400);
}

$$('[data-tab]').forEach(button => {
  button.addEventListener('click', () => {
    const page = button.dataset.tab;
    $$('[data-tab]').forEach(item => item.classList.toggle('active', item === button));
    $$('.page').forEach(item => item.classList.toggle('active', item.dataset.page === page));
  });
});

$("#pluginSearch").addEventListener("input", event => renderPlugins(event.target.value));
$("#syncPlugins").addEventListener("click", async () => {
  plugins = await bridge.listPlugins();
  refresh();
  toast("插件列表已同步");
});
$("#runAllJobs").addEventListener("click", () => toast("已提交全部任务"));
$("#openCreate").addEventListener("click", () => toast("这里可以接入任务创建页"));
$("#openSearch").addEventListener("click", () => {
  $$('[data-tab]').find(btn => btn.dataset.tab === 'plugins').click();
  $("#pluginSearch").focus();
});
$("#clearLogs").addEventListener("click", () => toast("演示环境未真实清空日志"));
$("#testPlugin").addEventListener("click", async () => {
  const result = await bridge.testPlugin(selectedPlugin.id);
  toast(result);
});
$("#pluginSheet").addEventListener("close", async () => {
  if ($("#pluginSheet").returnValue === "default") {
    await bridge.updatePlugin(selectedPlugin.id, {
      endpoint: $("#endpointInput").value
    });
    refresh();
    toast("配置已保存");
  }
});

refresh();
