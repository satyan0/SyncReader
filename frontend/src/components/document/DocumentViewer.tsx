// src/components/document/DocumentViewer.tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import useStore from '../../store/useStore';
import { Loader2, X, List, ChevronRight, ChevronDown, Search } from 'lucide-react';
import socketService from '../../services/socketService';
import { Highlight } from '../../store/useStore';
import { extractTableOfContents, searchInDocument, TableOfContentsItem } from '../../utils/pdfUtils';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = import.meta.env.VITE_PDF_WORKER_SRC || '/pdf.worker.js';



const DocumentViewer: React.FC = () => {
  const currentUser = useStore((state) => state.currentUser);
  const documents = useStore((state) => state.room?.documents);
  const highlights = useStore((state) => state.highlights);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale] = useState<number>(1.0);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionCoords, setSelectionCoords] = useState<DOMRect | null>(null);
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ pageNumber: number; text: string; position: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const highlightCounter = useRef<number>(0);

  const docId = currentUser?.current_doc_id;
  const currentDocument = documents?.find(d => d.id === docId);
  
  // Get highlights for current document (reactive to store changes)
  const currentDocumentHighlights = docId ? highlights[docId] || [] : [];
  
  // Debug: log highlights count when it changes
  useEffect(() => {
    console.log('Current document highlights count:', currentDocumentHighlights.length);
  }, [currentDocumentHighlights.length]);

  const pdfUrl = currentDocument ? `${import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8080'}/document/${currentDocument.id}` : '';

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
    
    // Extract table of contents from the PDF
    loadTableOfContents();
  }, []);

  const loadTableOfContents = async () => {
    if (!currentDocument || !pdfUrl) return;
    
    try {
      const toc = await extractTableOfContents(pdfUrl);
      // Ensure all page numbers are valid numbers
      const validatedToc = toc.map(item => ({
        ...item,
        pageNumber: Math.max(1, Math.min(numPages || 1, Number(item.pageNumber) || 1)),
        title: String(item.title || 'Untitled'),
        level: Number(item.level) || 1,
      }));
      setTableOfContents(validatedToc);
    } catch (error) {
      console.error('Error extracting table of contents:', error);
      // Fallback to basic TOC
      const basicToc: TableOfContentsItem[] = [];
      for (let i = 1; i <= Math.min(numPages || 1, 20); i++) {
        basicToc.push({
          title: `Page ${i}`,
          pageNumber: i,
          level: 1,
        });
      }
      setTableOfContents(basicToc);
    }
  };

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF');
    setIsLoading(false);
  }, []);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === '') {
      setSelectedText('');
      setSelectionCoords(null);
      return;
    }

    const text = selection.toString().trim();
    setSelectedText(text);

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Get the page container to calculate relative coordinates
    const pageContainer = pageRefs.current[currentPage];
    if (pageContainer) {
      const containerRect = pageContainer.getBoundingClientRect();
      const relativeRect = {
        x: rect.x - containerRect.x,
        y: rect.y - containerRect.y,
        width: rect.width,
        height: rect.height,
      };
      setSelectionCoords(relativeRect as DOMRect);
    } else {
      setSelectionCoords(rect);
    }
  }, [currentPage]);

  const handleMouseUp = useCallback(() => {
    handleTextSelection();
  }, [handleTextSelection]);

  const createHighlight = useCallback(() => {
    if (!selectedText || !selectionCoords || !currentUser) return;

    const highlight: Highlight = {
      id: `highlight-${Date.now()}-${highlightCounter.current++}`,
      text: selectedText,
      selectedText: selectedText,
      pageNumber: currentPage,
      documentId: docId!,
      boundingBox: {
        x: selectionCoords.x,
        y: selectionCoords.y,
        width: selectionCoords.width,
        height: selectionCoords.height,
      },
      userId: currentUser.id,
      username: currentUser.username,
      timestamp: Date.now(),
    };

    // Add to local store
    useStore.getState().addHighlight(highlight);
    
    // Send to backend via socket
    socketService.addHighlight(highlight);

    // Clear selection
    setSelectedText('');
    setSelectionCoords(null);
    window.getSelection()?.removeAllRanges();
  }, [selectedText, selectionCoords, currentUser, currentPage, docId]);

  // Keyboard shortcut for creating highlights
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'h' && selectedText) {
      e.preventDefault();
      createHighlight();
    }
  }, [selectedText, createHighlight]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Track current page on scroll
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        const container = document.querySelector('.overflow-auto');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const containerTop = containerRect.top;
        const containerHeight = containerRect.height;

        // Find which page is most visible in the viewport
        let currentVisiblePage = 1;
        let maxVisibility = 0;

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const pageElement = document.getElementById(`page-${pageNum}`);
          if (!pageElement) continue;

          const pageRect = pageElement.getBoundingClientRect();
          const pageTop = pageRect.top;
          const pageHeight = pageRect.height;

          // Calculate how much of the page is visible
          const visibleTop = Math.max(pageTop, containerTop);
          const visibleBottom = Math.min(pageTop + pageHeight, containerTop + containerHeight);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);

          if (visibleHeight > maxVisibility) {
            maxVisibility = visibleHeight;
            currentVisiblePage = pageNum;
          }
        }

        if (currentVisiblePage !== currentPage) {
          setCurrentPage(currentVisiblePage);
        }
      }, 100); // Debounce scroll events
    };

    const container = document.querySelector('.overflow-auto');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        clearTimeout(scrollTimeout);
      };
    }
  }, [numPages, currentPage]);

  // const handlePageChange = (newPage: number) => {
  //   setCurrentPage(newPage);
  // };

  const handleTableOfContentsClick = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    
    // Scroll to the specific page
    const pageElement = document.getElementById(`page-${pageNumber}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    setShowTableOfContents(false);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() || !pdfUrl) return;
    
    setIsSearching(true);
    try {
      const results = await searchInDocument(pdfUrl, searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching document:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    
    // Scroll to the specific page
    const pageElement = document.getElementById(`page-${pageNumber}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    setShowTableOfContents(false);
  };

  const toggleSection = (sectionTitle: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionTitle)) {
      newExpanded.delete(sectionTitle);
    } else {
      newExpanded.add(sectionTitle);
    }
    setExpandedSections(newExpanded);
  };

    const renderTableOfContentsItem = (item: TableOfContentsItem, index: number) => {
    const isExpanded = expandedSections.has(item.title);
    const hasChildren = item.children && item.children.length > 0;
    
    // Ensure all values are strings/numbers for rendering
    const safeTitle = String(item.title || 'Untitled');
    const safePageNumber = Number(item.pageNumber) || 1;
    const safeLevel = Number(item.level) || 1;
    
    return (
      <div key={index} className="w-full">
        <div
          className={`flex items-start justify-between p-2 hover:bg-slate-100 rounded cursor-pointer ${
            currentPage === safePageNumber ? 'bg-blue-100 text-blue-700' : ''
          }`}
          style={{ paddingLeft: `${(safeLevel - 1) * 16 + 12}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleSection(safeTitle);
            } else {
              handleTableOfContentsClick(safePageNumber);
            }
          }}
        >
          <div className="flex items-start space-x-2 min-w-0 flex-1">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection(safeTitle);
                }}
                className="p-1 hover:bg-slate-200 rounded flex-shrink-0 mt-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            <span className="text-sm break-words leading-relaxed">{safeTitle}</span>
          </div>
          <span className="text-xs text-slate-500 flex-shrink-0 ml-2 whitespace-nowrap">{safePageNumber}</span>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {item.children!.map((child, childIndex) => 
              renderTableOfContentsItem(child, index * 1000 + childIndex)
            )}
          </div>
        )}
      </div>
    );
  };

  // Early return after all hooks
  if (!docId || !currentDocument) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">No document selected</div>
          <div className="text-gray-400 text-sm">Select a document from the list to view it</div>
        </div>
      </div>
    );
  }

  // Function to get color based on user ID
  const getUserHighlightColor = (userId: number) => {
    const colors = [
      'border-yellow-400',
      'border-blue-400', 
      'border-green-400',
      'border-red-400',
      'border-purple-400',
      'border-pink-400',
      'border-indigo-400',
      'border-orange-400'
    ];
    
    // Use a simple hash to consistently assign colors to users
    const hash = userId.toString().split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const renderHighlight = (highlight: Highlight, pageNumber: number) => {
    if (highlight.pageNumber !== pageNumber) return null;

    const borderColor = getUserHighlightColor(highlight.userId);

    const handleDeleteHighlight = () => {
      console.log('Deleting highlight:', highlight.id, 'from document:', highlight.documentId);
      
      // Remove from local store immediately for instant UI feedback
      useStore.getState().removeHighlight(highlight.documentId, highlight.id);
      
      console.log('Highlight removed from store, remaining highlights:', useStore.getState().highlights[highlight.documentId]?.length || 0);
      
      // Send delete request to backend via socket (fire and forget for maximum speed)
      socketService.removeHighlightFast(highlight.id, highlight.documentId).catch((error: Error) => {
        console.error('Failed to remove highlight from server:', error);
        
        if (error.message === 'Socket not connected') {
          console.warn('Highlight deleted locally but not synced to server due to connection issue');
          // Don't re-add the highlight in this case - let the user keep the optimistic update
          // The highlight will be properly synced when connection is restored
        } else {
          // Re-add the highlight for other types of server errors
          useStore.getState().addHighlight(highlight);
        }
      });
    };

    return (
      <div
        key={highlight.id}
        className={`absolute border-2 ${borderColor} rounded-sm cursor-pointer group z-10`}
        style={{
          left: `${highlight.boundingBox.x}px`,
          top: `${highlight.boundingBox.y}px`,
          width: `${highlight.boundingBox.width}px`,
          height: `${highlight.boundingBox.height}px`,
          pointerEvents: 'none', // Allow text selection through highlights
          backgroundColor: 'transparent',
        }}
        title={`Highlighted by ${highlight.username}`}
      >
        {/* Username label at left center outside highlight */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-full bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none break-words z-20 mr-2 max-w-32">
          {highlight.username}
        </div>
        
        {/* Delete button at top right corner */}
        <button
          onClick={handleDeleteHighlight}
          className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-100 pointer-events-auto z-30 flex items-center justify-center hover:bg-red-600 hover:scale-110 active:scale-90 active:duration-75"
          title="Delete highlight"
        >
          <X className="w-3 h-3" />
        </button>
        
        {/* Hover area for the highlight */}
        <div 
          className="absolute inset-0 pointer-events-auto group-hover:bg-transparent"
          style={{ backgroundColor: 'transparent' }}
        />
      </div>
    );
  };

  const renderPage = (pageNumber: number) => (
    <div
      key={pageNumber}
      ref={(el) => { pageRefs.current[pageNumber] = el; }}
      className="relative mb-4"
      onMouseUp={handleMouseUp}
      id={`page-${pageNumber}`}
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        className="border border-gray-200 shadow-sm"
        renderTextLayer={true}
        renderAnnotationLayer={false}
      />
      {currentDocumentHighlights.map(highlight => renderHighlight(highlight, pageNumber))}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex flex-col space-y-3 p-3 sm:p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{currentDocument!.name}</h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Page {currentPage} of {numPages}
            </p>
          </div>
          
          {/* Table of Contents Toggle */}
          <button
            onClick={() => setShowTableOfContents(!showTableOfContents)}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              showTableOfContents 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Table of Contents"
          >
            <List className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        
        {/* Mobile: Highlight button only */}
        {selectedText && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center justify-center">
              <button
                onClick={createHighlight}
                className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors whitespace-nowrap"
              >
                Highlight
              </button>
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-center justify-center text-blue-600 py-2">
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table of Contents Panel */}
        {showTableOfContents && (
          <div className="w-full sm:w-80 bg-gray-50 border-r border-gray-200 flex flex-col absolute sm:relative z-20 h-full">
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">Table of Contents</h3>
                <button
                  onClick={() => setShowTableOfContents(false)}
                  className="sm:hidden p-1 text-gray-500 hover:text-gray-700 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Search */}
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Search in document..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 break-words">Search Results</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <div
                          key={index}
                          onClick={() => handleSearchResultClick(result.pageNumber)}
                          className="p-2 text-xs hover:bg-gray-100 rounded cursor-pointer"
                        >
                          <div className="font-medium whitespace-nowrap">Page {result.pageNumber}</div>
                          <div className="text-gray-600 break-words leading-relaxed">{result.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {tableOfContents.length > 0 ? (
                <div className="space-y-1">
                  {tableOfContents.map((item, index) => renderTableOfContentsItem(item, index))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8 px-2">
                  <p className="text-sm break-words">No table of contents available</p>
                  <p className="text-xs mt-1 break-words">This PDF doesn't have a structured outline</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        <div className={`flex-1 overflow-auto p-2 sm:p-4 ${showTableOfContents ? 'hidden sm:block' : 'w-full'}`}>
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-500 text-lg mb-2">Error loading PDF</div>
                <div className="text-gray-500 text-sm">{error}</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                onLoadProgress={() => setIsLoading(true)}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                  </div>
                }
              >
                {Array.from(new Array(numPages), (_, index) => renderPage(index + 1))}
              </Document>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;