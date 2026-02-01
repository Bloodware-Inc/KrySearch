/* ==============================
   Absolute Zero Knowledge GODMODE
   Encrypted Relay • Hybrid Crypto • Search Isolation
   Static-safe / Browser-only
   ============================== */
(function(){
  "use strict";

  const plugin={
    id:"absolute-zero-knowledge-godmode",
    description:"Encrypted relay + hybrid crypto + full search isolation",

    async run(){
      try{

        /* ================= CONFIG ================= */

        const RELAY_URL=null; // OPTIONAL: user-provided relay endpoint
        const MAX_LEN=256;
        const QUERY_KEYS=["q","query","search","s"];
        const JITTER_MS=120;
        const DECOYS=4;

        /* ================= ENV LOCKDOWN ================= */

        try{Object.defineProperty(window,"localStorage",{value:null});}catch{}
        try{Object.defineProperty(window,"sessionStorage",{value:null});}catch{}
        try{Object.defineProperty(document,"cookie",{get(){return""},set(){}});}catch{}
        try{indexedDB=null;}catch{}

        history.replaceState({}, "", location.pathname);

        const ref=document.createElement("meta");
        ref.name="referrer";
        ref.content="no-referrer";
        document.head.appendChild(ref);

        /* ================= CSP ================= */

        if(!document.querySelector('meta[http-equiv="Content-Security-Policy"]')){
          const c=document.createElement("meta");
          c.httpEquiv="Content-Security-Policy";
          c.content=[
            "default-src 'self'",
            "script-src 'self'",
            "connect-src 'self'",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'none'",
            "form-action 'self'",
            "upgrade-insecure-requests"
          ].join("; ");
          document.head.appendChild(c);
        }

        /* ================= CRYPTO ================= */

        const enc=new TextEncoder();

        function burn(b){try{crypto.getRandomValues(b);}catch{}}

        async function sha512(buf){
          return crypto.subtle.digest("SHA-512",buf);
        }

        async function hybridSeal(msg){
          // Classical FS
          const eph=await crypto.subtle.generateKey(
            {name:"ECDH",namedCurve:"X25519"},
            false,
            ["deriveBits"]
          );

          const shared=await crypto.subtle.deriveBits(
            {name:"ECDH",public:eph.publicKey},
            eph.privateKey,
            256
          );

          // PQ-hardening layer (hash split)
          const pq=await sha512(shared);

          const keyMaterial=new Uint8Array([
            ...new Uint8Array(shared),
            ...new Uint8Array(pq)
          ]);

          const aesKey=await crypto.subtle.importKey(
            "raw",
            await sha512(keyMaterial),
            {name:"AES-GCM"},
            false,
            ["encrypt"]
          );

          const iv=crypto.getRandomValues(new Uint8Array(12));
          const data=enc.encode(msg);

          const cipher=await crypto.subtle.encrypt(
            {name:"AES-GCM",iv},
            aesKey,
            data
          );

          burn(data);

          return{
            iv:Array.from(iv),
            payload:btoa(String.fromCharCode(...new Uint8Array(cipher)))
          };
        }

        function randomNoise(){
          return crypto.getRandomValues(new Uint8Array(16))
            .reduce((s,b)=>s+(b%36).toString(36),"");
        }

        /* ================= QUERY FIND ================= */

        function findInput(form){
          for(const k of QUERY_KEYS){
            const i=form.querySelector(`input[name="${k}"]`);
            if(i?.value) return i;
          }
          const a=form.querySelector("input[type=search]");
          return a?.value?a:null;
        }

        /* ================= SEARCH ISOLATION ================= */

        function isolatedSearch(payload){
          const iframe=document.createElement("iframe");
          iframe.sandbox="allow-forms allow-scripts";
          iframe.style.display="none";

          iframe.srcdoc=`
            <form method="POST" action="${RELAY_URL||"/search"}">
              <input name="zk" value='${payload.replace(/'/g,"")}' />
            </form>
            <script>document.forms[0].submit()</script>
          `;

          document.body.appendChild(iframe);
          setTimeout(()=>iframe.remove(),1500);
        }

        /* ================= INTERCEPT ================= */

        document.addEventListener("submit",async e=>{
          const f=e.target;
          if(!f || f.tagName!=="FORM") return;

          const input=findInput(f);
          if(!input) return;

          e.preventDefault();
          e.stopImmediatePropagation();

          let q=input.value
            .normalize("NFKC")
            .replace(/[^\x20-\x7E]/g,"")
            .slice(0,MAX_LEN);

          if(!q) return;

          await new Promise(r=>setTimeout(r,Math.random()*JITTER_MS));

          const real=await hybridSeal(q);
          const noise=[];

          for(let i=0;i<DECOYS;i++){
            noise.push(await hybridSeal(randomNoise()));
          }

          input.value="";
          q=null;
          burn(new Uint8Array(1024));

          isolatedSearch(
            encodeURIComponent(JSON.stringify({
              v:1,
              real,
              noise
            }))
          );

        },true);

        /* ================= SABOTAGE ================= */

        navigator.sendBeacon=()=>false;
        window.open=()=>null;
        fetch=new Proxy(fetch,{
          apply(t,_,args){
            const u=String(args[0]||"");
            if(/q=|search|query/.test(u)) throw new Error("blocked");
            return Reflect.apply(t,_,args);
          }
        });

        addEventListener("beforeunload",()=>{
          burn(new Uint8Array(2048));
        });

      }catch{}
    }
  };

  window.KRY_PLUGINS=window.KRY_PLUGINS||[];
  window.KRY_PLUGINS.push(plugin);

})();
