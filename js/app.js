// AITeacher Background Helper
const AITeacher = {
  active: true,
  init() {
     const teacherDiv = document.createElement('div');
     teacherDiv.id = 'ai-teacher-toast';
     teacherDiv.className = 'glass-panel hidden';
     teacherDiv.style.cssText = 'position:fixed; bottom:80px; right:20px; max-width:300px; z-index:9000; border-color:var(--accent); border-left:4px solid var(--accent); transition: all 0.5s ease; transform: translateX(120%); background:var(--bg-dark-surface); padding:1rem; border-radius:12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);';
     teacherDiv.innerHTML = `
        <div style="display:flex; gap:12px; align-items:flex-start;">
           <i data-lucide="bot" style="color:var(--accent); margin-top:2px;"></i>
           <div>
              <h4 style="font-size:12px; font-weight:700; letter-spacing:1px; color:var(--accent); margin-bottom:4px;">AI ASSISTANT</h4>
              <p id="ai-teacher-msg" style="font-size:13px; line-height:1.4; color:white;"></p>
           </div>
        </div>
     `;
     document.body.appendChild(teacherDiv);
  },
  async showTip(manualMessage, duration = 8000) {
    let msg = manualMessage;
    let structuredAdvice = null;
    
    // Let Genkit invent tips if none provided natively
    if(!msg) {
        if(typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            try {
                const contextMap = Store.getAllItems().map(i => ({ 
                    n: i.name, 
                    stock: i.batches.reduce((sum,b) => sum + (b.totalUnits||0), 0) 
                }));
                const payload = JSON.stringify(contextMap);
                const askAITeacher = firebase.functions().httpsCallable('askAITeacher');
                const result = await askAITeacher({ inventoryContext: payload });
                structuredAdvice = result.data;
            } catch(e) {
                console.warn("Genkit AITeacher unreachable:", e);
                msg = this.tips[Math.floor(Math.random() * this.tips.length)];
            }
        } else {
            msg = this.tips[Math.floor(Math.random() * this.tips.length)];
        }
    }

    const toast = document.getElementById('ai-teacher-toast');
    const msgEl = document.getElementById('ai-teacher-msg');
    if(!this.active || !toast) return;

    if (structuredAdvice) {
        // Render rich structured advice
        msgEl.innerHTML = `
            <div style="margin-bottom:8px; font-weight:600; color:white;">${structuredAdvice.stockTrends}</div>
            <ul style="margin: 8px 0; padding-left:18px; font-size:12px; color:rgba(255,255,255,0.8);">
                ${structuredAdvice.immediateActions.map(a => `<li>${a}</li>`).join('')}
            </ul>
            <div style="font-style:italic; font-size:11px; color:var(--accent); border-top:1px solid rgba(255,255,255,0.1); padding-top:8px;">
                "${structuredAdvice.motivationalTip}"
            </div>
        `;
    } else {
        msgEl.innerText = msg;
    }

    toast.classList.remove('hidden');
    void toast.offsetWidth;
    toast.style.transform = 'translateX(0)';
    lucide.createIcons();
    
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
    }, duration);
  }
};

