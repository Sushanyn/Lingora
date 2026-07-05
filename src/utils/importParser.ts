export interface ParsedWord {
  term: string;
  definition: string;
  example_sentence: string;
}

export const parseFileContent = (content: string, filename: string): ParsedWord[] => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    return parseCSV(content);
  } else if (extension === 'txt') {
    return parseTXT(content);
  }
  
  throw new Error('Unsupported file format. Please upload .txt or .csv');
};

const parseCSV = (content: string): ParsedWord[] => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const parsed: ParsedWord[] = [];
  
  for (const line of lines) {
    // Basic CSV splitting (doesn't handle commas inside quotes well, but good for simple cases)
    const columns = line.split(',');
    if (columns.length >= 2) {
      parsed.push({
        term: columns[0].trim(),
        definition: columns[1].trim(),
        example_sentence: columns[2] ? columns[2].trim() : ''
      });
    }
  }
  
  return parsed;
};

const parseTXT = (content: string): ParsedWord[] => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const parsed: ParsedWord[] = [];
  
  // Try to automatically detect delimiter: tab, hyphen, or equals
  for (const line of lines) {
    let delimiter = '';
    if (line.includes('\t')) delimiter = '\t';
    else if (line.includes('-')) delimiter = '-';
    else if (line.includes('=')) delimiter = '=';
    
    if (delimiter) {
      const parts = line.split(delimiter);
      if (parts.length >= 2) {
        parsed.push({
          term: parts[0].trim(),
          definition: parts[1].trim(),
          example_sentence: parts[2] ? parts.slice(2).join(delimiter).trim() : ''
        });
      }
    }
  }
  
  return parsed;
};
