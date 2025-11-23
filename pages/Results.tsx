
import React, { useEffect, useState } from 'react';
import { GeneratedResult } from '../types';
import { Card, Button } from '../components/UI';
import { Download, Play, Save, Trash2, ArrowLeft, Check, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { textToSpeech } from '../services/geminiService';

const Results: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<GeneratedResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('lastResult');
    if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setData(parsed);
          setContent(parsed.content);
        } catch (e) {
          console.error("Failed to load result", e);
          navigate('/dashboard');
        }
    } else {
        navigate('/dashboard');
    }
  }, [navigate]);

  const handleDownload = () => {
      // CSS Khusus untuk Microsoft Word & Cetak
      // Spesifikasi: Legal Paper, Margin 1.5cm, Portrait, Table Fixed
      const cssStyles = `
        @page {
            size: Legal portrait; /* 21.59cm x 35.56cm */
            margin: 1.5cm; 
            mso-page-orientation: portrait;
        }
        body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt; /* Standar profesional */
            line-height: 1.3;
            color: #000;
            background: #fff;
        }
        h1, h2, h3 { text-align: center; margin-bottom: 0.5em; text-transform: uppercase; }
        h1 { font-size: 14pt; font-weight: bold; }
        h2 { font-size: 12pt; font-weight: bold; }
        
        /* TABEL ANTI MELEBAR (FIXED LAYOUT) - KRUSIAL UNTUK DOCX */
        table {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            margin-bottom: 1em;
            table-layout: fixed; /* Memaksa tabel patuh pada lebar halaman */
        }
        th, td {
            border: 1px solid #000;
            padding: 4px 6px;
            vertical-align: top;
            word-wrap: break-word; /* Memotong kata panjang */
            overflow-wrap: break-word;
            word-break: break-word;
            font-size: 11pt;
        }
        th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }
        
        /* Typografi Arab */
        .rtl, [dir="rtl"] {
            direction: rtl;
            text-align: right;
            font-family: 'Traditional Arabic', 'Amiri', serif;
            font-size: 14pt;
        }
        
        /* Elements */
        hr { border: 0; border-top: 2px solid #000; margin: 15px 0; }
        ul, ol { margin-left: 1.5em; padding-left: 0; }
        img { max-width: 100%; height: auto; }
      `;

      const header = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>${data?.title}</title>
            <style>${cssStyles}</style>
        </head>
        <body>
      `;
      
      const footer = "</body></html>";
      
      // Wrapper div untuk memastikan lebar konten di Word sesuai
      const processedContent = `<div class="WordSection1" style="width:100%;">${content}</div>`;
      
      const sourceHTML = header + processedContent + footer;

      const blob = new Blob(['\ufeff', sourceHTML], {
          type: 'application/msword'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data?.title || 'Dokumen'}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleSave = () => {
      if (!data) return;
      
      const historyItem = {
          ...data,
          content: content,
          id: crypto.randomUUID(),
          createdAt: new Date()
      };

      const existingHistory = localStorage.getItem('documentHistory');
      let history = [];
      try {
          history = existingHistory ? JSON.parse(existingHistory) : [];
      } catch (e) {
          history = [];
      }
      
      const newHistory = [historyItem, ...history];
      localStorage.setItem('documentHistory', JSON.stringify(newHistory));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
  };

  const handleTTS = async () => {
      if (isPlaying) return;
      setIsPlaying(true);
      try {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = content;
          const text = tempDiv.textContent || "";
          const shortText = text.substring(0, 500);

          const audioBuffer = await textToSpeech(shortText);
          if (audioBuffer) {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const buffer = await audioContext.decodeAudioData(audioBuffer);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
            source.onended = () => setIsPlaying(false);
          } else {
             setIsPlaying(false); 
          }
      } catch (e) {
          console.error(e);
          setIsPlaying(false);
          alert(e instanceof Error ? e.message : "Gagal memutar audio");
      }
  };

  if (!data) return null;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
        {/* Toolbar Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white">
                <ArrowLeft size={20} /> Kembali
            </button>
            <div className="flex flex-wrap gap-2 items-center">
                 <div className="mr-4 text-xs text-slate-500 hidden md:block">
                    Format: Legal Portrait • Margin 1.5cm
                </div>
                <Button variant="outline" onClick={() => setIsEditing(!isEditing)} className="h-9 text-sm">
                    {isEditing ? 'Selesai Edit' : 'Edit Konten'}
                </Button>
                <Button variant="secondary" onClick={handleTTS} disabled={isPlaying} className="h-9 text-sm">
                    <Play size={16} className={isPlaying ? "animate-pulse text-green-400" : ""} /> 
                </Button>
                <Button variant="secondary" onClick={handleSave} className={`h-9 text-sm ${saved ? "bg-green-600 text-white" : ""}`}>
                    {saved ? <Check size={16} /> : <Save size={16} />} 
                </Button>
                <Button onClick={handleDownload} className="h-9 text-sm bg-blue-600 hover:bg-blue-700">
                    <Download size={16} /> Word (Legal)
                </Button>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-6 overflow-hidden">
            {isEditing ? (
                 <div className="w-full h-full bg-slate-800 rounded-xl border border-slate-700 p-1">
                    <textarea 
                        className="w-full h-full p-4 font-mono text-sm bg-slate-900 text-slate-200 border-none resize-none focus:outline-none rounded-lg"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                 </div>
            ) : (
                /* Document Preview Area - Simulasi Kertas Legal */
                <div className="w-full h-full bg-slate-900 rounded-xl border border-slate-700 overflow-y-auto flex justify-center p-8 custom-scrollbar">
                    <div 
                        className="bg-white text-black shadow-2xl relative transition-transform"
                        style={{
                            /* Dimensi Kertas Legal dalam pixel (asumsi 96DPI) */
                            /* 8.5 inch = 21.59 cm */
                            width: '21.59cm', 
                            /* 14 inch = 35.56 cm */
                            minHeight: '35.56cm', 
                            /* Margin 1.5 cm */
                            padding: '1.5cm',
                            boxSizing: 'border-box',
                            /* Mencegah konten keluar dari kertas */
                            overflow: 'hidden'
                        }}
                    >
                        {/* Inject Global Styles for Preview Only */}
                        <style>{`
                            .preview-content table { 
                                width: 100%; 
                                border-collapse: collapse; 
                                table-layout: fixed; /* Kunci tabel rapi */
                                margin-bottom: 1em; 
                            }
                            .preview-content th, .preview-content td { 
                                border: 1px solid black; 
                                padding: 4px; 
                                word-wrap: break-word; 
                                overflow-wrap: break-word;
                                word-break: break-word; 
                                vertical-align: top; 
                            }
                            .preview-content th { background-color: #f0f0f0; }
                            .preview-content h1, .preview-content h2, .preview-content h3 { text-align: center; }
                            .preview-content p { text-align: justify; line-height: 1.3; }
                        `}</style>
                        
                        <div 
                            className="preview-content font-serif text-[11pt]"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Results;
