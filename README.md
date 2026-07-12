# 装了吗 - 今天你装了吗？😎

帮学编程的同学一键安装软件的全栈系统。

## 项目结构

```
project_1/
├── server/              # Python FastAPI 服务端
├── desktop/             # Electron 桌面应用
├── admin/               # Web 管理后台
├── setup_ai_config.py   # AI 配置自动提取工具
└── PROGRESS.md          # 开发进度
```

## 快速开始

### 1. 配置 AI

```bash
# 自动从 Cursor 设置中提取 AI API Key
python setup_ai_config.py

# 或者手动配置
cp server/.env.example server/.env
# 编辑 server/.env，填入 AI_API_KEY
```

### 2. 启动服务端

```bash
cd server
pip install -r requirements.txt
python main.py
# 运行在 http://localhost:8000
```

### 3. 启动桌面应用

```bash
cd desktop
npm install
npm run dev
# Electron 应用会自动打开
```

### 4. 启动管理后台

```bash
cd admin
npm install
npm run dev
# 运行在 http://localhost:5174
# 默认管理员密码: admin123
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/presets | 获取预置软件列表 |
| POST | /api/software/search | 搜索软件（AI 识别） |
| POST | /api/software/{name}/guide | 生成/获取安装方案 |
| POST | /api/software/{name}/install-script | 获取纯安装脚本 |
| POST | /api/feedback | 提交反馈 |
| POST | /api/admin/login | 管理员登录 |
| GET | /api/admin/guides | 管理方案列表 |
| PUT | /api/admin/guides/{id} | 编辑方案 |
| DELETE | /api/admin/guides/{id} | 删除方案 |
| POST | /api/admin/guides/{id}/regenerate | AI 重新生成 |
| GET | /api/admin/feedback | 反馈列表 |
| PUT | /api/admin/feedback/{id} | 标记已处理 |
| GET | /api/admin/stats | 统计数据 |
