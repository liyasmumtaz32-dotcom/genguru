
import React, { useState, useRef, useEffect } from 'react';
import { Card, Button } from '../../components/UI';
import { Mic, MicOff, Volume2, StopCircle, Radio } from 'lucide-react';
import { getAI } from '../../services/geminiService';
import { LiveServerMessage, Modality, Blob } from '@google/genai';

const AudioLab: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState('Siap Terhubung');
  const [volume, setVolume] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  
  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-4), msg]);

  // Audio Helper Functions
  function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    
    // Manual Encode
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);

    return {
        data: b64,
        mimeType: 'audio/pcm;rate=16000',
    };
  }

  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
  }

  const startSession = async () => {
    try {
      setStatus('Menghubungkan...');
      addLog("Meminta izin mikrofon...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addLog("Mikrofon aktif.");

      // Setup Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      nextStartTimeRef.current = 0;

      const ai = getAI();
      addLog("Inisialisasi Gemini Live 2.5...");

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => {
                setStatus('Terhubung');
                setIsActive(true);
                addLog("Koneksi WebSocket Terbuka.");

                // Process Input Audio
                const source = inputContextRef.current!.createMediaStreamSource(stream);
                const scriptProcessor = inputContextRef.current!.createScriptProcessor(4096, 1, 1);
                
                scriptProcessor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Visualize volume
                    let sum = 0;
                    for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                    setVolume(Math.sqrt(sum / inputData.length) * 100);

                    const pcmBlob = createBlob(inputData);
                    sessionPromise.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                };

                source.connect(scriptProcessor);
                scriptProcessor.connect(inputContextRef.current!.destination);
                
                // Store cleaner
                sessionRef.current = { 
                    close: () => {
                        scriptProcessor.disconnect();
                        source.disconnect();
                        stream.getTracks().forEach(t => t.stop());
                    } 
                };
            },
            onmessage: async (message: LiveServerMessage) => {
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                
                if (base64Audio && audioContextRef.current) {
                    const ctx = audioContextRef.current;
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                    
                    const audioBuffer = await decodeAudioData(
                        decode(base64Audio),
                        ctx,
                        24000,
                        1
                    );
                    
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(ctx.destination);
                    source.onended = () => sourcesRef.current.delete(source);
                    
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);
                }

                if (message.serverContent?.interrupted) {
                    addLog("Interupsi terdeteksi.");
                    sourcesRef.current.forEach(s => s.stop());
                    sourcesRef.current.clear();
                    nextStartTimeRef.current = 0;
                }
            },
            onclose: () => {
                setStatus('Terputus');
                setIsActive(false);
                addLog("Koneksi ditutup.");
            },
            onerror: (err) => {
                console.error(err);
                addLog("Error: " + JSON.stringify(err));
            }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            },
            systemInstruction: "Anda adalah teman ngobrol yang ramah dan cerdas dalam Bahasa Indonesia."
        }
      });

    } catch (e) {
      setStatus('Error');
      addLog("Gagal: " + (e as Error).message);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
        sessionRef.current.close();
    }
    if (inputContextRef.current) inputContextRef.current.close();
    if (audioContextRef.current) audioContextRef.current.close();
    
    setIsActive(false);
    setStatus('Siap Terhubung');
    setVolume(0);
    // Reload to fully clear web sockets in this simple demo structure
    window.location.reload(); 
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
         <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <Radio className="text-red-500 animate-pulse" /> Lab Audio Live
            </h1>
            <p className="text-slate-400">Percakapan real-time ultra-low latency dengan Gemini 2.5 Native Audio.</p>
        </div>

        <div className="relative mb-8">
            <div className={`w-64 h-64 mx-auto rounded-full flex items-center justify-center transition-all duration-100 ${isActive ? 'bg-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.5)]' : 'bg-slate-800'}`}>
                <div 
                    className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-75 border-4 ${isActive ? 'border-indigo-400 bg-indigo-900/50' : 'border-slate-600 bg-slate-700'}`}
                    style={{ transform: `scale(${1 + (volume / 50)})` }}
                >
                     {isActive ? <Volume2 size={64} className="text-white" /> : <MicOff size={64} className="text-slate-500" />}
                </div>
            </div>
            
            <div className="mt-8 space-y-4">
                <p className={`font-mono text-sm uppercase tracking-widest ${isActive ? 'text-green-400' : 'text-slate-500'}`}>
                    STATUS: {status}
                </p>
                
                {!isActive ? (
                    <Button onClick={startSession} className="rounded-full px-8 py-4 text-lg shadow-xl shadow-indigo-500/20 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500">
                        <Mic className="mr-2" /> Mulai Percakapan
                    </Button>
                ) : (
                    <Button onClick={stopSession} variant="danger" className="rounded-full px-8 py-4 text-lg shadow-xl shadow-red-500/20">
                        <StopCircle className="mr-2" /> Akhiri Sesi
                    </Button>
                )}
            </div>
        </div>

        <Card className="mt-8 text-left bg-black/50 font-mono text-xs text-green-400 p-4 h-40 overflow-hidden border-slate-800">
            {logs.map((log, i) => (
                <div key={i}>&gt; {log}</div>
            ))}
            {isActive && <div className="animate-pulse">&gt; _</div>}
        </Card>
    </div>
  );
};

export default AudioLab;
