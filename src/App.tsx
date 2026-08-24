import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { ChevronDown, Download, Eye, QrCode, Sparkles, Star, Upload } from 'lucide-react';

const googleGBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIyLjU2IDEyLjI1YzAtLjc4LS4wNy0xLjUzLS4yLTIuMjVIMTJ2NC4yNmg1LjkyYy0uMjYgMS4zNy0xLjA0IDIuNTMtMi4yMSAzLjMxdjIuNzdoMy41N2MyLjA4LTEuOTIgMy4yOC00Ljc0IDMuMjgtOC4wOXoiIGZpbGw9IiM0Mjg1RjQiLz48cGF0aCBkPSJNMTIgMjNjMi45NyAwIDUuNDYtLjk4IDcuMjgtMi42NmwtMy41Ny0yLjc3Yy0uOTguNjYtMi4yMyAxLjA2LTMuNzEgMS4wNi0yLjg2IDAtNS4yOS0xLjkzLTYuMTYtNC41M0gyLjE4djIuODRDMy45OSAyMC41MyA3LjcgMjMgMTIgMjN6IiBmaWxsPSIjMzRBMDUzIi8+PHBhdGggZD0iTTUuODQgMTQuMDljLS4yMi0uNjYtLjM1LTEuMzYtLjM1LTIuMDlzLjEzLTEuNDMuMzUtMi4wOVY3LjA3SDIuMThDMS40MyA4LjU1IDEgMTAuMjIgMSAxMnMuNDMgMy40NSAxLjE4IDQuOTNsMi44NS0yLjIyLjgxLS42MnoiIGZpbGw9IiNGQkJDMDUiLz48cGF0aCBkPSJNMTIgNS4zOGMxLjYyIDAgMy4wNi41NiA0LjIxIDEuNjRsMy4xNS0zLjE1QzE3LjQ1IDIuMDkgMTQuOTcgMSAxMiAxIDcuNyAxIDMuOTkgMy40NyAyLjE4IDcuMDdsMy42NiAyLjg0Yy44Ny0yLjYgMy4zLTQuNTMgNi4xNi00LjUzeiIgZmlsbD0iI0VBNDMzNSIvPjwvc3ZnPg==";

const MAX_QR_CHARACTERS = 250;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1200;
const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const DISPLAY_TEMPLATES = [
  { id: 'premium', name: 'Premium', description: 'Vidro violeta', colors: ['#818cf8', '#c084fc'] },
  { id: 'clean', name: 'Clean', description: 'Azul sereno', colors: ['#bfdbfe', '#e0e7ff'] },
  { id: 'warm', name: 'Solar', description: 'Quente e vibrante', colors: ['#fb7185', '#fbbf24'] },
  { id: 'nature', name: 'Nature', description: 'Verde orgânico', colors: ['#6ee7b7', '#67e8f9'] },
  { id: 'noir', name: 'Noir', description: 'Escuro sofisticado', colors: ['#0f172a', '#334155'] },
] as const;

type DisplayTemplateId = (typeof DISPLAY_TEMPLATES)[number]['id'];

const isGoogleReviewDomain = (hostname: string) => {
  const domain = hostname.toLowerCase();
  return (
    domain === 'g.page' ||
    domain.endsWith('.g.page') ||
    domain === 'goo.gl' ||
    domain.endsWith('.goo.gl') ||
    domain === 'google.com' ||
    domain.endsWith('.google.com')
  );
};

const getReviewLinkError = (value: string) => {
  const link = value.trim();

  if (!link) return 'Informe o link de avaliação do Google.';
  if (link.length > MAX_QR_CHARACTERS) {
    return `Use um link de até ${MAX_QR_CHARACTERS} caracteres para preservar a leitura do QR Code.`;
  }

  try {
    const url = new URL(link);
    if (url.protocol !== 'https:') return 'Use um link seguro iniciado por https://.';
    if (!isGoogleReviewDomain(url.hostname)) {
      return 'Use um link de avaliação gerado pelo Google (g.page, maps.app.goo.gl ou google.com).';
    }
  } catch {
    return 'Informe uma URL válida de avaliação do Google.';
  }

  return '';
};

