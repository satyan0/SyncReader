// src/utils/pdfUtils.ts
import { pdfjs } from 'react-pdf';

export interface TableOfContentsItem {
  title: string;
  pageNumber: number;
  level: number;
  children?: TableOfContentsItem[];
}

export const extractTableOfContents = async (pdfUrl: string): Promise<TableOfContentsItem[]> => {
  try {
    // Load the PDF document
    const pdf = await pdfjs.getDocument(pdfUrl).promise;
    
    // Get the outline/bookmarks
    const outline = await pdf.getOutline();
    
    if (!outline || outline.length === 0) {
      // If no outline, create a basic TOC from page numbers
      const numPages = pdf.numPages;
      const basicToc: TableOfContentsItem[] = [];
      
      for (let i = 1; i <= Math.min(numPages, 50); i++) {
        basicToc.push({
          title: `Page ${i}`,
          pageNumber: i,
          level: 1,
        });
      }
      
      return basicToc;
    }
    
    // Convert outline to our TOC format
    const convertOutlineToToc = (items: any[], level: number = 1): TableOfContentsItem[] => {
      return items.map(item => {
        try {
          // Handle different types of destination objects
          let pageNumber = 1;
          if (item.dest) {
            if (Array.isArray(item.dest) && item.dest.length > 0) {
              const dest = item.dest[0];
              if (typeof dest === 'number') {
                pageNumber = dest;
              } else if (dest && typeof dest === 'object' && 'num' in dest) {
                pageNumber = Number(dest.num) || 1;
              }
            }
          }
          
          return {
            title: String(item.title || 'Untitled'),
            pageNumber: Math.max(1, pageNumber),
            level: Math.max(1, level),
            children: item.items ? convertOutlineToToc(item.items, level + 1) : undefined,
          };
        } catch (itemError) {
          console.error('Error processing TOC item:', itemError);
          return {
            title: 'Untitled',
            pageNumber: 1,
            level: Math.max(1, level),
          };
        }
      });
    };
    
    return convertOutlineToToc(outline);
  } catch (error) {
    console.error('Error extracting table of contents:', error);
    
    // Fallback to basic TOC
    return [
      { title: 'Page 1', pageNumber: 1, level: 1 },
      { title: 'Page 2', pageNumber: 2, level: 1 },
      { title: 'Page 3', pageNumber: 3, level: 1 },
    ];
  }
};

export const extractTextFromPage = async (pdfUrl: string, pageNumber: number): Promise<string> => {
  try {
    const pdf = await pdfjs.getDocument(pdfUrl).promise;
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    return textContent.items
      .map((item: any) => item.str)
      .join(' ');
  } catch (error) {
    console.error('Error extracting text from page:', error);
    return '';
  }
};

export const searchInDocument = async (
  pdfUrl: string, 
  searchTerm: string
): Promise<Array<{ pageNumber: number; text: string; position: number }>> => {
  try {
    const pdf = await pdfjs.getDocument(pdfUrl).promise;
    const results: Array<{ pageNumber: number; text: string; position: number }> = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      
      const searchIndex = pageText.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (searchIndex !== -1) {
        results.push({
          pageNumber: pageNum,
          text: pageText.substring(searchIndex, searchIndex + 100) + '...',
          position: searchIndex,
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error searching in document:', error);
    return [];
  }
};
