
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Select, Button, ProgressModal } from '../../components/UI';
import { generateFastContent } from '../../services/geminiService'; // Using Flash Lite

const ECourseGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [streamLog, setStreamLog] = useState('');
  const [topic, setTopic] = useState('');
  const [meetings, setMeetings] = useState('4');
  const [target, setTarget] = useState('Siswa SMA');
  const [language, setLanguage] = useState('Bahasa Indonesia');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStreamLog("Memulai penyusunan kurikulum (Fast Mode)...");
    
    const harakatInstruction = language === 'Bahasa Arab' ? `
    ATURAN PENULISAN BAHASA ARAB:
    - MATERI SLIDE & PENJELASAN WAJIB MENGGUNAKAN BAHASA ARAB FUSHA DENGAN HARAKAT LENGKAP (Vocalized).
    - JANGAN gunakan Arab gundul.
    - Gunakan istilah teknis yang tepat.
    ` : '';

    const prompt = `Buatkan struktur E-Course lengkap untuk topik: "${topic}".
    - Target Audiens: ${target}.
    - Jumlah Pertemuan: ${meetings}.
    - Bahasa Pengantar: ${language}.
    
    ${harakatInstruction}

    Instruksi Format Notasi Ilmiah (Matematika/Fisika/Kimia):
    - Gunakan tag HTML <sup> untuk pangkat (contoh: x<sup>2</sup>). Jangan gunakan simbol '^'.
    - Gunakan tag HTML <sub> untuk indeks (contoh: H<sub>2</sub>O). Jangan gunakan simbol '_'.
    - Gunakan format yang mudah dibaca.

    Output harus berupa HTML dengan struktur:
    1. Silabus Kursus (Deskripsi, Tujuan).
    2. Rencana Pembelajaran per pertemuan (Tabel).
    3. Materi Detail untuk setiap pertemuan (Gunakan bahasa ${language}).
    4. Konten Slide Presentasi (tandai dengan class="ppt-slide").
    `;

    try {
      // Using Flash Lite via generateFastContent
      const result = await generateFastContent(
          prompt,
          "Anda adalah ahli kurikulum e-course yang cepat dan efisien."
      );
      
      if (result) {
          localStorage.setItem('lastResult', JSON.stringify({
            title: `E-Course: ${topic}`,
            content: result,
            type: 'ECOURSE',
            date: new Date().toISOString()
          }));
          navigate('/results');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan pada sistem AI.";
      setStreamLog(prev => prev + `\n\n[ERROR]: ${msg}`);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
        <ProgressModal isOpen={loading} logs={streamLog} />
        
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Generator E-Course (Fast)</h1>
            <p className="text-slate-400">Rancang kurikulum kursus kilat menggunakan Gemini Flash Lite.</p>
        </div>
        <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
                <Input label="Topik Kursus" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Misal: Dasar Pemrograman Python" required />
                
                <div className="grid grid-cols-2 gap-6">
                    <Select label="Bahasa Pengantar" value={language} onChange={e => setLanguage(e.target.value)}>
                        <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                        <option value="Bahasa Arab">Bahasa Arab</option>
                        <option value="Bahasa Inggris">Bahasa Inggris</option>
                        <option value="Bahasa Sunda">Bahasa Sunda</option>
                    </Select>
                    <Select label="Jumlah Pertemuan/Modul" value={meetings} onChange={e => setMeetings(e.target.value)}>
                        <option value="2">2 Pertemuan</option>
                        <option value="4">4 Pertemuan</option>
                        <option value="8">8 Pertemuan</option>
                        <option value="12">12 Pertemuan</option>
                    </Select>
                </div>
                
                <Input label="Target Audiens" value={target} onChange={e => setTarget(e.target.value)} />
                
                <Button type="submit" className="w-full" disabled={loading}>
                    Generate E-Course (Flash Mode)
                </Button>
            </form>
        </Card>
    </div>
  );
};

export default ECourseGenerator;