const validateImageFile = (file: File) => {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Use uma imagem PNG, JPG ou WebP.');
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('A imagem deve ter no máximo 5 MB.');
  }
};

const getSafeFileName = (name: string) => {
  const withoutControlCharacters = [...name].filter((character) => character.charCodeAt(0) >= 32).join('');
  return (withoutControlCharacters || 'Display_Avaliacao')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'Display_Avaliacao';
};

const processImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    const readOriginalFile = () => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Não foi possível ler a imagem.'));
      };
      reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
      reader.readAsDataURL(file);
    };

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      if (img.width <= MAX_IMAGE_DIMENSION && img.height <= MAX_IMAGE_DIMENSION) {
        readOriginalFile();
        return;
      }

      const ratio = Math.min(MAX_IMAGE_DIMENSION / img.width, MAX_IMAGE_DIMENSION / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(img.width * ratio);
      canvas.height = Math.floor(img.height * ratio);
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Não foi possível preparar a imagem para exportação.'));
        return;
      }

      try {
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(file.type, 0.9));
      } catch {
        reject(new Error('Não foi possível redimensionar esta imagem.'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível carregar esta imagem.'));
    };

    img.src = objectUrl;
  });
};

const getDominantColors = (imgSrc: string): Promise<[string, string]> => {
  const fallback: [string, string] = ['#e2e8f0', '#cbd5e1'];

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(fallback);
          return;
        }

        const size = 64;
        canvas.width = size;
        canvas.height = size;
        context.drawImage(img, 0, 0, size, size);

        const colorCounts: Record<string, number> = {};
        const data = context.getImageData(0, 0, size, size).data;

        for (let index = 0; index < data.length; index += 4) {
          const [red, green, blue, alpha] = [data[index], data[index + 1], data[index + 2], data[index + 3]];
          const isVeryLight = red > 240 && green > 240 && blue > 240;
          const isVeryDark = red < 15 && green < 15 && blue < 15;
          if (alpha < 128 || isVeryLight || isVeryDark) continue;

          const rgb = `${Math.floor(red / 16) * 16},${Math.floor(green / 16) * 16},${Math.floor(blue / 16) * 16}`;
          colorCounts[rgb] = (colorCounts[rgb] ?? 0) + 1;
        }

        const sortedColors = Object.entries(colorCounts).sort((first, second) => second[1] - first[1]);
        if (sortedColors.length === 0) {
          resolve(fallback);
          return;
        }

        const rgbToHex = (rgb: string) => {
          const [red, green, blue] = rgb.split(',').map(Number);
          return `#${(1 << 24 | red << 16 | green << 8 | blue).toString(16).slice(1).padStart(6, '0')}`;
        };

        const firstColor = rgbToHex(sortedColors[0][0]);
        let secondColor = firstColor;

        for (let index = 1; index < sortedColors.length; index += 1) {
          const [r1, g1, b1] = sortedColors[0][0].split(',').map(Number);
          const [r2, g2, b2] = sortedColors[index][0].split(',').map(Number);
          if (Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) > 60) {
            secondColor = rgbToHex(sortedColors[index][0]);
            break;
          }
        }

        resolve([firstColor, secondColor]);
      } catch {
        resolve(fallback);
      }
    };
    img.onerror = () => resolve(fallback);
    img.src = imgSrc;
  });
};

class QrCodeErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <p className="qr-error" role="alert">Não foi possível gerar este QR Code. Revise o link e tente novamente.</p>;
    }

    return this.props.children;
  }
}

