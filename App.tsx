
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateMindMapStructure, generateQuickSummary } from './services/geminiService';
import { extractTextFromFile } from './services/fileParser';
import { MindMapNodeData } from './types';
import MindMap from './components/MindMap';
import { Icon } from './components/Icon';
import { ChatPanel } from './components/ChatPanel';

declare const jspdf: any;

const BRANCH_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', 
  '#ec4899', '#06b6d4', '#ef4444', '#6366f1'
];

const LOADING_STEPS = [
    "Reading document architecture...",
    "Extracting semantic entities...",
    "Identifying core relationships...",
    "Calculating tree topology...",
    "Deep reasoning on branch structure...",
    "Optimizing node hierarchy...",
    "Finalizing visualization..."
];

const App: React.FC = () => {
  // --- State ---
  const [documentText, setDocumentText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [mindMapData, setMindMapData] = useState<MindMapNodeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MindMapNodeData[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // New AI Features State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [quickSummary, setQuickSummary] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('mind-map-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // --- Effects ---

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('mind-map-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
        setLoadingStep(0);
        interval = setInterval(() => {
            setLoadingStep(prev => (prev + 1) % LOADING_STEPS.length);
        }, 1800);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const searchInMindMap = useCallback((query: string, node: MindMapNodeData | null): MindMapNodeData[] => {
    if (!node) return [];
    let matches: MindMapNodeData[] = [];
    const lowerCaseQuery = query.toLowerCase();
    if (node.topic.toLowerCase().includes(lowerCaseQuery) || node.content.toLowerCase().includes(lowerCaseQuery)) {
        matches.push(node);
    }
    for (const child of node.children) {
        matches = matches.concat(searchInMindMap(query, child));
    }
    return matches;
  }, []);

  useEffect(() => {
    if (searchQuery.trim() && mindMapData) {
      setSearchResults(searchInMindMap(searchQuery, mindMapData));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, mindMapData, searchInMindMap]);

  // --- Handlers ---

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const handleGenerateMindMap = useCallback(async () => {
    if (!documentText.trim()) {
      setError('Please enter text or upload a file first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setMindMapData(null);
    setSearchQuery('');
    try {
      const data = await generateMindMapStructure(documentText);
      setMindMapData(data);
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [documentText]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    try {
      const text = await extractTextFromFile(file);
      setDocumentText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      try {
        const text = await extractTextFromFile(file);
        setDocumentText(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file.');
      }
    }
  };

  const handleExportPdf = useCallback(() => {
    if (!mindMapData) return;
    try {
      const { jsPDF } = jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15; // Tighter margin
      const contentWidth = pageWidth - (margin * 2);
      let cursorY = 20;

      // Helper: Check for page break
      const checkSpace = (heightNeeded: number) => {
        if (cursorY + heightNeeded > pageHeight - margin) {
          doc.addPage();
          cursorY = margin + 10; // Extra top margin on new pages
        }
      };

      // Helper: Hex to RGB
      const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16)
          } : { r: 0, g: 0, b: 0 };
      };

      // --- Title Section ---
      // Gradient-like header bar
      doc.setFillColor(56, 189, 248); // Brand Primary
      doc.rect(0, 0, pageWidth, 15, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(33, 37, 41);
      
      const title = mindMapData.topic || "Mind Map Report";
      const titleLines = doc.splitTextToSize(title, contentWidth);
      doc.text(titleLines, margin, cursorY + 10);
      cursorY += (titleLines.length * 12) + 5;

      // Root Summary Box
      if (mindMapData.content) {
          doc.setFillColor(243, 248, 252); // Light Blue BG
          doc.setDrawColor(203, 213, 225); // Border
          doc.setLineWidth(0.5);
          
          doc.setFont("helvetica", "italic");
          doc.setFontSize(11);
          doc.setTextColor(71, 85, 105);
          
          const summaryLines = doc.splitTextToSize(mindMapData.content, contentWidth - 10);
          const boxHeight = (summaryLines.length * 6) + 10;
          
          doc.roundedRect(margin, cursorY, contentWidth, boxHeight, 3, 3, 'FD');
          doc.text(summaryLines, margin + 5, cursorY + 8);
          
          cursorY += boxHeight + 15;
      } else {
          cursorY += 10;
      }

      // --- Recursive Render Function ---
      const renderNode = (node: MindMapNodeData, depth: number, colorHex: string, parentX: number) => {
        const rgb = hexToRgb(colorHex);
        
        // Level 1: Major Sections
        if (depth === 0) {
             node.children.forEach((child, idx) => {
                 const branchColor = BRANCH_COLORS[idx % BRANCH_COLORS.length];
                 const childRgb = hexToRgb(branchColor);
                 
                 // Section Header
                 checkSpace(40); // Ensure enough space for header + at least one line
                 
                 // Colored Section Bar
                 doc.setFillColor(childRgb.r, childRgb.g, childRgb.b);
                 doc.roundedRect(margin, cursorY, contentWidth, 10, 2, 2, 'F');
                 
                 doc.setFont("helvetica", "bold");
                 doc.setFontSize(14);
                 doc.setTextColor(255, 255, 255);
                 doc.text(child.topic.toUpperCase(), margin + 5, cursorY + 7);
                 
                 cursorY += 14;
                 
                 // Section Content
                 if (child.content) {
                     doc.setFont("helvetica", "normal");
                     doc.setFontSize(11);
                     doc.setTextColor(51, 65, 85);
                     const contentLines = doc.splitTextToSize(child.content, contentWidth - 5);
                     checkSpace(contentLines.length * 5);
                     doc.text(contentLines, margin + 2, cursorY);
                     cursorY += (contentLines.length * 5) + 4;
                 }
                 
                 // Render Children
                 if (child.children && child.children.length > 0) {
                     // Two-column layout for Level 2 if space permits? 
                     // For now, let's stick to a clean indented list but with visual connectors
                     child.children.forEach(grandChild => {
                         renderNode(grandChild, depth + 2, branchColor, margin + 5);
                     });
                 }
                 
                 cursorY += 8; // Spacing between sections
             });
             return;
        }

        // Level 2+: Sub-items
        const indent = parentX + 5;
        const availableW = pageWidth - margin - indent;
        
        checkSpace(15);
        
        // Bullet Point Style
        doc.setDrawColor(rgb.r, rgb.g, rgb.b);
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.circle(indent - 4, cursorY - 1, 1.5, 'F');
        
        // Topic
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59); // Dark Slate
        
        const topicLines = doc.splitTextToSize(node.topic, availableW);
        doc.text(topicLines, indent, cursorY);
        const topicHeight = topicLines.length * 5;
        
        // Content (Inline or Block)
        let contentHeight = 0;
        if (node.content) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139); // Slate 500
            
            // If topic is short, try to put content on same line?
            // Let's keep it structured: Topic -> Content block
            const contentLines = doc.splitTextToSize(node.content, availableW);
            checkSpace(topicHeight + (contentLines.length * 4));
            
            doc.text(contentLines, indent, cursorY + topicHeight);
            contentHeight = (contentLines.length * 4.5);
        }
        
        // Vertical Line Connector (Thread)
        // Draw line from bullet down to end of content
        const totalItemHeight = topicHeight + contentHeight;
        // doc.setLineWidth(0.2);
        // doc.line(indent - 4, cursorY, indent - 4, cursorY + totalItemHeight);

        cursorY += totalItemHeight + 4;

        // Recursion
        if (node.children) {
            node.children.forEach(child => renderNode(child, depth + 1, colorHex, indent + 5));
        }
      };

      renderNode(mindMapData, 0, '#000000', margin);

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          
          // Footer Line
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184);
          
          doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
          
          doc.setTextColor(56, 189, 248); // Brand Color
          doc.text("MindMap.AI", pageWidth - margin, pageHeight - 7, { align: 'right' });
      }

      doc.save(`${fileName || 'mindmap'}_report.pdf`);
    } catch (err) {
      console.error(err);
      setError('Failed to export PDF.');
    }
  }, [mindMapData, fileName]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-bg relative font-sans">
      
      {/* Components Overlays */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} documentContext={documentText || mindMapData?.content || ""} />

      {/* Loading State (Animated Orb) */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm text-white animate-fade-in">
           <div className="relative w-64 h-64 animate-float">
              <div className="absolute inset-0 rounded-full border-2 border-brand-primary/30 animate-spin-slow"></div>
              <div className="absolute inset-4 rounded-full border-2 border-brand-accent/30 animate-spin-reverse-slow"></div>
              
              <div className="absolute inset-8 rounded-full bg-gradient-to-b from-brand-primary to-brand-accent blur-md opacity-60 animate-pulse-slow"></div>
              <div className="absolute inset-8 rounded-full shadow-[inset_-10px_-10px_30px_rgba(0,0,0,0.5),inset_10px_10px_30px_rgba(255,255,255,0.2)] bg-white/10 backdrop-blur-sm"></div>
              
              <div className="absolute inset-0 flex items-center justify-center z-10">
                  <span className="text-lg font-bold tracking-[0.2em] text-white drop-shadow-md">
                      THINKING
                  </span>
              </div>
           </div>
           
           <div className="mt-12 space-y-2 text-center max-w-md">
               <h3 className="text-2xl font-bold text-brand-primary">
                   Processing Data
               </h3>
               <div className="h-6 overflow-hidden">
                   <p className="text-sm text-brand-text-secondary/80 font-medium">
                       {`> ${LOADING_STEPS[loadingStep]}`}
                   </p>
               </div>
           </div>
        </div>
      )}
      
      {/* Sidebar - Simple Anime Style */}
      <div 
        className={`
            bg-brand-surface border-r-2 border-brand-border shadow-anime flex flex-col z-30 transition-all duration-300 ease-in-out relative
            ${isSidebarCollapsed ? 'w-0 md:w-20' : 'w-full md:w-80'}
        `}
      >
        {/* Header Logo */}
        <div className={`p-6 flex items-center justify-between ${isSidebarCollapsed ? 'md:justify-center' : ''}`}>
          {!isSidebarCollapsed && (
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-primary-hover rounded-2xl flex items-center justify-center text-white shadow-md transform -rotate-3">
                    <Icon type="branch" className="w-6 h-6" />
                 </div>
                 <span className="font-bold text-brand-text text-xl tracking-tight">MindMap<span className="text-brand-primary">.AI</span></span>
             </div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            className="p-2 rounded-xl hover:bg-brand-surface-highlight text-brand-text-secondary border-2 border-transparent hover:border-brand-border transition-all"
          >
             <Icon type={isSidebarCollapsed ? 'sidebar-open' : 'sidebar-close'} className="w-5 h-5" />
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto px-5 space-y-6 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
           
           {/* Import Section - Cute Card */}
           <div 
                className={`
                    border-2 border-dashed rounded-3xl p-6 text-center transition-all cursor-pointer relative group
                    ${dragActive ? 'border-brand-primary bg-brand-primary/5 scale-105' : 'border-brand-border hover:border-brand-primary/50 hover:bg-brand-surface-highlight'}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
           >
               <div className="w-12 h-12 mx-auto mb-3 bg-brand-surface-highlight rounded-full flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform duration-300">
                   <Icon type="upload" className="w-6 h-6" />
               </div>
               <p className="text-sm font-bold text-brand-text mb-1 group-hover:text-brand-primary transition-colors">
                   Upload Document
               </p>
               <p className="text-xs text-brand-text-secondary">
                   TXT, PDF, DOCX
               </p>
               <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept=".txt,.pdf,.docx"
               />
               {fileName && (
                   <div className="mt-4 p-2 bg-brand-surface shadow-sm rounded-xl flex items-center gap-2 text-xs text-brand-text border-2 border-brand-border animate-pop">
                       <Icon type="file" className="w-4 h-4 text-brand-accent" />
                       <span className="truncate font-medium">{fileName}</span>
                   </div>
               )}
           </div>

           {/* Text Area */}
           <div className="space-y-3">
               <label className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider ml-1">Or Paste Content</label>
               <textarea
                   className="w-full h-48 bg-brand-bg/50 border-2 border-brand-border rounded-2xl p-4 text-sm text-brand-text focus:ring-0 focus:border-brand-primary outline-none resize-none transition-all placeholder:text-brand-text-secondary/50"
                   placeholder="Type or paste your notes here..."
                   value={documentText}
                   onChange={(e) => setDocumentText(e.target.value)}
               ></textarea>
           </div>

           {/* Generate Button - Pop Style */}
           <button
              onClick={handleGenerateMindMap}
              disabled={isLoading || !documentText}
              className={`
                  w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-200 transform
                  ${!documentText 
                    ? 'bg-brand-border text-brand-text-secondary cursor-not-allowed' 
                    : 'bg-brand-primary text-white shadow-[0_4px_0_0_rgba(0,0,0,0.1)] hover:-translate-y-1 active:translate-y-[2px] active:shadow-none'
                  }
              `}
           >
               <Icon type="sparkles" className="w-5 h-5" />
               <span>GENERATE MAP</span>
           </button>

           {error && (
               <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-100 flex items-start gap-3 animate-pop">
                   <Icon type="alert" className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                   <p className="text-xs font-medium text-red-600">{error}</p>
               </div>
           )}
        </div>
        
        {/* Sidebar Footer */}
        <div className={`p-5 border-t-2 border-brand-border ${isSidebarCollapsed ? 'items-center flex flex-col gap-4' : ''}`}>
            <button onClick={toggleTheme} className="p-3 rounded-2xl bg-brand-bg border-2 border-brand-border hover:border-brand-primary text-brand-text transition-all w-full flex items-center justify-center gap-3 font-medium">
                <Icon type={theme === 'light' ? 'moon' : 'sun'} className="w-5 h-5" />
                {!isSidebarCollapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
          
          {/* Top Bar (Floating Capsule Style) */}
          <div className="absolute top-6 left-6 right-6 z-20 flex justify-between pointer-events-none">
             {/* Search Capsule */}
             <div className={`pointer-events-auto transition-all duration-500 ease-out transform ${mindMapData ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
                <div className="bg-brand-surface/90 backdrop-blur-md rounded-2xl shadow-anime border-2 border-brand-border flex items-center px-4 py-3 w-64 md:w-96 focus-within:border-brand-primary transition-all group">
                    <Icon type="search" className="w-5 h-5 text-brand-text-secondary group-focus-within:text-brand-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Find node..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm ml-3 w-full text-brand-text placeholder:text-brand-text-secondary/50 font-medium"
                    />
                    {searchResults.length > 0 && (
                        <span className="bg-brand-primary text-white text-[10px] font-bold px-2 py-1 rounded-full ml-2 animate-pop">{searchResults.length}</span>
                    )}
                </div>
             </div>

             {/* Action Capsules */}
             <div className="flex gap-3 pointer-events-auto">
                 {mindMapData && (
                    <button 
                        onClick={handleExportPdf}
                        className="bg-brand-surface text-brand-text p-3 rounded-2xl shadow-anime border-2 border-brand-border hover:border-brand-primary hover:text-brand-primary transition-all hover:-translate-y-1 active:translate-y-0"
                        title="Export PDF"
                    >
                        <Icon type="download" className="w-5 h-5" />
                    </button>
                 )}
                 
                 <button
                    onClick={() => setIsChatOpen(true)}
                    className="bg-brand-primary text-white p-3 rounded-2xl shadow-anime border-2 border-brand-primary hover:bg-brand-primary-hover transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none"
                    title="Chat Assistant"
                 >
                    <Icon type="chat" className="w-5 h-5" />
                 </button>
             </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-hidden bg-brand-bg relative">
             {mindMapData ? (
                 <MindMap 
                    data={mindMapData} 
                    searchQuery={searchQuery} 
                    hoveredNodeId={hoveredNodeId}
                 />
             ) : (
                 <div className="h-full flex flex-col items-center justify-center text-brand-text-secondary opacity-60 p-8 text-center">
                     <div className="w-32 h-32 bg-brand-surface border-2 border-dashed border-brand-border rounded-full flex items-center justify-center mb-6 animate-float">
                         <Icon type="branch" className="w-12 h-12 text-brand-border" />
                     </div>
                     <h2 className="text-2xl font-bold text-brand-text mb-2">Ready to Create</h2>
                     <p className="text-base max-w-xs">Upload a document or paste text to start mapping your ideas.</p>
                 </div>
             )}
             
             {/* Quick Summary Toast */}
             {quickSummary && (
                 <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-brand-surface border-2 border-brand-primary text-brand-text px-6 py-4 rounded-2xl shadow-anime z-30 max-w-md text-sm text-center animate-pop flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
                     {quickSummary}
                 </div>
             )}
          </div>
      </div>
    </div>
  );
};

export default App;
