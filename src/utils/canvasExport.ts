/**
 * Canvas Export Utilities
 * 
 * Provides functions to export the canvas in various formats:
 * - PNG: Raster image export
 * - SVG: Vector graphics export
 * - JSON: Data export for backup/restore
 */

import type { ShapeCollection } from '@/types';

export interface ExportOptions {
  format: 'png' | 'svg' | 'json';
  fullCanvas?: boolean; // If false, exports viewport only
  filename?: string;
  includeMetadata?: boolean;
}

export interface ExportMetadata {
  exportDate: string;
  shapeCount: number;
  userCount?: number;
  canvasId: string;
  version: string;
}

/**
 * Export canvas as PNG image
 */
export const exportAsPNG = async (
  stageRef: any, 
  options: ExportOptions,
  _metadata?: ExportMetadata
): Promise<void> => {
  if (!stageRef?.current) {
    console.error('Stage ref not available');
    return;
  }

  const stage = stageRef.current;
  const dataURL = stage.toDataURL({ pixelRatio: 2 }); // 2x for better quality
  
  downloadFile(dataURL, options.filename || 'canvas-export.png');
};

/**
 * Export canvas as SVG
 */
export const exportAsSVG = (
  shapes: ShapeCollection,
  _viewport: { x: number; y: number; zoom: number },
  options: ExportOptions
): void => {
  const shapesArray = Object.values(shapes).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  
  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  shapesArray.forEach(shape => {
    const x1 = shape.x;
    const y1 = shape.y;
    const x2 = shape.x + (shape.width || 0);
    const y2 = shape.y + (shape.height || 0);
    
    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
  });
  
  // Add padding
  const padding = 20;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Build SVG
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">\n`;
  
  shapesArray.forEach(shape => {
    const rotation = shape.rotation || 0;
    const centerX = shape.x + (shape.width || 0) / 2;
    const centerY = shape.y + (shape.height || 0) / 2;
    const transform = rotation ? ` transform="rotate(${rotation * (180 / Math.PI)} ${centerX} ${centerY})"` : '';
    
    if (shape.type === 'rectangle') {
      svg += `  <rect x="${shape.x}" y="${shape.y}" width="${shape.width || 100}" height="${shape.height || 100}" fill="${shape.fill || '#000000'}"${transform} />\n`;
    } else if (shape.type === 'ellipse') {
      const cx = shape.x + (shape.width || 100) / 2;
      const cy = shape.y + (shape.height || 100) / 2;
      const rx = (shape.width || 100) / 2;
      const ry = (shape.height || 100) / 2;
      svg += `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${shape.fill || '#000000'}"${transform} />\n`;
    } else if (shape.type === 'text') {
      const fontSize = shape.fontSize || 16;
      const fontFamily = shape.fontFamily || 'Inter, sans-serif';
      const fontWeight = shape.bold ? 'bold' : 'normal';
      const fontStyle = shape.italic ? 'italic' : 'normal';
      const textDecoration = shape.underline ? 'underline' : (shape.strikethrough ? 'line-through' : 'none');
      const textAnchor = shape.textAlign === 'center' ? 'middle' : (shape.textAlign === 'right' ? 'end' : 'start');
      const textX = shape.textAlign === 'center' ? shape.x + (shape.width || 200) / 2 : (shape.textAlign === 'right' ? shape.x + (shape.width || 200) : shape.x);
      
      svg += `  <text x="${textX}" y="${shape.y + fontSize}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}" font-style="${fontStyle}" text-decoration="${textDecoration}" text-anchor="${textAnchor}" fill="${shape.fill || '#000000'}"${transform}>${escapeXml(shape.text || 'Text')}</text>\n`;
    }
  });
  
  svg += `</svg>`;
  
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, options.filename || 'canvas-export.svg');
  URL.revokeObjectURL(url);
};

/**
 * Export canvas data as JSON
 */
export const exportAsJSON = (
  shapes: ShapeCollection,
  viewport: { x: number; y: number; zoom: number },
  options: ExportOptions,
  metadata?: ExportMetadata
): void => {
  const exportData = {
    ...(options.includeMetadata && metadata ? { metadata } : {}),
    viewport,
    shapes: Object.values(shapes).map(shape => ({
      ...shape,
      // Clean up Firestore-specific fields for portability
      updatedAt: typeof shape.updatedAt === 'number' ? shape.updatedAt : Date.now(),
    })),
  };
  
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, options.filename || 'canvas-export.json');
  URL.revokeObjectURL(url);
};

/**
 * Helper to trigger file download
 */
const downloadFile = (url: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Helper to escape XML special characters
 */
const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