function App() {
  const [companyName, setCompanyName] = useState('');
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(100);
  const [logoBgOpacity, setLogoBgOpacity] = useState(45);
  const [callToAction, setCallToAction] = useState('Avalie-nos no Google');
  const [instructionText, setInstructionText] = useState('Aponte a câmera do celular para o código acima');
  const [qrIconImage, setQrIconImage] = useState<string | null>(null);
  const [reviewLink, setReviewLink] = useState('');
  const [color1, setColor1] = useState('#818cf8');
  const [color2, setColor2] = useState('#c084fc');
  const [showStars, setShowStars] = useState(true);
  const [starColor, setStarColor] = useState('#fbbc04');
  const [selectedTemplate, setSelectedTemplate] = useState<DisplayTemplateId>('premium');
  const [logoPos, setLogoPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const dragStartRef = useRef({ x: 0, y: 0 });
  const displayRef = useRef<HTMLDivElement>(null);

  const normalizedReviewLink = reviewLink.trim();
  const reviewLinkError = getReviewLinkError(reviewLink);
  const isReviewLinkValid = reviewLinkError === '';

  const applyDisplayTemplate = (templateId: DisplayTemplateId) => {
    const template = DISPLAY_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    setSelectedTemplate(template.id);
    setColor1(template.colors[0]);
    setColor2(template.colors[1]);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setUploadError('');
      validateImageFile(file);
      const processedImage = await processImage(file);
      setLogoImage(processedImage);
      const [firstColor, secondColor] = await getDominantColors(processedImage);
      setColor1(firstColor);
      setColor2(secondColor);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Não foi possível processar a logo.');
    }
  };

  const handleQrIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setUploadError('');
      validateImageFile(file);
      setQrIconImage(await processImage(file));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Não foi possível processar o ícone do QR Code.');
    }
  };

  const handleDownload = async () => {
    const displayElement = displayRef.current;
    if (!displayElement || !isReviewLinkValid || isExporting) return;

    setIsExporting(true);
    displayElement.classList.add('pdf-export');

    try {
      await document.fonts.ready;
      const dataUrl = await toPng(displayElement, {
        quality: 1,
        pixelRatio: 4,
        cacheBust: true,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a6',
        compress: true,
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, 105, 148, undefined, 'FAST');
      const fileName = getSafeFileName(companyName.trim());
      pdf.save(`${fileName}_Placa_Avaliacao.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF', error);
      alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      displayElement.classList.remove('pdf-export');
      setIsExporting(false);
    }
  };

  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { x: clientX - logoPos.x, y: clientY - logoPos.y };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setLogoPos({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y,
    });
  };

  const handleLogoKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    const movement = {
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
    }[event.key];

    if (!movement) return;
    event.preventDefault();
    setLogoPos((position) => ({ x: position.x + movement.x, y: position.y + movement.y }));
  };

  const gradientBg = `
    radial-gradient(circle at 0% 0%, ${color1} 0%, transparent 60%),
    radial-gradient(circle at 100% 100%, ${color2} 0%, transparent 60%),
    linear-gradient(135deg, ${color1}22 0%, ${color2}22 100%),
    #ffffff
  `;

  return (
    <div className="app-container">
      <aside className="sidebar" aria-label="Personalização do display">
        <div className="editor-intro">
          <div>
            <div className="brand-row">
              <img src="/logo.svg" alt="Avali.ai" className="brand-logo" />
              <h2>Avali.ai</h2>
            </div>
            <p className="sidebar-intro">Crie uma placa de avaliação elegante em poucos passos.</p>
          </div>
          <a className="preview-shortcut" href="#print-preview">
            <Eye size={16} aria-hidden="true" />
            Ver prévia
          </a>
        </div>

        <details className="editor-section" open>
          <summary>
            <span><strong>Conteúdo</strong><small>Nome, chamada e link</small></span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <div className="section-content">
            <div className="form-group">
              <label htmlFor="company-name">Nome da empresa</label>
              <input id="company-name" type="text" className="form-control" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Ex.: Café do Centro" maxLength={60} />
            </div>

            <div className="form-group">
              <label htmlFor="call-to-action">Chamada para ação</label>
              <input id="call-to-action" type="text" className="form-control" value={callToAction} onChange={(event) => setCallToAction(event.target.value)} placeholder="Ex.: Avalie-nos no Google" maxLength={60} />
            </div>

            <div className="form-group">
              <label htmlFor="instruction-text">Instrução</label>
              <input id="instruction-text" type="text" className="form-control" value={instructionText} onChange={(event) => setInstructionText(event.target.value)} placeholder="Ex.: Aponte a câmera para o código" maxLength={90} />
            </div>

            <div className="form-group link-field">
              <label htmlFor="review-link">Link de avaliação do Google</label>
              <input
                id="review-link"
                type="url"
                inputMode="url"
                className="form-control"
                value={reviewLink}
                onChange={(event) => setReviewLink(event.target.value)}
                placeholder="https://g.page/r/.../review"
                maxLength={MAX_QR_CHARACTERS}
                aria-invalid={Boolean(normalizedReviewLink) && !isReviewLinkValid}
                aria-describedby={normalizedReviewLink && !isReviewLinkValid ? 'review-link-hint review-link-error' : 'review-link-hint'}
              />
              <p id="review-link-hint" className="field-hint">Use o link de avaliação criado no Perfil da Empresa no Google.</p>
              {normalizedReviewLink && !isReviewLinkValid && <p id="review-link-error" className="field-error" role="alert">{reviewLinkError}</p>}
            </div>
          </div>
        </details>

        <details className="editor-section">
          <summary>
            <span><strong>Marca</strong><small>Logo e enquadramento</small></span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <div className="section-content">
            <div className="form-group">
              <span className="field-label">Sua logotipo (opcional)</span>
              <div className="button-row">
                <label className="btn btn-upload" htmlFor="logo-upload">
                  <Upload size={16} aria-hidden="true" />
                  Escolher imagem
                </label>
                <input id="logo-upload" className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} />
                {logoImage && (
                  <button type="button" className="btn btn-danger" onClick={() => {
                    setLogoImage(null);
                    setLogoSize(100);
                    setLogoPos({ x: 0, y: 0 });
                  }}>
                    Remover
                  </button>
                )}
              </div>
            </div>

            {logoImage && (
              <div className="form-group logo-settings">
                <div className="label-with-action">
                  <label htmlFor="logo-size">Tamanho da logo: {logoSize}%</label>
                  {(logoPos.x !== 0 || logoPos.y !== 0) && <button type="button" className="link-button" onClick={() => setLogoPos({ x: 0, y: 0 })}>Centralizar</button>}
                </div>
                <input id="logo-size" type="range" min="50" max="400" value={logoSize} onChange={(event) => setLogoSize(Number(event.target.value))} className="range-control" />
                <p id="logo-position-help" className="field-hint">Arraste a logo ou use as setas do teclado para ajustá-la.</p>
                <label htmlFor="logo-background">Fundo escuro da logo: {logoBgOpacity}%</label>
                <input id="logo-background" type="range" min="0" max="100" value={logoBgOpacity} onChange={(event) => setLogoBgOpacity(Number(event.target.value))} className="range-control" />
              </div>
            )}
          </div>
        </details>

        <details className="editor-section">
          <summary>
            <span><strong>QR Code</strong><small>Ícone e estrelas</small></span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <div className="section-content">
            <div className="form-group compact-group">
              <label className="checkbox-label" htmlFor="show-stars">
                <input id="show-stars" type="checkbox" checked={showStars} onChange={(event) => setShowStars(event.target.checked)} />
                Mostrar 5 estrelas
              </label>
              {showStars && (
                <div className="inline-field">
                  <label htmlFor="star-color">Cor das estrelas</label>
                  <input id="star-color" type="color" value={starColor} onChange={(event) => setStarColor(event.target.value)} />
                </div>
              )}
            </div>

            <div className="form-group">
              <span className="field-label">Ícone no centro</span>
              <div className="button-row">
                <label className="btn btn-upload" htmlFor="qr-icon-upload">
                  <Upload size={16} aria-hidden="true" />
                  Trocar ícone
                </label>
                <input id="qr-icon-upload" className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleQrIconUpload} />
                {qrIconImage && <button type="button" className="btn btn-danger" onClick={() => setQrIconImage(null)}>Usar Google</button>}
              </div>
            </div>
          </div>
        </details>

        <details className="editor-section" open>
          <summary>
            <span><strong>Aparência</strong><small>Modelos e cores</small></span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <div className="section-content">
            <div className="template-heading"><Sparkles size={15} aria-hidden="true" /> Modelos visuais</div>
            <div className="template-grid">
              {DISPLAY_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`template-card ${selectedTemplate === template.id ? 'is-selected' : ''}`}
                  onClick={() => applyDisplayTemplate(template.id)}
                  aria-pressed={selectedTemplate === template.id}
                >
                  <span className="template-swatch" style={{ background: `linear-gradient(135deg, ${template.colors[0]}, ${template.colors[1]})` }} />
                  <span><strong>{template.name}</strong><small>{template.description}</small></span>
                </button>
              ))}
            </div>

            <div className="form-group color-customization">
              <span className="field-label">Cores personalizadas</span>
              <div className="color-fields">
                <label htmlFor="background-color-one">Cor primária<input id="background-color-one" type="color" value={color1} onChange={(event) => setColor1(event.target.value)} /></label>
                <label htmlFor="background-color-two">Cor secundária<input id="background-color-two" type="color" value={color2} onChange={(event) => setColor2(event.target.value)} /></label>
              </div>
              <p className="field-hint">Ao enviar uma logo, as cores são ajustadas automaticamente.</p>
            </div>
          </div>
        </details>

        {uploadError && <p className="field-error" role="alert">{uploadError}</p>}

        <div className="export-panel">
          <p><span className={`status-dot ${isReviewLinkValid ? 'is-ready' : ''}`} />{isReviewLinkValid ? 'Pronto para impressão em A6' : 'Adicione um link para liberar a exportação'}</p>
          <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={!isReviewLinkValid || isExporting} title={!isReviewLinkValid ? reviewLinkError : undefined}>
            <Download size={18} aria-hidden="true" />
            {isExporting ? 'Gerando PDF…' : 'Baixar PDF em alta resolução'}
          </button>
        </div>
      </aside>

      <main className="preview-area" id="print-preview" tabIndex={-1}>
        <div className="header-controls">
          <span>Prévia de impressão</span>
          <h3>Seu display de mesa</h3>
        </div>

        <div className={`display-card template-${selectedTemplate}`} ref={displayRef} style={{ background: gradientBg }}>
          <div className="glass-panel">
            <div className="display-header">
              {logoImage ? (
                <div
                  className="logo-wrapper"
                  style={{
                    background: logoBgOpacity > 0 ? `rgba(0, 0, 0, ${logoBgOpacity / 100})` : 'transparent',
                    boxShadow: logoBgOpacity > 0 ? '0 10px 25px rgba(0, 0, 0, 0.2)' : 'none',
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                  tabIndex={0}
                  aria-describedby="logo-position-help"
                  onKeyDown={handleLogoKeyDown}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    handleDragStart(event.clientX, event.clientY);
                  }}
                  onPointerMove={(event) => handleDragMove(event.clientX, event.clientY)}
                  onPointerUp={() => setIsDragging(false)}
                  onPointerCancel={() => setIsDragging(false)}
                >
                  <img
                    src={logoImage}
                    alt="Logotipo da empresa"
                    className="company-logo-img"
                    style={{ transform: `translate(${logoPos.x}px, ${logoPos.y}px) scale(${logoSize / 100})`, transition: isDragging ? 'none' : 'transform 0.1s' }}
                  />
                </div>
              ) : (
                <h1 className={`company-name ${companyName.length > 24 ? 'company-name--long' : ''}`}>{companyName || 'Sua empresa'}</h1>
              )}
            </div>

            {showStars && (
              <div className="google-stars" style={{ color: starColor }} aria-label="5 estrelas">
                {Array.from({ length: 5 }, (_, index) => <Star key={index} fill="currentColor" size={26} aria-hidden="true" />)}
              </div>
            )}

            <p className="display-kicker">Sua opinião faz a diferença</p>
            <h2 className="display-title">{callToAction || 'Avalie-nos no Google'}</h2>

            <div className="qr-container" aria-live="polite">
              {isReviewLinkValid ? (
                <QrCodeErrorBoundary key={normalizedReviewLink}>
                  <QRCodeSVG
                    value={normalizedReviewLink}
                    size={800}
                    style={{ width: '200px', height: '200px' }}
                    level="H"
                    marginSize={4}
                    title="QR Code para a página de avaliação no Google"
                    imageSettings={{ src: qrIconImage || googleGBase64, height: 112, width: 112, excavate: true }}
                  />
                </QrCodeErrorBoundary>
              ) : (
                <div className="qr-placeholder" aria-label="Aguardando link de avaliação válido"><QrCode size={48} aria-hidden="true" /></div>
              )}
            </div>

            <p className="instruction-text">{instructionText || 'Aponte a câmera do celular para o código acima'}</p>
            <div className="google-accent" aria-hidden="true"><span /><span /><span /><span /></div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
