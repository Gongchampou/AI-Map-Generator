// These will be available globally from the scripts in index.html
declare const pdfjsLib: any;
declare const mammoth: any;

export const extractTextFromFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'txt':
      return readTextFile(file);
    case 'pdf':
      return readPdfFile(file);
    case 'docx':
      return readDocxFile(file);
    case 'doc':
    case 'ppt':
    case 'pptx':
      throw new Error(`.${extension} files are not supported for direct import yet.`);
    default:
      throw new Error(`Unsupported file type: .${extension}`);
  }
};

const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    reader.onerror = (error) => {
      reject(new Error('Failed to read the text file.'));
    };
    reader.readAsText(file);
  });
};

const readPdfFile = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let textContent = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    textContent += text.items.map((item: any) => item.str).join(' ');
    textContent += '\n\n'; // Page separator
  }
  return textContent;
};

const readDocxFile = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};
