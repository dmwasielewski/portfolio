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
  sorted.forEach(function(c){filtersEl.appendChild(makeBtn(c.id,c.label,c.cmds.length));});

  var contentEl=document.getElementById('lcr-content');
  if(!contentEl) return;
  contentEl.innerHTML='';

  sorted.forEach(function(c){
    var section=document.createElement('section');
    section.className='lcr-section';
    section.dataset.category=c.id;
    var h=document.createElement('div');
    h.className='lcr-section-title'; h.textContent=c.label;
    section.appendChild(h);
    var table=document.createElement('table');
    table.className='lcr-table';
    var tbody=document.createElement('tbody');
    c.cmds.forEach(function(row){
      var opts=(row.length>2&&row[2])||{};
      var risk=opts.risk||'safe';
      var color=risk==='destructive'?'#ef4444':risk==='caution'?'#f59e0b':'#3b82f6';
      var tr=document.createElement('tr');
      var td1=document.createElement('td');
      td1.style.color=color;
      td1.textContent=row[0];
      var td2=document.createElement('td');
      td2.textContent=row[1]||'';
      tr.appendChild(td1);tr.appendChild(td2);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); section.appendChild(table);

    // Permissions reference panel
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
      var catOk=activeFilter==='all'||section.dataset.category===activeFilter;
      if(!catOk){section.style.display='none';return;}
      section.style.display='';
      section.querySelectorAll('tr').forEach(function(tr){
        if(!q){tr.classList.remove('lcr-row-hidden');visible++;return;}
        var cells=tr.querySelectorAll('td');
        var hit=(cells[0]&&cells[0].textContent.toLowerCase().indexOf(q)>-1)||
                (cells[1]&&cells[1].textContent.toLowerCase().indexOf(q)>-1);
        tr.classList.toggle('lcr-row-hidden',!hit);
        if(hit) visible++;
      });
    });
    var showEl=document.getElementById('lcr-showing');
    if(showEl){
      showEl.textContent=(q||activeFilter!=='all')
        ?'Showing '+visible+' of '+totalCmds+' commands'
        :'';
    }
  }
}

document.addEventListener('nav',initLcr);
initLcr();
})();
