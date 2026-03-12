/**
 * Componente otimizado para imagens do Cloudinary
 * Autor: Arisara (backend Nyoka)
 * Data: 2025-11-03
 */

import React from 'react';

interface CloudinaryImageProps {
  /** Public ID da imagem (ex: "logo_arisara_lettering_gvdyuz") */
  publicId: string;
  /** Texto alternativo */
  alt: string;
  /** Largura em pixels (opcional) */
  width?: number;
  /** Altura em pixels (opcional) */
  height?: number;
  /** Classes CSS */
  className?: string;
  /** Estilos inline */
  style?: React.CSSProperties;
  /** Qualidade (auto, best, good, eco, low) */
  quality?: 'auto' | 'best' | 'good' | 'eco' | 'low';
  /** Formato (auto, webp, avif, png, jpg) */
  format?: 'auto' | 'webp' | 'avif' | 'png' | 'jpg';
}

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dtijk612b';

export function CloudinaryImage({
  publicId,
  alt,
  width,
  height,
  className = '',
  style = {},
  quality = 'auto',
  format = 'auto',
}: CloudinaryImageProps) {
  // Construir transformações
  const transformations: string[] = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  
  // URL otimizada
  const transformString = transformations.length > 0 ? `${transformations.join(',')}/` : '';
  const imageUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformString}${publicId}`;

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
    />
  );
}

/**
 * Hook para gerar URL do Cloudinary manualmente
 */
export function useCloudinaryUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
  }
): string {
  const transformations: string[] = [];
  
  if (options?.width) transformations.push(`w_${options.width}`);
  if (options?.height) transformations.push(`h_${options.height}`);
  if (options?.quality) transformations.push(`q_${options.quality}`);
  if (options?.format) transformations.push(`f_${options.format}`);
  
  const transformString = transformations.length > 0 ? `${transformations.join(',')}/` : '';
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformString}${publicId}`;
}

