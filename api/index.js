const express = require('express');
const path = require('path');
const fs = require('fs');

const ARTISANS = require('./artisans');
const REQS = require('./reqs');
const SEED_PRODUCTS = require('./p');

const app = express();
const FRONTEND = path.join(__dirname, '..', 'frontend');

app.use(express.json({limit:'15mb'}));
app.use(express.urlencoded({extended:true}));

function clone(v){ return JSON.parse(JSON.stringify(v)); }
// Vercel functions are stateless. Keep runtime data in memory for this demo.
// For persistent production data, replace this with PostgreSQL/another database.
let db={products:clone(SEED_PRODUCTS), inquiries:[], rfqs:clone(REQS)};
function save(){ /* intentionally no-op on Vercel; filesystem writes are not persistent */ }
function nextId(items){ return items.length ? Math.max(...items.map(x=>Number(x.id)||0))+1 : 1; }

const SERVICES={
 speech:{name:'SpeechService',provider:'IndicConformer (AI4Bharat)'},
 translation:{name:'TranslationService',provider:'IndicTrans2 (AI4Bharat)'},
 vision:{name:'VisionService',provider:'Open-weight vision-language model'},
 catalog:{name:'CatalogGenerationService',provider:'Open-weight instruct LLM (Qwen/Gemma family)'},
 image:{name:'ImageProcessingService',provider:'Background-removal model (licence check required)'},
 pricing:{name:'PricingService',provider:'Explainable pricing engine (not an LLM)'}
};

const SAMPLE={
 en:'This is a handwoven cotton stole made in our village. Natural indigo dyed, soft and light, with a traditional border.',
 hi:'यह हमारे गाँव में हाथ से बुना हुआ सूती स्टोल है। प्राकृतिक नील से रंगा हुआ, हल्का और मुलायम, पारंपरिक किनारी के साथ।',
 te:'ఇది మా గ్రామంలో చేతితో నేసిన పత్తి స్టోల్. సహజ నీలిమందుతో రంగు వేసినది, తేలికగా మృదువుగా ఉంటుంది, సంప్రదాయ అంచుతో.'
};

const GLOSS = {
 handwoven:['हाथ से बुना हुआ','చేతితో నేసిన'], cotton:['सूती','పత్తి'], stole:['स्टोल','స్టోల్'],
 natural:['प्राकृतिक','సహజ'], indigo:['नील','నీలిమందు'], soft:['मुलायम','మృదువైన'],
 light:['हल्का','తేలికైన'], traditional:['पारंपरिक','సంప్రదాయ'], border:['किनारी','అంచు'],
 saree:['साड़ी','చీర'], bamboo:['बांस','వెదురు'], terracotta:['टेराकोटा','టెర్రకోట']
};
function demoTranslate(text, from, to){
  if(from===to) return text;
  const reverse = {};
  Object.entries(GLOSS).forEach(([en,v])=>{
    reverse[en]=[en,v[0],v[1]];
  });
  const idx={en:0,hi:1,te:2}[from], outIdx={en:0,hi:1,te:2}[to];
  return String(text).split(/(\s+)/).map(tok=>{
    const key=tok.toLowerCase().replace(/[.,!?;:]+$/,'');
    for(const [en,v] of Object.entries(reverse)){
      if(v[idx]===key || en===key) return v[outIdx] || tok;
    }
    return tok;
  }).join('');
}
function priceEngine(category, craft, cost={}){
  const material=Number(cost.material)||0, hours=Number(cost.hours)||0, rate=Number(cost.rate)||0, packaging=Number(cost.packaging)||0;
  const total=material+hours*rate+packaging;
  const comps=db.products.filter(p=>p.status==='published'&&p.cat===category).map(p=>Number(p.price)).sort((a,b)=>a-b);
  const median=comps.length?comps[Math.floor(comps.length/2)]:null;
  const inq=db.inquiries.filter(i=>{const p=db.products.find(x=>x.id===i.pid);return p&&p.cat===category}).length+
            db.rfqs.filter(r=>r.cat===category).length;
  const demand=Math.min(1.08,1+.02*inq);
  const base=total*1.35, blend=median?base*.6+median*.4:base;
  const suggested=Math.round((blend*demand)/50)*50;
  return {cost:total,base:Math.round(base),comps,median,inq,demand,
    sales:[{q:'Last quarter',n:14,avg:median||Math.round(base)}],
    suggested,lo:Math.round(suggested*.88/50)*50,hi:Math.round(suggested*1.16/50)*50,
    margin:suggested-total,
    reason:median?`Blends your cost plus a 35% margin with the median of ${comps.length} comparable ${String(category||'').toLowerCase()} listings, adjusted ${Math.round((demand-1)*100)}% for demand.`:`No comparable listings yet, so this is your cost plus a 35% margin.`,
    engine:SERVICES.pricing.provider};
}

