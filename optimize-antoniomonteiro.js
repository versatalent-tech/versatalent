const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

(async () => {
  const files = ['Tonecas_1.jpg','Tonecas_2.jpg','Tonecas_3.jpg','Tonecas_4.jpg','Tonecas_5.jpg'];
  const sourceDir = path.join(__dirname, '../uploads');
  const outputDir = path.join(__dirname, 'public/antoniomonteiro');
  const maxWidth = 1400;
  const targetKB = 150;
  const maxQ = 85; const minQ = 60;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir,{recursive:true});

  for(const f of files){
    const input = path.join(sourceDir,f);
    if(!fs.existsSync(input)){console.warn('missing',f);continue;}
    const out = path.join(outputDir,f);
    let q=maxQ;
    await sharp(input).rotate().resize(maxWidth,null,{fit:'inside'}).jpeg({quality:q,progressive:true}).toFile(out);
    let size=fs.statSync(out).size/1024;
    while(size>targetKB*1.5 && q>minQ){q-=5;await sharp(input).rotate().resize(maxWidth,null,{fit:'inside'}).jpeg({quality:q,progressive:true}).toFile(out);size=fs.statSync(out).size/1024;}
    console.log(f,size.toFixed(1)+'KB q'+q);
  }
})();
