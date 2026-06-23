import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Star, QrCode, Upload } from 'lucide-react';

const googleGBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIyLjU2IDEyLjI1YzAtLjc4LS4wNy0xLjUzLS4yLTIuMjVIMTJ2NC4yNmg1LjkyYy0uMjYgMS4zNy0xLjA0IDIuNTMtMi4yMSAzLjMxdjIuNzdoMy41N2MyLjA4LTEuOTIgMy4yOC00Ljc0IDMuMjgtOC4wOXoiIGZpbGw9IiM0Mjg1RjQiLz48cGF0aCBkPSJNMTIgMjNjMi45NyAwIDUuNDYtLjk4IDcuMjgtMi42NmwtMy41Ny0yLjc3Yy0uOTguNjYtMi4yMyAxLjA2LTMuNzEgMS4wNi0yLjg2IDAtNS4yOS0xLjkzLTYuMTYtNC41M0gyLjE4djIuODRDMy45OSAyMC41MyA3LjcgMjMgMTIgMjN6IiBmaWxsPSIjMzRBMDUzIi8+PHBhdGggZD0iTTUuODQgMTQuMDljLS4yMi0uNjYtLjM1LTEuMzYtLjM1LTIuMDlzLjEzLTEuNDMuMzUtMi4wOVY3LjA3SDIuMThDMS40MyA4LjU1IDEgMTAuMjIgMSAxMnMuNDMgMy40NSAxLjE4IDQuOTNsMi44NS0yLjIyLjgxLS42MnoiIGZpbGw9IiNGQkJDMDUiLz48cGF0aCBkPSJNMTIgNS4zOGMxLjYyIDAgMy4wNi41NiA0LjIxIDEuNjRsMy4xNS0zLjE1QzE3LjQ1IDIuMDkgMTQuOTcgMSAxMiAxIDcuNyAxIDMuOTkgMy40NyAyLjE4IDcuMDdsMy42NiAyLjg0Yy44Ny0yLjYgMy4zLTQuNTMgNi4xNi00LjUzeiIgZmlsbD0iI0VBNDMzNSIvPjwvc3ZnPg==";

// Utility para processar imagens pesadas e redimensionar antes de salvar no estado
const processImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      const MAX_DIMENSION = 1200; // Tamanho máximo seguro para não travar o html2canvas (garante alta resolução p/ impressão A6)
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Exporta com qualidade 90% para jpeg, ou mantém png para transparência
          resolve(canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9));
          return;
        }
      }
      
      // Se não for muito grande ou o canvas falhar, lê o arquivo original como base64
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo original"));
      reader.readAsDataURL(file);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Falha ao carregar a imagem"));
    };
    
    img.src = objectUrl;
  });
};

const getDominantColors = (imgSrc: string): Promise<[string, string]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(['#e2e8f0', '#cbd5e1']);
        return;
      }
      
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      
      const data = ctx.getImageData(0, 0, size, size).data;
      const colorCounts: Record<string, number> = {};
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];
        
        // Ignore transparent and very light/dark colors to get true brand colors
        if (a < 128 || (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) continue;
        
        const rgb = `${Math.floor(r/16)*16},${Math.floor(g/16)*16},${Math.floor(b/16)*16}`;
        colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
      }
      
      const sortedColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
      
      if (sortedColors.length === 0) {
        resolve(['#e2e8f0', '#cbd5e1']); 
        return;
      }
      
      const rgbToHex = (rgbStr: string) => {
        const [r, g, b] = rgbStr.split(',').map(Number);
        return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).padStart(6, '0');
      };
      
      const color1 = rgbToHex(sortedColors[0][0]);
      let color2 = color1;
      
      for (let i = 1; i < sortedColors.length; i++) {
        const [r1, g1, b1] = sortedColors[0][0].split(',').map(Number);
        const [r2, g2, b2] = sortedColors[i][0].split(',').map(Number);
        const dist = Math.abs(r1-r2) + Math.abs(g1-g2) + Math.abs(b1-b2);
        if (dist > 60) {
          color2 = rgbToHex(sortedColors[i][0]);
          break;
        }
      }
      resolve([color1, color2]);
    };
    img.onerror = () => resolve(['#e2e8f0', '#cbd5e1']);
    img.src = imgSrc;
  });
};

const waitForPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