const api = express.Router();
api.get('/health',(req,res)=>res.json({ok:true,service:'CraftConnect API',version:'1.0.0'}));
api.get('/products',(req,res)=>res.json(db.products));
api.get('/products/:id',(req,res)=>{
  const p=db.products.find(x=>String(x.id)===String(req.params.id));
  p?res.json(p):res.status(404).json({error:'Product not found'});
});
api.post('/products',(req,res)=>{
  const body=req.body||{};
  const product={...body,id:body.id||nextId(db.products)};
  const existing=db.products.findIndex(p=>String(p.id)===String(product.id));
  if(existing>=0) db.products[existing]=product; else db.products.unshift(product);
  save(); res.status(existing>=0?200:201).json(product);
});
api.patch('/products/:id',(req,res)=>{
  const i=db.products.findIndex(x=>String(x.id)===String(req.params.id));
  if(i<0) return res.status(404).json({error:'Product not found'});
  db.products[i]={...db.products[i],...req.body}; save(); res.json(db.products[i]);
});
api.delete('/products/:id',(req,res)=>{
  const before=db.products.length;
  db.products=db.products.filter(x=>String(x.id)!==String(req.params.id));
  if(db.products.length===before) return res.status(404).json({error:'Product not found'});
  save(); res.status(204).end();
});
api.get('/artisans',(req,res)=>res.json(ARTISANS));
api.get('/requirements',(req,res)=>res.json(db.rfqs));
api.get('/inquiries',(req,res)=>res.json(db.inquiries));
api.post('/inquiries',(req,res)=>{
  const item={...req.body,id:nextId(db.inquiries),createdAt:new Date().toISOString()};
  db.inquiries.unshift(item); save(); res.status(201).json(item);
});

api.post('/ai/speech/transcribe',async(req,res)=>{
  const lang=req.body?.lang||'te';
  res.json({text:req.body?.sample?SAMPLE[lang]||'':'',lang,engine:SERVICES.speech.provider});
});
api.post('/ai/translate',async(req,res)=>{
  const text=String(req.body?.text||'').trim(), from=req.body?.from||'en';
  if(!text) return res.json({en:null,hi:null,te:null,unavailable:['en','hi','te'],engine:SERVICES.translation.provider});
  if(Object.values(SAMPLE).includes(text)) return res.json({en:SAMPLE.en,hi:SAMPLE.hi,te:SAMPLE.te,unavailable:[],engine:SERVICES.translation.provider});
  const out={}; for(const l of ['en','hi','te']) out[l]=l===from?text:demoTranslate(text,from,l);
  res.json({...out,unavailable:[],approx:true,engine:SERVICES.translation.provider});
});
api.post('/ai/vision/analyze',async(req,res)=>{
  const known=req.body?.photo?.key==='ikat-saree';
  const A=key=>({key,value:null,confidence:0,status:'unknown'});
  const attributes=['objectType','material','color','pattern','craftType'].map(A);
  if(known){attributes[0]={key:'objectType',value:'Saree',confidence:.62,status:'needs_confirmation'};attributes[3]={key:'pattern',value:'Geometric ikat pattern',confidence:.55,status:'needs_confirmation'};}
  res.json({attributes,note:known?'Low-confidence suggestions only. Please confirm each one.':'The prototype vision service cannot read uploaded photos yet, so every attribute is unknown.',engine:SERVICES.vision.provider});
});
api.post('/ai/catalog/generate',async(req,res)=>{
  const text=String(req.body?.text||'').trim().toLowerCase();
  const vision=req.body?.vision, profile=req.body?.profile||{};
  const val=(v)=>({value:v==null||v===''?null:v,source:v==null||v===''?'unknown':'ai',confirmed:false});
  const material=['cotton','silk','bamboo','brass','terracotta','jute','wood','clay','paper','glass','ceramic'].find(x=>text.includes(x));
  const color=['red','blue','green','yellow','pink','black','white','brown','indigo'].find(x=>text.includes(x));
  const craft=text.includes('handwoven')||text.includes('handloom')?'Handloom weaving':text.includes('hand-painted')?'Hand painting':null;
  const obj=text.includes('saree')?'Saree':text.includes('stole')?'Stole':text.includes('pot')?'Pot':null;
  const vObj=vision?.attributes?.find(a=>a.key==='objectType'&&a.value);
  const objectType=obj||vObj?.value||null;
  const name=[craft&&text.includes('handwoven')?'Handwoven':null,material,objectType].filter(Boolean).join(' ')||null;
  res.json({fields:{
    name:val(name),category:val(objectType==='Saree'||objectType==='Stole'?'Textiles':objectType==='Pot'?'Home Decor':null),
    craft:val(craft),material:val(material?material[0].toUpperCase()+material.slice(1):null),
    color:val(color?color[0].toUpperCase()+color.slice(1):null),dimensions:val(null),
    description:val(req.body?.text||null),quantity:val(null),location:{value:profile.location||null,source:'artisan',confirmed:false},
    languages:{value:['en','hi','te'],source:'ai',confirmed:false},keywords:val([craft,material,objectType,color].filter(Boolean))
  },engine:SERVICES.catalog.provider,note:'Only facts present in the voice note or confirmed photo analysis were used.'});
});
api.post('/ai/image/process',(req,res)=>res.json({processed:req.body?.photo?.original||null,version:req.body?.version||1,method:'simulated',note:'Prototype: lighting adjustment only. The original file is kept unchanged.'}));
api.post('/ai/pricing/suggest',(req,res)=>res.json(priceEngine(req.body?.category,req.body?.craft,req.body?.cost||{})));

app.use('/api/v1',api);
app.use(express.static(FRONTEND));
app.get('*',(req,res)=>{
  if(req.path.startsWith('/api/')) return res.status(404).json({error:'API route not found'});
  res.sendFile(path.join(FRONTEND,'index.html'));
});
module.exports = app;
