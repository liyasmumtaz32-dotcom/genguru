
import React, { useState, useRef, useEffect } from 'react';
import { createChatSession } from '../services/geminiService';
import { GenerateContentResponse, Chat } from "@google/genai";
import { Button } from '../components/UI';
import { Send, User, Bot, Loader2 } from 'lucide-react';

interface Message {
    role: 'user' | 'model';
    text: string;
}

const ChatBot: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatSession = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatSession.current = createChatSession();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !chatSession.current) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            let fullText = "";
            setMessages(prev => [...prev, { role: 'model', text: "" }]); // Placeholder

            const resultStream = await chatSession.current.sendMessageStream({ message: userMsg });
            
            for await (const chunk of resultStream) {
                const chunkText = (chunk as GenerateContentResponse).text || "";
                fullText += chunkText;
                
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { role: 'model', text: fullText };
                    return newMsgs;
                });
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: "Maaf, terjadi kesalahan pada koneksi AI." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
            <div className="mb-4">
                <h1 className="text-3xl font-bold text-white mb-2">Asisten Cerdas</h1>
                <p className="text-slate-400">Tanya jawab kompleks dengan Gemini 3 Pro Preview.</p>
            </div>

            <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-4 overflow-y-auto custom-scrollbar mb-4 space-y-4">
                {messages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-500 flex-col">
                        <Bot size={48} className="mb-2 opacity-50" />
                        <p>Mulai percakapan dengan Asisten Guru...</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1">
                                <Bot size={16} className="text-white" />
                            </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-sm' 
                            : 'bg-slate-700 text-slate-100 rounded-tl-sm'
                        }`}>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0 mt-1">
                                <User size={16} className="text-white" />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-2 flex items-center gap-2">
                <input 
                    className="flex-1 bg-transparent border-none focus:ring-0 text-white px-4 py-2 placeholder-slate-500"
                    placeholder="Ketik pesan Anda..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    disabled={isLoading}
                />
                <Button 
                    onClick={handleSend} 
                    disabled={isLoading || !input.trim()} 
                    className={`w-10 h-10 rounded-lg p-0 flex items-center justify-center ${isLoading ? 'bg-slate-600' : 'bg-indigo-600'}`}
                >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </Button>
            </div>
        </div>
    );
};

export default ChatBot;
