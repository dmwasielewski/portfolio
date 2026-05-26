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
    // Quartz entity-encodes " as &quot; inside <script> elements — decode before parsing
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

  function makeBtn(id,label){
    var b=document.createElement('button');
    b.className='lcr-btn'+(id==='all'?' active':'');
    b.textContent=label; b.dataset.id=id;
    b.addEventListener('click',function(){
      activeFilter=id;
      filtersEl.querySelectorAll('.lcr-btn').forEach(function(x){
        x.classList.toggle('active',x.dataset.id===id);
      });
      applyFilter();
    });
    return b;
  }
  filtersEl.appendChild(makeBtn('all','All'));
  sorted.forEach(function(c){filtersEl.appendChild(makeBtn(c.id,c.label));});

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
      var opts=row[2]||{};
      var risk=opts.risk||'safe';
      var color=risk==='destructive'?'#ef4444':risk==='caution'?'#f59e0b':'#3b82f6';
      var tr=document.createElement('tr');
      tr.innerHTML='<td style="color:'+color+'">'+escHtml(row[0])+'</td><td>'+escHtml(row[1])+'</td>';
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); section.appendChild(table);
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
