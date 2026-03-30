import React, { useState, useEffect } from 'react';
import { Settings, Send, Key, Link, Cpu, MessageSquare, AlertCircle, CheckCircle2, Copy, Image as ImageIcon, Binary, ListOrdered, FileText, XCircle, Loader2, Volume2, Scan, ImagePlus } from 'lucide-react';

const App = () => {
  const [provider, setProvider] = useState('openai');
  const [taskType, setTaskType] = useState('chat');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [prompt, setPrompt] = useState('你好！请做个简短的自我介绍。');
  const [documents, setDocuments] = useState('巴黎是法国的首都\n苹果是一种水果\n今天天气很好');
  const [imageUrl, setImageUrl] = useState('https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg');
  const [response, setResponse] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestTime, setRequestTime] = useState(0);

  useEffect(() => {
    if (provider === 'anthropic') {
      setBaseUrl('https://api.anthropic.com');
      if (taskType === 'chat') setModel('claude-3-haiku-20240307');
      if (taskType === 'embedding') setModel('voyage-2');
      if (taskType === 'image') setModel('proxy-image-model');
      if (taskType === 'reranker') setModel('proxy-reranker-model');
      if (taskType === 'tts') setModel('proxy-tts-model');
      if (taskType === 'ocr') setModel('claude-3-5-sonnet-20241022');
    } else {
      setBaseUrl('https://api.openai.com');
      if (taskType === 'chat') setModel('gpt-3.5-turbo');
      if (taskType === 'embedding') setModel('text-embedding-3-small');
      if (taskType === 'image') setModel('dall-e-3');
      if (taskType === 'reranker') setModel('bge-reranker-v2-m3');
      if (taskType === 'tts') setModel('tts-1');
      if (taskType === 'ocr') setModel('gpt-4o-mini');
    }
    setResponse(null);
    setAudioUrl(null);
    setError('');
  }, [provider, taskType]);

  const getFullUrl = () => {
    let cleanBase = baseUrl.trim().replace(/\/$/, '');

    if (provider === 'anthropic' && (taskType === 'chat' || taskType === 'ocr')) {
      return cleanBase.endsWith('/v1') ? `${cleanBase}/messages` : `${cleanBase}/v1/messages`;
    }

    let endpoint = '/chat/completions';
    if (taskType === 'embedding') endpoint = '/embeddings';
    if (taskType === 'image') endpoint = '/images/generations';
    if (taskType === 'reranker') endpoint = '/rerank';
    if (taskType === 'tts') endpoint = '/audio/speech';
    if (taskType === 'ocr') endpoint = '/chat/completions';

    return cleanBase.endsWith('/v1') ? `${cleanBase}${endpoint}` : `${cleanBase}/v1${endpoint}`;
  };

  const handleSendRequest = async () => {
    if (!apiKey.trim()) {
      setError('请输入 API Key');
      return;
    }
    if (!baseUrl.trim()) {
      setError('请输入 Base URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setResponse(null);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    const startTime = Date.now();

    try {
      const targetUrl = getFullUrl();
      let headers = {
        'Content-Type': 'application/json',
      };
      let body = {};

      if (provider === 'openai') {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
        body = { model: model.trim() };

        if (taskType === 'chat') {
          body.messages = [{ role: 'user', content: prompt }];
        } else if (taskType === 'embedding') {
          body.input = prompt;
        } else if (taskType === 'image') {
          body.prompt = prompt;
          body.n = 1;
          body.size = "1024x1024";
        } else if (taskType === 'reranker') {
          body.query = prompt;
          body.documents = documents.split('\n').filter(d => d.trim() !== '');
        } else if (taskType === 'tts') {
          body.input = prompt;
          body.voice = "alloy";
        } else if (taskType === 'ocr') {
          body.messages = [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl.trim() } }
              ]
            }
          ];
        }
      } else {
        headers['x-api-key'] = apiKey.trim();
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';

        if (taskType === 'chat') {
          body = { model: model.trim(), max_tokens: 1024, messages: [{ role: 'user', content: prompt }] };
        } else if (taskType === 'embedding') {
          body = { model: model.trim(), input: prompt };
        } else if (taskType === 'image') {
          body = { model: model.trim(), prompt: prompt, n: 1, size: "1024x1024" };
        } else if (taskType === 'reranker') {
          body = { model: model.trim(), query: prompt, documents: documents.split('\n').filter(d => d.trim() !== '') };
        } else if (taskType === 'tts') {
          body = { model: model.trim(), input: prompt, voice: "alloy" };
        } else if (taskType === 'ocr') {
          body = {
            model: model.trim(),
            max_tokens: 1024,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: imageUrl.trim() } }
                ]
              }
            ]
          };
        }
      }

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get('content-type');

      if (!res.ok) {
        let errData;
        try {
          errData = await res.json();
        } catch {
          throw new Error(`请求失败，状态码: ${res.status}`);
        }
        throw new Error(errData.error?.message || errData.error?.type || `请求失败，状态码: ${res.status}`);
      }

      if (contentType && (contentType.includes('audio') || taskType === 'tts')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setResponse({
          _meta: "此为二进制音频流，已在下方生成播放器",
          type: contentType,
          size_bytes: blob.size,
          status: "success"
        });
      } else {
        const data = await res.json();
        setResponse(data);
      }
    } catch (err) {
      setError(err.message || '网络请求失败，请检查 Base URL、API Key 或网络连接 (CORS)。');
    } finally {
      setIsLoading(false);
      setRequestTime(Date.now() - startTime);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-500 text-white rounded-xl shadow-sm">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">万能 API 测试工具</h1>
              <p className="text-sm text-gray-500">支持 Chat / Embedding / Image / Rerank / TTS / OCR</p>
            </div>
          </div>
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setProvider('openai')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                provider === 'openai' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              OpenAI / 兼容格式
            </button>
            <button
              onClick={() => setProvider('anthropic')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                provider === 'anthropic' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Anthropic
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
              <h2 className="text-lg font-semibold flex items-center">
                <Settings className="mr-2 w-5 h-5 text-gray-400" />
                接口配置
              </h2>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">测试任务类型</label>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                  <button onClick={() => setTaskType('chat')} className={`flex items-center justify-center px-2 py-2 rounded-lg border text-sm transition-all ${taskType === 'chat' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <MessageSquare className="w-4 h-4 mr-1.5" /> 对话
                  </button>
                  <button onClick={() => setTaskType('ocr')} className={`flex items-center justify-center px-2 py-2 rounded-lg border text-sm transition-all ${taskType === 'ocr' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Scan className="w-4 h-4 mr-1.5" /> 视觉
                  </button>
                  <button onClick={() => setTaskType('tts')} className={`flex items-center justify-center px-2 py-2 rounded-lg border text-sm transition-all ${taskType === 'tts' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Volume2 className="w-4 h-4 mr-1.5" /> 语音
                  </button>
                  <button onClick={() => setTaskType('embedding')} className={`flex items-center justify-center px-2 py-2 rounded-lg border text-sm transition-all ${taskType === 'embedding' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Binary className="w-4 h-4 mr-1.5" /> 向量
                  </button>
                  <button onClick={() => setTaskType('image')} className={`flex items-center justify-center px-2 py-2 rounded-lg border text-sm transition-all ${taskType === 'image' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <ImageIcon className="w-4 h-4 mr-1.5" /> 生图
                  </button>
                  <button onClick={() => setTaskType('reranker')} className={`flex items-center justify-center px-2 py-2 rounded-lg border text-sm transition-all ${taskType === 'reranker' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <ListOrdered className="w-4 h-4 mr-1.5" /> 重排
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Link className="mr-1.5 w-4 h-4 text-gray-400" /> Base URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Key className="mr-1.5 w-4 h-4 text-gray-400" /> API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Cpu className="mr-1.5 w-4 h-4 text-gray-400" /> 模型 (Model)
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-3.5-turbo"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
              <h2 className="text-lg font-semibold flex items-center mb-4">
                <MessageSquare className="mr-2 w-5 h-5 text-gray-400" />
                请求测试
              </h2>

              <div className="space-y-4 mb-4">
                {taskType === 'ocr' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <ImagePlus className="w-4 h-4 mr-1 text-gray-400" />
                      待分析图片的 URL
                    </label>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    {provider === 'anthropic' && (
                      <p className="text-xs text-orange-500 mt-1">注: 许多第三方中转通过 OpenAI 视觉格式代理 Claude 模型，如果报错可尝试切换为 OpenAI 提供商。</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {taskType === 'embedding' ? '待向量化的文本 (Input)' :
                      taskType === 'image' ? '图像描述词 (Prompt)' :
                        taskType === 'tts' ? '需要合成语音的文本 (Text)' :
                          taskType === 'ocr' ? '对图片的提问 (Prompt)' :
                            taskType === 'reranker' ? '检索查询词 (Query)' : '测试提示词 (Prompt)'}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={taskType === 'tts' ? 5 : 3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  />
                </div>

                {taskType === 'reranker' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-1 text-gray-400" />
                      待重排文档 (Documents，每行一个)
                    </label>
                    <textarea
                      value={documents}
                      onChange={(e) => setDocuments(e.target.value)}
                      rows="4"
                      placeholder="文档1\n文档2\n文档3"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="text-xs text-gray-400 font-mono break-all bg-gray-50 p-2 rounded-lg flex-1 border border-gray-100">
                  <span className="font-semibold text-blue-500">POST</span> {getFullUrl()}
                </div>
                <button
                  onClick={handleSendRequest}
                  disabled={isLoading}
                  className={`flex items-center justify-center px-6 py-2.5 rounded-lg text-white font-medium transition-all whitespace-nowrap ${
                    isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? '请求中...' : '发送测试'}
                </button>
              </div>

              {isLoading && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center text-blue-600 transition-all">
                  <Loader2 className="animate-spin w-5 h-5 mr-2 flex-shrink-0" />
                  <span className="font-medium">正在连接 API，请稍候...</span>
                </div>
              )}

              {!isLoading && error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col sm:flex-row sm:items-center text-red-700 shadow-sm transition-all">
                  <div className="flex items-center mb-2 sm:mb-0">
                    <XCircle className="w-6 h-6 mr-2 flex-shrink-0 text-red-500" />
                    <span className="font-bold text-lg mr-4">测试失败</span>
                  </div>
                  <div className="text-sm break-all sm:border-l sm:border-red-200 sm:pl-4 opacity-90 flex-1">
                    {error}
                  </div>
                </div>
              )}

              {!isLoading && response && !error && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col sm:flex-row sm:items-center text-green-800 shadow-sm transition-all">
                  <div className="flex items-center mb-2 sm:mb-0">
                    <CheckCircle2 className="w-6 h-6 mr-2 flex-shrink-0 text-green-500" />
                    <span className="font-bold text-lg mr-4">测试成功</span>
                  </div>
                  <div className="text-sm sm:border-l sm:border-green-300 sm:pl-4 opacity-90 flex-1 flex items-center">
                    <span>接口连接正常，耗时 <strong className="font-mono text-green-600">{requestTime}</strong> ms</span>
                  </div>
                </div>
              )}

              {taskType === 'tts' && audioUrl && (
                <div className="mt-2 mb-4 p-5 border border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center shadow-inner">
                  <span className="text-sm font-medium text-gray-600 mb-3 flex items-center"><Volume2 className="w-4 h-4 mr-2 text-blue-500" /> 生成的音频预览</span>
                  <audio src={audioUrl} controls className="w-full max-w-md h-12" />
                </div>
              )}

              {taskType === 'image' && response?.data?.[0]?.url && (
                <div className="mt-2 mb-4 p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center">
                  <span className="text-sm font-medium text-gray-600 mb-3 flex items-center"><ImageIcon className="w-4 h-4 mr-2 text-blue-500" /> 生成的图片预览</span>
                  <img src={response.data[0].url} alt="Generated" className="max-w-full h-auto rounded-lg shadow-sm max-h-[300px]" />
                </div>
              )}

              {taskType === 'ocr' && imageUrl && (
                <div className="mt-2 mb-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col p-4">
                  <span className="text-xs text-gray-500 mb-2">输入图片预览：</span>
                  <img src={imageUrl} alt="OCR Target" className="max-h-32 object-contain self-start rounded border border-gray-300" onError={(e) => { e.target.style.display = 'none' }} />
                </div>
              )}

              <div className="mt-4 flex-1 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">响应结果 {taskType === 'tts' && audioUrl ? '(Meta)' : '(JSON)'}</label>
                  {response && (
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(response, null, 2))}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex items-center text-xs"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" /> 复制
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-gray-900 rounded-xl p-4 overflow-hidden relative group">
                  <pre className="text-sm text-green-400 font-mono overflow-auto h-full whitespace-pre-wrap break-all">
                    {response ? (
                      JSON.stringify(response, null, 2)
                    ) : (
                      <span className="text-gray-500">等待发起请求...</span>
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
