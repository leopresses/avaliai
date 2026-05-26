import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Star, QrCode, Upload } from 'lucide-react';

const googleGBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIyLjU2IDEyLjI1YzAtLjc4LS4wNy0xLjUzLS4yLTIuMjVIMTJ2NC4yNmg1LjkyYy0uMjYgMS4zNy0xLjA0IDIuNTMtMi4yMSAzLjMxdjIuNzdoMy41N2MyLjA4LTEuOTIgMy4yOC00Ljc0IDMuMjgtOC4wOXoiIGZpbGw9IiM0Mjg1RjQiLz48cGF0aCBkPSJNMTIgMjNjMi45NyAwIDUuNDYtLjk4IDcuMjgtMi42NmwtMy41Ny0yLjc3Yy0uOTguNjYtMi4yMyAxLjA2LTMuNzEgMS4wNi0yLjg2IDAtNS4yOS0xLjkzLTYuMTYtNC41M0gyLjE4djIuODRDMy45OSAyMC41MyA3LjcgMjMgMTIgMjN6IiBmaWxsPSIjMzRBMDUzIi8+PHBhdGggZD0iTTUuODQgMTQuMDljLS4yMi0uNjYtLjM1LTEuMzYtLjM1LTIuMDlzLjEzLTEuNDMuMzUtMi4wOVY3LjA3SDIuMThDMS40MyA4LjU1IDEgMTAuMjIgMSAxMnMuNDMgMy40NSAxLjE4IDQuOTNsMi44NS0yLjIyLjgxLS42MnoiIGZpbGw9IiNGQkJDMDUiLz48cGF0aCBkPSJNMTIgNS4zOGMxLjYyIDAgMy4wNi41NiA0LjIxIDEuNjRsMy4xNS0zLjE1QzE3LjQ1IDIuMDkgMTQuOTcgMSAxMiAxIDcuNyAxIDMuOTkgMy40NyAyLjE4IDcuMDdsMy42NiAyLjg0Yy44Ny0yLjYgMy4zLTQuNTMgNi4xNi00LjUzeiIgZmlsbD0iI0VBNDMzNSIvPjwvc3ZnPg==";

function App() {
  const [companyName, setCompanyName] = useState('Reserva Beer & Grill');
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(100);
  const [logoBgOpacity, setLogoBgOpacity] = useState(45);
  const [reviewLink, setReviewLink] = useState('https://g.page/r/exemplo/review');
  const [hue, setHue] = useState(250); // Default to a nice purple/blue

  const displayRef = useRef<HTMLDivElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    if (!displayRef.current) return;
    
    const canvas = await html2canvas(displayRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a6'
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, 105, 148);
    pdf.save(`${companyName.replace(/\s+/g, '_')}_QR_Display.pdf`);
  };

  // Dinamicamente gera o gradiente do fundo e a cor do texto baseada no slider
  const gradientBg = `linear-gradient(135deg, hsl(${hue}, 85%, 85%) 0%, hsl(${(hue + 45) % 360}, 85%, 75%) 100%)`;
  const titleColor = `hsl(${hue}, 80%, 25%)`; // Dark version of the selected color

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
                }}
              >
                Remover
              </button>
            )}
          </div>
        </div>

        {logoImage && (
          <div className="form-group" style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label>Tamanho da Logo: {logoSize}%</label>
            <input 
              type="range" 
              min="50" 
              max="400" 
              value={logoSize} 
              onChange={(e) => setLogoSize(Number(e.target.value))} 
              className="color-slider"
              style={{ background: '#cbd5e1' }}
            />
            
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
          <label>Link de Avaliação do Google</label>
          <input 
            type="text" 
            className="form-control" 
            value={reviewLink}
            onChange={(e) => setReviewLink(e.target.value)}
            placeholder="https://g.page/r/..."
          />
        </div>

        <div className="form-group">
          <label>Cor do Fundo (Deslize para mudar)</label>
          <input 
            type="range" 
            min="0" 
            max="360" 
            value={hue} 
            onChange={(e) => setHue(Number(e.target.value))} 
            className="color-slider"
          />
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
                <div style={{ 
                  background: logoBgOpacity > 0 ? `rgba(0, 0, 0, ${logoBgOpacity / 100})` : 'transparent',
                  borderRadius: logoBgOpacity > 0 ? '16px' : '0',
                  boxShadow: logoBgOpacity > 0 ? '0 10px 25px rgba(0,0,0,0.2)' : 'none',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: logoBgOpacity > 0 ? '300px' : 'auto',
                  height: logoBgOpacity > 0 ? '110px' : 'auto'
                }}>
                  <img 
                    src={logoImage} 
                    alt="Logotipo da Empresa" 
                    className="company-logo-img" 
                    style={{ transform: `scale(${logoSize / 100})`, transition: 'all 0.1s' }}
                  />
                </div>
              ) : (
                <h1 className="company-name">{companyName || 'Sua Empresa'}</h1>
              )}
            </div>

            <div className="google-stars">
              <Star fill="currentColor" size={26} />
              <Star fill="currentColor" size={26} />
              <Star fill="currentColor" size={26} />
              <Star fill="currentColor" size={26} />
              <Star fill="currentColor" size={26} />
            </div>

            <h2 className="display-title" style={{ color: titleColor }}>
              Avalie-nos no Google
            </h2>

            <div className="qr-container">
              {reviewLink ? (
                <QRCodeSVG 
                  value={reviewLink} 
                  size={200}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: googleGBase64,
                    height: 48,
                    width: 48,
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
              Aponte a câmera do celular para o código acima
            </p>

            <div className="google-accent-bar"></div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
