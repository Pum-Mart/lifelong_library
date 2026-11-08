'use client';
import { useEffect, useRef, useState } from 'react';
import { inputCls, Button } from './ui';

// ស្កេន QR ដោយកាមេរ៉ា ឬវាយ/ស្កេនដោយម៉ាស៊ីន USB (វាយលេខ + Enter)
export default function Scanner({ onScan, placeholder = 'ស្កេន ឬវាយលេខ…', autoFocus = true }) {
  const [text, setText] = useState('');
  const [camera, setCamera] = useState(false);
  const [camErr, setCamErr] = useState('');
  const inputRef = useRef(null);
  const regionId = useRef(`qr-${Math.random().toString(36).slice(2)}`);
  const lastRef = useRef({ code: '', at: 0 });

  function emit(code) {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const now = Date.now();
    if (lastRef.current.code === c && now - lastRef.current.at < 2500) return; // ការពារស្កេនស្ទួន
    lastRef.current = { code: c, at: now };
    onScan(c);
  }

  useEffect(() => {
    if (!camera) return;
    let scanner;
    let stopped = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (stopped) return;
        scanner = new Html5Qrcode(regionId.current);
        await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, (code) => emit(code), () => {});
      } catch (e) {
        setCamErr('មិនអាចបើកកាមេរ៉ាបានទេ — សូមអនុញ្ញាតកាមេរ៉ា ឬប្រើការវាយលេខ');
        setCamera(false);
      }
    })();
    return () => {
      stopped = true;
      if (scanner) scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  return (
    <div className="space-y-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); emit(text); setText(''); inputRef.current?.focus(); }}
      >
        <input ref={inputRef} autoFocus={autoFocus} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className={inputCls} />
        <Button type="submit">យល់ព្រម</Button>
        <Button type="button" variant="secondary" onClick={() => { setCamErr(''); setCamera((v) => !v); }}>
          {camera ? 'បិទកាមេរ៉ា' : '📷 កាមេរ៉ា'}
        </Button>
      </form>
      {camErr && <p className="text-xs text-red-600">{camErr}</p>}
      {camera && <div id={regionId.current} className="mx-auto max-w-sm overflow-hidden rounded-lg border" />}
    </div>
  );
}
