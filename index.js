import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import express from "express"; 
import fs from "fs/promises"
import multer from "multer";


const app = express(); 
const upload =multer();
app.use(express.json());

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

app.post('/generate-from-image',upload.single('image'), async(req, res)=>{
    try {
        const {prompt} = req.body;
        const base64Image = req.file.buffer.toString('base64');

        if (!prompt) {
            return res.status(400).json({error: 'Prompt is required'});
        }
        const result = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                {text: prompt},
                {inlineData: {data: base64Image, mimeType: req.file.mimetype}},
            ],
        })

        res.status(200).send({output: result.text});
        
    } catch (err) {
        res.status(500).json({err: 'Failed to generate image'});
    }
})

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    try {
        const base64Document = req.file.buffer.toString('base64');
        const {prompt} = req.body;

        if (!prompt) {
            return res.status(400).json({error: 'Prompt is required'});
        }
        const result = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                {text: prompt},
                {inlineData: {data: base64Document, mimeType: req.file.mimetype}},
            ],
        })
        
        res.status(200).send({output: result.text});
        
    } catch (error) {
        res.status(500).json({err: 'Failed to generate document'});
    }
})

app.post('/generate-from-audio', upload.single('audio'), async(req, res)=> {
    try {
        const base64Audio = req.file.buffer.toString('base64');
        const {prompt} = req.body;

        const result = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                {text: prompt},
                {inlineData: {data: base64Audio, mimeType: req.file.mimetype}},
            ],
        })
        
        res.status(200).send({output: result.text});
        
    } catch (error) {
        res.status(500).json({err: 'Failed to generate audio'});
    }
})

const PORT= 3000;
app.listen(PORT, ()=>{
    console.log(`Server is running at http://localhost:${PORT}`);
});