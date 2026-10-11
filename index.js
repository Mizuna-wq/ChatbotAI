import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import express from "express"; 
import fs from "fs/promises"
import multer from "multer";
import cors from "cors";


const app = express(); 
const upload =multer();
app.use(cors());
app.use(express.json());    
app.use(express.static('public'))

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const GEMINI_MODEL = "gemini-3.5-flash-lite";


app.post('/generate-text', async(req, res)=> {
    try {
        const {prompt} = req.body;
        if (!prompt) {
            return res.status(400).json({error: 'Prompt is required'});
        }
        const result = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
        }) 
        
        res.status(200).send({output: result.text}); 
        
    } catch (err) {
        console.error('Error generating text: ', err);
        res.status(500).json({err: 'Failed to generate text'})
    }
})

app.get('/', (req, res)=>{
    res.send("Halo, Silahkan Gunakan Fitur API di /generate-text");
    
})

app.post('/generate-from-image', upload.single('image'), async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required' });
        }
        const prompt = (req.body.prompt && req.body.prompt.trim()) || "Jelaskan dan analisis gambar ini secara detail.";
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype.split(';')[0] || 'image/jpeg';

        const result = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt },
                { inlineData: { data: base64Image, mimeType } },
            ],
        });

        res.status(200).send({ output: result.text });
    } catch (err) {
        console.error('Error generating from image:', err);
        res.status(500).json({ err: 'Failed to generate from image' });
    }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Document file is required' });
        }
        const prompt = (req.body.prompt && req.body.prompt.trim()) || "Tolong ringkas dan jelaskan isi dokumen ini.";
        const base64Document = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype.split(';')[0] || 'application/pdf';

        const result = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt },
                { inlineData: { data: base64Document, mimeType } },
            ],
        });
        
        res.status(200).send({ output: result.text });
    } catch (error) {
        console.error('Error generating from document:', error);
        res.status(500).json({ err: 'Failed to generate from document' });
    }
});

app.post('/generate-from-audio', upload.single('audio'), async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Audio file is required' });
        }
        const prompt = (req.body.prompt && req.body.prompt.trim()) || "Tolong dengarkan rekaman audio ini, buatkan transkrip ringkas dan berikan tanggapan.";
        const base64Audio = req.file.buffer.toString('base64');
        let mimeType = req.file.mimetype.split(';')[0] || 'audio/webm';
        if (mimeType === 'application/octet-stream') {
            mimeType = 'audio/webm';
        }

        const result = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt },
                { inlineData: { data: base64Audio, mimeType } },
            ],
        });
        
        res.status(200).send({ output: result.text });
    } catch (error) {
        console.error('Error generating from audio:', error);
        res.status(500).json({ err: 'Failed to generate from audio' });
    }
});


app.post('/api-chat', async (req,res) => {
    try {
        let {conversation, prompt} = req.body;
        if (!conversation && prompt) {
            conversation = [{ role: 'user', text: prompt }];
        }
        if(!Array.isArray(conversation))throw new Error("conversation must be an array")

        const contents = conversation.map((msg)=>({role: msg.role, parts: [{text: msg.text}]}));

        const result = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config:{
                temperature: 0.9,
                systemInstruction:'selalu gunakan bahasa indonesia'
            }
        }) 
        
        res.status(200).send({output: result.text});
        
    } catch (err) {
        console.error('Error generating text: ', err);
        res.status(500).json({err: 'Failed to generate text'})
    }
})

const PORT= 3000;
app.listen(PORT, ()=>{
    console.log(`Server is running at http://localhost:${PORT}`);
});