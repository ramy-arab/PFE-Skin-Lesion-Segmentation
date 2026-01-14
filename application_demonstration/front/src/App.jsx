import React, { useRef, useState } from "react"; 
import { UploadCloud, Loader2, Image as ImageIcon, Eye, EyeOff, Trash2, RefreshCcw } from "lucide-react"; 
 
// Single-file component with embedded styles (no framer-motion, no Tailwind) 
export default function SegmentationApp() { 
  const [image, setImage] = useState(null); 
  const [mask, setMask] = useState(null); 
  const [loading, setLoading] = useState(false); 
  const [dragging, setDragging] = useState(false); 
  const [opacity, setOpacity] = useState(0.6); 
  const [showOverlay, setShowOverlay] = useState(true); 
  const [error, setError] = useState(""); 
 
  const fileInputRef = useRef(null); 
 
  const handleBrowseClick = () => fileInputRef.current?.click(); 
 
  const handleImageUpload = (event) => { 
    const file = event.target.files?.[0]; 
    if (file) processImage(file); 
  }; 
 
  const handleDrop = (event) => { 
    event.preventDefault(); 
    setDragging(false); 
    const file = event.dataTransfer.files?.[0]; 
    if (file) processImage(file); 
  }; 
 
  const processImage = async (file) => { 
    setError(""); 
    const localUrl = URL.createObjectURL(file); 
    setImage(localUrl); 
    setMask(null); 
    setLoading(true); 
 
    const formData = new FormData(); 
    formData.append("file", file); 
 
    try { 
      const response = await fetch("http://localhost:5000/segment", { 
        method: "POST", 
        body: formData, 
      }); 
 
      if (!response.ok) { 
        throw new Error(`Server responded ${response.status}`); 
      } 
      const data = await response.json(); 
      if (!data?.mask) throw new Error("Mask not returned by API"); 
      setMask(`data:image/png;base64,${data.mask}`); 
    } catch (err) { 
      console.error(err); 
      setError(err.message || "Failed to process image"); 
    } finally { 
      setLoading(false); 
    } 
  }; 
 
  const handleClear = () => { 
    setImage(null); 
    setMask(null); 
    setOpacity(0.6); 
    setShowOverlay(true); 
    setError(""); 
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  }; 
 
  return ( 
    <div className="app"> 
      <style>{STYLES}</style> 
 
      <header className="header"> 
        <div className="brand"> 
          <ImageIcon size={28} /> 
          <h1>Skin Lesion Segmentation</h1> 
        </div> 
        <div className="actions"> 
          <button className="btn secondary" onClick={handleClear} title="Clear"> 
            <Trash2 size={18} /> 
            <span>Clear</span> 
          </button> 
          <button className="btn primary" onClick={handleBrowseClick} title="Upload image"> 
            <UploadCloud size={18} /> 
            <span>Upload</span> 
          </button> 
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            className="hidden" 
          /> 
        </div> 
      </header> 
 
      <main className="content"> 
        {/* Upload / Drop zone */} 
        {!image && ( 
          <div 
            className={`dropzone ${dragging ? "dragging" : ""}`} 
            onDragOver={(e) => { 
              e.preventDefault(); 
              setDragging(true); 
            }} 
            onDragLeave={() => setDragging(false)} 
            onDrop={handleDrop} 
            onClick={handleBrowseClick} 
            role="button" 
            aria-label="Upload image" 
          > 
            <UploadCloud size={44} /> 
            <p className="dz-title">Drag & drop an image, or click to browse</p> 
            <p className="dz-hint">JPG / PNG — processed entirely in your browser + API</p> 
          </div> 
        )} 
 
        {/* Error notice */} 
        {error && ( 
          <div className="alert"> 
            <span>{error}</span> 
            <button className="link" onClick={() => setError("")}>Dismiss</button> 
          </div> 
        )} 
 
        {/* Results */} 
        {(image || loading) && ( 
          <section className="grid"> 
            {/* Uploaded Image */}
            <div className="card"> 
              <div className="card-head"> 
                <h3>Uploaded Image</h3> 
              </div> 
              <div className="media"> 
                {!image ? ( 
                  <div className="skeleton" /> 
                ) : ( 
                  <img src={image} alt="Uploaded" className="preview" /> 
                )} 
              </div> 
            </div> 



            {/* 🔹 Binary Segmentation (new) */} 
            <div className="card"> 
              <div className="card-head"> 
                <h3>Binary Segmentation</h3> 
              </div> 
              <div className="media"> 
                {loading ? ( 
                  <div className="loading"> 
                    <Loader2 className="spin" size={28} /> 
                    <span>Processing…</span> 
                  </div> 
                ) : mask ? ( 
                  <img src={mask} alt="Binary segmentation" className="preview" /> 
                ) : ( 
                  <div className="placeholder"> 
                    <RefreshCcw size={22} /> 
                    <span>Upload an image to generate mask</span> 
                  </div> 
                )} 
              </div> 
            </div> 

            {/* Overlay Mask (existing code stays unchanged) */} 
            <div className="card"> 
              <div className="card-head"> 
                <h3>Generated Mask</h3> 
                <div className="right"> 
                  <button 
                    className="icon-btn" 
                    onClick={() => setShowOverlay((v) => !v)} 
                    title={showOverlay ? "Hide overlay" : "Show overlay"} 
                  > 
                    {showOverlay ? <EyeOff size={18} /> : <Eye size={18} />} 
                  </button> 
                </div> 
              </div> 
              <div className="media"> 
                {loading ? ( 
                  <div className="loading"> 
                    <Loader2 className="spin" size={28} /> 
                    <span>Processing…</span> 
                  </div> 
                ) : mask ? ( 
                  <div className="stack"> 
                    <img src={image} alt="Base" className="preview" /> 
                    {showOverlay && ( 
                      <img 
                        src={mask} 
                        alt="Segmentation mask" 
                        className="preview mask" 
                        style={{ opacity }} 
                      /> 
                    )} 
                  </div> 
                ) : ( 
                  <div className="placeholder"> 
                    <RefreshCcw size={22} /> 
                    <span>Upload an image to generate mask</span> 
                  </div> 
                )} 
              </div> 
 
              {/* Controls */} 
              {mask && ( 
                <div className="panel"> 
                  <label htmlFor="opacity">Mask opacity</label> 
                  <input 
                    id="opacity" 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={opacity} 
                    onChange={(e) => setOpacity(parseFloat(e.target.value))} 
                  /> 
                  <span className="value">{Math.round(opacity * 100)}%</span> 
                </div> 
              )} 
            </div> 
          </section> 
        )} 
      </main> 
 
      <footer className="footer"> 
       
      </footer> 
    </div> 
  ); 
} 
 