const App = {
  init() {
    this.initAuth();
    Store.initFirestoreSync();
    Router.add('dashboard', () => Components.createDashboard());
    Router.add('departments', () => Components.createDepartmentGrid());
    Router.add('tools', () => Components.createToolsMenu());
    Router.add('receiving', () => Components.createReceivingUI());
    Router.add('sales', () => Components.createSalesUI());
    
    // Dynamic dept routes
    Store.state.departments.forEach(dept => {
       Router.add(`dept-${dept.id}`, () => Components.createItemList(dept.id));
    });

    Router.init();
    lucide.createIcons();
    
    // Bind bottom nav active states dynamically
    window.addEventListener('hashchange', () => {
       document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
           item.style.color = 'var(--text-muted)';
       });
       const hash = window.location.hash.replace('#', '');
       const navMap = {
           'dashboard': 0, 'departments': 1, 'tools': 2, 'receiving': 3
       };
       if(navMap[hash] !== undefined) {
           document.querySelectorAll('.bottom-nav .nav-item')[navMap[hash]].style.color = 'var(--primary)';
       }
    });

    // Header Settings bind
    const settingsBtn = document.querySelector('header .icon-btn[aria-label="Settings"]');
    if(settingsBtn) settingsBtn.addEventListener('click', () => this.openSettings());

    // Global Scanner Setup
    document.getElementById('global-scanner-btn').addEventListener('click', () => {
      this.openModal(`
        <h2>Barcode Scanner</h2>
        <div style="background:#000; height:250px; border-radius:8px; margin: 15px 0; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden;">
           <div style="position:absolute; width:100%; height:2px; background:var(--danger); top:50%; box-shadow: 0 0 10px red; z-index:2;"></div>
           <p style="color:#555" id="cam-status">Requesting Camera...</p>
           <video id="scanner-video" autoplay playsinline style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; z-index:1; opacity:0;"></video>
        </div>
        <p style="text-align:center;">Looking for 1D/2D Barcodes...</p>
        <div style="text-align:center; margin-top:20px; display:flex; flex-direction:column; gap:10px;">
           <button class="btn-primary" onclick="App.simulateSuccessScan()"><i data-lucide="sparkles"></i> Simulate Scan Success</button>
           <button class="btn-primary" style="background:var(--bg-dark-surface)" onclick="App.buzzError(); App.closeModal()"><i data-lucide="x-circle"></i> Terminate Scanner</button>
        </div>
      `);
      this.startCamera();
      AITeacher.showTip("Camera active. Align the barcode or invoice text clearly within the frame for maximum AI accuracy.");
    });
  },

  initAuth() {
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
       document.getElementById('auth-overlay').classList.add('hidden');
       Store.state.currentUser = "Mock User";
       Store.state.currentRole = "admin";
       this.updateNavVisibility();
       return;
    }

    // Check if returning from email link
    if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt("Please provide your email for confirmation");
        }
        if (email) {
            firebase.auth().signInWithEmailLink(email, window.location.href)
            .then((result) => {
                window.localStorage.removeItem('emailForSignIn');
                window.location.hash = 'dashboard';
            })
            .catch((error) => alert("Auth Error: " + error.message));
        }
    }

    firebase.auth().onAuthStateChanged((user) => {
       if (user) {
          Store.state.currentUser = user.email;
          Store.state.currentRole = Store.determineRole(user.email);
          document.getElementById('auth-overlay').classList.add('hidden');
          this.updateNavVisibility();
          // Re-evaluate current route to ensure they still have access
          Router.handleRoute(); 
       } else {
          Store.state.currentUser = null;
          Store.state.currentRole = null;
          document.getElementById('auth-overlay').classList.remove('hidden');
       }
    });
  },

  login() {
    if (typeof firebase === 'undefined' || !firebase.apps.length) return;
    const email = document.getElementById('auth-email').value;
    if(!email) return alert("Enter your email address!");
    
    document.getElementById('auth-status-msg').innerText = "Sending secure link...";
    const actionCodeSettings = {
        url: window.location.href, // This returns them to the current page
        handleCodeInApp: true
    };
    
    firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings)
      .then(() => {
        window.localStorage.setItem('emailForSignIn', email);
        document.getElementById('auth-status-msg').innerText = "Link sent! Check your inbox and click the link to log in.";
      })
      .catch((error) => {
        document.getElementById('auth-status-msg').innerText = "Error: " + error.message;
      });
  },

  updateNavVisibility() {
      const role = Store.state.currentRole || 'standard';
      document.querySelectorAll('.nav-item').forEach(el => {
          const allowedRoles = el.getAttribute('data-allowed-roles');
          if (allowedRoles) {
             const rolesArr = allowedRoles.split(',');
             if (rolesArr.includes(role)) {
                 el.style.display = 'flex';
             } else {
                 el.style.display = 'none';
             }
          }
      });
  },

  toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  },

  setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('inventoryTheme', themeName);
    
    // Update Theme Toggle Icon
    const toggleIcon = document.querySelector('#theme-toggle-btn i');
    if (toggleIcon) {
        toggleIcon.setAttribute('data-lucide', themeName === 'dark' ? 'moon' : 'sun');
        lucide.createIcons();
    }
    
    // Update Chart Text Color Live
    if(typeof Chart !== 'undefined') {
        Chart.instances.forEach(chart => {
            if(chart.options && chart.options.plugins && chart.options.plugins.legend) {
                chart.options.plugins.legend.labels.color = themeName === 'light' ? '#000': '#fff';
                chart.update();
            }
        });
    }
  },

  openSettings() {
    this.openModal(`
      <h2>System Settings</h2>
      <p style="margin-bottom:1.5rem; color:var(--text-muted)">Configure your application preferences.</p>
      
      <div class="glass-panel" style="text-align:left;">
         <h4 style="margin-bottom:10px;">User Profile</h4>
         <p style="font-size:13px; margin-bottom:4px;">Email: <strong>${Store.state.currentUser || 'Unauthenticated'}</strong></p>
         <p style="font-size:13px; margin-bottom:10px;">Security Role: <strong style="color:var(--primary); text-transform:uppercase;">${Store.state.currentRole || 'Guest'}</strong></p>
         <button class="btn-primary" style="width:100%; background:var(--danger);" onclick="if(firebase.apps && firebase.apps.length) firebase.auth().signOut()"><i data-lucide="log-out"></i> Log Out</button>
      </div>
      
      <button class="btn-primary" style="width:100%; margin-top:20px; background:transparent; border-color:var(--text-muted); color:var(--text-muted)" onclick="App.closeModal()">Close</button>
    `);
  },

  openModal(html) {
    const mc = document.getElementById('modal-container');
    const mb = document.getElementById('modal-body');
    mb.innerHTML = html;
    mc.classList.remove('hidden');
    lucide.createIcons();
  },

  stopHardware() {
     if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
        this.currentStream = null;
     }
     if (this.recognition) {
        this.recognition.stop();
        this.recognition = null;
     }
  },

  async startCamera() {
     try {
       const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
       const video = document.getElementById('scanner-video');
       if (video) {
          video.srcObject = stream;
          video.play();
          video.style.opacity = 1;
          document.getElementById('cam-status').innerText = "";
          this.currentStream = stream; // Keep track to stop on close
       }
     } catch(err) {
        const stat = document.getElementById('cam-status');
        if(stat) stat.innerText = "Camera Access Denied/Failed: " + err.message;
        console.error("Camera error:", err);
     }
  },

  closeModal() {
    this.stopHardware();
    document.getElementById('modal-container').classList.add('hidden');
  },

  // Mock Hardware Feedbacks & Audio
  playTone(freq, type, duration) {
    if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
    const osc = window.audioCtx.createOscillator();
    const gain = window.audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(window.audioCtx.destination);
    osc.start();
    gain.gain.setValueAtTime(1, window.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + duration);
    osc.stop(window.audioCtx.currentTime + duration);
  },

  buzzError() {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    this.playTone(300, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(200, 'sawtooth', 0.4), 150);
    console.log("BUZZ: ERROR");
  },
  
  buzzSuccess() {
    if (navigator.vibrate) navigator.vibrate(100);
    this.playTone(880, 'sine', 0.1);
    setTimeout(() => this.playTone(1760, 'sine', 0.2), 100);
    console.log("BUZZ: SUCCESS");
  },

  simulateSuccessScan() {
    this.buzzSuccess();
    this.openModal(`
      <div style="text-align:center;">
        <i data-lucide="check-circle" style="color:var(--accent); width:64px; height:64px; margin-bottom:1rem;"></i>
        <h2>Item Found</h2>
        <p style="margin:1rem 0;">1001 - Rib Eye (B-1102)</p>
        <button class="btn-primary" onclick="App.closeModal()"><i data-lucide="thumbs-up"></i> Confirm</button>
      </div>
    `);
  },

  finalizeReceiving() {
     Store.receiveNewBatches([
         { name: 'Red Pack Tomato Puree', qty: 2 },
         { name: 'Rib Eye', qty: 70 }
     ]);
     const list = document.getElementById('invoice-actual-list');
     if(list) list.innerHTML = '<p style="font-size:11px; color:var(--accent); text-align:center; margin-top:20px; font-weight:bold;">Successfully Committed to DB.</p>';
     const btn = document.getElementById('commit-recv-btn');
     if(btn) btn.classList.add('hidden');
  },

  finalizeSales() {
     Store.deductInventory([
         { name: 'Red Pack Tomato Puree', qty: 3 },
         { name: 'Rib Eye', qty: 10 }
     ]);
     const list = document.getElementById('sales-actual-list');
     if(list) list.innerHTML = '<p style="font-size:11px; color:var(--danger); text-align:center; margin-top:20px; font-weight:bold;">Successfully Deducted from DB.</p>';
     const btn = document.getElementById('commit-sales-btn');
     if(btn) btn.classList.add('hidden');
  },

  async simulateScanProgress() {
    AITeacher.showTip("Processing image. The AI is now analyzing the invoice structure to extract line items with high precision.");
    this.openModal(`
       <div style="text-align:center; padding: 2rem 0;">
          <div class="scanner-pulse" style="width:60px; height:60px; border-radius:50%; margin:0 auto 1.5rem auto; border:4px solid var(--accent); border-top-color:transparent; animation: spin 1s linear infinite;"></div>
          <h3>Running Cloud AI OCR Flow...</h3>
          <p>Analyzing invoice items via Genkit & Gemini...</p>
       </div>
    `);

    try {
        const video = document.getElementById('scanner-video');
        let imageToScan = null;
        
        if (this.currentStream && video && video.videoWidth > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            imageToScan = canvas.toDataURL('image/jpeg', 0.8); // Jpeg for smaller payload
        }

        if (!imageToScan) throw new Error("Could not capture frame from camera.");

        const invoiceOCR = firebase.functions().httpsCallable('invoiceOCR');
        const result = await invoiceOCR({ base64Image: imageToScan });
        const { items } = result.data;

        this.buzzSuccess();
        this.openModal(`
          <div style="text-align:center;">
             <h2 style="color:var(--accent)">AI Extraction Complete</h2>
             <p style="margin:1rem 0;">Successfully identified ${items.length} items from the invoice.</p>
             <div style="text-align:left; background:var(--bg-dark-surface); padding:1rem; border-radius:8px; margin-bottom:1.5rem; max-height:150px; overflow-y:auto;">
                ${items.map(i => `<p style="font-size:13px; margin-bottom:4px;">+ ${i.qty}${i.weight ? ' lbs' : ''} : <strong>${i.name}</strong></p>`).join('')}
             </div>
             <button class="btn-primary" onclick="App.closeModal()"><i data-lucide="list-checks"></i> Review & Commit</button>
          </div>
        `);
    } catch (err) {
        this.buzzError();
        console.error("OCR Failure:", err);
        alert("Genkit OCR Error (Ensure GEMINI key is set and cloud functions are running): " + err.message);
    }
  },

  // Tool Launchers
  openShelfAudit() {
     this.openModal(`<h2>Shelf Audit (Aivilon Mock)</h2><p>Camera feed overlaid with Bounding Boxes counting units.</p><button style="margin-top:20px; width:100%" class="btn-primary" onclick="App.closeModal()"><i data-lucide="camera"></i> Close</button>`);
  },
  openPalletCounter() {
     this.openModal(`<h2>360 Pallet Counter</h2><p>Move around pallet to generate 3D Volumetric Map...</p><button style="margin-top:20px; width:100%" class="btn-primary" onclick="App.closeModal()"><i data-lucide="box"></i> Close</button>`);
  },
  openVoiceCalc() {
     this.openModal(`
       <h2>Voice Calculator</h2>
       <div id="calc-display" style="font-size: 2rem; text-align:right; border-bottom:1px solid var(--border-glass); padding:20px 0; margin-bottom:20px; font-weight:300;">
         Waiting...
       </div>
       <div style="display:flex; justify-content:center;">
          <button id="mic-btn" class="icon-btn scanner-pulse" style="width:80px; height:80px; background:var(--danger); border:none;" onclick="App.startMic()">
             <i data-lucide="mic" style="width:40px; height:40px; color:white;"></i>
          </button>
       </div>
       <p id="mic-status" style="text-align:center; margin-top:20px;">Click the microphone to grant permissions and speak.</p>
       <button style="margin-top:20px; width:100%" class="btn-primary" onclick="App.closeModal()"><i data-lucide="check"></i> Done</button>
     `);
  },

  startMic() {
     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
     if (!SpeechRecognition) {
        alert("Speech Recognition API not natively supported in this browser. Try Chrome.");
        return;
     }
     
     const statusEl = document.getElementById('mic-status');
     const btn = document.getElementById('mic-btn');
     
     if(this.recognition) {
        this.recognition.stop(); // restart
     }
     
     statusEl.innerText = "Requesting mic access...";
     
     this.recognition = new SpeechRecognition();
     this.recognition.continuous = false;
     this.recognition.interimResults = false;
     this.recognition.lang = 'en-US';

     this.recognition.onstart = () => {
         statusEl.innerText = "Listening... Speak your calculation";
         btn.style.background = "var(--accent)";
         this.buzzSuccess(); 
         document.getElementById('calc-display').innerHTML = '<span style="color:var(--text-muted)">Listening...</span>';
         
         AITeacher.showTip("Speak clearly. To maximize mathematical accuracy, explicitly say 'Plus', 'Minus', or 'Equals'.");
     };

     this.recognition.onresult = (event) => {
         let rawTranscript = event.results[0][0].transcript.toLowerCase();
         console.log("Speech Input:", rawTranscript);
         
         // Enhance AI Accuracy by natively parsing mathematical semantics
         let parsed = rawTranscript
            .replace(/plus/g, '+')
            .replace(/minus/g, '-')
            .replace(/equals/g, '=')
            .replace(/times/g, '*')
            .replace(/divided by/g, '/')
            .replace(/one/g, '1')
            .replace(/two/g, '2'); // basic normalizations
            
         document.getElementById('calc-display').innerText = parsed;
         statusEl.innerText = "Heard: " + parsed;
         btn.style.background = "var(--danger)";
         
         // Contextual check by AI Teacher
         if(parsed.includes('=')) {
            AITeacher.showTip("Great! You've explicitly finalized the calculation with an 'Equals' sign.");
         } else if(!(/[\+\-\*\/\=]/.test(parsed))) {
            AITeacher.showTip("AI detected numbers but no mathematical operators. Try adding 'Plus'.");
         }
     };

     this.recognition.onerror = (event) => {
         statusEl.innerText = "Error: " + event.error;
         btn.style.background = "var(--danger)";
         this.buzzError();
         AITeacher.showTip("Speech recognition failed. Please ensure you have granted microphone permissions to your browser.");
     };
     
     this.recognition.start();
  },
  addWeightItemToDB() {
     // Mocking AI extracted data into persistent item
     const simulatedNewItem = {
       id: '2005_' + Math.floor(Math.random() * 1000),
       name: 'Fresh Atlantic Salmon (Scanned)',
       deptId: 'seafood',
       batches: [{ batchNo: 'B-NEW-' + Math.floor(Math.random() * 1000), weight: 14.50, dateRecv: new Date().toLocaleDateString(), loc: 'Cooler B' }],
       unitsPerCase: 1,
       shelfCapacity: 20,
       isRandomWeight: true
     };
     Store.state.inventory.push(simulatedNewItem);
     Store.notify(); // this triggers localstorage persistance DB save!
     this.buzzSuccess();
  },

  openWeightCalc() {
     this.openModal(`
       <h2>Case Weight Calculator</h2>
       <div style="background:#000; height:150px; margin: 15px 0; display:flex; align-items:center; justify-content:center;">
          <p>Scan Product Label...</p>
       </div>
       <ul class="item-list" style="margin-bottom:1.5rem;">
          <li class="item-row badge" style="justify-content:space-between"><span>Rib Eye</span><span>75.84 lbs</span></li>
       </ul>
       <button class="btn-primary" style="width:100%" onclick="App.addWeightItemToDB(); App.closeModal()"><i data-lucide="send"></i> Submit to Database</button>
     `);
  }
};

// CSS Animation definition dynamically added for spinner
const style = document.createElement('style');
style.textContent = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
document.head.appendChild(style);

window.onload = () => {
    const savedTheme = localStorage.getItem('inventoryTheme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    const toggleIcon = document.querySelector('#theme-toggle-btn i');
    if (toggleIcon) toggleIcon.setAttribute('data-lucide', savedTheme === 'dark' ? 'moon' : 'sun');
    
    AITeacher.init();
    App.init();
    
    // Background guidance intro
    setTimeout(() => AITeacher.showTip("Welcome to InventoryAI! Try tapping the center Scanner to securely read a barcode or invoice with High-Precision OCR."), 2000);
};
