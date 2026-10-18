const DATA_URL = 'questions.json';
const letters = ['A','B','C','D'];
let data, selectedSubject, selectedMode = 'practice', selectedYear = 'all';
let quiz = { questions: [], index: 0, answers: {}, mode: 'practice', timer: null, remaining: 7200, submitted: false };
const $ = (id) => document.getElementById(id);

async function init(){
  data = window.EXAM_DATA || await fetch(DATA_URL).then(r => r.json());
  selectedSubject = data.subjects.find(s=>s.quiz);
  renderSubjects();
  document.querySelectorAll('.mode-card').forEach(btn => btn.addEventListener('click', () => { selectedMode = btn.dataset.mode; document.querySelectorAll('.mode-card').forEach(x=>x.classList.toggle('selected', x===btn)); }));
  $('yearSelect').addEventListener('change', e => selectedYear = e.target.value);
  $('startButton').addEventListener('click', startQuiz); $('backButton').addEventListener('click', goHome); $('submitButton').addEventListener('click', submitQuiz); $('retryButton').addEventListener('click', startQuiz); $('homeButton').addEventListener('click', goHome);
  $('prevButton').addEventListener('click', () => move(-1)); $('nextButton').addEventListener('click', () => move(1));
}
function renderSubjects(){
  const grid = $('subjectGrid');
  grid.innerHTML = data.subjects.map(s => `<button class="subject-card ${s.quiz ? '' : 'disabled'} ${selectedSubject?.code===s.code?'selected':''}" data-code="${s.code}" ${s.quiz?'':'disabled'}><span class="subject-code">${s.code}</span><strong>${s.name}</strong><small>${s.quiz ? '近三年共 '+s.years.reduce((n,y)=>n+y.questionCount,0)+' 題可練習' : '非選擇題｜PDF 瀏覽'}</small></button>`).join('');
  grid.querySelectorAll('.subject-card:not(.disabled)').forEach(b => b.addEventListener('click',()=>{selectedSubject=data.subjects.find(s=>s.code===b.dataset.code); renderSubjects();}));
}
function startQuiz(){
  if(!selectedSubject) return;
  const qs = selectedSubject.years.filter(y=>selectedYear==='all'||String(y.year)===selectedYear).flatMap(y=>y.questions.map(q=>({...q, year:y.year})));
  quiz = {questions:qs, index:0, answers:{}, mode:selectedMode, timer:null, remaining:7200, submitted:false};
  $('homeView').classList.add('hidden'); $('resultView').classList.add('hidden'); $('quizView').classList.remove('hidden');
  $('quizTitle').textContent=selectedSubject.name; $('quizModeLabel').textContent=selectedMode==='practice'?'PRACTICE MODE · 立即判分':'EXAM MODE · 計時模擬'; $('timer').classList.toggle('hidden', selectedMode!=='exam');
  if(selectedMode==='exam') startTimer(); renderMap(); renderQuestion(); window.scrollTo({top:0,behavior:'smooth'});
}
function startTimer(){ clearInterval(quiz.timer); quiz.timer=setInterval(()=>{quiz.remaining--; renderTimer(); if(quiz.remaining<=0){clearInterval(quiz.timer); $('timer').classList.add('expired');}},1000); renderTimer(); }
function renderTimer(){const h=String(Math.floor(quiz.remaining/3600)).padStart(2,'0'),m=String(Math.floor(quiz.remaining%3600/60)).padStart(2,'0'),s=String(quiz.remaining%60).padStart(2,'0'); $('timerValue').textContent=`${h}:${m}:${s}`;}
function renderMap(){ $('questionMap').innerHTML=quiz.questions.map((q,i)=>`<button class="map-button" data-i="${i}">${i+1}</button>`).join(''); document.querySelectorAll('.map-button').forEach(b=>b.addEventListener('click',()=>{quiz.index=Number(b.dataset.i);renderQuestion();})); }
function renderQuestion(){
  const q=quiz.questions[quiz.index]; if(!q) return; const answered=quiz.answers[quiz.index];
  $('questionCounter').textContent=`QUESTION ${String(quiz.index+1).padStart(2,'0')} / ${quiz.questions.length}`; $('questionYear').textContent=`${q.year} 年試題`; $('questionStem').textContent=q.stem; $('progressBar').style.width=`${((quiz.index+1)/quiz.questions.length)*100}%`;
  $('options').innerHTML=q.options.map((o,i)=>`<button class="option ${answered===letters[i]?'selected':''}" data-answer="${letters[i]}"><span class="letter">${letters[i]}</span><span>${o}</span></button>`).join('');
  document.querySelectorAll('.option').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.answer)));
  const feedback=$('practiceFeedback'); feedback.className='feedback hidden'; feedback.innerHTML='';
  if(quiz.mode==='practice' && answered){showPracticeFeedback(answered);}
  $('prevButton').disabled=quiz.index===0; $('nextButton').innerHTML=quiz.index===quiz.questions.length-1?'完成並看結果 <span>→</span>':'下一題 <span>→</span>';
  document.querySelectorAll('.map-button').forEach((b,i)=>b.className=`map-button ${i===quiz.index?'current':''} ${quiz.answers[i]?'answered':''}`);
}
function choose(answer){ if(quiz.mode==='practice' && quiz.answers[quiz.index]) return; quiz.answers[quiz.index]=answer; renderQuestion(); if(quiz.mode==='practice') showPracticeFeedback(answer); }
function showPracticeFeedback(answer){const q=quiz.questions[quiz.index], f=$('practiceFeedback'); f.className=`feedback ${answer===q.answer?'':'wrong'}`; f.innerHTML=answer===q.answer?`✓ 答對了！正確答案是 ${q.answer}`:`✕ 再想想。正確答案是 <strong>${q.answer}</strong>`; document.querySelectorAll('.option').forEach(b=>{if(b.dataset.answer===q.answer)b.classList.add('correct'); if(answer!==q.answer&&b.dataset.answer===answer)b.classList.add('wrong');});}
function move(delta){if(quiz.index===quiz.questions.length-1&&delta>0){submitQuiz();return;} quiz.index=Math.max(0,Math.min(quiz.questions.length-1,quiz.index+delta));renderQuestion();}
function submitQuiz(){ if(quiz.submitted)return; quiz.submitted=true; clearInterval(quiz.timer); const correct=quiz.questions.reduce((n,q,i)=>n+(quiz.answers[i]===q.answer?1:0),0); const score=Math.round(correct/quiz.questions.length*100); $('quizView').classList.add('hidden'); $('resultView').classList.remove('hidden'); $('scoreValue').textContent=score; $('resultTitle').textContent=score>=60?'測驗完成，繼續保持。':'測驗完成，再複習一次。'; $('resultSummary').textContent=`答對 ${correct} / ${quiz.questions.length} 題｜${selectedSubject.name}${selectedMode==='exam'?'｜計時模擬':''}`; $('resultBreakdown').innerHTML=`<div class="breakdown-row"><span>題目範圍</span><strong>${selectedYear==='all'?'2023–2025':selectedYear}</strong></div><div class="breakdown-row"><span>作答狀態</span><strong>${Object.keys(quiz.answers).length} 題已作答，${quiz.questions.length-Object.keys(quiz.answers).length} 題未作答</strong></div>`; window.scrollTo({top:0,behavior:'smooth'}); }
function goHome(){clearInterval(quiz.timer);$('quizView').classList.add('hidden');$('resultView').classList.add('hidden');$('homeView').classList.remove('hidden');renderSubjects();window.scrollTo({top:0,behavior:'smooth'});}
init();
