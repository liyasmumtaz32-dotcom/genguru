
import React, { useState } from 'react';
import { Card, Button, Loader } from '../../components/UI';
import { generateImage, editImage, analyzeImage } from '../../services/geminiService';
import { Image as ImageIcon, ScanEye, Upload } from 'lucide-react';

const ImageLab: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null); // For generation/edit
  const [uploadedImage, setUploadedImage] = useState<string | null>(null); // For analysis
  const [analysisResult, setAnalysisResult] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'generate' | 'edit' | 'analyze'>('generate');

  // Handle File Upload for Analysis
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setUploadedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleAction = async () => {
      if(!prompt && mode !== 'analyze') return;
      if(mode === 'analyze' && !uploadedImage) return;

      setLoading(true);
      try {
          if (mode === 'generate') {
            const res = await generateImage(prompt);
            setImage(res);
          } else if (mode === 'edit' && image) {
            const res = await editImage(image, prompt);
            setImage(res);
          } else if (mode === 'analyze' && uploadedImage) {
            // Extract MIME type from base64 string
            const mimeType = uploadedImage.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
            const res = await analyzeImage(uploadedImage, mimeType, prompt || "Jelaskan gambar ini secara detail.");
            setAnalysisResult(res);
          }
      } catch (e) {
          alert('Gagal memproses permintaan.');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto">
         <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Studio & Analisis Gambar</h1>
            <p className="text-slate-400">Generate, Edit, dan Analisis gambar menggunakan Gemini 3 Pro (Vision).</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-6">
                <Card>
                    <div className="flex gap-1 mb-6 bg-slate-700/50 p-1 rounded-lg overflow-x-auto">
                        {['generate', 'edit', 'analyze'].map((m) => (
                            <button 
                                key={m}
                                onClick={() => { setMode(m as any); setPrompt(''); }}
                                className={`flex-1 py-2 px-3 text-xs md:text-sm rounded-md transition-colors capitalize ${mode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                disabled={m === 'edit' && !image}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {mode === 'analyze' && (
                            <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center hover:border-indigo-500 transition-colors cursor-pointer relative">
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <div className="text-slate-400">
                                    <Upload className="mx-auto mb-2" />
                                    <span className="text-xs">{uploadedImage ? "Ganti Gambar" : "Upload Gambar"}</span>
                                </div>
                            </div>
                        )}

                        <label className="text-sm text-slate-400">
                            {mode === 'analyze' ? 'Pertanyaan tentang gambar' : 'Prompt / Deskripsi'}
                        </label>
                        <textarea 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 h-32 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder={mode === 'analyze' ? "Apa yang sedang dilakukan orang dalam gambar ini?" : "Seekor robot sedang belajar..."}
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                        />
                        <Button onClick={handleAction} className="w-full" disabled={loading}>
                            {loading ? <Loader /> : mode.toUpperCase()}
                        </Button>
                    </div>
                </Card>
            </div>

            <div className="md:col-span-2 space-y-4">
                {/* Display Area */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl min-h-[400px] flex items-center justify-center p-4 relative overflow-hidden">
                    {mode === 'analyze' && uploadedImage ? (
                         <img src={uploadedImage} alt="Upload" className="max-w-full max-h-[400px] rounded shadow-2xl" />
                    ) : (mode !== 'analyze' && image) ? (
                        <img src={image} alt="Generated" className="max-w-full max-h-[400px] rounded shadow-2xl" />
                    ) : (
                        <div className="text-center text-slate-500">
                            {mode === 'analyze' ? <ScanEye size={48} className="mx-auto mb-2 opacity-50"/> : <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />}
                            <p>{mode === 'analyze' ? 'Upload gambar untuk dianalisis' : 'Hasil gambar akan muncul di sini'}</p>
                        </div>
                    )}
                    
                    {loading && (
                        <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center backdrop-blur-sm z-10">
                            <div className="text-center">
                                <Loader />
                                <p className="mt-4 text-indigo-400">AI sedang bekerja...</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Analysis Result or Download */}
                {mode === 'analyze' && analysisResult && (
                    <Card title="Hasil Analisis (Gemini 3 Pro)">
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{analysisResult}</p>
                    </Card>
                )}
                
                {mode !== 'analyze' && image && (
                    <div className="flex justify-end">
                        <a href={image} download="generated-image.png" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-2">
                            Download PNG
                        </a>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ImageLab;
