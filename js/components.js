// UI Rendering Components

const Components = {
  createDashboard() {
     const container = document.createElement('div');
     
     // Calculate contextual metrics
     const allItems = Store.state.inventory;
     let totalValueEst = 0; // Mock calculation based on qty * $12.50
     let expiringSoon = 0;
     let totallyExpired = 0;
     let meatP=0, seaP=0, proP=0, daiP=0;
     
     allItems.forEach(item => {
        let qty = 0;
        if(item.batches) item.batches.forEach(b => { qty += (b.weight || b.quantity || 1) });
        totalValueEst += (qty * 12.50); 
        
        if (item.batches && item.batches.length > 0 && item.batches[0].dateMan) {
             const status = Store.getExpirationStatus(item, item.batches[0]);
             if (status.status === 'EXPIRED') totallyExpired++;
             else if (status.status === 'CRITICAL' || status.status === 'WARNING' || status.status === 'NOTICE') {
                 expiringSoon++;
                 // Background AI Teacher queued alerts
                 if(status.daysLeft === 0) setTimeout(() => AITeacher.showTip(`CRITICAL: ${item.name} MUST BE PULLED TODAY!`), 2000);
                 else if(status.daysLeft === 1) setTimeout(() => AITeacher.showTip(`CRITICAL: ${item.name} must be pulled tomorrow!`), 5000);
                 else if(status.daysLeft === 3) setTimeout(() => AITeacher.showTip(`Warning: ${item.name} has 3 days until pull date.`), 10000);
                 else if(status.daysLeft === 5) setTimeout(() => AITeacher.showTip(`Notice: ${item.name} has 5 days until pull date.`), 15000);
                 else if(status.daysLeft === 10) setTimeout(() => AITeacher.showTip(`Notice: ${item.name} is on its 10-day expiration warning.`), 20000);
             }
        }
        
        if(item.deptId==='meat') meatP+=qty;
        else if(item.deptId==='seafood') seaP+=qty;
        else if(item.deptId==='produce') proP+=qty;
        else daiP+=qty;
     });

     container.innerHTML = `
        <div style="margin-bottom: 2rem; margin-top:10px;">
           <h2 style="font-size:24px; font-weight:800; background: linear-gradient(90deg, #fff, var(--primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Executive Dashboard</h2>
           <p style="color:var(--text-muted)">Live Inventory Overview</p>
        </div>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom: 2rem;">
           <div class="glass-panel" style="padding:15px; text-align:center;">
              <p style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">Estimated Floor Value</p>
              <h3 style="font-size:22px; color:var(--primary); text-shadow: 0 0 10px var(--primary-glow);">$${totalValueEst.toLocaleString(undefined, {minimumFractionDigits:2})}</h3>
           </div>
           <div class="glass-panel" style="padding:15px; text-align:center;">
              <p style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">Unique Items on Shelf</p>
              <h3 style="font-size:22px;">${allItems.length} <span style="font-size:12px; color:var(--text-muted); font-weight:normal;">SKUs</span></h3>
           </div>
           <div class="glass-panel" style="padding:15px; text-align:center; border-left:4px solid orange;">
              <p style="font-size:11px; font-weight:700; color:orange; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">Items About to Expire</p>
              <h3 style="font-size:22px;">${expiringSoon} <span style="font-size:12px; color:var(--text-muted); font-weight:normal;">${expiringSoon === 1 ? 'Batch' : 'Batches'}</span></h3>
           </div>
           <div class="glass-panel" style="padding:15px; text-align:center; border-left:4px solid var(--danger);">
              <p style="font-size:11px; font-weight:700; color:var(--danger); text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">Past Pull Date</p>
              <h3 style="font-size:22px;">${totallyExpired} <span style="font-size:12px; color:var(--text-muted); font-weight:normal;">${totallyExpired === 1 ? 'Batch' : 'Batches'}</span></h3>
           </div>
        </div>
        
        <div class="glass-panel" style="padding:15px; margin-bottom: 2rem; display:flex; flex-direction:column; align-items:center;">
           <h4 style="margin-bottom:15px; width:100%; text-align:left;">Commodity Distribution</h4>
           <div style="width: 250px; height: 250px; position:relative;">
               <canvas id="dashboard-chart"></canvas>
           </div>
        </div>
        
        <button class="btn-primary" style="width:100%; margin-bottom: 2rem;" onclick="window.location.hash='departments'">
           <i data-lucide="grid"></i> View Full Database
        </button>
     `;
     
     // Render Chart
     setTimeout(() => {
        const ctx = document.getElementById('dashboard-chart');
        if(ctx && typeof Chart !== 'undefined') {
           new Chart(ctx, {
              type: 'doughnut',
              data: {
                 labels: ['Meat', 'Seafood', 'Produce', 'Dairy'],
                 datasets: [{
                    data: [meatP||1, seaP||1, proP||1, daiP||1],
                    backgroundColor: ['#6610f2', '#f43f5e', '#10b981', '#3b82f6'],
                    borderWidth: 0,
                    hoverOffset: 4
                 }]
              },
              options: {
                 responsive: true,
                 maintainAspectRatio: false,
                 plugins: { 
                     legend: { position: 'bottom', labels: { color: document.body.getAttribute('data-theme')==='light' ? '#000': '#fff' } } 
                 },
                 cutout: '70%'
              }
           });
        }
     }, 100);
     
     return container;
  },

  createDepartmentGrid() {
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2>Departments & Items</h2>
        <p style="margin-bottom:1rem;">Search across all inventory or select a department.</p>
        <div class="search-bar glass-panel" style="padding: 10px; display:flex; gap:10px; align-items:center; margin-bottom: 0;">
           <i data-lucide="search" style="color:var(--text-muted)"></i>
           <input type="text" id="global-search-input" placeholder="Search entire DB by name, ID, or size..." style="background:transparent; border:none; width:100%; outline:none; color:var(--text-main); font-size:16px;">
        </div>
      </div>
      <div id="global-search-results" class="item-list glass-panel hidden" style="margin-bottom: 1.5rem;"></div>
      <div class="grid-departments" id="dept-grid"></div>
    `;

    // Global Search feature mapped to the landing screen
    setTimeout(() => {
       const input = document.getElementById('global-search-input');
       const grid = document.getElementById('dept-grid');
       const resultsContainer = document.getElementById('global-search-results');
       
       if (input) {
          input.addEventListener('input', (e) => {
             const query = e.target.value;
             if(query.trim().length > 0) {
                grid.classList.add('hidden');
                resultsContainer.classList.remove('hidden');
                
                const results = Store.searchItems(query);
                resultsContainer.innerHTML = '';
                if(results.length === 0) {
                   resultsContainer.innerHTML = '<p style="text-align:center; padding: 20px;">No matching items in database</p>';
                } else {
                   results.forEach(item => {
                      const div = document.createElement('div');
                      div.className = 'item-row';
                      div.style.borderBottom = '1px solid var(--border-glass)';
                      div.style.padding = '10px 0';
                      div.style.cursor = 'pointer';
                      
                      let expiryBadge = '';
                      if (item.batches && item.batches.length > 0 && item.batches[0].dateMan) {
                         const status = Store.getExpirationStatus(item, item.batches[0]);
                         if (status.status === 'EXPIRED') {
                            expiryBadge = `<span class="expiry-badge expiry-expired"><i data-lucide="alert-triangle" style="width:12px; height:12px;"></i> EXPIRED ${Math.abs(status.daysLeft)}d AGO</span>`;
                         } else if (status.status === 'CRITICAL') {
                            expiryBadge = `<span class="expiry-badge expiry-critical"><i data-lucide="alert-octagon" style="width:12px; height:12px;"></i> ${status.msg}</span>`;
                         } else if (status.status === 'WARNING') {
                            expiryBadge = `<span class="expiry-badge expiry-warning"><i data-lucide="clock" style="width:12px; height:12px;"></i> ${status.msg}</span>`;
                         } else if (status.status === 'NOTICE') {
                            expiryBadge = `<span class="expiry-badge expiry-notice"><i data-lucide="info" style="width:12px; height:12px;"></i> ${status.msg}</span>`;
                         }
                      }

                      div.innerHTML = `<div class="item-info"><h4 style="color:var(--insane-indigo); filter: brightness(1.5);">${item.name}</h4><p>ID: ${item.id} &bull; Dept: ${item.deptId}</p>${expiryBadge}</div><div style="display:flex; align-items:center; gap: 10px;"><span class="badge"><i data-lucide="package" style="width:14px; height:14px;"></i> ${Store.calcTotal(item)}</span><i data-lucide="chevron-right" style="color:var(--text-muted)"></i></div>`;
                      div.addEventListener('click', () => window.location.hash = `item-${item.deptId}-${item.id}`);
                      resultsContainer.appendChild(div);
                   });
                   lucide.createIcons();
                }
             } else {
                grid.classList.remove('hidden');
                resultsContainer.classList.add('hidden');
             }
          });
       }
    }, 100);

    
    const grid = container.querySelector('#dept-grid');

    const emojiMap = {
       'meat': '🥩🍗',
       'seafood': '🐟🦞',
       'produce': '🥦🍎',
       'dairy': '🧀🥛',
       'dry-goods': '📦🥫'
    };

    Store.state.departments.forEach(dept => {
      const card = document.createElement('div');
      card.className = 'glass-panel dept-card';
      
      card.innerHTML = `
        <div class="dept-icon" style="font-size:28px; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; box-shadow:inset 0 0 15px rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1);">
          <span style="filter: drop-shadow(0px 8px 10px rgba(0,0,0,0.6)); transform: scale(1.3);">${emojiMap[dept.id] || '🛒'}</span>
        </div>
        <h4 style="font-weight:700; letter-spacing:0.5px; font-size:14px; margin-top:8px;">${dept.name}</h4>
      `;
      card.addEventListener('click', () => {
        Router.navigate(`dept-${dept.id}`);
      });
      grid.appendChild(card);
    });

    return container;
  },

  createItemDetail(deptId, itemId) {
      const item = Store.state.inventory.find(i => i.id === itemId);
      const container = document.createElement('div');
      if(!item) {
         container.innerHTML = `<p>Item not found.</p><button onclick="window.history.back()">Back</button>`;
         return container;
      }
      
      let batchesHtml = '';
      if(item.batches && item.batches.length > 0) {
         item.batches.forEach((b, idx) => {
             const status = Store.getExpirationStatus(item, b);
             let badge = `<span class="expiry-badge expiry-safe"><i data-lucide="check-circle" style="width:12px; height:12px;"></i> SAFE (${status.daysLeft}d left)</span>`;
             if(status.status === 'EXPIRED') badge = `<span class="expiry-badge expiry-expired"><i data-lucide="alert-triangle" style="width:12px; height:12px;"></i> EXPIRED (${Math.abs(status.daysLeft)}d ago)</span>`;
             else if(status.status === 'CRITICAL') badge = `<span class="expiry-badge expiry-critical"><i data-lucide="alert-octagon" style="width:12px; height:12px;"></i> ${status.msg}</span>`;
             else if(status.status === 'WARNING') badge = `<span class="expiry-badge expiry-warning"><i data-lucide="clock" style="width:12px; height:12px;"></i> ${status.msg}</span>`;
             else if(status.status === 'NOTICE') badge = `<span class="expiry-badge expiry-notice"><i data-lucide="info" style="width:12px; height:12px;"></i> ${status.msg}</span>`;
             
             batchesHtml += `
               <div style="background:var(--bg-dark-surface); padding:10px; border-radius:6px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border-left: 4px solid ${status.status==='EXPIRED' ? 'var(--danger)' : status.status==='WARNING' ? 'orange' : status.status==='CRITICAL' ? 'red' : 'transparent'};">
                  <div>
                     <p style="font-size:14px; font-weight:800; color:var(--text-main); margin-bottom:4px;">Batch: ${b.batchNo}</p>
                     <p style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">Mfr Date: ${b.dateMan || b.dateRecv} ${badge}</p>
                     <p style="font-size:12px; color:var(--text-muted);">Quantity/Weight: <strong>${b.weight || b.quantity || 1}</strong> &bull; Location: <strong>${b.loc || 'Unknown'}</strong></p>
                  </div>
                  <button class="icon-btn" style="color:var(--danger); background:rgba(255,0,0,0.1);" onclick="Store.removeBatch('${item.id}', ${idx}); window.location.reload();"><i data-lucide="trash-2"></i></button>
               </div>
             `;
         });
      } else {
         batchesHtml = '<p style="color:var(--text-muted); font-size:13px;">No active inventory batches.</p>';
      }

      container.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom: 1.5rem; cursor:pointer;" onclick="window.location.hash='dept-${deptId}'">
           <i data-lucide="chevron-left"></i> <h2>Product Management</h2>
        </div>
        
        <div class="glass-panel" style="margin-bottom: 20px;">
           <h3 style="color:var(--insane-indigo); margin-bottom:5px; font-size:22px;">${item.name}</h3>
           <p style="color:var(--text-muted); font-size:13px; margin-bottom:15px;">SKU: ${item.id} &bull; Dept: ${item.deptId}</p>
           
           <!-- Real-time dynamic 1D Barcode Output -->
           <div style="background:white; padding:10px; border-radius:8px; display:inline-block; margin-bottom:15px; max-width:100%;">
              <svg id="barcode-target-${item.id}" style="width:100%; max-height:60px;"></svg>
           </div>
           
           <div style="display:flex; gap:10px; margin-bottom: 15px;">
              <div style="flex:1; background:var(--bg-dark-surface); padding:10px; border-radius:6px; text-align:center;">
                 <p style="font-size:11px; text-transform:uppercase; color:var(--text-muted);">Total In Stock</p>
                 <h4 style="font-size:18px; color:var(--text-main);">${Store.calcTotal(item)}</h4>
              </div>
              <div style="flex:1; background:var(--bg-dark-surface); padding:10px; border-radius:6px; text-align:center;">
                 <p style="font-size:11px; text-transform:uppercase; color:var(--text-muted);">Shelf Capacity</p>
                 <h4 style="font-size:18px; color:var(--primary);">${item.shelfCapacity}</h4>
              </div>
           </div>
           
           <p style="font-size:13px; margin-bottom:5px;">Allowed Days to Sell: <strong>${item.allowedDaysToSell || 'N/A'}</strong></p>
           <button class="btn-primary" style="width:100%; margin-top:10px;" onclick="App.openShelfAudit()"><i data-lucide="camera"></i> Run Physical Audit</button>
        </div>
        
        <div class="glass-panel">
           <h4 style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
              FIFO Batches
              <button class="icon-btn" style="width:30px; height:30px; background:var(--bg-dark-surface);" onclick="App.addWeightItemToDB(); setTimeout(()=>window.location.reload(), 500);"><i data-lucide="plus"></i></button>
           </h4>
           ${batchesHtml}
        </div>
      `;
      
      setTimeout(() => {
          lucide.createIcons();
          if(typeof JsBarcode !== 'undefined') {
              JsBarcode(`#barcode-target-${item.id}`, item.id, {
                  format: "CODE128",
                  displayValue: true,
                  lineColor: "#000",
                  background: "transparent",
                  height: 45,
                  margin: 0,
                  fontSize: 14
              });
          }
      }, 50);
      return container;
  },

  createItemList(deptId) {
    const dept = Store.state.departments.find(d => d.id === deptId);
    const items = Store.getDepartmentItems(deptId);
    
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="display:flex; gap:10px; align-items:center; margin-bottom: 1.5rem; cursor:pointer;" id="back-btn">
        <i data-lucide="chevron-left"></i> <h2>${dept ? dept.name : 'Items'}</h2>
      </div>
      <div class="search-bar glass-panel" style="padding: 10px; display:flex; gap:10px; align-items:center; margin-bottom: 1rem;">
         <i data-lucide="search" style="color:var(--text-muted)"></i>
         <input type="text" placeholder="Search by name, size, supplier..." style="background:transparent; border:none; width:100%; outline:none;">
      </div>
      <div class="item-list glass-panel">
        ${items.length === 0 ? '<p style="padding:20px; text-align:center;">No items in this department yet.</p>' : ''}
      </div>
    `;

    container.querySelector('#back-btn').addEventListener('click', () => Router.navigate('departments'));
    
    const list = container.querySelector('.item-list');
    const searchInput = container.querySelector('input');

    const renderList = (currentItems) => {
        list.innerHTML = currentItems.length === 0 ? '<p style="padding:20px; text-align:center;">No items found.</p>' : '';
        currentItems.forEach(item => {
          const row = document.createElement('div');
          row.className = 'item-row';
          row.style.borderBottom = "1px solid var(--border-glass)";
          row.style.padding = "10px 0";
          row.style.cursor = "pointer";
          
          let expiryBadge = '';
          if (item.batches && item.batches.length > 0 && item.batches[0].dateMan) {
             const status = Store.getExpirationStatus(item, item.batches[0]);
             if (status.status === 'EXPIRED') {
                expiryBadge = `<span class="expiry-badge expiry-expired"><i data-lucide="alert-triangle" style="width:12px; height:12px;"></i> EXPIRED ${Math.abs(status.daysLeft)}d AGO</span>`;
             } else if (status.status === 'CRITICAL') {
                expiryBadge = `<span class="expiry-badge expiry-critical"><i data-lucide="alert-octagon" style="width:12px; height:12px;"></i> ${status.msg}</span>`;
             } else if (status.status === 'WARNING') {
                expiryBadge = `<span class="expiry-badge expiry-warning"><i data-lucide="clock" style="width:12px; height:12px;"></i> ${status.msg}</span>`;
             } else if (status.status === 'NOTICE') {
                expiryBadge = `<span class="expiry-badge expiry-notice"><i data-lucide="info" style="width:12px; height:12px;"></i> ${status.msg}</span>`;
             }
          }

          row.innerHTML = `
            <div class="item-info">
              <h4 style="color:var(--insane-indigo); filter: brightness(1.5);">${item.name}</h4>
              <p>ID: ${item.id} &bull; Capacity: ${item.shelfCapacity}</p>
              ${expiryBadge}
            </div>
            <div style="display:flex; align-items:center; gap: 10px;">
               <span class="badge"><i data-lucide="package" style="width:14px; height:14px;"></i> ${Store.calcTotal(item)}</span>
               <i data-lucide="chevron-right" style="color:var(--text-muted)"></i>
            </div>
          `;
          row.addEventListener('click', () => window.location.hash = `item-${deptId}-${item.id}`);
          list.appendChild(row);
        });
        lucide.createIcons();
    };

    // Initial render
    renderList(items);

    // Filter logic on search and search globally if needed
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        if(query.length > 0) {
           // Search Global DB when typing in the search bar
           const globalResults = Store.searchItems(query);
           renderList(globalResults);
        } else {
           // Fallback to department specific
           renderList(Store.getDepartmentItems(deptId));
        }
    });

    return container;
  },

  createToolsMenu() {
    const container = document.createElement('div');
    container.innerHTML = `
      <h2>AI Hardware Tools</h2>
      <p style="margin-bottom:1.5rem;">Access simulated AI models</p>
      
      <div class="grid-departments">
         <div class="glass-panel dept-card" onclick="App.openShelfAudit()">
            <div class="dept-icon" style="background:var(--secondary)"><i data-lucide="camera"></i></div>
            <h4>Shelf Audit</h4>
         </div>
         <div class="glass-panel dept-card" onclick="App.openPalletCounter()">
            <div class="dept-icon" style="background:var(--accent)"><i data-lucide="box"></i></div>
            <h4>Pallet Counter</h4>
         </div>
         <div class="glass-panel dept-card" onclick="App.openVoiceCalc()">
            <div class="dept-icon" style="background:var(--danger)"><i data-lucide="mic"></i></div>
            <h4>Voice Calc</h4>
         </div>
         <div class="glass-panel dept-card" onclick="App.openWeightCalc()">
            <div class="dept-icon" style="background:var(--primary)"><i data-lucide="scale"></i></div>
            <h4>Case Calculator</h4>
         </div>
      </div>
    `;
    return container;
  },

  createSalesUI() {
      const container = document.createElement('div');
      container.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom: 1.5rem;">
           <i data-lucide="receipt"></i> <h2>EOD Sales Verification</h2>
        </div>
        <p style="color:var(--text-muted); margin-bottom:1rem; font-size:13px;">Match digital sales records against physical barcode removals.</p>
        
        <div style="display:flex; gap:10px; align-items:stretch; min-height:60vh;">
           <!-- Left Pane: AI Sales Record -->
           <div class="glass-panel" style="flex:1; display:flex; flex-direction:column; padding:10px; border-right:2px solid var(--border-glass);">
              <h4 style="margin-bottom:10px; color:orange; font-size:12px; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid var(--border-glass); padding-bottom:10px;">
                 <i data-lucide="file-text" style="width:14px;"></i> Daily Sales List
              </h4>
              <button class="btn-primary" style="margin-bottom:15px; font-size:11px; padding:6px; background:orange; color:black;" onclick="App.simulateScanProgress()"><i data-lucide="camera" style="width:12px;"></i> Upload EOD Report</button>
              
              <div id="sales-expected-list" style="flex:1; overflow-y:auto; padding-right:5px;">
                 <p style="font-size:11px; color:var(--text-muted); text-align:center; margin-top:20px;">Awaiting Upload...</p>
              </div>
           </div>
           
           <!-- Right Pane: Deduction Confirmed -->
           <div class="glass-panel" style="flex:1; display:flex; flex-direction:column; padding:10px;">
              <h4 style="margin-bottom:10px; color:var(--danger); font-size:12px; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid var(--border-glass); padding-bottom:10px;">
                 <i data-lucide="trash-2" style="width:14px;"></i> System Deductions
              </h4>
              <button class="btn-primary" style="margin-bottom:15px; font-size:11px; padding:6px; background:var(--danger);" onclick="document.getElementById('global-scanner-btn').click()"><i data-lucide="scan" style="width:12px;"></i> Subtract Barcode</button>
              
              <div id="sales-actual-list" style="flex:1; overflow-y:auto; padding-right:5px;">
                 <p style="font-size:11px; color:var(--text-muted); text-align:center; margin-top:20px;">Pending verification...</p>
              </div>
              <button id="commit-sales-btn" class="btn-primary hidden" style="margin-top:15px; font-size:11px; padding:6px; background:var(--danger); width:100%; box-shadow:none;" onclick="App.finalizeSales()"><i data-lucide="check-circle" style="width:14px; height:14px;"></i> Finalize Deductions</button>
            </div>
        </div>
      `;
      // Global scan simulator hooks handle the exact UI population based on which div exists.
      return container;
  },

  createReceivingUI() {
      const container = document.createElement('div');
      container.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom: 1.5rem;">
           <i data-lucide="truck"></i> <h2>Invoice Reconciliation</h2>
        </div>
        <p style="color:var(--text-muted); margin-bottom:1rem; font-size:13px;">1. AI extracts Expected Items<br>2. Scanner validates Physical Items</p>
        
        <div style="display:flex; gap:10px; align-items:stretch; min-height:60vh;">
           <!-- Left Pane: AI Invoice (Expected) -->
           <div class="glass-panel" style="flex:1; display:flex; flex-direction:column; padding:10px; border-right:2px solid var(--border-glass);">
              <h4 style="margin-bottom:10px; color:var(--primary); font-size:12px; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid var(--border-glass); padding-bottom:10px;">
                 <i data-lucide="file-text" style="width:14px;"></i> Expected
              </h4>
              <button class="btn-primary" style="margin-bottom:15px; font-size:11px; padding:6px;" onclick="App.simulateScanProgress()"><i data-lucide="camera" style="width:12px;"></i> Run OCR Docs</button>
              
              <div id="invoice-expected-list" style="flex:1; overflow-y:auto; padding-right:5px;">
                 <p style="font-size:11px; color:var(--text-muted); text-align:center; margin-top:20px;">Awaiting AI Load...</p>
              </div>
           </div>
           
           <!-- Right Pane: Live Scans (Actual) -->
           <div class="glass-panel" style="flex:1; display:flex; flex-direction:column; padding:10px;">
              <h4 style="margin-bottom:10px; color:var(--accent); font-size:12px; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid var(--border-glass); padding-bottom:10px;">
                 <i data-lucide="box" style="width:14px;"></i> Scanned
              </h4>
              <button class="btn-primary" style="margin-bottom:15px; font-size:11px; padding:6px; background:var(--accent);" onclick="document.getElementById('global-scanner-btn').click()"><i data-lucide="scan" style="width:12px;"></i> Scan Pallet</button>
              
              <div id="invoice-actual-list" style="flex:1; overflow-y:auto; padding-right:5px;">
                 <p style="font-size:11px; color:var(--text-muted); text-align:center; margin-top:20px;">Awaiting Scanner Feed...</p>
              </div>
              <button id="commit-recv-btn" class="btn-primary hidden" style="margin-top:15px; font-size:11px; padding:6px; background:var(--accent); width:100%; box-shadow:none;" onclick="App.finalizeReceiving()"><i data-lucide="check-circle" style="width:14px; height:14px;"></i> Commit to Inventory</button>
            </div>
        </div>
      `;
      
      // Override the old scan mockup callback dynamically to handle ALL split screen views
      const originalSimulate = App.simulateScanProgress.bind(App);
      App.simulateScanProgress = async () => {
         await originalSimulate(); 
         setTimeout(() => {
             const leftListRecon = document.getElementById('invoice-expected-list');
             const leftListSales = document.getElementById('sales-expected-list');
             
             if(leftListRecon) {
                leftListRecon.innerHTML = `
                  <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; margin-bottom:8px; font-size:11px; border-left:3px solid var(--primary);">
                     <p style="font-weight:bold; color:white;">Tomato Puree</p>
                     <p style="color:var(--text-muted)">Expected: +2 Cases</p>
                  </div>
                  <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; margin-bottom:8px; font-size:11px; border-left:3px solid var(--primary);">
                     <p style="font-weight:bold; color:white;">Rib Eye (Beef)</p>
                     <p style="color:var(--text-muted)">Expected: +70 lbs</p>
                  </div>
                `;
                App.closeModal();
             } else if (leftListSales) {
                leftListSales.innerHTML = `
                  <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; margin-bottom:8px; font-size:11px; border-left:3px solid orange;">
                     <p style="font-weight:bold; color:white;">Bison Burgers</p>
                     <p style="color:var(--text-muted)">Verify: -3 Cases</p>
                  </div>
                  <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; margin-bottom:8px; font-size:11px; border-left:3px solid orange;">
                     <p style="font-weight:bold; color:white;">Milk (Whole Gallon)</p>
                     <p style="color:var(--text-muted)">Verify: -10 Gallons</p>
                  </div>
                `;
                App.closeModal();
             }
         }, 3000); // UI buffer after Tesseract finishes
      };
      
      const originalSuccess = App.simulateSuccessScan.bind(App);
      App.simulateSuccessScan = () => {
         originalSuccess();
         setTimeout(() => {
             const rightListRecon = document.getElementById('invoice-actual-list');
             const rightListSales = document.getElementById('sales-actual-list');
             
             if(rightListRecon) {
                if(rightListRecon.innerText.includes("Awaiting")) rightListRecon.innerHTML = '';
                rightListRecon.innerHTML += `
                  <div style="background:rgba(16, 185, 129, 0.1); padding:8px; border-radius:6px; margin-bottom:8px; font-size:11px; border-left:3px solid var(--accent);">
                     <p style="font-weight:bold; color:var(--accent);">Match Confirmed <i data-lucide="check-circle" style="width:10px; display:inline-block;"></i></p>
                     <p style="color:var(--text-muted)">Scanned: +1 Case</p>
                  </div>
                `;
                const btn = document.getElementById('commit-recv-btn');
                if (btn) btn.classList.remove('hidden');
             } else if (rightListSales) {
                if(rightListSales.innerText.includes("Pending")) rightListSales.innerHTML = '';
                rightListSales.innerHTML += `
                  <div style="background:rgba(239, 68, 68, 0.1); padding:8px; border-radius:6px; margin-bottom:8px; font-size:11px; border-left:3px solid var(--danger);">
                     <p style="font-weight:bold; color:var(--danger);">Deduction Complete <i data-lucide="trash-2" style="width:10px; display:inline-block;"></i></p>
                     <p style="color:var(--text-muted)">FIFO Adjusted: -1 Case</p>
                  </div>
                `;
                const btn = document.getElementById('commit-sales-btn');
                if (btn) btn.classList.remove('hidden');
             }
             lucide.createIcons();
             App.closeModal();
         }, 400);
      };

      return container;
  },

  createFunctionMockup(title, desc, icon="scan") {
    const container = document.createElement('div');
    container.innerHTML = `
      <h2>${title}</h2>
      <p style="margin-bottom:1.5rem;">${desc}</p>
      <div class="glass-panel" style="text-align:center; padding: 4rem 1rem;">
         <div class="scanner-pulse" style="width:80px; height:80px; border-radius:50%; margin:0 auto 1.5rem auto; display:flex; align-items:center; justify-content:center; background:var(--bg-dark-surface);">
             <i data-lucide="${icon}" style="width:40px; height:40px; color:var(--primary);"></i>
         </div>
         <h3>Awaiting Camera Permission...</h3>
         <p style="margin-top:0.5rem; max-width: 300px; margin-left:auto; margin-right:auto;">This feature simulates native AI processing of invoices or sales reports.</p>
         <button class="btn-primary" style="margin-top:1.5rem;" onclick="App.simulateScanProgress()"><i data-lucide="rocket"></i> Start Scan Simulation</button>
      </div>
    `;
    return container;
  }
};
