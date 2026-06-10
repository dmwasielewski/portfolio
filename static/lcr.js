(function(){
function escHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function initLcr(){
  var app=document.getElementById('lcr-app');
  if(!app) return;
  var dataEl=document.getElementById('lcr-data');
  if(!dataEl) return;
  var DATA;
  try{
    var raw=dataEl.textContent||dataEl.innerHTML;
    var tmp=document.createElement('textarea');tmp.innerHTML=raw;
    DATA=JSON.parse(tmp.value);
  }
  catch(e){ console.error('lcr: data parse failed',e); return; }

  var sorted=DATA.slice().sort(function(a,b){return a.label.localeCompare(b.label);});
  var totalCmds=DATA.reduce(function(s,c){return s+c.cmds.length;},0);
  var totalCats=DATA.length;
  var statsEl=document.getElementById('lcr-stats');
  if(statsEl) statsEl.textContent=totalCmds+' commands across '+totalCats+' categories';

  // Safe colour: blue for Linux, same blue for PS (both use #3b82f6 now)
  var safeColor='#3b82f6';

  // localStorage click-tracking
  var STORAGE_KEY=app.dataset.theme==='ps'?'ps_cmdcounts':'lx_cmdcounts';
  function getCounts(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'); }catch(e){ return {}; }
  }
  function incrementCount(cmd){
    var c=getCounts(); c[cmd]=(c[cmd]||0)+1;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(c));
  }
  function getPopularCmds(){
    var counts=getCounts();
    var all=[];
    DATA.forEach(function(cat){
      cat.cmds.forEach(function(cmd){
        var n=counts[cmd[0]]||0;
        if(n>0) all.push({cmd:cmd,count:n});
      });
    });
    return all.sort(function(a,b){return b.count-a.count;});
  }

  var filtersEl=document.getElementById('lcr-filters');
  if(!filtersEl) return;
  filtersEl.innerHTML='';
  var activeFilter='all';

  function makeBtn(id,label,count){
    var b=document.createElement('button');
    b.className='lcr-btn'+(id==='all'?' active':'');
    b.textContent=count!==undefined?label+' ('+count+')':label;
    b.dataset.id=id;
    b.addEventListener('click',function(){
      activeFilter=id;
      filtersEl.querySelectorAll('.lcr-btn').forEach(function(x){
        x.classList.toggle('active',x.dataset.id===id);
      });
      applyFilter();
    });
    return b;
  }
  filtersEl.appendChild(makeBtn('all','All',totalCmds));
  filtersEl.appendChild(makeBtn('__popular__','⭐ Most Used'));
  sorted.forEach(function(c){filtersEl.appendChild(makeBtn(c.id,c.label,c.cmds.length));});

  var contentEl=document.getElementById('lcr-content');
  if(!contentEl) return;
  contentEl.innerHTML='';

  function buildRow(tbody,row,showBadge){
    var opts=(row.length>2&&row[2])||{};
    var risk=opts.risk||'safe';
    var color=risk==='destructive'?'#ef4444':risk==='caution'?'#f59e0b':safeColor;
    var tr=document.createElement('tr');

    // Command cell
    var td1=document.createElement('td');
    td1.style.cssText='width:30%;max-width:30%;overflow-wrap:break-word';
    td1.title=row[0];
    var cmdSpan=document.createElement('span');
    cmdSpan.style.cssText='font-family:ui-monospace,monospace;color:'+color+';font-weight:700;overflow-wrap:break-word';
    cmdSpan.textContent=row[0].replace(/(\w)-(\w)/g,'$1‑$2');
    td1.appendChild(cmdSpan);
    if(showBadge){
      var counts=getCounts();
      var n=counts[row[0]]||0;
      if(n>0){
        var badge=document.createElement('span');
        badge.className='lcr-count-badge';
        badge.textContent=String(n);
        td1.appendChild(badge);
      }
    }
    tr.appendChild(td1);

    // Description cell
    var td2=document.createElement('td');
    td2.textContent=row[1]||'';
    tr.appendChild(td2);

    // Copy button cell
    var td3=document.createElement('td');
    td3.style.cssText='width:52px;text-align:right';
    var btn=document.createElement('button');
    btn.className='lcr-copy';
    btn.textContent='copy';
    btn.addEventListener('click',function(){
      navigator.clipboard.writeText(row[0]).then(function(){
        incrementCount(row[0]);
        if(activeFilter==='__popular__') applyFilter();
        btn.textContent='✓';
        btn.classList.add('lcr-copy-ok');
        setTimeout(function(){ btn.textContent='copy'; btn.classList.remove('lcr-copy-ok'); },1500);
      }).catch(function(){});
    });
    td3.appendChild(btn);
    tr.appendChild(td3);

    tbody.appendChild(tr);
  }

  function buildSection(label,cmds,showBadge){
    var section=document.createElement('div');
    section.className='lcr-section';

    // Header bar: category name + count
    var hdr=document.createElement('div');
    hdr.className='lcr-section-title';
    var nameSpan=document.createElement('span');
    nameSpan.textContent=label;
    var countSpan=document.createElement('span');
    countSpan.className='lcr-ct-count';
    countSpan.textContent=cmds.length+' commands';
    hdr.appendChild(nameSpan);
    hdr.appendChild(countSpan);
    section.appendChild(hdr);

    var table=document.createElement('table');
    table.className='lcr-table';
    table.style.tableLayout='fixed';
    var tbody=document.createElement('tbody');
    cmds.forEach(function(row){ buildRow(tbody,row,showBadge); });
    table.appendChild(tbody);
    section.appendChild(table);
    return section;
  }

  sorted.forEach(function(c){
    var section=buildSection(c.label,c.cmds,false);
    section.dataset.category=c.id;

    // Permissions reference panel (Linux only)
    if(c.id==='perms'){
      var toggle=document.createElement('button');
      toggle.className='lcr-ref-toggle';
      toggle.innerHTML='&#128203; Permission bits reference &#9658;';
      var panel=document.createElement('div');
      panel.className='lcr-ref-panel';
      panel.style.display='none';
      toggle.addEventListener('click',function(){
        var open=panel.style.display!=='none';
        panel.style.display=open?'none':'block';
        toggle.innerHTML='&#128203; Permission bits reference '+(open?'&#9658;':'&#9660;');
      });

      var diag=document.createElement('pre');
      diag.className='lcr-perm-diagram';
      diag.textContent=
        '- rw- r-- r--  2  user  group  4096  file.txt\n'+
        '│ │   │   └── Others:  r-- = read only\n'+
        '│ │   └────── Group:   r-- = read only\n'+
        '│ └────────── Owner:   rw- = read + write\n'+
        '└──────────── Type:    see below';
      panel.appendChild(diag);

      function refSection(title,rows){
        var t=document.createElement('div');t.className='lcr-ref-title';t.textContent=title;
        panel.appendChild(t);
        var g=document.createElement('div');g.className='lcr-ref-grid';
        rows.forEach(function(r){
          var row=document.createElement('div');row.className='lcr-ref-row';
          var code=document.createElement('code');code.textContent=r[0];
          var span=document.createElement('span');span.className='lcr-ref-key';span.textContent=r[1];
          row.appendChild(code);row.appendChild(span);
          g.appendChild(row);
        });
        panel.appendChild(g);
      }
      refSection('File type (1st character)',[
        ['-','Regular file'],['d','Directory'],['l','Symbolic link'],
        ['b','Block device (disk)'],['c','Character device (tty)'],
        ['p','Named pipe'],['s','Socket']
      ]);
      refSection('Permission bits (owner / group / others)',[
        ['r','Read (octal 4)'],['w','Write (octal 2)'],['x','Execute (octal 1)'],
        ['-','Not set'],['s','Setuid/setgid + execute'],['t','Sticky bit + execute']
      ]);
      refSection('Common patterns',[
        ['rwxr-xr-x','755 — owner full, rest read+exec'],
        ['rw-r--r--','644 — owner r/w, rest read only'],
        ['rwx------','700 — owner only, no one else'],
        ['rw-------','600 — private file, owner r/w only'],
        ['rwxrwxrwx','777 — everyone full access (avoid!)']
      ]);
      section.appendChild(toggle);
      section.appendChild(panel);
    }

    contentEl.appendChild(section);
  });

  var searchEl=document.getElementById('lcr-search');
  if(!searchEl) return;
  searchEl.value='';
  searchEl.removeEventListener('input',applyFilter);
  searchEl.addEventListener('input',applyFilter);

  function applyFilter(){
    var q=searchEl.value.trim().toLowerCase();
    var visible=0;

    contentEl.querySelectorAll('.lcr-section').forEach(function(section){
      section.style.display='none';
    });

    if(activeFilter==='__popular__'){
      var popular=getPopularCmds();
      var filtered=popular.filter(function(e){
        return !q||e.cmd[0].toLowerCase().indexOf(q)>-1||(e.cmd[1]&&e.cmd[1].toLowerCase().indexOf(q)>-1);
      });
      var showEl=document.getElementById('lcr-showing');

      // Remove previous popular section if any
      var prevPop=contentEl.querySelector('.lcr-section-popular');
      if(prevPop) prevPop.remove();

      if(!filtered.length){
        if(showEl) showEl.textContent='No commands tracked yet — click copy on any command to start.';
        return;
      }
      if(showEl) showEl.textContent=filtered.length+' most-used commands';

      var popSection=buildSection('⭐ Most Used',filtered.map(function(e){return e.cmd;}),true);
      popSection.classList.add('lcr-section-popular');
      contentEl.prepend(popSection);
      visible=filtered.length;
    } else {
      contentEl.querySelectorAll('.lcr-section:not(.lcr-section-popular)').forEach(function(section){
        var catOk=activeFilter==='all'||section.dataset.category===activeFilter;
        if(!catOk) return;
        section.style.display='';
        if(q){
          section.querySelectorAll('tr').forEach(function(tr){
            var cells=tr.querySelectorAll('td');
            var hit=(cells[0]&&cells[0].textContent.toLowerCase().indexOf(q)>-1)||
                    (cells[1]&&cells[1].textContent.toLowerCase().indexOf(q)>-1);
            tr.classList.toggle('lcr-row-hidden',!hit);
            if(hit) visible++;
          });
        } else {
          section.querySelectorAll('tr').forEach(function(tr){
            tr.classList.remove('lcr-row-hidden');
            visible++;
          });
        }
      });
      var showEl=document.getElementById('lcr-showing');
      if(showEl){
        showEl.textContent=(q||activeFilter!=='all')
          ?'Showing '+visible+' of '+totalCmds+' commands'
          :'';
      }
    }
  }
  applyFilter();
}

document.addEventListener('nav',initLcr);
initLcr();
})();