function App() {
  const [companyName, setCompanyName] = useState('Reserva Beer & Grill');
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(100);
  const [logoBgOpacity, setLogoBgOpacity] = useState(45);
  const [callToAction, setCallToAction] = useState('Avalie-nos no Google');
  const [instructionText, setInstructionText] = useState('Aponte a câmera do celular para o código acima');
  const [qrIconImage, setQrIconImage] = useState<string | null>(null);
  const [reviewLink, setReviewLink] = useState('https://g.page/r/exemplo/review');
  const [color1, setColor1] = useState('#818cf8');
  const [color2, setColor2] = useState('#c084fc');
  const [showStars, setShowStars] = useState(true);
  const [starColor, setStarColor] = useState('#fbbc04');
  const [logoPos, setLogoPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const displayRef = useRef<HTMLDivElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processedImage = await processImage(file);
        setLogoImage(processedImage);
        
        try {
          const [c1, c2] = await getDominantColors(processedImage);
          setColor1(c1);
          setColor2(c2);
        } catch (e) {
          console.error("Erro ao extrair cores", e);
        }
      } catch (error) {
        console.error("Erro ao processar logo:", error);
        alert("Ocorreu um erro ao tentar processar esta imagem. Tente outro formato.");
      }
    }
  };

  const handleQrIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processedImage = await processImage(file);
        setQrIconImage(processedImage);
      } catch (error) {
        console.error("Erro ao processar ícone do QR:", error);
        alert("Ocorreu um erro ao tentar processar esta imagem. Tente outro formato.");
      }
    }
  };

  const handleDownload = async () => {
    const displayElement = displayRef.current;
    if (!displayElement) return;
    
    // Evita que a sombra externa vire borda fantasma no raster final do PDF.
    const originalShadow = displayElement.style.boxShadow;
    displayElement.style.boxShadow = 'none';
    displayElement.classList.add('pdf-export');
    
    try {
      await document.fonts.ready;
      await waitForPaint();

      const canvas = await html2canvas(displayElement, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
        width: displayElement.offsetWidth,
        height: displayElement.offsetHeight,
        windowWidth: displayElement.offsetWidth,
        windowHeight: displayElement.offsetHeight,
        onclone: (_document, element) => {
          element.classList.add('pdf-export');
          (element as HTMLElement).style.boxShadow = 'none';
        },
      });
    
      const imgData = canvas.toDataURL('image/png', 1);
    
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a6',
        compress: false,
        hotfixes: ['px_scaling'],
      });
    
      // A imagem ja inclui toda a arte A6, sem sangria negativa que desloca cores/bordas.
      pdf.addImage(imgData, 'PNG', 0, 0, 105, 148, undefined, 'NONE');
      pdf.save(`${companyName.replace(/\s+/g, '_')}_QR_Display.pdf`);
    } finally {
      displayElement.classList.remove('pdf-export');
      displayElement.style.boxShadow = originalShadow;
    }
  };

  // Drag handlers para a logo
  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { x: clientX - logoPos.x, y: clientY - logoPos.y };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setLogoPos({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Dinamicamente gera o gradiente do fundo e a cor do texto baseada no slider e estilo
  const gradientBg = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
  const titleColor = `#0f172a`; // A placa de vidro é iluminada, o texto pode ser sempre escuro

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
            <img src="/logo.svg" alt="Avali.ai Logo" style={{ width: '32px', height: '32px', borderRadius: '6px' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Avali.ai
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Crie displays incríveis com efeito Glassmorphism.
          </p>
        </div>

        <div className="form-group">
          <label>Sua Logotipo (Opcional)</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <label className="btn" style={{ flex: 1, backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', cursor: 'pointer', color: '#475569' }}>
              <Upload size={16} />
              Escolher Imagem
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </label>
            {logoImage && (
              <button 
                className="btn" 
                style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}
                onClick={() => {
                  setLogoImage(null);
                  setLogoSize(100);
                  setLogoPos({ x: 0, y: 0 });
                }}
              >
                Remover
              </button>
            )}
          </div>
        </div>

        {logoImage && (
          <div className="form-group" style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tamanho da Logo: {logoSize}%</span>
              {logoPos.x !== 0 || logoPos.y !== 0 ? (
                <button 
                  onClick={() => setLogoPos({ x: 0, y: 0 })}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Centralizar
                </button>
              ) : null}
            </label>
            <input 
              type="range" 
              min="50" 
              max="400" 
              value={logoSize} 
              onChange={(e) => setLogoSize(Number(e.target.value))} 
              className="color-slider"
              style={{ background: '#cbd5e1' }}
            />
            
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem', fontStyle: 'italic' }}>
              Dica: Clique e arraste a logo na placa ao lado para ajustá-la.
            </p>
            
            <label style={{ display: 'block', marginTop: '1rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
              Fundo Escuro da Logo: {logoBgOpacity}%
            </label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={logoBgOpacity} 
              onChange={(e) => setLogoBgOpacity(Number(e.target.value))} 
              className="color-slider"
              style={{ background: '#cbd5e1' }}
            />
          </div>
        )}

        <div className="form-group">
          <label>Nome da Empresa</label>
          <input 
            type="text" 
            className="form-control" 
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ex: Café do Centro"
          />
        </div>

        <div className="form-group">
          <label>Chamada para Ação (Topo)</label>
          <input 
            type="text" 
            className="form-control" 
            value={callToAction}
            onChange={(e) => setCallToAction(e.target.value)}
            placeholder="Ex: Avalie-nos no Google"
          />
        </div>

        <div className="form-group">
          <label>Instrução (Rodapé)</label>
          <input 
            type="text" 
            className="form-control" 
            value={instructionText}
            onChange={(e) => setInstructionText(e.target.value)}
            placeholder="Ex: Aponte a câmera do celular para o código acima"
          />
        </div>

        <div className="form-group">
          <label>Link de Avaliação do Google</label>
          <input 
            type="text" 
            className="form-control" 
            value={reviewLink}
            onChange={(e) => setReviewLink(e.target.value)}
            placeholder="https://g.page/r/..."
          />
        </div>

        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showStars} 
              onChange={(e) => setShowStars(e.target.checked)} 
              style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
            />
            Mostrar 5 Estrelas
          </label>
          
          {showStars && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Cor das Estrelas:</label>
              <input 
                type="color" 
                value={starColor} 
                onChange={(e) => setStarColor(e.target.value)} 
                style={{ width: '40px', height: '30px', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px' }}
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Ícone no Centro do QR Code</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <label className="btn" style={{ flex: 1, backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', cursor: 'pointer', color: '#475569' }}>
              <Upload size={16} />
              Trocar Ícone
              <input type="file" accept="image/*" onChange={handleQrIconUpload} style={{ display: 'none' }} />
            </label>
            {qrIconImage && (
              <button 
                className="btn" 
                style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}
                onClick={() => setQrIconImage(null)}
              >
                Voltar pro Google
              </button>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Cores do Fundo</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="color" 
              value={color1} 
              onChange={(e) => setColor1(e.target.value)} 
              style={{ flex: 1, height: '40px', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px' }}
            />
            <input 
              type="color" 
              value={color2} 
              onChange={(e) => setColor2(e.target.value)} 
              style={{ flex: 1, height: '40px', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px' }}
            />
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Dica: Faça upload de uma logo e nós ajustamos as cores automaticamente!
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleDownload} style={{ marginTop: 'auto' }}>
          <Download size={18} />
          Baixar PDF Alta Resolução
        </button>
      </aside>

      <main className="preview-area">
        <div className="header-controls">
          <h3 style={{ color: 'var(--color-text-muted)', fontSize: '1rem', fontWeight: 600 }}>Preview de Impressão</h3>
        </div>

        <div className="display-card" ref={displayRef} style={{ background: gradientBg }}>
          <div className="glass-panel">
            
            <div className="display-header">
              {logoImage ? (
                <div 
                  className="logo-wrapper"
                  style={{ 
                    background: logoBgOpacity > 0 ? `rgba(0, 0, 0, ${logoBgOpacity / 100})` : 'transparent',
                    borderRadius: '16px',
                    boxShadow: logoBgOpacity > 0 ? '0 10px 25px rgba(0,0,0,0.2)' : 'none',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '300px',
                    height: '110px',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                  onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY); }}
                  onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                  onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
                  onTouchEnd={handleDragEnd}
                >
                  <img 
                    src={logoImage} 
                    alt="Logotipo da Empresa" 
                    className="company-logo-img" 
                    style={{ 
                      transform: `translate(${logoPos.x}px, ${logoPos.y}px) scale(${logoSize / 100})`, 
                      transition: isDragging ? 'none' : 'all 0.1s',
                      pointerEvents: 'none' // Previne a imagem de tentar ser arrastada nativamente pelo navegador
                    }}
                  />
                </div>
              ) : (
                <h1 className="company-name">{companyName || 'Sua Empresa'}</h1>
              )}
            </div>

            {showStars && (
              <div className="google-stars" style={{ color: starColor }}>
                <Star fill="currentColor" size={26} />
                <Star fill="currentColor" size={26} />
                <Star fill="currentColor" size={26} />
                <Star fill="currentColor" size={26} />
                <Star fill="currentColor" size={26} />
              </div>
            )}

            <h2 className="display-title" style={{ color: titleColor }}>
              {callToAction || 'Avalie-nos no Google'}
            </h2>

            <div className="qr-container">
              {reviewLink ? (
                <QRCodeSVG 
                  value={reviewLink} 
                  size={800} // Gera um SVG gigante para qualidade máxima
                  style={{ width: '200px', height: '200px' }} // Exibe no tamanho normal
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: qrIconImage || googleGBase64,
                    height: 192, // Escala o ícone proporcionalmente (800 / 200 * 48)
                    width: 192,
                    excavate: true,
                  }}
                />
              ) : (
                <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                  <QrCode size={48} color="#94a3b8" />
                </div>
              )}
            </div>

            <p className="instruction-text">
              {instructionText || 'Aponte a câmera do celular para o código acima'}
            </p>

            <div className="google-accent-bar"></div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
