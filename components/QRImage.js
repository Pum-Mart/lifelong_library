'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRImage({ value, size = 96, className = '' }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (value) QRCode.toDataURL(value, { margin: 1, width: size * 2, errorCorrectionLevel: 'M' }).then(setSrc);
  }, [value, size]);
  if (!src) return <div style={{ width: size, height: size }} className="bg-gray-100" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt={value} className={className} />;
}
