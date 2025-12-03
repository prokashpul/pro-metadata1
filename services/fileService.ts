import JSZip from 'jszip';
import { ProcessedFile, Platform, PlatformConfig } from '../types';

export const getThumbnail = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    // Optimization: Resize images to small thumbnail size to save memory
    if (file.type.startsWith('image/')) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const MAX_SIZE = 150; // Thumbnail max dimension
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG 0.7 quality
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          // Fallback
          resolve(url);
        }
        URL.revokeObjectURL(url);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(''); // Fail gracefully
      };
      
      img.src = url;
    } else {
      // Enhanced SVG Placeholders
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const isVideo = file.type.startsWith('video/') || ['MP4', 'MOV', 'AVI', 'WEBM'].includes(ext);
      const isVector = ['AI', 'EPS', 'SVG', 'CDR'].includes(ext);
      
      let svgContent = '';

      if (isVideo) {
        // Video: Indigo Gradient + Play Icon
        svgContent = `
          <defs>
            <linearGradient id="gradVideo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#818CF8;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#gradVideo)"/>
          <circle cx="50" cy="50" r="30" fill="white" fill-opacity="0.2"/>
          <path d="M42 35L62 50L42 65V35Z" fill="white"/>
          <text x="50" y="90" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="0.05em">${ext}</text>
        `;
      } else if (isVector) {
        // Vector: Orange Gradient + Vector Nodes Icon
        svgContent = `
          <defs>
            <linearGradient id="gradVector" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#EA580C;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#FB923C;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#gradVector)"/>
          <path d="M30 65C30 65 30 35 50 35C70 35 70 65 70 65" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <rect x="26" y="61" width="8" height="8" fill="white"/>
          <rect x="66" y="61" width="8" height="8" fill="white"/>
          <rect x="46" y="31" width="8" height="8" fill="white"/>
          <text x="50" y="90" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="0.05em">${ext}</text>
        `;
      } else {
        // Generic: Slate Gradient + Doc Icon
        svgContent = `
          <defs>
            <linearGradient id="gradFile" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#475569;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#94A3B8;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#gradFile)"/>
          <path d="M35 25H65L75 35V75H35V25Z" stroke="white" stroke-width="2" fill="none" fill-opacity="0.2"/>
          <path d="M35 25H65L75 35V75H35V25Z" stroke="white" stroke-width="2" fill="none"/>
          <path d="M65 25V35H75" stroke="white" stroke-width="2" fill="none"/>
          <text x="50" y="90" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="0.05em">${ext}</text>
        `;
      }

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">${svgContent}</svg>`;
      resolve(`data:image/svg+xml;base64,${btoa(svg)}`);
    }
  });
};

const sanitizeFilename = (title: string): string => {
  return title.replace(/[^a-zA-Z0-9\-_ ]/g, '').replace(/\s+/g, '_').trim();
};

const escapeCsv = (val: string): string => {
  const str = String(val).replace(/"/g, '""');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str}"`;
  }
  return str;
};

// Internal helper to generate CSV content string
const generateCsvContent = (
  platform: Platform,
  files: ProcessedFile[]
): string => {
  const headers = ['Filename', 'Title', 'Description', 'Keywords'];
  let csvContent = headers.map(escapeCsv).join(',') + '\n';
  let count = 0;

  files.forEach((item) => {
    if (item.status === 'complete' && item.platformMetadata[platform]) {
      const meta = item.platformMetadata[platform]!;
      const ext = item.file.name.substring(item.file.name.lastIndexOf('.'));
      // Ensure the filename in CSV matches the renamed file in ZIP
      const newName = `${sanitizeFilename(meta.title)}${ext}`;
      
      const row = [
        newName,
        meta.title,
        meta.description,
        meta.keywords.join(', ')
      ];
      csvContent += row.map(escapeCsv).join(',') + '\n';
      count++;
    }
  });

  return count > 0 ? csvContent : '';
};

export const downloadZip = async (
  platform: Platform, 
  config: PlatformConfig, 
  files: ProcessedFile[]
) => {
  const zip = new JSZip();
  let count = 0;

  files.forEach((item) => {
    if (item.status === 'complete' && item.platformMetadata[platform]) {
      const meta = item.platformMetadata[platform]!;
      const cleanTitle = sanitizeFilename(meta.title);
      
      // Original File
      const ext = item.file.name.substring(item.file.name.lastIndexOf('.'));
      const newName = `${cleanTitle}${ext}`;
      zip.file(newName, item.file);
      count++;

      // Preview File (renamed to match)
      if (item.previewFile) {
        const previewExt = item.previewFile.name.substring(item.previewFile.name.lastIndexOf('.'));
        const newPreviewName = `${cleanTitle}${previewExt}`;
        zip.file(newPreviewName, item.previewFile);
      }
    }
  });

  if (count === 0) return;

  // Generate and add CSV to ZIP
  const csvContent = generateCsvContent(platform, files);
  if (csvContent) {
    zip.file(`${config.name.replace(/\s/g, '_')}_Metadata.csv`, csvContent);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${config.name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