const STYLES = ` 
:root{ 
  --bg: #f6f8fb; --panel:#ffffff; --ink:#0f172a; --muted:#64748b; --ring:#e2e8f0; --accent:#2563eb; --accent-weak:#dbeafe; 
} 
*{box-sizing:border-box} 
html,body,#root{height:100%} 
body{margin:0; background:linear-gradient(135deg,#f8fafc, #eef2ff 20%, #f6f8fb); color:var(--ink); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";} 
.hidden{display:none} 
.app{min-height:100vh; display:flex; flex-direction:column} 
.header{position:sticky; top:0; z-index:10; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 20px; backdrop-filter:saturate(180%) blur(8px); background:rgba(255,255,255,.7); border-bottom:1px solid var(--ring)} 
.brand{display:flex; align-items:center; gap:10px} 
.brand h1{font-size:18px; margin:0} 
.actions{display:flex; align-items:center; gap:10px} 
.btn{display:inline-flex; align-items:center; gap:8px; border:1px solid var(--ring); padding:8px 12px; border-radius:12px; background:var(--panel); cursor:pointer; transition:transform .08s ease, box-shadow .2s ease} 
.btn:hover{transform:translateY(-1px); box-shadow:0 6px 16px rgba(0,0,0,.06)} 
.btn.primary{background:var(--accent); color:white; border-color:transparent} 
.btn.secondary{background:var(--panel)} 
.link{background:none; border:none; color:var(--accent); cursor:pointer} 
 
.content{max-width:1100px; width:100%; margin:24px auto; padding:0 16px; flex:1} 
.dropzone{border:2px dashed #cbd5e1; color:var(--muted); background:white; border-radius:16px; padding:42px 24px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:10px; box-shadow:0 8px 28px rgba(2,8,23,.06)} 
.dropzone svg{opacity:.9} 
.dropzone .dz-title{font-weight:600; color:#1f2937} 
.dropzone .dz-hint{font-size:12px} 
.dropzone.dragging{border-color:var(--accent); background:var(--accent-weak)} 
 
.grid{display:grid; grid-template-columns:1fr; gap:18px; margin-top:18px} 

@media(min-width:920px){.grid{grid-template-columns:1fr 1fr 1fr}}

 
.card{background:var(--panel); border:1px solid var(--ring); border-radius:16px; box-shadow:0 10px 24px rgba(2,8,23,.05); overflow:hidden; display:flex; flex-direction:column} 
.card-head{display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid var(--ring)} 
.card-head h3{margin:0; font-size:15px} 
.card-head .right{display:flex; align-items:center; gap:8px} 
 
.media{position:relative; padding:12px} 
.preview{width:100%; height:auto; display:block; border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,.06)} 
.stack{position:relative} 
.stack .mask{position:absolute; inset:0; mix-blend-mode:multiply; transition:opacity .15s ease} 
.placeholder{height:300px; border:1px dashed var(--ring); border-radius:12px; color:var(--muted); display:flex; align-items:center; justify-content:center; gap:8px} 
 
.panel{display:flex; align-items:center; gap:10px; padding:10px 14px; border-top:1px solid var(--ring)} 
.panel label{font-size:13px; color:#334155} 
.panel input[type=range]{flex:1} 
.panel .value{width:42px; text-align:right; font-variant-numeric:tabular-nums} 
 
.loading{display:flex; align-items:center; gap:10px; color:var(--accent); padding:24px} 
.spin{animation:spin 1s linear infinite} 
@keyframes spin{to{transform:rotate(360deg)}} 
 
.skeleton{height:300px; border-radius:12px; background:linear-gradient(90deg,#f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%); background-size:400% 100%; animation:shimmer 1.2s infinite} 
@keyframes shimmer{0%{background-position:100% 0}100%{background-position:0 0}} 
 
.icon-btn{background:transparent; border:1px solid var(--ring); border-radius:10px; padding:6px; cursor:pointer} 
.icon-btn:hover{background:#f8fafc} 
 
.alert{margin:14px 0; padding:10px 12px; border:1px solid #fecaca; background:#fff1f2; color:#991b1b; border-radius:12px; display:flex; align-items:center; justify-content:space-between; gap:12px} 
 
.footer{padding:20px; text-align:center; color:var(--muted)} 
`; 


