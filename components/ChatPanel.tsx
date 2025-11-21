
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { createChatSession, performWebSearch, transcribeAudio, generateSpeech } from '../services/geminiService';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: { uri: string; title: string }[];
}

interface ChatPanelProps {
  documentContext: string;
  isOpen: boolean;
  onClose: () => void;
}

// Audio util
const playAudio = async (base64Audio: string) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const buffer = await audioContext.decodeAudioData(bytes.buffer);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
};

export const ChatPanel: React.FC<ChatPanelProps> = ({ documentContext, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: 'Hello! I can help you analyze this document. Ask me anything.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Initialize chat session when context changes
  useEffect(() => {
    if (documentContext) {
        chatSessionRef.current = createChatSession(documentContext);
    }
  }, [documentContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        let responseText = '';
        let sources: any[] = [];

        if (useWebSearch) {
            // Use Gemini 2.5 Flash with Search Tool
            const result = await performWebSearch(userMsg.text);
            responseText = result.text || "I couldn't find anything.";
            
            // Extract grounding sources
            if (result.groundingMetadata?.groundingChunks) {
                sources = result.groundingMetadata.groundingChunks
                    .filter((c: any) => c.web?.uri)
                    .map((c: any) => ({ uri: c.web.uri, title: c.web.title || 'Source' }));
            }
        } else {
            // Use Chat Session (Gemini 3.0 Pro)
            if (!chatSessionRef.current) {
                chatSessionRef.current = createChatSession(documentContext);
            }
            const result = await chatSessionRef.current.sendMessage({ message: userMsg.text });
            responseText = result.text;
        }

        const modelMsg: ChatMessage = { 
            id: (Date.now() + 1).toString(), 
            role: 'model', 
            text: responseText,
            sources: sources.length > 0 ? sources : undefined
        };
        setMessages(prev => [...prev, modelMsg]);

    } catch (err) {
        console.error(err);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I encountered an error." }]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
      }
  };

  const handleRecordToggle = async () => {
      if (isRecording) {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const recorder = new MediaRecorder(stream);
              const chunks: Blob[] = [];
              
              recorder.ondataavailable = (e) => chunks.push(e.data);
              recorder.onstop = async () => {
                  const blob = new Blob(chunks, { type: 'audio/webm' }); 
                  const reader = new FileReader();
                  reader.readAsDataURL(blob);
                  reader.onloadend = async () => {
                      const base64 = (reader.result as string).split(',')[1];
                      setIsTyping(true);
                      try {
                          const text = await transcribeAudio(base64, blob.type);
                          setInput(prev => prev + (prev ? ' ' : '') + text);
                      } catch (e) {
                          console.error("Transcribe error", e);
                      } finally {
                          setIsTyping(false);
                      }
                  };
              };
              
              recorder.start();
              mediaRecorderRef.current = recorder;
              setIsRecording(true);
          } catch (err) {
              console.error("Mic permission denied", err);
          }
      }
  };

  const handleTTS = async (text: string) => {
      try {
          const audioData = await generateSpeech(text);
          if (audioData) {
              await playAudio(audioData);
          }
      } catch (e) {
          console.error("TTS Error", e);
      }
  };

  return (
    <div 
        className={`
            fixed top-0 right-0 h-full w-full md:w-[450px] bg-brand-surface border-l-2 border-brand-border shadow-2xl z-40 
            transform transition-transform duration-300 ease-in-out flex flex-col font-sans
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
    >
      {/* Header */}
      <div className="p-5 border-b-2 border-brand-border flex justify-between items-center bg-brand-surface/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center">
                 <Icon type="chat" className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-brand-text text-lg">AI Assistant</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-surface-highlight rounded-xl border-2 border-transparent hover:border-brand-border transition-all">
              <Icon type="x" className="w-5 h-5 text-brand-text-secondary" />
          </button>
      </div>

      {/* Options Bar */}
      <div className="px-5 py-3 bg-brand-bg border-b-2 border-brand-border flex items-center gap-4 text-xs font-medium">
          <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={useWebSearch} 
                    onChange={(e) => setUseWebSearch(e.target.checked)}
                    className="peer sr-only" 
                  />
                  <div className="w-9 h-5 bg-brand-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
              </div>
              <span className="text-brand-text-secondary group-hover:text-brand-primary transition-colors flex items-center gap-1">
                  <Icon type="search" className="w-3 h-3" /> Google Search
              </span>
          </label>
          <div className="h-4 w-0.5 bg-brand-border"></div>
          <span className="text-brand-text-secondary flex items-center gap-1">
             <Icon type="sparkles" className="w-3 h-3 text-brand-accent" /> 
             {useWebSearch ? 'Gemini 2.5 Flash' : 'Gemini 3.0 Pro'}
          </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-brand-bg/30">
          {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`
                        max-w-[85%] px-5 py-4 shadow-sm relative group
                        ${msg.role === 'user' 
                            ? 'bg-brand-primary text-white rounded-2xl rounded-br-none' 
                            : 'bg-brand-surface border-2 border-brand-border text-brand-text rounded-2xl rounded-bl-none'
                        }
                    `}
                  >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                      
                      {/* Sources */}
                      {msg.sources && (
                          <div className="mt-3 pt-2 border-t border-brand-border/20">
                              <p className="text-[10px] uppercase font-bold opacity-70 mb-2 flex items-center gap-1">
                                  <Icon type="branch" className="w-3 h-3" /> Sources
                              </p>
                              <div className="flex flex-wrap gap-2">
                                  {msg.sources.map((src, idx) => (
                                      <a 
                                        key={idx} 
                                        href={src.uri} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-[10px] px-2 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 font-bold truncate max-w-[150px] transition-colors"
                                      >
                                          {src.title}
                                      </a>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* TTS Button (Model only) */}
                      {msg.role === 'model' && (
                          <button 
                            onClick={() => handleTTS(msg.text)}
                            className="absolute -bottom-8 left-0 p-1.5 text-brand-text-secondary hover:text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity bg-brand-surface rounded-full border border-brand-border shadow-sm"
                            title="Read aloud"
                          >
                              <Icon type="speaker" className="w-3 h-3" />
                          </button>
                      )}
                  </div>
              </div>
          ))}
          {isTyping && (
              <div className="flex justify-start">
                  <div className="bg-brand-surface border-2 border-brand-border rounded-2xl px-4 py-3 rounded-bl-none">
                      <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-brand-text-secondary/40 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-brand-text-secondary/40 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-brand-text-secondary/40 rounded-full animate-bounce delay-200"></div>
                      </div>
                  </div>
              </div>
          )}
          <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-brand-surface border-t-2 border-brand-border">
          <div className="relative flex items-end gap-2 bg-brand-bg border-2 border-brand-border rounded-2xl p-2 focus-within:border-brand-primary transition-colors shadow-inner">
              <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none focus:ring-0 p-3 text-sm max-h-32 resize-none font-medium placeholder:text-brand-text-secondary/60"
                  rows={1}
                  style={{ minHeight: '48px' }}
              />
              <div className="flex items-center gap-2 pb-1.5 pr-1">
                  <button 
                    onClick={handleRecordToggle}
                    className={`p-2.5 rounded-xl transition-all active:scale-95 ${isRecording ? 'bg-red-500 text-white shadow-lg animate-pulse' : 'hover:bg-brand-surface-highlight text-brand-text-secondary hover:text-brand-primary'}`}
                    title="Voice Input"
                  >
                      <Icon type="mic" className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleSend}
                    disabled={!input.trim() && !isRecording}
                    className="p-2.5 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-[0_2px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[1px]"
                  >
                      <Icon type="send" className="w-5 h-5" />
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};
