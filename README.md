# 万能 API 测试工具

一个简洁美观的 Web 应用，用于快速测试各类 AI API 接口。

## 功能特性

- **多提供商支持**：OpenAI 兼容格式 / Anthropic
- **多任务类型**：
  - 对话 (Chat)
  - 视觉 (OCR)
  - 语音合成 (TTS)
  - 向量化 (Embedding)
  - 图像生成 (Image)
  - 重排序 (Reranker)
- **自定义配置**：支持自定义 Base URL、API Key、模型名称
- **实时响应**：显示请求耗时、JSON 响应、音频播放器等

## 技术栈

- React 19 + Vite 8
- Tailwind CSS 4
- Lucide React (图标)

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 使用说明

1. 选择 API 提供商（OpenAI 兼容格式 或 Anthropic）
2. 选择任务类型
3. 填写 Base URL 和 API Key
4. 输入测试内容，点击发送测试
